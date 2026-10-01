import {createEngine} from '../src/index.mjs';
import {schema} from '../src/contracts.mjs';
// The host sends tool results to its chosen agent API. Neither agent supplies final URLs.
export const openAITool={type:'function',name:'resolve_hardware_software_url',description:'Offline official software URL resolution with exact model audit',strict:false,parameters:schema('input')};
export const claudeTool={name:'resolve_hardware_software_url',description:openAITool.description,input_schema:schema('input')};
export function createAgentToolBridge(engine=createEngine()){
  return async function execute(name,args){
    if(name!=='resolve_hardware_software_url')throw new Error('UNKNOWN_TOOL');
    return engine.resolve(typeof args==='string'?JSON.parse(args):args,{offline:true});
  };
}
export async function handleOpenAI(toolCall,execute=createAgentToolBridge()){
  return{type:'function_call_output',call_id:toolCall.call_id,output:JSON.stringify(await execute(toolCall.name,toolCall.arguments))};
}
export async function handleClaude(toolUse,execute=createAgentToolBridge()){
  return{type:'tool_result',tool_use_id:toolUse.id,content:JSON.stringify(await execute(toolUse.name,toolUse.input))};
}
