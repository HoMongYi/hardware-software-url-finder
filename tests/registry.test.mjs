import test from 'node:test';import assert from 'node:assert/strict';
import { fixtureVendor,fixtureRegistry,input } from './fixtures.mjs';
import { validateRegistry,loadRegistry } from '../src/registry.mjs';
import {createEngine} from '../src/index.mjs';
test('public registry schema/conflict validation passes',()=>assert.equal(validateRegistry(loadRegistry().vendors).valid,true));
test('duplicate vendor rejected',()=>assert.equal(validateRegistry([fixtureVendor(),fixtureVendor()]).valid,false));
test('conflicting model URLs rejected',()=>{const v=fixtureVendor();v.models.push({...v.models[0],id:'conflict',canonical_page:'https://example.com/support/other'});assert.ok(validateRegistry([v]).errors.some(r=>r.startsWith('EXACT_CONFLICT')));});
test('conflicting scoped aliases rejected',()=>{const v=fixtureVendor();v.model_aliases.push({...v.model_aliases[0],to:'ABC V3'});assert.ok(validateRegistry([v]).errors.some(r=>r.startsWith('ALIAS_CONFLICT')));});
test('invalid active date and UNKNOWN provenance rejected',()=>{const v=fixtureVendor();v.models[0].verified_at=null;v.classification='UNKNOWN';const c=validateRegistry([v]);assert.ok(c.errors.some(x=>x.startsWith('UNVERIFIED_ACTIVE')));assert.ok(c.errors.some(x=>x.startsWith('UNKNOWN_PUBLIC')));});
test('private exact overrides public exact and stays out of public lookup/status',async()=>{
 const registry=fixtureRegistry();const privateV=fixtureVendor();privateV.models[0].canonical_page='https://example.com/support/private-exact';registry.privateVendors=[privateV];
 const e=createEngine({registry,now:'2026-10-01'});const result=await e.resolve(input());assert.equal(result.primary.url,'https://example.com/support/private-exact');assert.equal(result.reason_codes[0],'PRIVATE_EXACT');assert.equal(e.status().models,1);
});
test('no private overlay is required',async()=>assert.equal((await createEngine().resolve({product_name:'Synthetic keycaps'})).decision,'blank'));
test('ecosystem uses explicit support list and exclusions',async()=>{
 const v=fixtureVendor();v.models=[];v.ecosystems=[{id:'example-control',canonical_page:'https://example.com/software',status:'active',verified_at:'2026-10-01',provenance:['https://example.com/software'],support_mode:'explicit-model-list',supported_models:['ABC V2'],excluded_models:['ABC V2']}];
 const e=createEngine({registry:fixtureRegistry(v),now:'2026-10-01'});assert.equal((await e.resolve(input())).decision,'review');assert.equal((await e.resolve(input('[Example] ABC V3'))).decision,'review');
});
test('source vendor domains cannot grant unrelated registrable domain',()=>{const v=fixtureVendor();v.models[0].canonical_page='https://evil.com/support/abc-v2';assert.equal(validateRegistry([v]).valid,false);});
