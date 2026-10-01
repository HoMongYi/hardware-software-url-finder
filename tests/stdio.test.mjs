import test from'node:test';import assert from'node:assert/strict';import path from'node:path';import{ROOT}from'../src/registry.mjs';
import{Client}from'@modelcontextprotocol/client';import{StdioClientTransport}from'@modelcontextprotocol/client/stdio';
test('MCP CLI actual stdio subprocess interoperates with official SDK',async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[path.join(ROOT,'bin/hsuf.mjs'),'mcp'],stderr:'pipe'});const client=new Client({name:'synthetic-cli-test',version:'0.1.0'});
 await client.connect(transport);try{const list=await client.listTools();assert.equal(list.tools.length,6);const r=await client.callTool({name:'resolve_hardware_software_url',arguments:{product_name:'[Canon] PIXMA E3470'}});assert.equal(r.structuredContent.decision,'fill');}finally{await client.close();}
});
