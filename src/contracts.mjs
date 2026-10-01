import fs from 'node:fs';
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true, strict: false });
export const schema = name => JSON.parse(fs.readFileSync(new URL(`../schemas/${name}.schema.json`, import.meta.url), 'utf8'));
export const validateInput = ajv.compile(schema('input'));
export const validateResult = ajv.compile(schema('result'));
export const validateVendor = ajv.compile(schema('vendor'));
export function checkInput(input) {
  if (!validateInput(input) || !input.product_name.trim()) throw new Error('INVALID_INPUT');
  return input;
}
export const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['decision', 'candidate_id', 'reason_codes', 'uncertainties'],
  properties: {
    decision: { enum: ['candidate', 'review'] }, candidate_id: { type: ['string', 'null'] },
    reason_codes: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 100 } },
    uncertainties: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 500 } }
  }
};
const judgeCheck = ajv.compile(JUDGE_SCHEMA);
export function checkJudge(value, candidates) {
  if (!judgeCheck(value) || (value.decision === 'candidate' && !candidates.some(c => c.id === value.candidate_id)) || (value.decision === 'review' && value.candidate_id !== null)) throw new Error('INVALID_JUDGE_RESPONSE');
  return value;
}
export function checkSearch(value) {
  if (!value || !Array.isArray(value.candidates) || value.candidates.length > 20) throw new Error('INVALID_SEARCH_RESPONSE');
  return { candidates: value.candidates.map((c, i) => {
    if (!c || typeof c.url !== 'string' || c.url.length > 4096 || typeof c.title !== 'string' || c.title.length > 1000 || (c.snippet != null && (typeof c.snippet !== 'string' || c.snippet.length > 4000))) throw new Error('INVALID_SEARCH_CANDIDATE');
    return { id: String(i + 1), url: c.url, title: c.title, snippet: c.snippet || '' };
  }) };
}
