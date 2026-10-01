// Explicit opt-in. Credentials come only from this process's environment.
import test from 'node:test';import assert from 'node:assert/strict';
import {createEngine,loadRegistry} from '../src/index.mjs';import {pipelineProviders,SerpApiSearchProvider,OpenAIJudgeProvider} from '../src/providers.mjs';
const enabled=process.env.HSUF_RUN_PAID_TESTS==='1'&&process.env.SERPAPI_API_KEY&&process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL;
test('optional paid SerpAPI live contract',{skip:!enabled},async()=>{
 const r=await new SerpApiSearchProvider().search({query:'Canon PIXMA E3470 driver site:asia.canon',limit:5});assert.ok(Array.isArray(r.candidates));
});
test('optional paid OpenAI structured Judge contract',{skip:!enabled},async()=>{
 const r=await new OpenAIJudgeProvider().judge({product:{vendor:'canon',model:'PIXMA E3470',category:'printer'},candidates:[{id:'1',url:'https://asia.canon/en/support/PIXMA%20E3470/model',title:'PIXMA E3470 Support',snippet:'Official support and drivers',score:80,signals:{}}]});assert.ok(['candidate','review'].includes(r.decision));
});
test('optional paid full unresolved research pipeline',{skip:!enabled},async()=>{
 const registry=loadRegistry();registry.vendors.find(v=>v.id==='canon').models=[];
 const engine=createEngine({registry,offline:false,...pipelineProviders('serpapi-openai-judge')});const r=await engine.resolve({product_name:'[Canon] PIXMA E3470'});assert.ok(['fill','review'].includes(r.decision));
});
