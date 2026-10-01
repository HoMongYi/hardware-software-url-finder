#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { pathToFileURL } from 'node:url';
import { createEngine } from '../src/index.mjs';
import { parseCatalogCsv,resultsCsv } from '../src/csv.mjs';
import { pipelineProviders, GenericHttpSearchProvider, GenericHttpJudgeProvider, CommandJudgeProvider } from '../src/providers.mjs';
import { loadRegistry,validateRegistry,ROOT } from '../src/registry.mjs';
export function optionsFromConfig(config){
  if(config.audit&&Object.values(config.audit).some(v=>v===false))throw new Error('AUDIT_CANNOT_BE_DISABLED');
  const opts={topN:config.search?.candidate_limit_after_scoring??5};
  if(config.name==='serpapi-openai-judge')Object.assign(opts,pipelineProviders(config.name,{judgeEnabled:config.judge?.enabled!==false}));
  else{
    if(config.search?.provider==='generic-http')opts.search=new GenericHttpSearchProvider();
    if(config.judge?.provider==='generic-http')opts.judge=new GenericHttpJudgeProvider();
    if(config.judge?.provider==='command')opts.judge=new CommandJudgeProvider(config.judge.command);
  }
  if(config.scoring)opts.scoring=config.scoring;return opts;
}
export async function main(argv=process.argv.slice(2),{write=text=>process.stdout.write(text),engine:injected}={}){
  const args=[],flags={};
  for(let i=0;i<argv.length;i++){const a=argv[i];if(a.startsWith('--')){if(['--offline','--legacy','--help'].includes(a))flags[a.slice(2)]=true;else if(['--output','--pipeline','--config','--name','--port','--host','--private','--public-registry'].includes(a)){if(!argv[i+1]||argv[i+1].startsWith('--'))throw new Error('OPTION_VALUE_REQUIRED');flags[a.slice(2)]=argv[++i];}else throw new Error('UNKNOWN_OPTION');}else args.push(a);}
  if(flags.help||!args.length){write('HSUF 0.1.0\nresolve NAME|input.csv [--offline|--pipeline serpapi-openai-judge|--config pipeline.yaml] [--output result.csv] [--legacy]\naudit URL [--name PRODUCT]\nregistry validate|build\nserve [--port 8787] [--pipeline serpapi-openai-judge]\nmcp [--pipeline serpapi-openai-judge]\ndiscovery import file.json\n');return;}
  let providerOptions={};
  if(flags.config){const p=path.resolve(flags.config);if(fs.statSync(p).size>65536)throw new Error('CONFIG_TOO_LARGE');providerOptions=optionsFromConfig(YAML.parse(fs.readFileSync(p,'utf8')));}
  if(flags.pipeline)providerOptions={...providerOptions,...pipelineProviders(flags.pipeline)};
  const offline=flags.offline || !flags.pipeline&&!flags.config;
  const engine=injected||createEngine({...providerOptions,offline,privateDir:flags.private,publicDir:flags['public-registry']});
  const emit=value=>{const json=JSON.stringify(value,null,2)+'\n';if(flags.output){const destination=path.resolve(flags.output);if(fs.existsSync(destination))throw new Error('OUTPUT_EXISTS');fs.writeFileSync(destination,json);}else write(json);};
  if(args[0]==='resolve'){
    const name=args.slice(1).join(' ');if(!name)throw new Error('PRODUCT_REQUIRED');
    if(/\.csv$/i.test(name)){
      if(fs.statSync(name).size>4_194_304)throw new Error('CSV_TOO_LARGE');const rows=parseCatalogCsv(fs.readFileSync(name,'utf8'));const results=await engine.batch(rows,{offline});
      if(flags.output){if(fs.existsSync(flags.output))throw new Error('OUTPUT_EXISTS');fs.writeFileSync(flags.output,/\.csv$/i.test(flags.output)?resultsCsv(results,{legacy:flags.legacy}):JSON.stringify(results,null,2)+'\n');}else write(JSON.stringify(results,null,2)+'\n');
    }else emit(await engine.resolve({product_name:name},{offline}));return;
  }
  if(args[0]==='audit'){emit(engine.audit(args[1],{product_name:flags.name||'unknown'}));return;}
  if(args[0]==='registry'){
    const registry=loadRegistry({publicDir:flags['public-registry'],privateDir:flags.private});const report=validateRegistry(registry.vendors);if(!report.valid)throw new Error('INVALID_REGISTRY');
    if(args[1]==='build')fs.writeFileSync(path.join(ROOT,'data/public/registry.compiled.json'),JSON.stringify({version:'0.1.0',vendors:registry.vendors},null,2)+'\n');else if(args[1]!=='validate')throw new Error('UNKNOWN_REGISTRY_COMMAND');emit({...report,...engine.status()});return;
  }
  if(args[0]==='serve'){
    const {createHttpServer}=await import('../src/http.mjs');const host=flags.host||'127.0.0.1',port=Number(flags.port||8787);if(!Number.isInteger(port)||port<0||port>65535)throw new Error('INVALID_PORT');
    if(!['127.0.0.1','localhost','::1'].includes(host)&&!process.env.HSUF_HTTP_TOKEN)throw new Error('HTTP_TOKEN_REQUIRED');
    const server=createHttpServer(engine,{token:process.env.HSUF_HTTP_TOKEN,allowResearch:!offline});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,resolve);});process.stderr.write(`HSUF listening on ${host}:${server.address().port}\n`);return server;
  }
  if(args[0]==='mcp'){const{startMcp}=await import('../src/mcp.mjs');return startMcp(engine,{allowResearch:!offline});}
  if(args[0]==='discovery'&&args[1]==='import'){
    const file=args[2];if(fs.statSync(file).size>1_048_576)throw new Error('DISCOVERY_TOO_LARGE');
    const {importDiscovery}=await import('../src/discovery.mjs');emit(importDiscovery(fs.readFileSync(file,'utf8'),path.extname(file),engine));return;
  }
  throw new Error('UNKNOWN_COMMAND');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{process.stderr.write('HSUF_COMMAND_FAILED: check input, options, output path and provider environment configuration.\n');process.exitCode=2;});
