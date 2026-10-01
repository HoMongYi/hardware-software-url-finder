import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVendor } from './contracts.mjs';
import { identityKey as fold } from './identity.mjs';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export function validateRegistry(vendors, { privateOverlay = false } = {}) {
  const errors = [], ids = new Set(), rules = new Set(), records = new Set(), exact = new Map(), aliases = new Map();
  for (const v of vendors) {
    if (!validateVendor(v)) { errors.push(`SCHEMA:${v.id || 'unknown'}`); continue; }
    if (ids.has(v.id)) errors.push(`DUPLICATE_VENDOR:${v.id}`); ids.add(v.id);
    if (!privateOverlay && v.classification === 'UNKNOWN') errors.push(`UNKNOWN_PUBLIC_SOURCE:${v.id}`);
    for (const a of v.model_aliases) { const key = `${v.id}:${fold(a.from)}`; if (aliases.has(key) && aliases.get(key) !== fold(a.to)) errors.push(`ALIAS_CONFLICT:${v.id}`); aliases.set(key, fold(a.to)); }
    for (const record of [...v.models, ...v.ecosystems]) {
      if (records.has(record.id)) errors.push(`DUPLICATE_RECORD:${record.id}`); records.add(record.id);
      try { const u = new URL(record.canonical_page); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || !v.domains.some(d => u.hostname === d || u.hostname.endsWith('.' + d))) errors.push(`RECORD_DOMAIN:${record.id}`); } catch { errors.push(`RECORD_URL:${record.id}`); }
      if (record.status === 'active' && (!record.verified_at || !record.provenance.length)) errors.push(`UNVERIFIED_ACTIVE:${record.id}`);
      if (record.verified_at && (!/^\d{4}-\d{2}-\d{2}$/.test(record.verified_at) || !Number.isFinite(Date.parse(record.verified_at)))) errors.push(`INVALID_DATE:${record.id}`);
      if (record.model) { const key = `${v.id}:${fold(record.model)}`; if (exact.has(key) && exact.get(key) !== record.canonical_page) errors.push(`EXACT_CONFLICT:${record.id}`); exact.set(key, record.canonical_page); }
    }
    for (const r of v.rules) {
      if (rules.has(r.id)) errors.push(`DUPLICATE_RULE:${r.id}`); rules.add(r.id);
      if (!Object.keys(r.when).length) errors.push(`EMPTY_RULE:${r.id}`);
      for (const p of [...Object.values(r.when).flat(), ...(r.url_patterns || []), ...(r.forbid_url_regex || []), ...(r.delegated_evidence_url_patterns || [])]) { try { new RegExp(p, 'iu'); } catch { errors.push(`INVALID_REGEX:${r.id}`); } }
      if ((r.allowed_domains || []).some(d => !v.domains.includes(d))) errors.push(`RULE_DOMAIN:${r.id}`);
      if (r.delegated_domains?.length && !r.delegated_evidence_url_patterns?.length) errors.push(`UNGUARDED_DELEGATION:${r.id}`);
      if (r.ecosystem_id && !v.ecosystems.some(e => e.id === r.ecosystem_id)) errors.push(`UNKNOWN_ECOSYSTEM:${r.id}`);
    }
  }
  for (const v of vendors) for (const r of [...v.models, ...v.ecosystems]) if (r.successor && !records.has(r.successor)) errors.push(`UNKNOWN_SUCCESSOR:${r.id}`);
  return { valid: !errors.length, errors };
}
function loadDirectory(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort().map(n => readJson(path.join(dir, n))) : [];
}
export function loadRegistry({ publicDir = path.join(ROOT, 'data/public/vendors'), privateDir } = {}) {
  const vendors = loadDirectory(publicDir); const checked = validateRegistry(vendors);
  if (!checked.valid) throw new Error('INVALID_PUBLIC_REGISTRY:' + checked.errors.join(','));
  const privateVendors = privateDir ? loadDirectory(privateDir) : [];
  const privateCheck = validateRegistry(privateVendors, { privateOverlay: true });
  if (!privateCheck.valid) throw new Error('INVALID_PRIVATE_REGISTRY');
  return { vendors, privateVendors, markers: readJson(path.join(ROOT, 'data/public/brand-markers.json')).markers, passive: readJson(path.join(ROOT, 'data/public/passive-rules.json')) };
}
export function registryStatus(registry) {
  const vendors = registry.vendors;
  const records = vendors.flatMap(v => [...v.models, ...v.ecosystems]);
  return { version: '0.1.0', vendors: vendors.length, domains: new Set(vendors.flatMap(v => v.domains)).size, models: vendors.reduce((n,v) => n+v.models.length,0), aliases: vendors.reduce((n,v) => n+v.model_aliases.length,0), rules: vendors.reduce((n,v) => n+v.rules.length,0), ecosystems: vendors.reduce((n,v) => n+v.ecosystems.length,0), needs_refresh: records.filter(r => r.status === 'needs-refresh').length, private_overlay_enabled: !!registry.privateVendors?.length };
}
