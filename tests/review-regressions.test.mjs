import test from'node:test';import assert from'node:assert/strict';import{createEngine}from'../src/index.mjs';
import{fixtureRegistry,fixtureVendor,input,page}from'./fixtures.mjs';import{MockSearchProvider}from'../src/providers.mjs';import{safeRequest,pageEvidence}from'../src/network.mjs';
test('URL model and support text cannot substitute for empty fetched body',()=>{const e=createEngine({registry:fixtureRegistry()});const proof={...page(),title:'',text:''};assert.equal(e.finalize(input(),{url:proof.url},proof).decision,'review');});
test('extensionless attachment and binary MIME are rejected',()=>{const e=createEngine({registry:fixtureRegistry()});for(const headers of[{'content-type':'application/octet-stream'},{'content-type':'text/html','content-disposition':'attachment; filename=driver.exe'}]){const proof=pageEvidence({status:200,url:'https://example.com/support/abc-v2',text:'<title>ABC V2</title>ABC V2 driver',headers,redirects:[],verified_at:'2026-10-01'});assert.equal(e.finalize(input(),{url:proof.url},proof).decision,'review');}});
test('slash and hyphen distinct models never exact-match',async()=>{const v=fixtureVendor();v.models[0].model='ABC/X V2';const e=createEngine({registry:fixtureRegistry(v),now:'2026-10-01'});assert.equal((await e.resolve(input('[Example] ABC-X V2'))).decision,'review');});
test('HTTP canonical record cannot fill',async()=>{const v=fixtureVendor();v.models[0].canonical_page='http://example.com/support/abc-v2';const e=createEngine({registry:fixtureRegistry(v),now:'2026-10-01'});assert.equal((await e.resolve(input())).decision,'review');});
test('unconfirmed aliases never enter outbound search query or results',async()=>{const v=fixtureVendor();v.model_aliases[0].status='needs-refresh';let query;const e=createEngine({registry:fixtureRegistry(v),offline:false,search:{search:async r=>{query=r.query;return{candidates:[]};}}});const out=await e.resolve(input('[Example] LOCAL V2'));assert.deepEqual(out.normalized.alias_hints,[]);assert.ok(!query.includes('ABC V2'));});
test('all custom credentials rejected on cross-origin redirects',async()=>{let calls=0;await assert.rejects(safeRequest('https://example.com/',{headers:{'X-API-Key':'synthetic-token'},resolver:async()=>[{address:'8.8.8.8',family:4}],transport:async()=>{calls++;return{status:302,headers:{location:'https://other.com/'},text:''};}}),/CREDENTIAL_REDIRECT/);assert.equal(calls,1);});
test('shared engine serializes concurrent research provider calls',async()=>{let active=0,max=0;const e=createEngine({registry:fixtureRegistry(),offline:false,search:{search:async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));active--;return{candidates:[]};}}});await Promise.all(Array.from({length:5},(_,i)=>e.resolve(input('[Example] ABC V'+(i+9)))));assert.equal(max,1);});
test('batch punctuation identities make separate searches',async()=>{const search=new MockSearchProvider([]);const e=createEngine({registry:fixtureRegistry(),offline:false,search});await e.batch([input('[Example] ABC/X V9','a'),input('[Example] ABC-X V9','b')]);assert.equal(search.calls,2);});
test('public needs-refresh can research but stale private overlay never leaks to providers',async()=>{
 const v=fixtureVendor();v.models[0].status='needs-refresh';let calls=0;const registry=fixtureRegistry(v);const search={search:async()=>{calls++;return{candidates:[]};}};
 await createEngine({registry,offline:false,search}).resolve(input());assert.equal(calls,1);
 registry.privateVendors=[v];await createEngine({registry,offline:false,search}).resolve(input());assert.equal(calls,1);
});
test('private early family-rule review never triggers unapproved research',async()=>{
 const registry=fixtureRegistry();const v=fixtureVendor();v.models[0].support_mode='family-rule';v.models[0].rule_id='unmatched';registry.privateVendors=[v];let calls=0;
 const r=await createEngine({registry,offline:false,search:{search:async()=>{calls++;return{candidates:[]};}}}).resolve(input());assert.equal(r.decision,'review');assert.equal(calls,0);
});
test('hidden HTML model and download wording are not page evidence',()=>{
 const e=createEngine({registry:fixtureRegistry()});for(const attr of ['hidden','style="display:none"','style="visibility: hidden"','aria-hidden="true"']){
 const p=pageEvidence({url:'https://example.com/support/generic',status:200,headers:{'content-type':'text/html'},redirects:[],verified_at:'2026-10-01',text:`<title>Generic Support</title><div ${attr}><p>ABC V2 driver downloads</p><a href="https://webdriver.example.net/">ABC V2 firmware</a></div><p>Contact us</p>`});
 assert.equal(e.finalize(input(),{url:p.url},p).decision,'review');assert.ok(!p.links.includes('https://webdriver.example.net/'));
 }
});
test('malformed encoded redirect yields review rather than crashing resolution',()=>{
 const e=createEngine({registry:fixtureRegistry()});const proof={...page(),url:'https://example.com/support/%C0',redirects:['https://example.com/support/%C0']};assert.equal(e.finalize(input(),{url:'https://example.com/support/abc-v2'},proof).decision,'review');
});
