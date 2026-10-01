import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
const product={input_id:z.string().max(200).optional(),product_name:z.string().min(1).max(1000),category:z.string().max(80).optional(),metadata:z.record(z.string(),z.unknown()).optional()};
const generic=z.object({}).passthrough();
const resultSchema=z.object({input_id:z.string().nullable(),original_name:z.string(),normalized:generic,decision:z.enum(['fill','blank','review']),primary:z.object({url:z.string(),software_kind:z.string()}).nullable(),secondary:z.array(generic),reason_codes:z.array(z.string()),evidence:z.array(generic),verified_at:z.string().nullable()});
export function createMcpServer(engine,{allowResearch=false}={}){
  const server=new McpServer({name:'hardware-software-url-finder',version:'0.1.0'});
  const register=(name,description,inputSchema,outputSchema,handler,openWorld=false)=>server.registerTool(name,{description,inputSchema,outputSchema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:!openWorld,openWorldHint:openWorld}},async args=>{
    try{const value=await handler(args);return{content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value};}catch{return{content:[{type:'text',text:'INVALID_REQUEST'}],isError:true};}
  });
  register('resolve_hardware_software_url','Offline registry resolution. Only Core can fill.',z.object(product).strict(),resultSchema.shape,args=>engine.resolve(args,{offline:true}));
  register('resolve_hardware_software_urls','Offline batch, up to 1000 products.',{items:z.array(z.object(product).strict()).max(1000)},{results:z.array(resultSchema)},async args=>({results:await engine.batch(args.items,{offline:true})}));
  register('audit_hardware_software_url','Static audit only; absent independent page evidence returns review.',{url:z.string().max(4096),product:z.object(product).strict().optional()},{verdict:z.enum(['pass','review']),sanitized_url:z.string().nullable(),final_url:z.string().nullable(),reason_codes:z.array(z.string()),verified_at:z.string().nullable(),locale:z.string()},async args=>engine.audit(args.url,args.product));
  register('lookup_hardware_vendor','Look up a public vendor, never private mappings.',{id:z.string().max(100)},{vendor:generic.nullable()},async args=>({vendor:engine.registry.vendors.find(v=>v.id===args.id)||null}));
  register('lookup_software_ecosystem','Look up a public software ecosystem.',{id:z.string().max(100)},{ecosystem:generic.nullable()},async args=>({ecosystem:engine.registry.vendors.flatMap(v=>v.ecosystems).find(e=>e.id===args.id)||null}));
  register('get_registry_status','Public aggregate counts.',{},{version:z.string(),vendors:z.number(),domains:z.number(),models:z.number(),aliases:z.number(),rules:z.number(),ecosystems:z.number(),needs_refresh:z.number(),private_overlay_enabled:z.boolean()},async()=>engine.status());
  if(allowResearch)register('research_hardware_software_url','Explicit network/paid research; candidate selection requires Core Audit.',z.object(product).strict(),resultSchema.shape,args=>engine.resolve(args,{offline:false}),true);
  return server;
}
export async function startMcp(engine,options={}){const server=createMcpServer(engine,options);await server.connect(new StdioServerTransport(process.stdin,process.stdout,{maxBufferSize:1_048_576}));return server;}
