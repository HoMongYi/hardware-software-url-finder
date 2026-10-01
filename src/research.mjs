import fs from 'node:fs';
import YAML from 'yaml';
import { identityKey as fold, visibleModel, variantConflict } from './identity.mjs';
import { urlFilter } from './audit.mjs';
import { safeRequest, pageEvidence } from './network.mjs';
import { checkSearch, checkJudge, checkInput } from './contracts.mjs';

export const DEFAULT_SCORING=YAML.parse(fs.readFileSync(new URL('../config/scoring.yaml',import.meta.url),'utf8'));
export function rankCandidates(candidates,state,{scoring=DEFAULT_SCORING,topN=5}={}){
  if(!Number.isInteger(topN)||topN<1||topN>20)throw new Error('INVALID_TOP_N');
  const domains=state.rule?.allowed_domains?.length?state.rule.allowed_domains:state.vendor?.domains || [];
  return candidates.map(c=>{
    const filtered=urlFilter(c.url,domains);let decoded=c.url;try{decoded=decodeURI(c.url);}catch{}
    const model=state.normalized.canonical_model;const text=decoded+' '+c.title;
    const rejected=[...filtered.reasons];if(variantConflict(model,text).length)rejected.push('WRONG_REVISION');
    const signals={official_domain:filtered.ok,exact_model:visibleModel(model,text),support_or_download_page:/support|download|driver|software|firmware|helpdesk/i.test(text),known_software_ecosystem:state.vendor?.ecosystems.some(e=>e.canonical_page===filtered.url),vendor_model_token_match:visibleModel(model,c.title+' '+c.snippet),preferred_locale:/ko-kr|\/kr\/|\/ko\/|\.co\.kr/.test(c.url),generic_download_center:/\/downloads?\/?$/i.test(new URL(filtered.url || 'https://example.com/').pathname),model_not_visible:!visibleModel(model,text+' '+c.snippet),suspicious_redirect:/redirect|url=|target=/i.test(c.url)};
    let score=0;for(const [key,weight]of Object.entries({...scoring.positive,...scoring.negative}))if(signals[key])score+=weight;
    return {...c,url:filtered.url || c.url,score,signals,blocked:rejected};
  }).filter(c=>!c.blocked.length).sort((a,b)=>b.score-a.score || a.url.localeCompare(b.url)).filter((c,i,all)=>all.findIndex(x=>x.url===c.url)===i).slice(0,topN);
}
export async function research(core,input,options={}){
  const state=core.inspect(input);const review=code=>core.result(input,state.normalized,'review',[code]);
  if(!state.vendor)return review('OFFICIAL_DOMAIN_UNRESOLVED');
  if(!options.search)return review('SEARCH_PROVIDER_UNCONFIGURED');
  const product={vendor:state.rule?.vendor_id || state.normalized.vendor,model:state.normalized.canonical_model,category:state.normalized.category};
  const query=`${state.vendor.name} ${product.model} software driver support `+(state.normalized.alias_hints.length?state.normalized.alias_hints.join(' OR ')+' ':'')+state.vendor.domains.slice(0,3).map(d=>'site:'+d).join(' OR ');
  let response;try{response=checkSearch(await options.search.search({product,query,limit:20}));}catch{return review('SEARCH_PROVIDER_FAILURE');}
  const candidates=rankCandidates(response.candidates,state,options);if(!candidates.length)return review('NO_AUDITABLE_CANDIDATE');
  let chosen=candidates[0];const exactUrl=visibleModel(product.model,decodeURI(chosen.url));
  const deterministic=candidates.length===1 || exactUrl && chosen.score-(candidates[1]?.score ?? 0)>=15;
  if(!deterministic){
    if(!options.judge)return review('JUDGE_REQUIRED');
    let judgement;try{judgement=checkJudge(await options.judge.judge({product,candidates:candidates.map(({id,url,title,snippet,score,signals})=>({id,url,title,snippet,score,signals}))}),candidates);}catch{return review('JUDGE_PROVIDER_FAILURE');}
    if(judgement.decision!=='candidate'||judgement.uncertainties.length)return review('JUDGE_UNCERTAIN');chosen=candidates.find(c=>c.id===judgement.candidate_id);
  }
  // Candidate/LLM evidence is never reused as page proof.
  let probe;try{probe=pageEvidence(await (options.fetcher || safeRequest)(chosen.url,{timeoutMs:12000,maxBytes:1_048_576,maxRedirects:4}));}catch{return review('CORE_FETCH_FAILURE');}
  return core.finalize(input,chosen,probe);
}
export async function resolveBatch(engine,inputs,options={}){
  if(!Array.isArray(inputs)||inputs.length>1000)throw new Error('INVALID_BATCH');
  inputs.forEach(checkInput);const cache=new Map(),out=[];
  for(const input of inputs){
    const registryResult=engine.resolveRegistry(input);
    if(registryResult.decision!=='review'){out.push(registryResult);continue;}
    const n=registryResult.normalized;const key=JSON.stringify([n.vendor,fold(n.canonical_model),n.discriminators,n.category]);
    if(!cache.has(key))cache.set(key,await engine.resolve(input,options));
    const cached=cache.get(key);out.push({...cached,input_id:input.input_id??null,original_name:input.product_name,normalized:n});
  }
  return out;
}
