---
name: hardware-software-url-finder
description: Find and audit official hardware drivers, firmware, device software and web drivers from product names or CSV. Use HSUF Core for exact model/revision protection and fill, blank or review results, with optional Search/Judge research.
compatibility: Node.js 22+ with HSUF installed, or an HSUF MCP host. Live research runs in the host application, not in a network-isolated Skill container.
metadata:
  version: "0.1.0"
---

# Hardware Software URL Finder

Use the HSUF engine rather than deciding customer URLs yourself.

1. Pass `input_id`, `product_name` and optional `category` to `resolve_hardware_software_url(s)` MCP tools, or run `hsuf resolve input.csv --offline` through the host CLI. Read [contracts](references/contracts.md) for CSV and structured results.
2. Start with Registry. Keep V2/V3, Rev, D4/D5, WiFi, AX, Pro/Max/Ultra/Plus and SKU identity. Never invent a regional alias or discard colour/revision without vendor-scoped evidence.
3. Respect `fill`, `blank`, `review`. A search failure means `review`; only the passive-product classifier can make `blank`. Keep URLs empty for both blank and review when exporting.
4. Research unresolved products only when network/provider use is within the user's request and host configuration. Use `research_hardware_software_url` or `hsuf resolve input.csv --pipeline serpapi-openai-judge`. Registry hits never need LLM calls.
5. Search/Judge responses are candidate evidence. Core independently fetches and audits the final official page. Never replace a Core review with the Judge's confidence. Read [policy](references/policy.md) when investigating conflicts.
6. Return unresolved/needs-refresh items honestly. Do not edit Public Registry or company systems just because a candidate looks plausible.

For a local installation, `scripts/hsuf.mjs` routes to the installed Core using `HSUF_HOME`; generated Plugins carry their own runtime. In Claude API's code-execution container, ask the host to call a custom tool or MCP; do not rely on `curl` or package downloads in that container.
