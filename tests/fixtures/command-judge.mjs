let text='';for await(const chunk of process.stdin)text+=chunk;
const request=JSON.parse(text);
process.stdout.write(JSON.stringify({decision:'candidate',candidate_id:request.candidates[0].id,reason_codes:[],uncertainties:[]}));
