import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {ROOT} from './registry.mjs';
const ROOT_FILES=['package.json','package-lock.json','README.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','LICENSE','LICENSE-DECISION.md','AGENTS.md','.gitignore','.env.example'];
const ROOT_DIRS=['src','bin','data/public','schemas','config','skills','examples','docs','tests','scripts','.github'];
const REPORTS=['reports/migration.json','reports/legacy-comparison.json','reports/public-source-refresh.json','reports/verification.json','reports/FINAL_REPORT.md','reports/RELEASE_NOTES_v0.1.0.md'];
export function filesUnder(dir,base=dir){
 if(!fs.existsSync(dir))return[];return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{const p=path.join(dir,e.name);if(e.isSymbolicLink())throw new Error('PACKAGE_SYMLINK');return e.isDirectory()?filesUnder(p,base):[path.relative(base,p).replaceAll('\\','/')];});
}
export function publicFiles(root=ROOT){return[...ROOT_FILES.filter(n=>fs.existsSync(path.join(root,n))),...ROOT_DIRS.flatMap(d=>filesUnder(path.join(root,d)).map(n=>d+'/'+n)),...REPORTS.filter(n=>fs.existsSync(path.join(root,n)))].sort();}
export function scanPublic(root=ROOT){
 const findings=[];const files=publicFiles(root);
 for(const rel of files){
  if(/(^|\/)(private|exports|\.cache|node_modules|\.git)(\/|$)|\.env(\.|$)/.test(rel)&&rel!=='.env.example')findings.push({file:rel,code:'DISALLOWED_PATH'});
  const text=fs.readFileSync(path.join(root,rel),'utf8');
  for(const[code,re]of Object.entries({PRIVATE_KEY:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,TOKEN_LITERAL:/\b(?:sk-[a-zA-Z0-9_-]{20,}|gh[pousr]_[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})\b/,CREDENTIAL_ASSIGNMENT:/(?:api_key|apikey|password|access_token)\s*[:=]\s*["'][A-Za-z0-9_-]{24,}["']/i,INTERNAL_HOST:/https?:\/\/(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.169\.254|[^/\s]+\.(?:internal|corp))(?:[/:\s]|$)/i})){
    // Documented synthetic SSRF vectors are permitted only in tests and SECURITY examples.
    if(code==='INTERNAL_HOST'&&(rel.startsWith('tests/')||rel==='SECURITY.md'))continue;
    if(re.test(text))findings.push({file:rel,code});
  }
 }
 // Registry must never contain private catalogue provenance fields.
 for(const rel of files.filter(r=>r.startsWith('data/public/')&&r.endsWith('.json'))){const text=fs.readFileSync(path.join(root,rel),'utf8');if(/"(?:product_no|source_product_no|example_product_no|customer_name|employee_name)"\s*:/.test(text))findings.push({file:rel,code:'CATALOGUE_FIELD'});}
 return{status:findings.length?'Failed':'Passed',files:files.length,findings};
}
export function validatePlugin(pluginDir){
 const schema=JSON.parse(fs.readFileSync(path.join(ROOT,'schemas/plugin-manifest.schema.json'),'utf8'));const ajv=new Ajv2020({strict:false,validateFormats:false});const check=ajv.compile(schema);const manifest=JSON.parse(fs.readFileSync(path.join(pluginDir,'plugin.json'),'utf8'));
 if(!check(manifest))throw new Error('INVALID_PORTABLE_PLUGIN_MANIFEST');
 const mcp=JSON.parse(fs.readFileSync(path.join(pluginDir,'mcp.json'),'utf8'));const mcpSchema=JSON.parse(fs.readFileSync(path.join(ROOT,'schemas/plugin-mcp.schema.json'),'utf8'));const mcpCheck=ajv.compile(mcpSchema);if(!mcpCheck(mcp))throw new Error('INVALID_PORTABLE_PLUGIN_MCP');const server=mcp.mcpServers?.hsuf;
 if(!server||server.command!=='node'||!Array.isArray(server.args)||server.args[1]!=='mcp')throw new Error('INVALID_PLUGIN_MCP');
 const runtimeEntry=server.args[0].replace('${PLUGIN_ROOT}/','');if(!fs.existsSync(path.join(pluginDir,runtimeEntry)))throw new Error('PLUGIN_RUNTIME_MISSING');
 const canonical=fs.readFileSync(path.join(ROOT,'skills/hardware-software-url-finder/SKILL.md'));const packaged=fs.readFileSync(path.join(pluginDir,'skills/hardware-software-url-finder/SKILL.md'));
 if(!canonical.equals(packaged))throw new Error('PLUGIN_SKILL_DRIFT');
 return{status:'Passed',manifest_schema:schema.$id,canonical_skill_sha256:crypto.createHash('sha256').update(canonical).digest('hex'),runtime_entry:runtimeEntry};
}
// Deterministic standard ZIP (stored entries), avoiding a native archiver or opaque shell command.
const CRC_TABLE=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=CRC_TABLE[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
export function writeZip(destination,entries){
 const local=[],central=[];let offset=0;
 for(const entry of entries){if(entry.name.startsWith('/')||entry.name.split('/').includes('..')||entry.name.includes('\\'))throw new Error('UNSAFE_ZIP_PATH');const name=Buffer.from(entry.name),data=entry.data,crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(0x21,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);local.push(h,name,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(0x21,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=h.length+name.length+data.length;
 }
 const size=central.reduce((n,b)=>n+b.length,0);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16);fs.writeFileSync(destination,Buffer.concat([...local,...central,end]));
}
export function buildRelease(root=ROOT){
 const metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 const license=fs.readFileSync(path.join(root,'LICENSE'));
 if(metadata.license!=='MIT'||metadata.private===true||!license.toString().includes('MIT License'))throw new Error('PUBLIC_LICENSE_REQUIRED');
 const scan=scanPublic(root);if(scan.status!=='Passed')throw new Error('PUBLIC_SCAN_FAILED');
 const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});const plugin=path.join(dist,'hsuf-codex-plugin-v0.1.0');fs.mkdirSync(plugin,{recursive:true});
 const runtime=path.join(plugin,'runtime');fs.mkdirSync(runtime,{recursive:true});
 const allowed=publicFiles(root);
 for(const rel of allowed){const target=path.join(runtime,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,rel),target);}
 fs.cpSync(path.join(root,'skills'),path.join(plugin,'skills'),{recursive:true});
 fs.writeFileSync(path.join(plugin,'LICENSE'),license);
 const manifest={$schema:'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',name:'hardware-software-url-finder',version:'0.1.0',description:'Official software URL resolution through audited Core, offline Registry and optional research',keywords:['hardware','software','drivers','mcp','skills']};
 fs.writeFileSync(path.join(plugin,'plugin.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(plugin,'mcp.json'),JSON.stringify({$schema:'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',mcpServers:{hsuf:{type:'stdio',command:'node',args:['${PLUGIN_ROOT}/runtime/bin/hsuf.mjs','mcp'],env:{HSUF_HOME:'${PLUGIN_ROOT}/runtime'}}}},null,2)+'\n');
 const fallback=path.join(plugin,'.codex-plugin');fs.mkdirSync(fallback,{recursive:true});fs.writeFileSync(path.join(fallback,'plugin.json'),JSON.stringify({name:manifest.name,version:'0.1.0',description:manifest.description,skills:'./skills',mcpServers:'./mcp.json'},null,2)+'\n');
 const pluginValidation=validatePlugin(plugin);
 const pluginPaths=[...allowed.map(rel=>'runtime/'+rel),...filesUnder(path.join(root,'skills')).map(rel=>'skills/'+rel),'LICENSE','plugin.json','mcp.json','.codex-plugin/plugin.json'];
 const skillEntries=filesUnder(path.join(root,'skills')).map(rel=>({name:rel,data:fs.readFileSync(path.join(root,'skills',rel))}));
 if(!skillEntries.some(e=>e.name==='hardware-software-url-finder/LICENSE'))skillEntries.push({name:'hardware-software-url-finder/LICENSE',data:license});
 const artifacts=[['hardware-software-url-finder-v0.1.0-source.zip',allowed.map(rel=>({name:rel,data:fs.readFileSync(path.join(root,rel))}))],['hsuf-agent-skill-v0.1.0.zip',skillEntries],['hsuf-codex-plugin-v0.1.0.zip',pluginPaths.sort().map(rel=>({name:'hardware-software-url-finder/'+rel,data:fs.readFileSync(path.join(plugin,rel))}))]];
 const hashes=[];
 for(const[name,entries]of artifacts){const target=path.join(dist,name);writeZip(target,entries);const data=fs.readFileSync(target);hashes.push({name,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}
 fs.writeFileSync(path.join(dist,'SHA256SUMS.txt'),hashes.map(h=>h.sha256+'  '+h.name).join('\n')+'\n');
 const report={version:'0.1.0',status:'LOCAL_PUBLIC_RELEASE_CANDIDATE',license:'MIT',repository:'https://github.com/HoMongYi/hardware-software-url-finder',tag:'v0.1.0',release_title:'Hardware Software URL Finder v0.1.0',publish:'Not run',scan,plugin:pluginValidation,artifacts:hashes};fs.writeFileSync(path.join(dist,'release-manifest.json'),JSON.stringify(report,null,2)+'\n');return report;
}
