# Contracts

Input: `{ "input_id": "optional", "product_name": "[Vendor] Exact Model", "category": "optional" }`. Do not send private metadata to providers; map private organisation IDs in the host adapter.

Core result: input_id, original_name, normalized, decision, primary, secondary, reason_codes, evidence, verified_at. `primary` is null unless fill. verified_at is the source verification date, not the current invocation time.

CSV headers: `input_id,product_name,category`. product_name is required; other columns are optional. CLI accepts up to 1000 rows and 4 MiB. `--output result.csv --legacy` writes input_id, product_name, url. Spreadsheet formulas are escaped.

MCP offline tools: resolve_hardware_software_url, resolve_hardware_software_urls, audit_hardware_software_url, lookup_hardware_vendor, lookup_software_ecosystem, get_registry_status. Research is explicitly separate and optional.

Static audit alone cannot assert page compatibility. Use Core research or a verified Registry record; browser-required pages remain review.
