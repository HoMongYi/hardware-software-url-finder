# HSUF v0.1.0 Final Report

다음은 2026-10-02의 공개 전 로컬 검증 기록이며, 실제 GitHub 배포 검증은 마지막 절에 기록했습니다. 프로젝트는 MIT 라이선스의 최초 공개판 v0.1.0입니다. 대상 저장소는 https://github.com/HoMongYi/hardware-software-url-finder 입니다. GitHub push, Public Release publish, npm publish, 회사 내부 데이터 공개는 하지 않았습니다. 기존 공개 Source ZIP만 별도 디렉터리에 풀어 작업했고 원본 개발 workspace와 v2.2.1 baseline은 보존했습니다.

## 1. v2.2.1 baseline

**Passed:** golden 104/104, rule integrity 4/4, FAIL 0, SKIP 0. Node.js ESM/Node 18+ standalone scripts, JSON rules, CSV confirmed lookup, Skill 중심 workflow이며 package manager manifest·CI·LICENSE 파일은 원본 bundle에 없었습니다.

Migration Source ZIP SHA-256: `a78b533261b4b00931819e9f31008c4b98dbd01436e238e39cc99fe9bed2a482` — MANIFEST와 일치했습니다. 전체 원본 코드·규칙·문서·테스트와 두 내부 ZIP의 파일을 로컬로 확인했습니다. 이전 별도 v2.2 ZIP은 사용하지 않거나 덮어쓰지 않았습니다.

## 2. Before → After architecture

| Before | After |
|---|---|
| Skill + lookup/audit/rank 스크립트 | 공유 Core + normalize/classify/Registry/lifecycle/Audit/decision |
| company catalogue product_no 조회 | generic input_id + product_name + optional category/metadata |
| 전역 노이즈 삭제·구분기호 제거 | Vendor-scoped noise, exact identity 구분기호 보존 |
| confirmed CSV·단일 규칙 묶음 | Vendor별 Public Registry + optional ignored Private Overlay |
| 외부 LLM 절차 문서 | Search/Judge contracts + 실제 Provider/Pipeline 구현 |
| 서로 다른 JSON/CSV CLI | 동일 결과의 CLI/CSV, HTTP, MCP v2 |
| 단일 Skill 배포 | canonical Skill → Portable Plugin + compatibility manifest |

Core는 LLM SDK에 의존하지 않습니다. Search/Judge는 후보만 제공하고 Core가 독립 페이지 내용과 URL을 Audit합니다.

## 3. migrated URL/rule/alias/test counts

| 항목 | 결과 |
|---|---|
| 기존 confirmed CSV | 1,549행 분석; 원본 company catalogue 매핑 공개 이관 **0**, 보류 1,549 |
| 기존 공식 도메인 목록 | 115행/115 unique 분석; 규칙과 연결된 83개 도메인 일반화 |
| 기존 brand rules | 56개 projection; 회사 evidence/상품번호/내부 notes 제외 |
| fixed URL software | 24개 공개 URL 후보; 전부 needs-refresh |
| 모델별 지원 URL | 독립적으로 재검증한 공개 exact record **2** |
| source aliases | 31개 분석; 공개 호환 근거 불충분으로 공개 이관 **0**, 보류 31 |
| passive rules | 14 exclusion/98 patterns + 4 exception/43 patterns 유지 |
| markers | 3개 일반 브랜드 해석 규칙 |
| source golden | 104건 baseline 및 aggregate 비교; 원본 fixture/회사 식별자는 public에 복제하지 않음 |
| 공개 테스트 | 합성 데이터와 공개 출처로 새 계약·안전 정책을 검증하는 130개 테스트 |

31개 별칭을 verified처럼 복사하거나 WiFi 7을 무조건 WiFi로 합치지 않았습니다. scoped alias 기능은 confirmed/provenance Schema와 synthetic regression으로 구현했습니다. 현재 공개 데이터는 별칭을 비우고 원본은 보존합니다.

`legacy-comparison.json`: 입력 이름이 있는 lookup 60건에서 review 50, blank 10을 관찰했습니다. 회사 식별자만 있는 1건은 공개 입력으로 자동 변환하지 않았습니다. Static audit 34건은 페이지 근거 없이 pass하지 않습니다. 이 수치는 baseline regression의 FAIL 수가 아니라 의도한 정책 변경 결과입니다. source ranking의 전 후보 차단 blank는 새 계약에서 review로 수정했습니다.

## 4. public/private separation

원본 CSV, source-product 번호, 내부 검수 로그, 원본 Skill/설계 문서와 ZIP은 공개 프로젝트 밖에 있습니다. 공개 규칙은 일반 오답 패턴을 필드 allowlist로 재표현했으며 private mapping은 사용하지 않습니다. Private Overlay는 명시적인 옵션으로만 로드하고 Git ignore/release allowlist에서 제외했습니다. public lookup은 private 내용을 반환하지 않습니다. Private review는 별도 allowPrivateResearch 허용 없이 외부 Provider로 넘어가지 않습니다.

원본 코드/일반화 정책에 대한 재배포 권한까지 법적으로 확인했다고 주장하지 않습니다. 해당 권한과 프로젝트 LICENSE는 공개 전 maintainer 확인 항목입니다.

## 5. Registry counts

Vendor **51**, unique official-domain 후보 **85**, rules **58**, ecosystems **24**, public exact models **2**, public model aliases **0**. exact models는 ASUS PRIME A520M-K ARGB와 Canon PIXMA E3470입니다. 두 페이지를 제한된 실제 fetch로 확인하고, DOM 숨김 콘텐츠 제외 후 Core Audit로 다시 검증했습니다.

Schema/conflict validation과 registry compile **Passed**. Lifecycle active/deprecated/retired/replaced/needs-refresh 및 successor 지원; HTTP 200만으로 active 판정하지 않습니다. Ecosystem 24개는 needs-refresh이며 Offline auto-fill을 막습니다.

## 6. Search Providers

Mock, SerpAPI, Generic HTTP 구현. 최대 20개 candidate 계약, schema/크기 검사, private metadata 제거, official domain 하드 필터와 configurable scoring 적용. OpenAI Web Search unified adapter는 이번 버전 **Not implemented**인 선택 항목입니다.

## 7. Judge Providers

Mock, OpenAI Responses, Generic HTTP, Command 구현. OPENAI_MODEL은 필수 환경/config 값이며 모델 ID default가 없습니다. Responses strict Structured Output, store=false, advisory candidate ID whitelist, refusal/incomplete/invalid response → review. Gemini/DeepSeek/Qwen/Claude는 Generic Gateway 또는 Command 계약으로 연결할 수 있으며 native API 전용 adapter가 구현됐다고 주장하지 않습니다.

## 8. serpapi-openai-judge test result

**Passed:** 실제 SerpAPI/OpenAI Provider 클래스에 synthetic HTTP 응답을 주입해 Registry miss → Search → Hard Filter → Score → Top 5 → Structured Judge → 독립 Core fetch/Audit → fill 검증. 잘못된 리비전/WAF/빈 응답/바이너리·attachment 응답/조작된 confidence는 review. 동일 근거의 provider wrapper를 바꿔도 Core 결과 동일.

유료 SerpAPI/OpenAI 실호출은 **Not run / 3 SKIP**. 현재 process에 필요한 key/model 변수는 없었습니다. 다른 프로젝트의 credentials를 찾거나 사용하지 않았습니다.

## 9. deterministic tests PASS/FAIL/SKIP

| suite | PASS | FAIL | SKIP |
|---|---:|---:|---:|
| 원본 golden | 104 | 0 | 0 |
| 원본 rule integrity | 4 | 0 | 0 |
| 새 v0.1.0 deterministic | 130 | 0 | 0 |
| optional paid/network | 0 | 0 | 3 |
| 합계 | **238** | **0** | **3** |

실행 환경은 Windows/Node 24.13.1, Python 3.11.9입니다. Command/MCP stdio 프로세스 테스트는 실행 sandbox의 spawn 제한 밖에서 실제 로컬 subprocess로 실행했습니다. 기본 CI는 keys/network 없이 실행하도록 구성했습니다. GitHub Actions Ubuntu/Windows + Node 22/24 matrix의 실제 hosted 실행은 **Not run**입니다.

## 10. Skill validation

공식 skills-ref 0.1.0(공식 source commit 고정)으로 canonical Skill 및 생성된 Plugin Skill **Passed**. SKILL.md naming/frontmatter, reference 분리, Core wrapper 실행 확인. Claude Code와 Codex가 같은 Skill을 사용하며 Claude API Live Research를 code-execution container의 curl에 의존시키지 않습니다.

Agent host UI에 설치하고 자동 선택되는 동작, Claude API custom Skill upload는 **Needs verification / Not run**입니다.

## 11. Plugin package validation

Portable root plugin.json, mcp.json, skills/, runtime/ 생성. 공식 Agent Plugins 1.0.0 manifest/MCP JSON Schema로 Ajv2020 **Passed**. `.codex-plugin/plugin.json` fallback, PLUGIN_ROOT runtime 경로와 Skill hash 일치 검사 **Passed**. Plugin npm ci 후 실제 wrapper resolve 실행 **Passed**. 설치된 node_modules가 이후 release ZIP에 들어가지 않도록 explicit file allowlist를 사용합니다.

Codex Plugin 설치 UI/end-to-end host activation은 **Needs verification**입니다.

## 12. MCP / HTTP / CLI tests

**Passed:** 공식 MCP v2 server/client 2.2.0, 실제 CLI stdio transport 연결, read-only 6 Tools + 별도 opt-in research Tool, structuredContent/outputSchema 검증. HTTP 모든 base routes, vendor/ecosystem lookup, batch, audit, auth/origin/body bounds 테스트. CLI resolve/audit/registry/CSV/offline/legacy/discovery, quoted multiline CSV, 결과 identity, overwrite 방지, 조직 Generic Adapter 테스트.

API/MCP read-only resolve는 Offline이며 research를 별도 명시해야 외부 호출이 가능합니다. 실제 회사 DB/ERP/API는 구현하거나 호출하지 않았습니다.

## 13. Security tests

**Passed:** SSRF scheme/private IP/DNS 전체 답변 검사/IP pinning/redirect target 재검사, HTTPS downgrade·cross-origin credential 차단, response·timeout·concurrency bounds, prompt instruction을 데이터로 처리, direct-file/extensionless binary/attachment 차단, private early-return provenance, 숨긴 HTML 콘텐츠와 링크 제외, exact punctuation/cache 분리, malformed URL review, lifecycle, CSV formula escape, 공개 allowlist·secret/private pattern scan.

Runtime npm advisory 최초 moderate 1건(csv-parse)을 확인해 7.0.3으로 수정했고 재검사에서 **0건**입니다. HTML parser 추가 후에도 **0건**을 관찰했습니다. scanner는 모든 민감 free text를 보장하는 자동 감사가 아니며, 외부 CSS/동적 JS의 실제 화면 상태와 브라우저 전용 사이트는 Needs verification입니다.

## 14. README examples verified

한국어 README의 CLI/CSV/Offline, audit, registry, discovery, Pipeline YAML parsing, Generic HTTP/Command, 실제 Core wrapper, OpenAI/Claude host Tool handler, MCP stdio 및 HTTP 요청을 해당 구현 코드로 실행했습니다. 유료 native API나 host UI를 실제 검증한 명령처럼 쓰지 않고 별도 미실행 범위를 표시했습니다. source/Skill/Plugin ZIP 및 npm tarball 설치 smoke도 실행했습니다.

## 15. unresolved / needs-refresh

- Ecosystem **24개** needs-refresh.
- 공식 페이지 refresh 10개 중 **2 Passed / 8 Needs verification**. ASUS/Canon만 active exact. ASRock/Epson/Brother는 모델·download 근거 불충분, Intel WAF, HP/MCHOSE fetch unavailable, VGN 404, Akko는 공통 download page만 확인했습니다.
- 원본 **1,549 catalogue mappings + 31 regional aliases**는 provenance/호환 근거 보류. public 자동 판정을 재현하기 위해 원본 회사 매핑을 공개하지 않았습니다.
- 실제 paid calls, host UI activation, Linux/Node22 hosted CI, browser-rendered compatibility, 기존 자료의 재배포 권리는 maintainer 검토 범위입니다. 프로젝트 라이선스는 MIT로 선택 완료했습니다.

## 16. release artifacts

`dist/`에 생성:

1. hardware-software-url-finder-v0.1.0-source.zip — public 후보 source + tests/docs/CI + aggregate reports
2. hsuf-agent-skill-v0.1.0.zip — canonical Agent Skill
3. hsuf-codex-plugin-v0.1.0.zip — Portable Plugin + compatibility manifest + runtime
4. hardware-software-url-finder-0.1.0.tgz — 실제 npm pack 로컬 설치용
5. SHA256SUMS.txt
6. release-manifest.json

ZIP CRC/경로/private 제외 검사 **Passed**. 최종 bytes/hash는 self-reference를 피하기 위해 dist/release-manifest.json과 SHA256SUMS.txt에 기록합니다. 최종 보고서는 자체 hash를 포함하지 않습니다.

## 17. license decision

**Passed:** maintainer 승인에 따라 표준 MIT LICENSE를 추가했습니다. Copyright (c) 2026 HoMongYi. package.json 및 package-lock.json의 license는 MIT이며 임시 private 필드는 제거했습니다. 의존성/제조사 자료의 권리는 각 권리자의 조건을 따릅니다. npm publish는 실행하지 않았습니다.

## 18. GitHub publish checklist

- [x] Maintainer가 MIT를 선택했고 LICENSE와 공개 metadata를 적용했다. 기존 코드/일반화 정책의 재배포 권리 검토는 maintainer 책임이다.
- [ ] Public exact 출처·검증일과 24개 needs-refresh, 보류 mapping/aliases 수량을 확인한다.
- [ ] 공개 대상은 v0.1.0 repository/allowlisted artifacts뿐임을 확인한다. sibling bundle/baseline/원본 ZIP/private overlay/local logs는 제외한다.
- [ ] 원하는 Codex/Claude Code host에 Skill/Plugin을 설치해 활성화한다.
- [ ] 필요하면 테스트용 별도 credentials로 opt-in live Provider 테스트를 실행한다.
- [ ] 조직의 실제 integration·권한·배치·개인정보 경계를 해당 개발팀이 검토한다.
- [x] 대상 저장소는 HoMongYi/hardware-software-url-finder, 예정 Tag는 v0.1.0으로 확정했다. Source Root에 .git은 없고 commit/remote/tag/push/release는 만들지 않았다.
- [ ] 승인 후 push하고 hosted CI matrix를 확인한다. 그 뒤 별도 승인으로 v0.1.0 public release를 publish한다.

이번 별도 공개 Source Root에는 Git을 초기화하지 않았습니다. 구현·검증·패키징과 Tag/Release Notes 준비만 수행했습니다. 체크리스트는 공개 전 검토 사항이며, 작업 중 단순 진행 승인을 요청하지 않았습니다.

## Public Release Finalization — 2026-10-02

1. **MIT License — Passed.** Root, canonical Skill, Plugin root/runtime와 npm tarball에 동일한 MIT 전문을 포함합니다. 라이선스 미정 문서와 packaging test/manifest 전제를 수정했습니다.
2. **Public package metadata — Passed.** name hardware-software-url-finder, version 0.1.0, license MIT, repository/homepage/bugs를 대상 GitHub로 설정했습니다. private 필드는 제거했습니다. bin/exports/engines/files와 lockfile을 대조했습니다.
3. **Tests — Passed.** 원본 golden 104 + integrity 4, 공개 deterministic 130, FAIL 0. 유료 테스트 3 SKIP. 합계 238 PASS / 0 FAIL / 3 SKIP. 공개 metadata/flat ZIP/MIT inclusion 회귀 테스트를 추가해 기존 전제에서 RED, 수정 후 GREEN을 확인했습니다.
4. **Registry — Passed.** 51 vendors / 85 domain candidates / 58 rules / 24 ecosystems / 2 active exact models / 0 public aliases. 모든 ecosystem은 needs-refresh입니다. active 2개의 공개 provenance/source URL/verified_at이 기존 refresh report와 일치하며 날짜를 새로 덮어쓰지 않았습니다.
5. **Unresolved — Needs verification.** 공식 페이지 후보 8개와 ecosystem 24개는 미확인 상태를 유지합니다. source catalogue mapping 1,549행과 aliases 31개는 이관하지 않았습니다.
6. **Source ZIP leak scan — Passed.** 새 ZIP은 package.json/README/LICENSE가 archive root에 있습니다. .git/node_modules/.cache/.env/data/private/exports/원본 confirmed CSV/개발 로그/내부 매핑은 포함하지 않습니다. .env.example은 빈 변수 예시입니다. ZIP을 새 빈 디렉터리에 다시 풀어 GitHub Source Root를 확정했습니다.
7. **Secret scan — Passed.** public allowlist scan 및 네 package 내부 pattern scan findings 0. npm runtime audit advisory 0. 이 검사는 모든 자유 텍스트의 민감성을 법적으로 보증하지 않으며 provenance 검토를 대체하지 않습니다.
8. **SHA-256 — Passed.** 네 최종 package의 크기/해시가 SHA256SUMS와 release-manifest에 일치합니다. CRC/중복 경로/탈출 경로/symlink/금지 파일/MIT/npm metadata도 자동 검사했습니다. 자체 report/manifest는 자기 자신의 hash를 포함하지 않습니다.
9. **Release Assets.** Skill ZIP, Plugin ZIP, npm tgz, SHA256SUMS, release-manifest를 권장합니다. 자체 Source ZIP은 선택 Asset이지만 전체 checksum 검증을 위해 첨부할 수 있습니다. GitHub 자동 Tag Source ZIP과 자체 ZIP의 해시는 다릅니다. Tag v0.1.0, Title Hardware Software URL Finder v0.1.0; Notes는 reports/RELEASE_NOTES_v0.1.0.md 입니다.
10. **External checks — Not run — credentials/environment not available.** SerpAPI/OpenAI paid calls, Claude API Skill Upload, Agent UI 설치. GitHub Hosted CI는 아직 push 전이라 Not run; Linux/Node22 runtime도 별도 environment가 없어 Not run입니다. Mock/Contract와 실제 로컬 MCP stdio/client·HTTP·CLI는 Passed입니다.
11. **Before push checklist.** 아래 내용을 maintainer가 확인한 후 별도로 실행합니다.

- [x] MIT 및 public package metadata 적용
- [x] Source ZIP flat root, private 개발 파일 제외, Secret finding 0
- [x] Tests 0 FAIL, 모든 Release Artifact 재생성, SHA-256 검증
- [x] README CLI/API 예제·Agent wrapper·Provider 계약 대조와 로컬 실행
- [x] CONTRIBUTING, SECURITY 신고 절차, CHANGELOG, Release Notes 작성
- [ ] 대상 remote의 기존 이력을 확인한다. 기존 이력이 있으면 force push하지 않는다.
- [ ] Code/Registry의 출처와 재배포 권리를 확인하고 needs-refresh 범위를 수용한다.
- [ ] 원하는 Codex/Claude host 설치·활성화를 직접 확인한다.
- [ ] 사용자 승인 후 main push하고 Hosted CI matrix를 확인한다.
- [ ] 확인된 commit에 v0.1.0 Tag를 만들고 별도 승인으로 Release를 publish한다.
- [ ] npm publish는 이번 작업 범위에 포함하지 않는다.

공개 절차와 Asset 선택은 docs/PUBLISHING.md를 참고하세요. 실제 GitHub/npm publish는 실행하지 않았습니다.

## GitHub deployment verification — 2026-10-02

Maintainer가 main push, v0.1.0 annotated Tag 및 Public Release publish를 승인했습니다. npm publish와 회사 내부 데이터 공개는 승인 범위에 포함하지 않습니다.

- 최초 공개 main commit: c7076bfa156c25284e8cc3a55715e07ff9a92cdb.
- 최초 CI는 Node 22에서 --test-isolation=none을 지원하지 않아 실패했습니다. Node 24의 전체 검증 단계는 통과했지만 matrix fail-fast로 작업이 취소됐습니다. 이 결과를 공개 전 통과로 숨기지 않았습니다.
- 수정 commit: e3148fe3d260cfb59750f631995319a40422ecd8. 테스트 명령을 node --test --test-concurrency=1 tests/*.test.mjs로 변경하고 matrix fail-fast를 껐습니다. 테스트를 삭제하거나 Node 22 지원을 포기하지 않았습니다.
- 수정 후 Windows 로컬 deterministic130 PASS/0FAIL. Hosted CI의 Ubuntu/Windows × Node22/24 네 조합 모두 Passed; Registry compile/validate, Release Packaging, 공식 Skill validator와 archive/hash audit도 모두 Passed.
- CI: https://github.com/HoMongYi/hardware-software-url-finder/actions/runs/36897853577
- main에서 README가 HTML로 정상 렌더링되고 GitHub가 MIT License를 인식함을 API로 확인했습니다.
- 코드 수정이 들어간 Source/Skill/Plugin/npm Artifact는 배포 전에 다시 생성하고 checksum·size·누출 검사를 실행합니다. 이전 패키징 manifest의 publish 상태는 생성 시점의 기록이며 실제 공개 상태는 GitHub Release API가 기준입니다.
- 이 절 이전의 Hosted CI Not run과 publish Not run 표기는 공개 전 검증 시점의 기록입니다. 유료 호출 3 SKIP, Claude Skill upload, Agent UI 미실행과 needs-refresh/보류 데이터는 그대로 유지합니다.
- Tag/Release 완료 여부와 최종 Git SHA·Asset digest는 배포 마지막 확인에서 별도로 확인합니다. Repository의 이후 문서 수정까지 포함한 최종 main CI도 통과한 뒤에만 Tag를 만듭니다.
