# HSUF v0.1.0 Public Finalization Plan

> For agentic workers: execute inline with superpowers:executing-plans. The human requested continuous finalization without intermediate approval.

**Goal:** Produce a clean MIT-licensed GitHub source root and regenerated release assets without publishing.

**Architecture:** Preserve the existing Core and contracts. Start exclusively from the previously verified public Source ZIP; strengthen release metadata, archive layout and artifact audits.

**Tech Stack:** Node.js 22+ ESM, npm, Python standard-library archive verification.

**Spec:** The user's GitHub Public Release Finalization instructions in this conversation, 2026-10-02.

## Global Constraints

- Version 0.1.0; repository https://github.com/HoMongYi/hardware-software-url-finder; MIT, copyright 2026 HoMongYi.
- No push, release publish, npm publish, company data disclosure, or Core redesign.
- Do not promote needs-refresh records or migrate held catalogue mappings/aliases.
- Work from dist/hardware-software-url-finder-v0.1.0-source.zip only; keep baseline outside the public root.
- Write HANDOFF.md once at completion; do not initialize Git in the upload root.

## Review Focus

- Source ZIP must have package.json at archive root and no development/private files.
- MIT text must travel with Source, Skill, Plugin and npm artifacts.
- SHA256SUMS and manifest must match actual bytes, and detect missing/unlisted artifacts.
- README commands must match executable CLI; paid/UI/hosted checks must remain explicitly Not run.
- Regression protection and private boundaries must remain unchanged.

## Task 1: Public metadata and packaging

- [x] Update package.json/package-lock.json, LICENSE, license decision, ignore rules and packaging allowlists.
- [x] Replace obsolete license test with public metadata and license inclusion regression; run RED then GREEN for archive/metadata requirements.
- [x] Flatten Source ZIP entries; include LICENSE in Skill/Plugin archives and npm package.
- [x] Extend scripts/check-artifacts.py for CRC, root layout, path/leak, MIT and hash/size verification.

## Task 2: Documentation

- [x] Compare README against bin/hsuf.mjs and existing executable examples; update personal open-source positioning and MIT status.
- [x] Update CHANGELOG, SECURITY, CONTRIBUTING and GitHub upload/release guide.
- [x] Write reports/RELEASE_NOTES_v0.1.0.md; preserve uncertainty and migration counts.

## Task 3: Verification and final deliverables

- [x] Re-run baseline golden/integrity outside public root; run npm test, test:live, validate, registry build and dependency audit.
- [x] Validate canonical/packaged Skill and installed Plugin/npm runtime.
- [x] Update FINAL_REPORT/verification with observed results; rebuild all assets.
- [x] Extract regenerated Source ZIP into a separate clean github-v0.1.0 root and audit it.
- [x] Verify final hashes/allowlist; write one HANDOFF, report exact upload path and assets.

## Execution decisions

The uploaded outer v0.1.0.zip is not present at the known Downloads/workspace paths. The existing dist Source ZIP hash matches the prior completed release candidate (8359a340ddd5eff238363b333ed6aca0f3cde364beb6b5cbee2a5935f503c7b8); use that specified Source of Truth directly. Do not copy development files from the previous workspace.

## Completion evidence

Metadata/flat ZIP/MIT inclusion regression: RED (2 failures) then GREEN (4/4). Baseline 104 + 4 Passed. Deterministic 130 Passed; paid 3 SKIP. Runtime advisory 0; official canonical/packaged Skill validator Passed. npm hsuf.cmd and extracted Plugin runtime offline install smoke Passed. Final source/archive/hash verification and clean upload root are captured in FINAL_REPORT and release-manifest. No Git initialization, push or publish.
