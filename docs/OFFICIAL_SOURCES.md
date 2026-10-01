# Standards verified 2026-10-01

All relied-upon official docs were fetched (HTTP 200), bounded to 15 seconds and 1 MiB per request. Claude Code HTML exceeded the cap; its complete Markdown page was used. No company content was sent. These are observed protocol/package contracts, not evidence that every host UI installed the package.

- [Agent Skills specification](https://agentskills.io/specification): SKILL.md naming/frontmatter, progressive resources.
- [skills-ref reference validator](https://github.com/agentskills/agentskills/tree/main/skills-ref): 0.1.0, Python 3.11+, validate command. Installed locally from official source commit 69ef37e9424c0a7ea9dd2293b559e43ec8176379; actual validation passed.
- [OpenAI package docs](https://developers.openai.com/plugins/build/plugins), [Agent Plugins specification](https://agent-plugins.org/specification), [manifest Schema](https://agent-plugins.org/schemas/1.0.0/plugin.schema.json), [MCP Schema](https://agent-plugins.org/schemas/1.0.0/mcp.schema.json): fixed root layouts, closed portable root manifest, PLUGIN_ROOT expansion. Both JSON schemas saved and used in Ajv2020 validation. Some OpenAI skill docs show top-level skills fields; the portable schema forbids them, so generated root manifest follows the normative Schema. Compatibility fallback handles legacy Codex layout separately.
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses text.format JSON Schema, strict required fields and closed objects.
- [Codex Skills](https://developers.openai.com/codex/skills): project/personal .agents skill layouts. Host UI activation remains Needs verification.
- [Claude Code Skills](https://code.claude.com/docs/en/skills): .claude/skills personal/project installation.
- [Claude API Skills guide](https://platform.claude.com/docs/en/build-with-claude/skills-guide), [code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool): custom Skill container has no network. HSUF Live Research runs through the host's custom tool/MCP instead.
- [MCP current specification](https://modelcontextprotocol.io/specification/2026-07-28), [MCP SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/): stable split server/client 2.2.0. The unified SDK's latest 1.31.0 is a separate older line and is not used.
- [SerpAPI Google Search](https://serpapi.com/search-api): organic_results mapping is implemented and fake-response contract tested. Paid live use was Not run.

Public manufacturer-page results and content hashes are in reports/public-source-refresh.json. Failed/ambiguous requests do not establish current compatibility.
