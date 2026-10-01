import {createEngine} from '../src/index.mjs';
export async function runCatalogAdapter({readCatalog,acceptResult,engine=createEngine()}){
  const source=await readCatalog();
  // The organisation supplies generic fields; no DB schema is assumed here.
  const inputs=source.map(({input_id,product_name,category})=>({...(input_id?{input_id}:{}),product_name,...(category?{category}:{})}));
  const results=await engine.batch(inputs,{offline:true});
  for(const result of results)await acceptResult(result);
  return results;
}
