// Bounded public-source refresh. 200 alone NEVER promotes a lifecycle.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {ROOT,loadRegistry} from '../src/registry.mjs';
import {safeRequest,pageEvidence} from '../src/network.mjs';
import {visibleModel} from '../src/identity.mjs';
import {createCore} from '../src/core.mjs';
const targets=[
 {vendor:'asrock',model:'B860M Challenger WiFi White',url:'https://www.asrock.com/mb/Intel/B860M%20Challenger%20WiFi%20White/index.kr.asp#Download'},
 {vendor:'asus',model:'PRIME A520M-K ARGB',url:'https://www.asus.com/motherboards-components/motherboards/prime/prime-a520m-k-argb/helpdesk_download?model2Name=PRIME-A520M-K-ARGB'},
 {vendor:'intel',model:'Intel Arc Pro B70',url:'https://www.intel.co.kr/content/www/kr/ko/products/sku/245797/intel-arc-pro-b70-graphics/downloads.html'},
 {vendor:'canon',model:'PIXMA E3470',url:'https://asia.canon/en/support/PIXMA%20E3470/model'},
 {vendor:'epson',model:'PX-M887F',url:'https://support.epson.net/setupnavi/?LG2=KO&OSC=ARD&MKN=PX-M887F&PINF=support'},
 {vendor:'hp',model:'OfficeJet Pro 9120 All-in-One series',url:'https://support.hp.com/kr-ko/drivers/hp-officejet-pro-9120-all-in-one-series/model/2101420662'},
 {vendor:'brother',model:'HL-B2180DW',url:'https://support.brother.com/g/b/downloadtop.aspx?c=kr&lang=ko&prod=hlb2180dw_as'},
 {vendor:'mchose',url:'https://www.mchose.store/pages/download'},
 {vendor:'vgn',url:'https://www.vgnlab.com/pages/download'},
 {vendor:'akko',url:'https://en.akkogear.com/download/'},
];
const registry=loadRegistry();
const reports=[];
for(const t of targets.filter(t=>!process.argv.includes('--verified-only')||['canon','asus'].includes(t.vendor))){
 let evidence;try{evidence=pageEvidence(await safeRequest(t.url,{timeoutMs:10000,maxBytes:1_048_576,maxRedirects:3}));}catch{reports.push({vendor:t.vendor,source_url:t.url,status:'Needs verification',reason:'BOUNDED_FETCH_UNAVAILABLE'});continue;}
 const sourceUrl=evidence.url;const exact=t.model&&visibleModel(t.model,`${evidence.title} ${evidence.text}`);
 const downloadable=/driver|download|firmware|software|다운로드|드라이버|ダウンロード/i.test(evidence.text);
 const existing=registry.vendors.find(v=>v.id===t.vendor);
 const corePassed=existing&&t.model&&createCore({registry}).finalize({product_name:`[${existing.name}] ${t.model}`},{url:t.url,id:'public-refresh'},evidence).decision==='fill';
 const proven=evidence.status===200&&!evidence.browser_required&&exact&&downloadable&&corePassed;
 if(!existing){const host=new URL(sourceUrl).hostname;const newVendor={id:t.vendor,name:t.vendor.toUpperCase(),aliases:[t.vendor.toUpperCase()],domains:[host],classification:'PUBLIC_SOURCE_ONLY',provenance:[sourceUrl],verified_at:null,noise_tokens:[],model_aliases:[],models:[],rules:[{id:t.vendor+'-support',priority:500,when:{brand_any:['^'+t.vendor+'$']},action:'model_page',allowed_domains:[host]}],ecosystems:[]};fs.writeFileSync(path.join(ROOT,'data/public/vendors',t.vendor+'.json'),JSON.stringify(newVendor,null,2)+'\n');}
 if(existing&&t.model&&proven){
  const id=t.vendor+'-'+t.model.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const record={id,model:t.model,canonical_page:sourceUrl,status:'active',verified_at:evidence.verified_at,provenance:[sourceUrl],support_mode:'exact',supported_models:[t.model],excluded_models:[],software_kind:'support'};
  existing.models=existing.models.filter(m=>m.id!==id);existing.models.push(record);
  fs.writeFileSync(path.join(ROOT,'data/public/vendors',existing.id+'.json'),JSON.stringify(existing,null,2)+'\n');
 }
 reports.push({vendor:t.vendor,...(t.model?{model:t.model}:{}),source_url:t.url,final_url:sourceUrl,http_status:evidence.status,status:proven?'Passed':'Needs verification',exact_model_visible:!!exact,download_content_visible:downloadable,browser_required:evidence.browser_required,content_sha256:crypto.createHash('sha256').update(evidence.text).digest('hex'),verified_at:proven?evidence.verified_at:null});
 console.log(t.vendor,proven?'Passed':'Needs verification');
 // One request chain at a time, no retries, delay across provider hosts.
 await new Promise(r=>setTimeout(r,250));
}
const reportPath=path.join(ROOT,'reports/public-source-refresh.json');
const previous=process.argv.includes('--verified-only')&&fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')).results:[];
const merged=[...previous.filter(r=>!reports.some(n=>n.vendor===r.vendor)),...reports];
fs.writeFileSync(reportPath,JSON.stringify({classification:'PUBLIC_SOURCE_ONLY',timeout_ms:10000,max_bytes:1_048_576,concurrency:1,max_redirects:3,retries:0,results:merged},null,2)+'\n');
