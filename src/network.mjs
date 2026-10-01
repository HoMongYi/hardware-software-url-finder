import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { getDomain } from 'tldts';
import { parseDocument } from 'htmlparser2';

export const LIMITS = Object.freeze({ timeoutMs: 12000, maxBytes: 1_048_576, maxRedirects: 4, concurrency: 1 });
export function publicAddress(address) {
  try { let a = ipaddr.parse(address.replace(/^\[|\]$/g, '')); if (a.kind() === 'ipv6' && a.isIPv4MappedAddress()) a = a.toIPv4Address(); return a.range() === 'unicast'; } catch { return false; }
}
export function safeUrl(value) {
  if (typeof value !== 'string' || value.length > 4096 || /\s|[\u0000-\u001f]/.test(value)) throw new Error('UNSAFE_URL');
  let u; try { u = new URL(value); } catch { throw new Error('INVALID_URL'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || (u.port && !['80','443'].includes(u.port))) throw new Error('UNSAFE_URL');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (ipaddr.isValid(host)) { if (!publicAddress(host)) throw new Error('SSRF_IP'); }
  else if (host === 'localhost' || /\.(localhost|local|internal|test|invalid|example)$/.test(host) || !getDomain(host, { allowPrivateDomains: true })) throw new Error('SSRF_HOST');
  return u;
}
export function hostAllowed(host, domains = []) { return domains.some(d => host === d || host.endsWith('.' + d)); }
export function stripTracking(value) {
  const u = new URL(value);
  for (const k of [...u.searchParams.keys()]) if (/^utm_|^(srsltid|gclid|fbclid)$/i.test(k)) u.searchParams.delete(k);
  return u.href;
}
export async function guardUrl(value, resolver = dns.lookup) {
  const u = safeUrl(value); const host = u.hostname.replace(/^\[|\]$/g, '');
  const records = ipaddr.isValid(host) ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }] : await resolver(host, { all: true, verbatim: true });
  if (!records.length || records.some(r => !publicAddress(r.address))) throw new Error('SSRF_DNS');
  return { u, records };
}
function requestPinned(u, records, options) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body, timeoutMs, maxBytes } = options;
    const client = u.protocol === 'https:' ? https : http;
    const req = client.request(u, { method, headers: { 'user-agent': 'HSUF/0.1.0 (+official-support-audit)', 'accept-encoding': 'identity', ...headers }, lookup(_hostname, lookupOptions, cb) {
      const chosen = records.find(r => !lookupOptions.family || r.family === lookupOptions.family) || records[0];
      if (lookupOptions.all) cb(null, [chosen]); else cb(null, chosen.address, chosen.family);
    } }, res => {
      const chunks = []; let size = 0;
      if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') { res.destroy(); reject(new Error('COMPRESSED_RESPONSE_REJECTED')); return; }
      res.on('data', chunk => { size += chunk.length; if (size > maxBytes) res.destroy(new Error('RESPONSE_TOO_LARGE')); else chunks.push(chunk); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', () => reject(new Error('RESPONSE_FAILED')));
    });
    const timer = setTimeout(() => req.destroy(new Error('REQUEST_TIMEOUT')), timeoutMs);
    req.on('close', () => clearTimeout(timer));
    req.on('error', () => reject(new Error('REQUEST_FAILED')));
    if (body) req.write(body); req.end();
  });
}
export async function safeRequest(value, options = {}) {
  const settings = { ...LIMITS, ...options };
  if (!(settings.timeoutMs > 0 && settings.timeoutMs <= 30000 && settings.maxBytes > 0 && settings.maxBytes <= 2_097_152 && settings.maxRedirects >= 0 && settings.maxRedirects <= 5)) throw new Error('INVALID_NETWORK_LIMITS');
  const start = Date.now(), deadline = start + settings.timeoutMs; let current = value; const redirects = [];
  for (let i = 0; i <= settings.maxRedirects; i++) {
    const remaining = deadline - Date.now(); if (remaining <= 0) throw new Error('REQUEST_TIMEOUT');
    let timer;
    const guarded = await Promise.race([guardUrl(current, settings.resolver), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), remaining); })]).finally(() => clearTimeout(timer));
    const response = await (settings.transport || requestPinned)(guarded.u, guarded.records, { ...settings, timeoutMs: Math.max(1, deadline - Date.now()) });
    if (Buffer.byteLength(response.text || '', 'utf8') > settings.maxBytes) throw new Error('RESPONSE_TOO_LARGE');
    if (response.status >= 300 && response.status < 400) {
      if (!response.headers?.location || i === settings.maxRedirects || settings.method && settings.method !== 'GET') throw new Error('REDIRECT_REJECTED');
      const next = new URL(response.headers.location, current).href;
      if (new URL(current).protocol === 'https:' && new URL(next).protocol === 'http:') throw new Error('REDIRECT_DOWNGRADE');
      if (new URL(current).origin !== new URL(next).origin && Object.keys(settings.headers || {}).some(k => !['accept','accept-encoding','user-agent'].includes(k.toLowerCase()))) throw new Error('CREDENTIAL_REDIRECT');
      redirects.push(next); current = next; continue;
    }
    return { ...response, url: current, redirects, verified_at: new Date().toISOString().slice(0, 10) };
  }
  throw new Error('REDIRECT_REJECTED');
}
export async function requestJson(value, options = {}) {
  const response = await safeRequest(value, { ...options, maxRedirects: 0 });
  if (response.status !== 200) throw new Error('PROVIDER_HTTP_FAILURE');
  try { return JSON.parse(response.text); } catch { throw new Error('PROVIDER_INVALID_JSON'); }
}
export function pageEvidence(response) {
  const html = response.text || '';
  const dom = parseDocument(html, { decodeEntities: true });
  const texts = [], titles = [], links = []; let nodes = 0;
  function visit(node, isTitle = false) {
    if (++nodes > 100000) throw new Error('HTML_NODE_LIMIT');
    const attr = node.attribs || {};
    if (['script','style','template','noscript','iframe'].includes(node.name) || Object.hasOwn(attr,'hidden') || attr['aria-hidden'] === 'true' || /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:[;\s]|$))/i.test(attr.style || '')) return;
    const titleNode = isTitle || node.name === 'title';
    if (node.type === 'text') { texts.push(node.data); if (titleNode) titles.push(node.data); }
    if (node.name === 'a' && attr.href && links.length < 2000) { try { links.push(new URL(attr.href,response.url).href); } catch {} }
    for (const child of node.children || []) visit(child,titleNode);
  }
  visit(dom);
  const title = titles.join(' ').replace(/\s+/g,' ').slice(0,1000);
  const text = texts.join(' ').replace(/\s+/g,' ').slice(0,100000);
  return { url: response.url, redirects: response.redirects, status: response.status, title, text, content_type: response.headers?.['content-type'] || '', content_disposition: response.headers?.['content-disposition'] || '', verified_at: response.verified_at, browser_required: [401,403,429,503].includes(response.status) || /captcha|just a moment|verify you are human|access denied/i.test(title), links };
}
