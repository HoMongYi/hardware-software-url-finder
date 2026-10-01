import { createCore } from './core.mjs';
import { research, resolveBatch } from './research.mjs';
export { normalize, discriminators, exactModel } from './identity.mjs';
export { loadRegistry, validateRegistry, registryStatus } from './registry.mjs';
export { auditCandidate, urlFilter } from './audit.mjs';
export function createEngine(options = {}) {
  const core = createCore(options);
  let active = 0;
  const pending = [];
  const concurrency = options.concurrency ?? 1;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error('INVALID_CONCURRENCY');
  async function limited(input, settings) {
    if (active >= concurrency) {
      if (pending.length >= 32) return core.result(input, core.inspect(input).normalized, 'review', ['RESEARCH_BUSY']);
      await new Promise(resolve => pending.push(resolve));
    } else active++;
    try { return await research(core, input, settings); }
    finally { const next = pending.shift(); if (next) next(); else active--; }
  }
  return { ...core,
    async resolve(input, request = {}) {
      const offline = request.offline ?? options.offline ?? true;
      const value = core.resolveRegistry(input);
      if (offline || value.decision !== 'review' || value.reason_codes.some(r => ['LIFECYCLE_RETIRED','LIFECYCLE_REPLACED','LIFECYCLE_DEPRECATED','EXPLICIT_EXCLUSION','MODEL_NOT_SUPPORTED'].includes(r))) return value;
      if (value.evidence.some(e => e.source === 'private-registry') && !options.allowPrivateResearch) return value;
      return limited(input, { ...options, ...request });
    },
    async batch(inputs, request = {}) { return resolveBatch(this, inputs, request); }
  };
}
