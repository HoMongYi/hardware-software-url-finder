import test from 'node:test';import assert from 'node:assert/strict';import {fixtureRegistry,input} from './fixtures.mjs';
test('CSV contract supports quoted multiline and neutralizes spreadsheet formulas',async()=>{
 const {parseCatalogCsv,resultsCsv}=await import('../src/csv.mjs').catch(()=>({}));assert.equal(typeof parseCatalogCsv,'function','CSV adapter missing');
 const rows=parseCatalogCsv('input_id,product_name,category\r\n"=1+1","ABC,\nV2",keyboard\r\n');assert.equal(rows[0].product_name,'ABC,\nV2');
 const csv=resultsCsv([{input_id:'=1+1',original_name:'@evil',decision:'review',primary:null,reason_codes:['REGISTRY_MISS']}],{legacy:true});assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes("'@evil"));
 assert.throws(()=>parseCatalogCsv('product_no,product_name\n1,ABC\n'),/CSV_COLUMNS/);
});
test('HTTP exposes all documented read-only routes with the same Core',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {createHttpServer}=await import('../src/http.mjs');const registry=fixtureRegistry();registry.vendors[0].ecosystems=[{...registry.vendors[0].models[0],id:'example-ecosystem'}];const s=createHttpServer(createEngine({registry,now:'2026-10-01'}));await new Promise(r=>s.listen(0,'127.0.0.1',r));
 try{const base=`http://127.0.0.1:${s.address().port}`;const post=async(p,b)=>fetch(base+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});
 assert.equal((await fetch(base+'/health')).status,200);assert.equal((await(await post('/v1/resolve',input())).json()).decision,'fill');
 assert.equal((await(await post('/v1/resolve/batch',{items:[input()]})).json()).results.length,1);
 assert.equal((await(await post('/v1/audit',{url:'https://amazon.com/driver',product:input()})).json()).verdict,'review');
 assert.equal((await fetch(base+'/v1/vendors/example')).status,200);assert.equal((await fetch(base+'/v1/ecosystems/example-ecosystem')).status,200);assert.equal((await fetch(base+'/v1/ecosystems/missing')).status,404);
 assert.equal((await post('/v1/resolve',{product_name:''})).status,400);assert.equal((await fetch(base+'/health',{headers:{Origin:'https://evil.com'}})).status,403);
 assert.equal((await post('/v1/research',input())).status,404);
 }finally{await new Promise(r=>s.close(r));}
});
test('MCP official SDK client lists six read-only tools and returns structured output',async()=>{
 const {createMcpServer}=await import('../src/mcp.mjs');const {createEngine}=await import('../src/index.mjs');const {Client,InMemoryTransport}=await import('@modelcontextprotocol/client');
 const server=createMcpServer(createEngine({registry:fixtureRegistry(),now:'2026-10-01'}));const client=new Client({name:'synthetic-test',version:'1.0.0'});
 const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(b),client.connect(a)]);
 try{const listed=await client.listTools();assert.equal(listed.tools.length,6);assert.ok(listed.tools.every(t=>t.annotations.readOnlyHint&&t.outputSchema));
 const result=await client.callTool({name:'resolve_hardware_software_url',arguments:input()});assert.equal(result.structuredContent.decision,'fill');
 const status=await client.callTool({name:'get_registry_status',arguments:{}});assert.equal(status.structuredContent.vendors,1);
 const batch=await client.callTool({name:'resolve_hardware_software_urls',arguments:{items:[input()]}});assert.equal(batch.structuredContent.results.length,1);
 const audit=await client.callTool({name:'audit_hardware_software_url',arguments:{url:'https://amazon.com/software',product:input()}});assert.equal(audit.structuredContent.verdict,'review');
 const vendor=await client.callTool({name:'lookup_hardware_vendor',arguments:{id:'example'}});assert.equal(vendor.structuredContent.vendor.id,'example');
 const eco=await client.callTool({name:'lookup_software_ecosystem',arguments:{id:'missing'}});assert.equal(eco.structuredContent.ecosystem,null);
 }finally{await client.close();await server.close();}
});
test('HTTP auth and request limits are enforced',async()=>{
 const {createEngine}=await import('../src/index.mjs');const {createHttpServer}=await import('../src/http.mjs');const s=createHttpServer(createEngine({registry:fixtureRegistry()}),{token:'synthetic-token',maxBytes:100});await new Promise(r=>s.listen(0,'127.0.0.1',r));
 try{const b=`http://127.0.0.1:${s.address().port}`;assert.equal((await fetch(b+'/health')).status,401);assert.equal((await fetch(b+'/health',{headers:{authorization:'Bearer synthetic-token'}})).status,200);assert.equal((await fetch(b+'/v1/resolve',{method:'POST',headers:{authorization:'Bearer synthetic-token','content-type':'application/json'},body:JSON.stringify({product_name:'X'.repeat(110)})})).status,413);}finally{await new Promise(r=>s.close(r));}
});
test('MCP explicit research is separate and uses Core audit',async()=>{
 const {createMcpServer}=await import('../src/mcp.mjs');const {createEngine}=await import('../src/index.mjs');const {Client,InMemoryTransport}=await import('@modelcontextprotocol/client');
 const e=createEngine({registry:fixtureRegistry(),offline:false,search:{search:async()=>({candidates:[]})}});const server=createMcpServer(e,{allowResearch:true});const client=new Client({name:'synthetic-research',version:'0.1.0'});const[a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(b),client.connect(a)]);
 try{const tools=await client.listTools();assert.equal(tools.tools.length,7);const r=await client.callTool({name:'research_hardware_software_url',arguments:input('[Example] ABC V9')});assert.equal(r.structuredContent.decision,'review');assert.equal(r.structuredContent.reason_codes[0],'NO_AUDITABLE_CANDIDATE');}finally{await client.close();await server.close();}
});
