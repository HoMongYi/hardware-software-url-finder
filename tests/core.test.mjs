import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureRegistry, fixtureVendor, input, page } from './fixtures.mjs';

test('public engine exists and uses generic identity', async () => {
  const { createEngine } = await import('../src/index.mjs').catch(() => ({}));
  assert.equal(typeof createEngine, 'function', 'Core Engine has not been implemented');
  const engine = createEngine();
  const out = await engine.resolve({ input_id: 'synthetic-1', product_name: 'Keyboard keycap set' });
  assert.equal(out.input_id, 'synthetic-1');
  assert.equal(out.decision, 'blank');
  assert.equal(out.primary, null);
});

for (const token of ['V2','V3','II','Gen2','Rev 2.0','D4','D5','WiFi 6','WiFi 7','AX','Pro','Max','Ultra','Plus']) test(`identity retains ${token}`, async () => {
  const { createEngine } = await import('../src/index.mjs');
  const engine = createEngine({registry:fixtureRegistry()});
  assert.match(engine.inspect(input('[Example] ABC '+token)).normalized.model,new RegExp(token,'i'));
});
test('exact registry fill has source verification date, generic input and no providers',async()=>{
  const { createEngine }=await import('../src/index.mjs');let calls=0;
  const e=createEngine({registry:fixtureRegistry(),now:'2026-10-01',search:{search(){calls++;throw Error();}}});
  const r=await e.resolve(input(),{offline:false});assert.equal(r.decision,'fill');assert.equal(r.verified_at,'2026-10-01');assert.equal(calls,0);
});
for (const status of ['deprecated','retired','replaced','needs-refresh']) test(`lifecycle ${status} cannot fill`,async()=>{
  const { createEngine }=await import('../src/index.mjs');const v=fixtureVendor();v.models[0].status=status;
  assert.equal((await createEngine({registry:fixtureRegistry(v)}).resolve(input())).decision,'review');
});
test('stale verification needs refresh',async()=>{
  const { createEngine }=await import('../src/index.mjs');const v=fixtureVendor();v.models[0].verified_at='2020-01-01';
  assert.ok((await createEngine({registry:fixtureRegistry(v)}).resolve(input())).reason_codes.includes('NEEDS_REFRESH'));
});
for (const variant of ['ABC','ABC V3','ABC V2 D4','ABC V2 WiFi 7','ABC V2 Pro']) test(`exact lookup protects ${variant}`,async()=>{
 const { createEngine }=await import('../src/index.mjs');assert.equal((await createEngine({registry:fixtureRegistry()}).resolve(input('[Example] '+variant))).decision,'review');
});
test('confirmed alias is vendor scoped',async()=>{
 const { createEngine }=await import('../src/index.mjs');const e=createEngine({registry:fixtureRegistry(),now:'2026-10-01'});
 assert.equal((await e.resolve(input('[Example] LOCAL V2'))).decision,'fill');assert.equal((await e.resolve(input('[Other] LOCAL V2'))).decision,'review');
});
test('unverified alias never collapses model identity',async()=>{
 const { createEngine }=await import('../src/index.mjs');const v=fixtureVendor();v.model_aliases[0].status='needs-refresh';
 assert.equal((await createEngine({registry:fixtureRegistry(v)}).resolve(input('[Example] LOCAL V2'))).decision,'review');
});
test('Core ignores fabricated provider confidence and requires independent page evidence',async()=>{
 const { createEngine }=await import('../src/index.mjs');const e=createEngine({registry:fixtureRegistry()});
 assert.equal(e.finalize(input(),'oops').decision,'review');
});
test('Core audit passes exact fetched evidence and blocks wrong revision',async()=>{
 const { createEngine }=await import('../src/index.mjs');const e=createEngine({registry:fixtureRegistry()});const c={id:'1',url:'https://example.com/support/abc-v2'};
 assert.equal(e.finalize(input(),c,page()).decision,'fill');assert.equal(e.finalize(input(),c,page('ABC V3')).decision,'review');
});
test('schema rejects company-only product_no and empty name',async()=>{
 const { createEngine }=await import('../src/index.mjs');const e=createEngine({registry:fixtureRegistry()});
 await assert.rejects(e.resolve({product_no:'synthetic',product_name:'ABC'}),/INVALID_INPUT/);await assert.rejects(e.resolve({product_name:' '}),/INVALID_INPUT/);
});
