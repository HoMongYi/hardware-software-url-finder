import { getDomain } from 'tldts';
import { hostAllowed, safeUrl, stripTracking } from './network.mjs';
import { visibleModel, variantConflict, passiveProduct } from './identity.mjs';

const REJECT_HOSTS = ['amazon.com','amazon.co.uk','amazon.co.jp','newegg.com','taobao.com','tmall.com','jd.com','aliexpress.com','ebay.com','coupang.com','danawa.com','reddit.com','tistory.com','blogspot.com','softonic.com','filehippo.com','driverpack.io','bit.ly','t.co','tinyurl.com','web.archive.org','archive.org','google.com','bing.com'];
const FILE_RE = /\.(exe|msi|zip|rar|7z|pdf|bin|rom|cap|dmg|pkg|iso|cab|apk|tar|gz|docx?|hwp|xlsx?)(?:$|[?#])/i;
export function urlFilter(value, domains = []) {
  const reasons = []; let u;
  try { u = safeUrl(value); } catch { return { ok: false, reasons: ['UNSAFE_URL'], url: null }; }
  const host = u.hostname;
  if (u.protocol !== 'https:') reasons.push('INSECURE_HTTP');
  if (hostAllowed(host, REJECT_HOSTS) || /^(?:blog|cafe|shopping)\.naver\./.test(host)) reasons.push('DISCOVERY_ONLY_HOST');
  let decoded = u.pathname; try { decoded = decodeURIComponent(decoded); } catch { reasons.push('INVALID_URL_ENCODING'); }
  if (FILE_RE.test(decoded) || [...u.searchParams.values()].some(v => FILE_RE.test(v)) || /\/(?:files?|attachments?|binaries)\//i.test(decoded)) reasons.push('DIRECT_FILE');
  if (!hostAllowed(host, domains)) reasons.push('UNOFFICIAL_DOMAIN');
  if (/\/(login|signin|cart|checkout|manuals?|search)(\/|$)/i.test(decoded)) reasons.push('WRONG_PAGE_TYPE');
  return { ok: !reasons.length, reasons, url: stripTracking(u.href), domain: getDomain(host, { allowPrivateDomains: true }), hostname: host };
}
export function auditCandidate(candidate, { input, normalized, registry, rule, record, probe, delegationProbe, now = new Date() } = {}) {
  const vendor = registry.vendors.find(v => v.id === (rule?.vendor_id || normalized.vendor));
  const directDomains = rule?.allowed_domains?.length ? rule.allowed_domains : vendor?.domains || [];
  const delegated = (() => { try { return hostAllowed(new URL(candidate.url).hostname, rule?.delegated_domains || []); } catch { return false; } })();
  const base = urlFilter(candidate.url, delegated ? rule.delegated_domains : directDomains);
  const reasons = [...base.reasons];
  if (passiveProduct(input.product_name, registry.passive)) reasons.push('PASSIVE_PRODUCT');
  if (base.url) {
    const u = new URL(base.url);
    if (u.pathname === '/' && !(delegated && rule?.allow_delegated_root)) reasons.push('ROOT_ONLY');
    if ((rule?.forbid_url_regex || []).some(p => new RegExp(p, 'iu').test(base.url))) reasons.push('RULE_FORBIDDEN');
    if (rule?.url_patterns?.length && !delegated && !record && !rule.url_patterns.some(p => new RegExp(p, 'iu').test(base.url))) reasons.push('RULE_PAGE_PATTERN');
    if (!record && !rule?.allow_hub && /^\/(?:[a-z-]+\/)?(?:support|drivers?|downloads?)\/?$/i.test(u.pathname)) reasons.push('GENERIC_DOWNLOAD_CENTER');
  }
  if (delegated && (!delegationProbe || delegationProbe.status !== 200 || !hostAllowed(new URL(delegationProbe.url).hostname, directDomains) || !rule.delegated_evidence_url_patterns.some(p => new RegExp(p,'iu').test(delegationProbe.url)) || !delegationProbe.links?.includes(base.url) || !visibleModel(normalized.canonical_model, delegationProbe.text) || delegationProbe.browser_required)) reasons.push('DELEGATION_PROOF_REQUIRED');
  let verifiedAt = null;
  if (record) {
    if (!['active'].includes(record.status)) reasons.push('LIFECYCLE_' + record.status.toUpperCase().replace('-', '_'));
    const age = (now - new Date(record.verified_at)) / 86400000;
    if (!record.verified_at || !Number.isFinite(age) || age < 0 || age > (record.max_age_days || 180)) reasons.push('NEEDS_REFRESH');
    if (record.excluded_models.some(m => visibleModel(m, normalized.model))) reasons.push('EXPLICIT_EXCLUSION');
    verifiedAt = record.verified_at;
  } else if (!probe) reasons.push('EVIDENCE_UNAVAILABLE');
  else {
    if (!/^(text\/html|application\/xhtml\+xml|text\/plain)(?:;|$)/i.test(probe.content_type || '') || /attachment/i.test(probe.content_disposition || '')) reasons.push('NON_PAGE_RESPONSE');
    if (probe.status !== 200 || probe.browser_required) reasons.push(probe.browser_required ? 'BROWSER_REQUIRED' : 'PAGE_FETCH_FAILED');
    for (const url of [probe.url, ...(probe.redirects || [])]) {
      const filtered = urlFilter(url, delegated ? rule.delegated_domains : directDomains);
      reasons.push(...filtered.reasons.map(r => 'REDIRECT_' + r));
    }
    let decodedUrl = probe.url;
    try { decodedUrl = decodeURI(probe.url); } catch { reasons.push('INVALID_URL_ENCODING'); }
    if ([decodedUrl, probe.title].some(text => variantConflict(normalized.canonical_model, text).length)) reasons.push('WRONG_REVISION');
    if (!visibleModel(normalized.canonical_model, `${probe.title} ${probe.text}`)) reasons.push('EXACT_MODEL_UNVERIFIED');
    if (!/download|driver|software|firmware|launcher|utility|드라이버|다운로드/i.test(probe.text)) reasons.push('COMPATIBILITY_UNVERIFIED');
    if (/no longer supported|discontinued software|software is retired|end.of.life|단종.*소프트웨어/i.test(probe.text)) reasons.push('LIFECYCLE_NEEDS_REFRESH');
    verifiedAt = probe.verified_at;
  }
  return { verdict: reasons.length ? 'review' : 'pass', sanitized_url: base.url, final_url: probe?.url ? stripTracking(probe.url) : base.url, reason_codes: [...new Set(reasons)], verified_at: verifiedAt, locale: /ko-kr|\/kr\/|\/ko\/|\.co\.kr/i.test(base.url || '') ? 'ko' : 'global' };
}
