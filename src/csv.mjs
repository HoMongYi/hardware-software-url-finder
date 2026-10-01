import { parse } from 'csv-parse/sync';
import { checkInput } from './contracts.mjs';
export function parseCatalogCsv(text) {
  if (Buffer.byteLength(text)>4_194_304) throw new Error('CSV_TOO_LARGE');
  let columns=[];
  const rows=parse(text,{bom:true,skip_empty_lines:true,max_record_size:65536,columns:header=>{
    columns=header;
    if(!header.includes('product_name')||header.some(k=>!['input_id','product_name','category'].includes(k))||new Set(header).size!==header.length)throw new Error('CSV_COLUMNS');return header;
  }});
  if(!columns.length||rows.length>1000)throw new Error('CSV_ROW_LIMIT');
  return rows.map(row=>{if(!row.category)delete row.category;if(!row.input_id)delete row.input_id;return checkInput(row);});
}
function cell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function resultsCsv(results,{legacy=false}={}) {
  const header=legacy?['input_id','product_name','url']:['input_id','product_name','decision','url','reason_codes'];
  return header.join(',')+'\n'+results.map(r=>{const row=[r.input_id,r.original_name,...(legacy?[]:[r.decision]),r.decision==='fill'?r.primary.url:'',...(legacy?[]:[r.reason_codes.join('|')])];return row.map(cell).join(',');}).join('\n')+'\n';
}
