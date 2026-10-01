export const anyMatch = (patterns = [], text = '') => patterns.some(p => new RegExp(p, 'iu').test(text));
export const taggedBrand = name => /^\s*\[([^\]]+)\]/u.exec(name)?.[1]?.trim() || '';
export const fold = text => String(text).normalize('NFKC').toUpperCase().replace(/WI[- ]?FI/gu, 'WIFI').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
export const identityKey = text => String(text).normalize('NFKC').toUpperCase().replace(/WI[- ]?FI/gu, 'WIFI').trim().replace(/\s+/gu, ' ');
export function identifyVendor(name, registry) {
  const tag = taggedBrand(name);
  for (const marker of registry.markers || []) {
    if (anyMatch(marker.name_any, name) && (!marker.name_all || marker.name_all.every(p => anyMatch([p], name)))) {
      const v = registry.vendors.find(v => v.aliases.some(a => fold(a) === fold(marker.canonical_brand)));
      if (v) return v;
    }
  }
  const tagged = registry.vendors.find(v => [v.name, ...v.aliases].some(a => fold(a) === fold(tag)));
  if (tagged) return tagged;
  return registry.vendors.find(v => [v.name, ...v.aliases].some(a => a.length > 2 && fold(name).startsWith(fold(a) + ' '))) || null;
}
export function normalize(input, registry) {
  const vendor = identifyVendor(input.product_name, registry);
  let model = input.product_name.normalize('NFKC').replace(/^\s*\[[^\]]+\]\s*/u, '').trim();
  // No global colour/spec/bracket deletion. Only documented vendor-scoped tokens may disappear.
  for (const token of vendor?.noise_tokens || []) model = model.replace(new RegExp(`(^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'giu'), ' ');
  for (const alias of [vendor?.name, ...(vendor?.aliases || [])].filter(Boolean).sort((a, b) => b.length - a.length)) {
    if (model.toUpperCase().startsWith(alias.toUpperCase() + ' ')) { model = model.slice(alias.length).trim(); break; }
  }
  model = model.replace(/\s+/gu, ' ').trim();
  const aliases = (vendor?.model_aliases || []).filter(a => identityKey(a.from) === identityKey(model));
  const confirmed = aliases.find(a => a.status === 'confirmed');
  return { vendor: vendor?.id || null, model, canonical_model: confirmed?.to || model, alias_hints: aliases.filter(a => a.status === 'confirmed').map(a => a.to), revision: discriminators(model).revision || null, category: input.category || classify(model), discriminators: discriminators(model) };
}
export function discriminators(text) {
  const s = fold(text); const raw = String(text).toUpperCase(); const d = {};
  const first = re => re.exec(raw)?.[0]?.replace(/\s+/g, '');
  for (const [key, re] of Object.entries({ revision: /\b(?:V\d+|R\d+\.\d+|REV(?:ISION)?\.?\s*\d+(?:\.\d+)*|GEN\s*\d+|II|III)\b/i, memory: /\b(?:D[45]|DDR[45])\b/, wifi: /\bWI[- ]?FI(?:\s*[67]E?)?\b/, chipset: /\b[ABHWXZ]\d{3}[A-Z]?\b/, capacity: /\b\d+\s*(?:GB|TB)\b/, interface: /\b(?:SATA|PCIE|USB[- ]?C|BLUETOOTH|AX)\b/ })) { const v = first(re); if (v) d[key] = v.replace('WI-FI', 'WIFI'); }
  const suffix = [...s.matchAll(/\b(PRO|MAX|ULTRA|PLUS|TI|XT|XTX|SUPER|GRE|LCD|HE)\b/g)].map(m => m[1]);
  if (/\dHE\b/.test(raw)) suffix.push('HE');
  if (suffix.length) d.suffix = [...new Set(suffix)].sort().join('+');
  return d;
}
export function exactModel(a, b) { return identityKey(a) === identityKey(b); }
export function visibleModel(model, text) {
  const m = identityKey(model), t = identityKey(text);
  if (!m) return false;
  const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'u').test(t);
}
export function variantConflict(model, text) {
  const wanted = discriminators(model), seen = discriminators(text);
  return Object.keys(wanted).filter(k => seen[k] && seen[k] !== wanted[k]);
}
export function classify(text) {
  for (const [cat, re] of [['keyboard', /keyboard|키보드|키패드/i], ['mouse', /mouse|마우스/i], ['printer', /printer|프린터|복합기/i], ['gpu', /GeForce|Radeon|\bArc\b|그래픽/i], ['motherboard', /메인보드|\b[ABXZ]\d{3}/i], ['storage', /SSD|NVMe|HDD/i]]) if (re.test(text)) return cat;
  return 'unknown';
}
export function passiveProduct(name, rules) {
  const clean = name.replace(/\[[^\]]*\]/g, ' ').replace(/▶[^◀]*◀?/g, ' ').replace(/\([^)]*증정[^)]*\)/g, ' ');
  const head = clean.split(/[,，]/, 1)[0];
  const primary = /키보드|keyboard|마우스(?!\s?패드)|mouse(?!\s?pad)|프린터|메인보드|GeForce|Radeon|SSD|NVMe|도킹|캡처/i.test(head);
  const hard = new Set(['keycap','palmrest','switch-lube','mouse-feet','cable-gender','case-bracket','thermal-clean','consumable','bare-media','furniture-misc','passive-power']);
  for (const rule of rules.exclude || []) {
    if (!anyMatch(rule.patterns, clean)) continue;
    const inHead = anyMatch(rule.patterns, head);
    if (!inHead && primary) return null;
    const exception = (rules.exceptions || []).find(e => (!e.applies_to || e.applies_to.includes(rule.id)) && anyMatch(e.patterns, clean) && !(e.id === 'is-primary-device' && inHead && hard.has(rule.id)));
    if (!exception) return rule.id;
  }
  if (/\bkeycaps?\b|\bpalm\s?rest\b|\bmouse\s?feet\b/i.test(clean)) return 'passive-accessory';
  return null;
}
export function selectRule(input, normalized, registry) {
  const vendor = registry.vendors.find(v => v.id === normalized.vendor);
  const brand = vendor?.name || taggedBrand(input.product_name);
  return registry.vendors.flatMap(v => v.rules.map(r => ({ ...r, vendor_id: v.id }))).sort((a, b) => a.priority - b.priority).find(r => {
    const w = r.when;
    return (!w.brand_any || anyMatch(w.brand_any, brand)) && (!w.name_any || anyMatch(w.name_any, input.product_name)) && (!w.name_all || w.name_all.every(p => anyMatch([p], input.product_name))) && !anyMatch(w.name_none, input.product_name);
  }) || null;
}
