// Deterministic adapter example. Replace its body with an organisation-owned LLM gateway.
// No secrets are inherited by CommandJudge; credentials belong in the gateway's secret store.
let data='';for await(const chunk of process.stdin){data+=chunk;if(data.length>65536)throw Error('INPUT_TOO_LARGE');}
JSON.parse(data);
process.stdout.write(JSON.stringify({decision:'review',candidate_id:null,reason_codes:['HUMAN_GATEWAY_REQUIRED'],uncertainties:['Example adapter performs no paid API call.']}));
