import test from 'node:test';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createEngine} from '../src/index.mjs';
import {MockSearchProvider,MockJudgeProvider,GenericHttpSearchProvider,GenericHttpJudgeProvider,CommandJudgeProvider,OpenAIJudgeProvider,SerpApiSearchProvider} from '../src/providers.mjs';
import {fixtureRegistry,input} from './fixtures.mjs';
const candidates=[{url:'https://example.com/support/1',title:'ABC V9 Support',snippet:'ABC V9 driver'},{url:'https://example.com/support/2',title:'ABC V9 Support',snippet:'ABC V9 driver'}];
const judgement={decision:'candidate',candidate_id:'1',reason_codes:[],uncertainties:[]};
const req={product:{vendor:'example',model:'ABC V9',category:'keyboard'},candidates:candidates.map((c,i)=>({...c,id:String(i+1)}))};
test('cross-provider wrapper conformance yields identical Core result',async()=>{
 const pairs=[
  [new MockSearchProvider(candidates),new MockJudgeProvider(judgement)],
  [new GenericHttpSearchProvider({endpoint:'https://example.com/search',request:async()=>({candidates})}),new GenericHttpJudgeProvider({endpoint:'https://example.com/judge',request:async()=>judgement})],
  [new SerpApiSearchProvider({apiKey:'synthetic-token',request:async()=>({organic_results:candidates.map(c=>({...c,link:c.url}))})}),new OpenAIJudgeProvider({apiKey:'synthetic-token',model:'synthetic-model',request:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(judgement)}]}]})})]
 ];const outcomes=[];
 for(const [search,judge]of pairs){const e=createEngine({registry:fixtureRegistry(),offline:false,search,judge,fetcher:async url=>({url,status:200,headers:{'content-type':'text/html'},redirects:[],text:'<title>ABC V9 Support</title>ABC V9 firmware downloads',verified_at:'2026-10-01'})});outcomes.push(await e.resolve(input('[Example] ABC V9')));}
 for(const out of outcomes)assert.deepEqual(out,outcomes[0]);
});
test('Command provider uses JSON stdin/stdout without shell and enforces contract',async()=>{
 const provider=new CommandJudgeProvider({command:process.execPath,args:[fileURLToPath(new URL('./fixtures/command-judge.mjs',import.meta.url))]});assert.deepEqual(await provider.judge(req),judgement);
});
test('Command timeout and output size limits enforced',async()=>{
 for(const args of [['-e','setInterval(()=>{},1000)'],['-e','process.stdout.write("X".repeat(10000))']]){
 const p=new CommandJudgeProvider({command:process.execPath,args,timeoutMs:100,maxBytes:100});await assert.rejects(p.judge(req),/COMMAND_/);}
});
