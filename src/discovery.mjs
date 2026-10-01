import {parse} from 'csv-parse/sync';
export function importDiscovery(text,extension,engine){
  const rows=extension.toLowerCase()==='.csv'?parse(text,{columns:true,bom:true,max_record_size:65536}):JSON.parse(text);
  if(!Array.isArray(rows)||rows.length>1000)throw new Error('INVALID_DISCOVERY');
  return rows.map(row=>{
    if(typeof row.product_name!=='string'||typeof row.discovery_url!=='string')throw new Error('INVALID_DISCOVERY');
    const u=new URL(row.discovery_url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new Error('INVALID_DISCOVERY_URL');
    const product={product_name:row.product_name,...(row.input_id?{input_id:row.input_id}:{}),...(row.category?{category:row.category}:{})};
    return{product,normalized:engine.inspect(product).normalized,discovery_url:u.href,policy:'discovery-only',final_url:null};
  });
}
