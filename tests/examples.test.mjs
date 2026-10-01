import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import os from'node:os';import path from'node:path';
import{main,optionsFromConfig}from'../bin/hsuf.mjs';import{ROOT}from'../src/registry.mjs';import YAML from'yaml';
import{createEngine}from'../src/index.mjs';import{fixtureRegistry,input}from'./fixtures.mjs';
import{openAITool,claudeTool,handleOpenAI,handleClaude,createAgentToolBridge}from'../examples/agent-api-bridge.mjs';
import{runCatalogAdapter}from'../examples/integration-adapter.mjs';
import{validateRegistry}from'../src/registry.mjs';
test('README CLI single, offline CSV, legacy CSV, audit, registry and discovery commands execute',async()=>{
 let stdout='';const invoke=async argv=>{stdout='';await main(argv,{write:t=>stdout+=t});return JSON.parse(stdout);};
 const result=await invoke(['resolve','[Canon] PIXMA E3470','--offline']);assert.equal(result.decision,'fill');
 const rows=await invoke(['resolve',path.join(ROOT,'examples/generic-catalog.csv'),'--offline']);assert.deepEqual(rows.map(r=>r.decision),['fill','fill','blank','review']);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hsuf-doc-example-'));const output=path.join(dir,'result.csv');
 await main(['resolve',path.join(ROOT,'examples/generic-catalog.csv'),'--offline','--output',output,'--legacy']);assert.match(fs.readFileSync(output,'utf8'),/^input_id,product_name,url/);
 await assert.rejects(main(['resolve',path.join(ROOT,'examples/generic-catalog.csv'),'--output',output]),/OUTPUT_EXISTS/);
 assert.equal((await invoke(['audit','https://amazon.com/driver','--name','[Canon] PIXMA E3470'])).verdict,'review');assert.equal((await invoke(['registry','validate'])).valid,true);
 const discovery=await invoke(['discovery','import',path.join(ROOT,'examples/discovery.json')]);assert.equal(discovery[0].final_url,null);assert.equal(discovery[0].policy,'discovery-only');
});
test('documented organisation adapter and vendor template run without company schema',async()=>{
 const vendor=JSON.parse(fs.readFileSync(path.join(ROOT,'examples/vendor.example.json'),'utf8'));assert.equal(validateRegistry([vendor]).valid,true);
 const accepted=[];const results=await runCatalogAdapter({readCatalog:async()=>[{input_id:'synthetic-1',product_name:'[Canon] PIXMA E3470',category:'printer'}],acceptResult:async r=>accepted.push(r)});assert.equal(results.length,1);assert.equal(accepted[0].decision,'fill');
});
test('documented pipeline YAML is executable config with overridable top-five',()=>{
 for(const file of['serpapi-openai-judge.example.yaml','generic-http.example.yaml','command-judge.example.yaml']){const c=YAML.parse(fs.readFileSync(path.join(ROOT,'examples',file),'utf8'));const o=optionsFromConfig(c);assert.ok(o.search);assert.equal(o.topN,5);assert.ok(o.judge);}
 assert.throws(()=>optionsFromConfig({audit:{final_core_audit_required:false}}),/CANNOT_BE_DISABLED/);
});
test('OpenAI API and Claude API host tool bridges execute same Core contract',async()=>{
 const execute=createAgentToolBridge(createEngine({registry:fixtureRegistry(),now:'2026-10-01'}));
 assert.equal(openAITool.name,claudeTool.name);const o=await handleOpenAI({name:openAITool.name,call_id:'synthetic-call',arguments:JSON.stringify(input())},execute);const c=await handleClaude({name:claudeTool.name,id:'synthetic-call',input:input()},execute);
 assert.equal(JSON.parse(o.output).decision,'fill');assert.deepEqual(JSON.parse(o.output),JSON.parse(c.content));
});
