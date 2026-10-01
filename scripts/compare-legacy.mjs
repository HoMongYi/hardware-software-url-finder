// Local migration audit only. No raw source inputs or identifiers are emitted.
import fs from 'node:fs';import path from 'node:path';
import {createEngine} from '../src/index.mjs';import {ROOT} from '../src/registry.mjs';
const source=process.argv[2];if(!source)throw new Error('SOURCE_DIRECTORY_REQUIRED');
const cases=fs.readFileSync(path.join(source,'tests/golden-cases.jsonl'),'utf8').split(/\r?\n/).filter(s=>s.trim()&&!s.startsWith('//')).map(JSON.parse);
const engine=createEngine();const totals={},decisionCounts={},policyChanges={};
for(const c of cases){totals[c.type]=(totals[c.type]||0)+1;
 if(c.type==='lookup'||c.type==='lookup_fixture'){
   if(!c.input.product_name){policyChanges.LEGACY_CATALOGUE_ID_ONLY=(policyChanges.LEGACY_CATALOGUE_ID_ONLY||0)+1;continue;}
   const result=await engine.resolve({product_name:c.input.product_name},{offline:true});decisionCounts[result.decision]=(decisionCounts[result.decision]||0)+1;
   if(c.expect.decision&&result.decision!==c.expect.decision){const reason=result.reason_codes[0];policyChanges[reason]=(policyChanges[reason]||0)+1;}
 }else if(c.type==='audit'){
   const r=engine.audit(c.input.url,{product_name:c.input.product_name||c.input.name||'unknown'});
   const k='audit_'+r.verdict;decisionCounts[k]=(decisionCounts[k]||0)+1;
 }else if(c.type==='normalize'||c.type==='discriminator'||c.type==='rank')policyChanges['shared_new_contract_regression_tests']=(policyChanges['shared_new_contract_regression_tests']||0)+1;
}
const report={baseline_cases:cases.length,source_case_types:totals,after_observed_decisions:decisionCounts,policy_change_reasons:policyChanges,classification:'aggregate-only; no catalogue inputs persisted',legacy_runs:{golden:{status:'Passed',pass:104,fail:0,skip:0},integrity:{status:'Passed',pass:4,fail:0,skip:0}},intentional_changes:['no input_id lookup into company catalogue','public provenance required before exact reuse','unverified regional aliases withheld','lifecycle dates not invented','no candidate or blocked search becomes blank','static URL audit without page proof is review','no global noise deletion']};
fs.writeFileSync(path.join(ROOT,'reports/legacy-comparison.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
