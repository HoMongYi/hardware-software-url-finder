import { checkInput, validateResult } from './contracts.mjs';
import { loadRegistry, registryStatus } from './registry.mjs';
import { normalize, passiveProduct, exactModel, selectRule, visibleModel } from './identity.mjs';
import { auditCandidate } from './audit.mjs';

export function createCore(options = {}) {
  const registry = options.registry || loadRegistry(options);
  const now = () => options.now ? new Date(options.now) : new Date();
  function result(input, normalized, decision, reason_codes, primary = null, evidence = [], verified_at = null) {
    const value = { input_id: input.input_id ?? null, original_name: input.product_name, normalized, decision, primary, secondary: [], reason_codes, evidence, verified_at };
    if (!validateResult(value)) throw new Error('INVALID_CORE_RESULT'); return value;
  }
  function inspect(input) {
    checkInput(input); const normalized = normalize(input, registry); const rule = selectRule(input, normalized, registry);
    // Cross-vendor ecosystems (GPU drivers) belong to their software provider, not AIB.
    const vendor = registry.vendors.find(v => v.id === (rule?.vendor_id || normalized.vendor));
    return { input, normalized, rule, vendor };
  }
  function resolveRegistry(input) {
    const state = inspect(input); const { normalized, rule, vendor } = state;
    const passive = passiveProduct(input.product_name, registry.passive);
    if (passive) return result(input, normalized, 'blank', ['PASSIVE_ACCESSORY', passive]);
    const privateVendor = registry.privateVendors?.find(v => v.id === normalized.vendor);
    const privateExact = privateVendor?.models.find(m => exactModel(m.model, normalized.canonical_model));
    const publicExact = vendor?.models.find(m => exactModel(m.model, normalized.canonical_model));
    const ecosystem = rule?.ecosystem_id ? vendor?.ecosystems.find(e => e.id === rule.ecosystem_id) : vendor?.ecosystems.find(e => e.supported_models.some(m => exactModel(m, normalized.canonical_model)));
    const record = privateExact || publicExact || ecosystem;
    const privateEvidence = privateExact ? [{ source: 'private-registry', record_id: 'private-exact' }] : [];
    if (!record) return result(input, normalized, 'review', [normalized.vendor || rule ? 'REGISTRY_MISS' : 'UNKNOWN_VENDOR']);
    if (record.support_mode === 'explicit-model-list' && !record.supported_models.some(m => exactModel(m, normalized.canonical_model))) return result(input, normalized, 'review', ['MODEL_NOT_SUPPORTED'], null, privateEvidence);
    if (record.support_mode === 'family-rule' && record.rule_id !== rule?.id) return result(input, normalized, 'review', ['FAMILY_RULE_REQUIRED'], null, privateEvidence);
    if (record.excluded_models.some(m => visibleModel(m, normalized.model))) return result(input, normalized, 'review', ['EXPLICIT_EXCLUSION'], null, privateEvidence);
    const auditRegistry = privateExact ? { ...registry, vendors: registry.vendors.map(v => v.id === privateVendor.id ? { ...v, domains: [...new Set([...v.domains,...privateVendor.domains])] } : v) } : registry;
    const audit = auditCandidate({ url: record.canonical_page }, { ...state, registry: auditRegistry, record, now: now() });
    const evidence = [{ source: privateExact ? 'private-registry' : 'public-registry', record_id: privateExact ? 'private-exact' : record.id, lifecycle: record.status }];
    if (audit.verdict !== 'pass') return result(input, normalized, 'review', audit.reason_codes, null, evidence, record.verified_at);
    return result(input, normalized, 'fill', [privateExact ? 'PRIVATE_EXACT' : publicExact ? 'PUBLIC_EXACT' : 'PUBLIC_ECOSYSTEM'], { url: audit.final_url, software_kind: record.software_kind || 'support' }, evidence, record.verified_at);
  }
  return { registry, inspect, resolveRegistry, result,
    audit(url, input = { product_name: 'unknown' }) { const state = inspect(input); return auditCandidate({ url }, { ...state, registry, now: now() }); },
    finalize(input, candidate, probe, delegationProbe) { const state = inspect(input); const audit = auditCandidate(candidate, { ...state, registry, probe, delegationProbe, now: now() }); return result(input, state.normalized, audit.verdict === 'pass' ? 'fill' : 'review', audit.verdict === 'pass' ? ['CORE_AUDIT_PASSED'] : audit.reason_codes, audit.verdict === 'pass' ? { url: audit.final_url, software_kind: 'support' } : null, [{ source: 'core-page-audit', candidate_id: candidate.id, verdict: audit.verdict }], audit.verified_at); },
    status() { return registryStatus(registry); }
  };
}
