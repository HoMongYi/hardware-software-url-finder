# Provider contract and cost boundary

Search and Judge are independent async objects. Their id identifies the adapter; wrapper identity never changes Core policy. No OpenAI/Anthropic/Gemini SDK dependency enters Core.

Search request:

```json
{"product":{"vendor":"example","model":"ABC V2","category":"keyboard"},"query":"Example ABC V2 software support site:example.com","limit":20}
```

Search response:

```json
{"candidates":[{"url":"https://example.com/support/abc-v2","title":"ABC V2 Support","snippet":"Driver download"}]}
```

HSUF validates at most 20 results, reassigns stable candidate IDs, strips unknown provider fields and caps URL/title/snippet lengths. Evidence flags from Search are discarded. Hard filter removes unofficial domains, marketplace, communities, direct files and known wrong revisions before configurable scores are added. Top N is configurable (1–20), shipped example 5. Scores cannot override hard rejection.

Judge request includes normalized product and only the shortlisted id/url/title/snippet/score/signals. No raw input_id, metadata, catalogue data or entire raw search response is forwarded. Judge response:

```json
{"decision":"candidate","candidate_id":"1","reason_codes":["EXACT_MODEL"],"uncertainties":[]}
```

or decision review with null candidate_id. Schema is closed; a final_url or unknown candidate_id is an error. Uncertainties cause Core review. OpenAI uses Responses POST /v1/responses, store false, instructions separated from untrusted JSON evidence, text.format JSON Schema strict true, max_output_tokens 600. OPENAI_MODEL must be supplied; there is no model default.

Generic HTTP Search/Judge POST these contracts to an operator-owned gateway using optional environment tokens. A gateway can call Gemini, DeepSeek, Qwen, Claude or an OpenAI-compatible endpoint, then translate its output to HSUF JSON. It is responsible for its own model-specific API details. HSUF does not pretend every provider accepts the same native body.

Command Judge executes a fixed operator-provided executable/args, shell false, windowsHide true, safe OS env only, 12-second timeout and 64 KiB stdout/stderr caps. It reads one JSON request and writes one JSON response. Credentials must come from an approved gateway secret store; they are not forwarded from unrelated host env variables.

All external request endpoints pass the network guard; localhost/private addresses are not supported by Generic HTTP. Library tests can inject a transport, but CLI/HTTP/MCP requests cannot inject one. Candidate page proof is fetched independently by Core with DNS pinning and redirect checks. A Judge approval never bypasses that stage.

Cost: registry first, passive filter first, unresolved research only, exact registry skips LLM, one search request per deduped unresolved model, at most one Judge call and one bounded selected-page chain. Batch-local cache is capped by the 1000 input limit; no persistent provider result cache is written by default. Private identities must not be deduped into unrelated public products.

Optional OpenAI Web Search unified adapter is not implemented in v0.1.0. Paid/API live calls are separate tests; default CI injects fake HTTP responses into real provider wrappers.
