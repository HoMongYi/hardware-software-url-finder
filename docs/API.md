# CLI / HTTP / MCP contracts

All surfaces call the same Core. Generic input is input_id (optional string), product_name (required string, 1–1000 characters), category (optional) and metadata (optional object). Unknown root fields are rejected by Core. No company product number, schema or authentication is required.

Result schema is [../schemas/result.schema.json](../schemas/result.schema.json). primary is null unless fill. URLs are never exported for blank/review. Source verification dates can be null and are not regenerated at invocation time.

## CLI

`node bin/hsuf.mjs resolve NAME` defaults to offline. A `.csv` argument is treated as a file. CSV supports UTF-8 BOM, standard quoting and multiline cells; max 1000 records, 4 MiB, 64 KiB per record. Header columns may be input_id, product_name, category. Output paths must not already exist.

`--private DIR` explicitly loads a vendor-shaped overlay. `--config FILE` accepts bounded YAML and `--pipeline serpapi-openai-judge` uses the shipped example. `--offline` always takes precedence. Invalid arguments or parse failures exit with code 2 and a redacted fixed message; a valid review is exit 0.

## HTTP

Start `node bin/hsuf.mjs serve --port 8787`. Requests/response JSON are UTF-8; max body 1 MiB. All base routes are offline even when the optional research provider is enabled.

| Route | Response |
|---|---|
| GET /health | status, version, mode |
| POST /v1/resolve | Core result |
| POST /v1/resolve/batch | `{ "results": [CoreResult] }` |
| POST /v1/audit | static audit verdict, reason_codes, sanitized/final URL, verified_at, locale |
| GET /v1/vendors/:id | public vendor record; 404 if absent |
| GET /v1/ecosystems/:id | public ecosystem; 404 if absent |
| POST /v1/research | optional, explicitly enabled by server configuration; Core result |

Batch input is `{ "items": [GenericInput] }`. Audit input is `{ "url": "https://...", "product": GenericInput }`. With no product, static audit defaults to unknown and cannot fill. Metadata is never interpreted as provider settings, evidence or an override.

Fixed errors: 400 INVALID_REQUEST/INVALID_JSON, 401 UNAUTHORIZED, 403 ORIGIN_NOT_ALLOWED/HOST_NOT_ALLOWED, 404 NOT_FOUND, 413 BODY_TOO_LARGE, 415 JSON_REQUIRED, 429 BUSY. Error output never includes provider exceptions, input records or auth values. Bearer token required for binding outside loopback; request Origin rejected. Organisation developers own TLS/proxy/access policy.

## MCP

MCP v2 stable SDK 2.2.0, protocol 2026-07-28. Command: `node`; args: absolute Core bin path + `mcp`. Official client tests verify listTools and callTool over in-memory and actual stdio transports. All tools return structuredContent plus its serialized text; outputSchema and readOnlyHint are registered.

Six base tool names are listed in README. Single resolve takes GenericInput; batch takes items; audit takes url/product; lookup takes id; registry status takes no args. Private vendor/model records are not returned by public lookup/status.

`mcp --pipeline serpapi-openai-judge` exposes research_hardware_software_url separately with openWorldHint true. This can make paid requests; the host must make that distinction visible. Offline resolve remains offline.
