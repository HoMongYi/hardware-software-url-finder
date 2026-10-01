# HSUF v0.1.0 implementation design

Binding requirements: user-selected FINAL_DESIGN and CODEX_AUTOPROMPT_HSUF_v0.1.0_FINAL in the sibling development bundle; user overrides approval pauses. The old implementation is an immutable migration source, not executable public Core.

Input is input_id + product_name + optional category/metadata. Core does normalization, scoped aliases, passive classification, private/public lookup, lifecycle and audit. Research searches only unresolved products, hard-filters candidates, ranks with config, compares at most five via optional Judge, then independently fetches/audits official evidence. Provider SDKs never enter Core.

Node.js 22+ ESM preserves legacy ecosystem while enabling stable MCP SDK, HTTP and one cross-platform CLI. Vendor JSON is human source, Ajv validation + conflicts + compiler builds registry. Verified dates are source verification dates, never replaced with today's date merely because code ran.

SSRF boundary uses HTTPS/HTTP URL checks, registrable domains, all DNS address checks and DNS pinning per request. Every redirect is revalidated, credentials are not forwarded cross-origin, timeout/bytes/redirects/concurrency are bounded. No marketplace crawling or bypass. Fetched evidence is data, never instructions.

Raw legacy CSV catalogue mappings, product numbers, internal docs and private logs remain in the sibling baseline directory. Reusable rules and aliases are stripped of catalogue metadata. Unverified mappings cannot authorize fill; source-only records without current evidence are needs-refresh. Synthetic fixtures demonstrate complete offline fill without claiming manufacturer verification.

CLI, HTTP and MCP use the same result schema. Research requires explicit pipeline/config; read-only MCP defaults to offline. Skill source is canonical; release creates portable Plugin and compatibility manifest. Maintainer approved MIT on 2026-10-02; publication remains an explicit separate operation.
