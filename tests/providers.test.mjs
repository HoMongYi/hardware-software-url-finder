import test from 'node:test';import assert from 'node:assert/strict';
import { fixtureRegistry,fixtureVendor,input } from './fixtures.mjs';
const candidates=Array.from({length:8},(_,i)=>({url:`https://example.com/support/${i}`,title:'ABC V9 Support',snippet:'ABC V9 driver'}));
test('Search and Judge contracts exist',async()=>{const p=await import('../src/providers.mjs').catch(()=>({}));assert.equal(typeof p.SerpApiSearchProvider,'function');assert.equal(typeof p.OpenAIJudgeProvider,'function');});
test('SerpAPI maps bounded organic results and sends no metadata',async()=>{
 const {SerpApiSearchProvider}=await import('../src/providers.mjs');const p=new SerpApiSearchProvider({apiKey:'synthetic-token',request:async(url)=>{const u=new URL(url);assert.equal(u.searchParams.get('num'),'20');return{organic_results:candidates.map(c=>({link:c.url,title:c.title,snippet:c.snippet}))};}});assert.equal((await p.search({query:'ABC V9',limit:100})).candidates.length,8);
});
test('OpenAI Responses uses env-selected model and strict structured output',async()=>{
 const {OpenAIJudgeProvider}=await import('../src/providers.mjs');const p=new OpenAIJudgeProvider({apiKey:'synthetic-token',model:'synthetic-model',request:async(_url,opts)=>{const b=JSON.parse(opts.body);assert.equal(b.model,'synthetic-model');assert.equal(b.store,false);assert.equal(b.text.format.strict,true);assert.equal(b.text.format.type,'json_schema');assert.match(b.instructions,/untrusted/);return{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({decision:'candidate',candidate_id:'1',reason_codes:[],uncertainties:[]})}]}]};}});assert.equal((await p.judge({product:{model:'ABC V9'},candidates:[{...candidates[0],id:'1'}]})).candidate_id,'1');
});
test('OpenAI never defaults a model or accepts refusal',async()=>{
 const {OpenAIJudgeProvider}=await import('../src/providers.mjs');await assert.rejects(new OpenAIJudgeProvider({apiKey:'synthetic-token',model:''}).judge({}),/MODEL_REQUIRED/);
 await assert.rejects(new OpenAIJudgeProvider({apiKey:'synthetic-token',model:'synthetic-model',request:async()=>({status:'completed',output:[{content:[{type:'refusal'}]}]})}).judge({candidates:[]}),/REFUSAL/);
});
test('Judge cannot invent candidate or return final URL',async()=>{
 const {MockJudgeProvider}=await import('../src/providers.mjs');await assert.rejects(new MockJudgeProvider({decision:'candidate',candidate_id:'evil',reason_codes:[],uncertainties:[]}).judge({candidates:[]}),/INVALID_JUDGE/);
});
test('SerpAPI -> scoring -> top five -> OpenAI Judge -> independent Core Audit',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {SerpApiSearchProvider,OpenAIJudgeProvider}=await import('../src/providers.mjs');let judgeCalls=0,pageCalls=0;
 const search=new SerpApiSearchProvider({apiKey:'synthetic-token',request:async()=>({organic_results:[...candidates.map(c=>({link:c.url,title:c.title,snippet:c.snippet})),{link:'https://amazon.com/support/abc-v9',title:'ABC V9 official',snippet:''}]})});
 const judge=new OpenAIJudgeProvider({apiKey:'synthetic-token',model:'synthetic-model',request:async(_u,o)=>{judgeCalls++;const b=JSON.parse(o.body);const req=JSON.parse(b.input);assert.equal(req.candidates.length,5);return{output:[{content:[{type:'output_text',text:JSON.stringify({decision:'candidate',candidate_id:req.candidates[0].id,reason_codes:[],uncertainties:[]})}]}]};}});
 const e=createEngine({registry:fixtureRegistry(),offline:false,search,judge,fetcher:async url=>{pageCalls++;return{url,status:200,headers:{'content-type':'text/html'},redirects:[],verified_at:'2026-10-01',text:'<title>ABC V9 Support</title><p>ABC V9 firmware downloads</p>'};}});
 assert.equal((await e.resolve(input('[Example] ABC V9'))).decision,'fill');assert.equal(judgeCalls,1);assert.equal(pageCalls,1);
});
test('Judge approval cannot override wrong page revision or WAF',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {MockSearchProvider,MockJudgeProvider}=await import('../src/providers.mjs');
 for(const html of ['<title>ABC V3 Support</title>ABC V3 driver','<title>Just a moment</title>ABC V9 driver']){
 const e=createEngine({registry:fixtureRegistry(),offline:false,search:new MockSearchProvider(candidates),judge:new MockJudgeProvider(r=>({decision:'candidate',candidate_id:r.candidates[0].id,reason_codes:[],uncertainties:[]})),fetcher:async url=>({url,status:200,headers:{'content-type':'text/html'},text:html,redirects:[],verified_at:'2026-10-01'})});assert.equal((await e.resolve(input('[Example] ABC V9'))).decision,'review');}
});
test('search failure or empty search is review, never blank',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {MockSearchProvider}=await import('../src/providers.mjs');
 for(const search of [{search:async()=>{throw Error('sensitive provider error');}},new MockSearchProvider([])])assert.equal((await createEngine({registry:fixtureRegistry(),offline:false,search}).resolve(input('[Example] ABC V9'))).decision,'review');
});
test('batch dedupes scoped colour variants and preserves each identity',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {MockSearchProvider}=await import('../src/providers.mjs');const search=new MockSearchProvider([{url:'https://example.com/support/abc-v9',title:'ABC V9 Support',snippet:''}]);
 const e=createEngine({registry:fixtureRegistry(),offline:false,search,fetcher:async url=>({url,status:200,headers:{'content-type':'text/html'},text:'<title>ABC V9 Support</title>ABC V9 driver',redirects:[],verified_at:'2026-10-01'})});
 const results=await e.batch([input('[Example] ABC V9 Black','a'),input('[Example] ABC V9 White','b')]);assert.equal(search.calls,1);assert.deepEqual(results.map(r=>r.input_id),['a','b']);assert.ok(results.every(r=>r.decision==='fill'));
});
test('offline never calls research',async()=>{
 const {createEngine}=await import('../src/index.mjs');const e=createEngine({registry:fixtureRegistry(),search:{search:()=>{assert.fail('offline network');}}});assert.equal((await e.resolve(input('[Example] ABC V9'))).decision,'review');
});
