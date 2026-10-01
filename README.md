# Hardware Software URL Finder

제품 이름으로 공식 드라이버나 설정 프로그램을 찾다 보면 비슷한 모델의 지원 페이지, 쇼핑몰, 설치 파일이 한꺼번에 나옵니다. `V2`, `D4`, `WiFi 7` 하나가 다르면 그럴듯한 링크도 오답이 됩니다.

HSUF는 제품 이름으로 공식 소프트웨어 URL을 찾아 판정하는 범용 Node.js 엔진입니다. 실제 PC 유통·고객지원 업무에서 반복되는 URL 확인 문제를 줄이기 위해 시작한 개인 오픈소스 프로젝트입니다. 특정 회사의 공식 제품이나 사내 시스템이 아닙니다. 먼저 Registry를 보고, 필요한 경우에만 검색합니다. AI를 쓰더라도 후보 비교까지만 맡기고, 마지막 URL은 Core가 따로 확인합니다.

**v0.1.0**은 최초 공개 버전이며 [MIT License](LICENSE)로 제공합니다. 저장소는 [HoMongYi/hardware-software-url-finder](https://github.com/HoMongYi/hardware-software-url-finder)입니다. 현재 산출물은 공개 직전 최종 후보로, GitHub와 npm publish는 실행하지 않았습니다.

```text
Catalog / CSV / Agent
        ↓
HSUF Core
        ↓
Public Registry
        ↓
필요 시 Search / Judge Provider
        ↓
Core Audit
        ↓
fill / blank / review
```

## 결과 읽기

| 결과 | 뜻 | URL |
|---|---|---|
| `fill` | 정확 모델과 공식 지원 근거를 확인했습니다. | `primary.url` |
| `blank` | 키캡 같은 수동 부품으로, 소프트웨어가 필요하지 않습니다. | 없음 |
| `review` | 모델, 호환성, 리비전 또는 확인 근거가 부족합니다. | 없음 |

검색 실패나 후보가 모두 차단된 상황도 `review`입니다. `verified_at`은 페이지/Registry의 검증일입니다. 실행한 날짜로 덮어쓰지 않습니다.

## 설치와 CLI

Node.js **22 이상**이 필요합니다. 압축을 푼 프로젝트 폴더에서 실행합니다.

```bash
npm ci --ignore-scripts --no-audit --no-fund
node bin/hsuf.mjs --help
node bin/hsuf.mjs resolve "[Canon] PIXMA E3470" --offline
node bin/hsuf.mjs registry validate
```

이 문서의 `node bin/hsuf.mjs`는 패키지의 `hsuf` 실행 파일과 같은 코드입니다. npm 패키지를 설치하면 제공되는 `hsuf` 명령으로 바꿔 쓸 수 있습니다. 여기서는 설치 경로나 shell 설정에 영향을 받지 않는 호출을 사용합니다.

Canon 예제는 직접 확인한 공식 페이지를 Registry에서 찾아 `fill`을 반환합니다. 등록되지 않은 제품을 억지로 확정하지는 않습니다.

URL만 검사하려면 다음 명령을 사용합니다. 이 명령은 저장된 Registry/URL 정책을 검사하며 페이지를 새로 가져오지 않습니다. 페이지 근거가 없는 URL은 `review`로 남습니다.

```bash
node bin/hsuf.mjs audit "https://asia.canon/en/support/PIXMA%20E3470/model" --name "[Canon] PIXMA E3470"
```

배포용 tarball을 로컬로 설치한 경우 같은 실행 파일을 `hsuf resolve`, `hsuf audit`, `hsuf registry validate`, `hsuf mcp`, `hsuf serve`로 호출할 수 있습니다. v0.1.0 npm registry publish는 아직 하지 않았으므로 이 문서는 npm registry 설치를 전제로 하지 않습니다.

## CSV와 Offline

CSV는 UTF-8이며 다음 헤더를 사용합니다. `product_name`이 필수이고 나머지는 선택입니다.

```csv
input_id,product_name,category
SYNTHETIC-001,[Canon] PIXMA E3470,printer
SYNTHETIC-002,Synthetic keycap set,accessory
```

```bash
node bin/hsuf.mjs resolve examples/generic-catalog.csv --offline
node bin/hsuf.mjs resolve examples/generic-catalog.csv --offline --output result.csv
node bin/hsuf.mjs resolve examples/generic-catalog.csv --offline --output legacy.csv --legacy
```

출력 파일이 이미 있으면 덮어쓰지 않습니다. 다른 파일명을 쓰세요. 기본 CSV에는 `decision`과 `reason_codes`가 있고, `--legacy`는 `input_id,product_name,url` 세 컬럼만 만듭니다. blank/review의 URL은 빈칸입니다. CSV 수식으로 실행될 수 있는 셀은 이스케이프합니다.

아무 Provider 옵션도 주지 않으면 Offline이 기본입니다. Offline은 외부 DNS·HTTP·LLM을 호출하지 않습니다. 현재 예제 CSV의 결과는 fill 2개, blank 1개, review 1개입니다. 한 번에 최대 1,000행/4 MiB를 처리합니다.

## SerpAPI + OpenAI Judge

```text
제품 → Registry → 미확정 제품만 SerpAPI
     → 차단 필터 → 점수제 → 상위 5개
     → 필요할 때 OpenAI Judge → Core의 독립 페이지 Audit
```

호스트 환경에 `SERPAPI_API_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL`을 설정합니다. 모델 이름을 코드에 고정하지 않습니다. 자신의 계정에서 사용 가능한 모델 중 비용과 후보 판별 성능을 비교해 선택하세요. 특정 모델 사용을 강제하지 않습니다. `.env.example`은 변수 이름만 제공하며 `.env` 자동 로딩도 하지 않습니다.

```bash
node bin/hsuf.mjs resolve examples/generic-catalog.csv --pipeline serpapi-openai-judge --output researched.csv
node bin/hsuf.mjs resolve examples/generic-catalog.csv --config examples/serpapi-openai-judge.example.yaml
```

이 명령의 설정 파싱과 Provider 요청/응답은 테스트했습니다. 실제 유료 API 실호출은 **Not run**입니다. 기본 테스트는 실제 SerpAPI/OpenAI Provider 클래스에 가짜 HTTP 응답을 주입합니다. 따라서 키·요금·계정별 모델 사용 가능 여부를 검증했다고 보지는 않습니다.

Registry hit에는 Judge를 호출하지 않습니다. 후보가 하나면 Core가 바로 검증하고, 공식 후보가 여러 개라 비교가 필요하면 Judge를 씁니다. Judge의 confidence나 추천 URL로 Core의 review를 바꿀 수 없습니다. 점수는 [config/scoring.yaml](config/scoring.yaml), 후보 수는 Pipeline YAML에서 조정합니다. Hard Reject는 점수보다 우선합니다.

## Gemini · DeepSeek · Qwen · 자체 LLM

Search와 Judge는 독립 인터페이스입니다. Core에는 LLM SDK가 필요하지 않습니다.

| 종류 | 구현 |
|---|---|
| Search | Mock, SerpAPI, Generic HTTP |
| Judge | Mock, OpenAI Responses, Generic HTTP, Command |

Generic HTTP는 각 업체의 API에 바로 같은 JSON을 보내는 기능이 아닙니다. **자신의 Gateway가 HSUF 계약을 받아 선택한 LLM API로 바꾸는 구조**입니다. `HSUF_SEARCH_ENDPOINT`, `HSUF_JUDGE_ENDPOINT`와 필요한 token 환경변수를 설정합니다. 공개 HTTP(S) endpoint만 사용하며 localhost·사설 IP는 Fetcher가 차단합니다.

```bash
node bin/hsuf.mjs resolve examples/generic-catalog.csv --config examples/generic-http.example.yaml
node bin/hsuf.mjs resolve examples/generic-catalog.csv --config examples/command-judge.example.yaml
```

Command는 지정한 실행 파일에 JSON stdin을 보내고 JSON stdout을 읽습니다. shell을 사용하지 않고 시간·출력 크기를 제한합니다. API 키 환경변수는 자식 프로세스에 자동 전달하지 않습니다. 실제 LLM 연결은 Gateway의 별도 secret store에서 처리하세요. 예제 Command는 항상 review를 반환하며 유료 API를 호출하지 않습니다.

Search는 `{ candidates: [{ url, title, snippet }] }`, Judge는 `{ decision: "candidate" 또는 "review", candidate_id, reason_codes, uncertainties }`를 반환합니다. 새 URL을 만들어 반환하면 계약을 통과할 수 없습니다. [Provider 계약](docs/PROVIDERS.md)에 전체 형식이 있습니다.

## Codex와 Claude Code

같은 [canonical Skill](skills/hardware-software-url-finder/SKILL.md)을 사용합니다. Skill은 작업 순서를 알려주고 실제 판정은 Core/CLI/MCP가 맡습니다.

Codex의 project Skill 위치는 `.agents/skills/hardware-software-url-finder`, personal 위치는 `~/.agents/skills/hardware-software-url-finder`입니다. Claude Code는 project `.claude/skills/hardware-software-url-finder`, personal `~/.claude/skills/hardware-software-url-finder`를 사용합니다. 해당 폴더에 canonical Skill 디렉터리를 복사하고 `HSUF_HOME`을 이 Core 프로젝트 경로로 설정합니다.

```bash
node skills/hardware-software-url-finder/scripts/hsuf.mjs resolve "[Canon] PIXMA E3470" --offline
```

설치 후에는 “hardware-software-url-finder로 이 CSV를 확인하고 애매한 모델은 review로 남겨줘”처럼 요청할 수 있습니다. 공식 `skills-ref` frontmatter 검증과 wrapper 실행은 **Passed**입니다. Codex/Claude Code UI에서 설치 후 자동 선택까지는 **Needs verification**입니다.

Codex Plugin은 canonical Skill에서 빌드합니다.

```bash
npm run release:build
```

`dist/hsuf-codex-plugin-v0.1.0.zip`에 root `plugin.json`, `mcp.json`, `skills/`, `runtime/`와 `.codex-plugin/plugin.json` 호환 manifest가 들어 있습니다. 압축을 풀고 `runtime`에서 `npm ci --ignore-scripts --no-audit --no-fund`로 의존성을 설치합니다. Portable manifest와 MCP 설정은 공식 Schema로 검사합니다. **Plugin 설치 UI 자체는 아직 검증하지 않았습니다.**

## OpenAI API와 Claude API

API를 사용하는 호스트는 [examples/agent-api-bridge.mjs](examples/agent-api-bridge.mjs)의 Tool 정의와 handler를 연결할 수 있습니다. OpenAI Responses의 `function_call`은 `handleOpenAI`, Claude의 `tool_use`는 `handleClaude`가 같은 Core를 호출합니다.

```js
import { handleOpenAI, handleClaude } from './examples/agent-api-bridge.mjs';

const openAIResult = await handleOpenAI({
  name: 'resolve_hardware_software_url', call_id: 'example-call',
  arguments: JSON.stringify({ product_name: '[Canon] PIXMA E3470' })
});
const claudeResult = await handleClaude({
  name: 'resolve_hardware_software_url', id: 'example-call',
  input: { product_name: '[Canon] PIXMA E3470' }
});
```

handler와 Tool 결과 형식은 로컬로 실행 확인했습니다. 실제 Messages/Responses 계정 실호출이나 Claude Skill upload는 **Not run**입니다. Claude API의 Skill code-execution container에는 외부 네트워크가 없으므로 Live Research는 호스트의 Custom Tool 또는 MCP에서 실행하세요. Node Core를 그 컨테이너에 설치할 수 있다고 가정하지 않습니다.

## MCP

```bash
node bin/hsuf.mjs mcp
```

stdout은 MCP 메시지 전용입니다. MCP host의 stdio command는 `node`, args는 `["/absolute/path/to/hsuf/bin/hsuf.mjs", "mcp"]`로 설정합니다. 기본 MCP에는 다음 read-only Tool 6개가 있습니다.

- `resolve_hardware_software_url`
- `resolve_hardware_software_urls`
- `audit_hardware_software_url`
- `lookup_hardware_vendor`
- `lookup_software_ecosystem`
- `get_registry_status`

Structured Output Schema를 제공하며 공식 MCP v2 클라이언트의 실제 stdio 연결로 테스트했습니다. 네트워크 조사가 필요하면 `mcp --pipeline serpapi-openai-judge`로 실행해 별도 `research_hardware_software_url` Tool을 노출합니다. Resolve Tool은 계속 Offline입니다.

## HTTP API

```bash
node bin/hsuf.mjs serve --port 8787
```

기본 주소는 `http://127.0.0.1:8787`입니다. 실제 사용한 요청 예시는 다음과 같습니다.

```js
const response = await fetch('http://127.0.0.1:8787/v1/resolve', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ input_id: 'SYNTHETIC-001', product_name: '[Canon] PIXMA E3470' })
});
const result = await response.json();
```

| Method | 경로 | 입력 |
|---|---|---|
| GET | `/health` | 없음 |
| POST | `/v1/resolve` | 제품 한 개 |
| POST | `/v1/resolve/batch` | `{ "items": [...] }` |
| POST | `/v1/audit` | `{ "url": "...", "product": { "product_name": "..." } }` |
| GET | `/v1/vendors/:id` | public Vendor ID |
| GET | `/v1/ecosystems/:id` | public Ecosystem ID |

모든 기본 route는 Offline입니다. `serve --pipeline serpapi-openai-judge`는 별도 `POST /v1/research`를 켭니다. loopback 밖에 bind하려면 `HSUF_HTTP_TOKEN`이 필요하고 모든 요청에 Bearer 인증을 요구합니다. 브라우저 Origin은 허용하지 않습니다. [API 계약](docs/API.md)에 크기·동시성 제한과 오류 형식이 있습니다.

## 기존 DB에 연결하기

```text
SKU / Product Name → 조직의 Input Adapter → HSUF
                   → 조직의 Result Adapter → Internal System
```

Core는 `input_id + product_name + category(optional)`만 알면 됩니다. 회사 DB의 테이블, ERP endpoint, 인증, 저장·운영 배치 방식은 해당 조직 개발팀이 결정합니다. [Integration Guide](docs/INTEGRATION.md)는 이 경계를 설명하고 DB 구조를 가정하지 않는 JavaScript Adapter 예제를 제공합니다.

비공개 확정값이 필요하면 같은 Vendor Schema의 파일을 `data/private/`에 두고 `--private data/private`로 명시적으로 켭니다. 이 경로는 Git과 release allowlist에서 제외됩니다. public lookup에는 private 내용을 돌려주지 않습니다.

## Vendor와 Software Ecosystem 추가

`data/public/vendors/<vendor-id>.json`에 공식 도메인, 정확 모델, 호환 모델/제외 목록, lifecycle, 공개 출처와 검증일을 기록합니다. 글로벌·중국 제조사도 같은 형식을 씁니다. 독립적으로 확인한 모델 별칭만 `model_aliases`에 추가하세요.

```bash
node bin/hsuf.mjs registry validate
node bin/hsuf.mjs registry build
npm test
```

Schema → conflict 검사 → compile 순서이며 [Registry Guide](docs/REGISTRY.md)에 실험용 Vendor 예제가 있습니다. `active / deprecated / retired / replaced / needs-refresh`와 successor를 지원합니다. HTTP 200만으로 active가 되지는 않습니다.

## Marketplace와 보안

Amazon, Newegg, Taobao/Tmall, JD, AliExpress는 발견용입니다. Final URL로 확정하지 않습니다. 사용자가 제공한 discovery JSON/CSV는 다음처럼 가져올 수 있습니다.

```bash
node bin/hsuf.mjs discovery import examples/discovery.json
```

SSRF, DNS의 private IP, 리다이렉트, direct binary, prompt injection을 테스트합니다. Fetcher는 12초·1 MiB·최대 4 redirect·제품당 순차 실행이 기본이며 CAPTCHA를 우회하지 않습니다. 보안 경계와 한계는 [SECURITY.md](SECURITY.md)에 있습니다.

## v0.1.0의 현재 한계

기존 v2.2.1 baseline은 104 golden + 4 integrity 테스트가 통과했습니다. 공개 Registry에는 현재 Vendor 51개, 도메인 85개, 규칙 58개, Ecosystem 24개와 독립 검증한 exact record 2개가 있습니다. Ecosystem 24개는 `needs-refresh`이며 아직 자동 fill하지 않습니다. 원본 상품번호 매핑 1,549행과 지역 별칭 31개는 공개 권한/호환 근거가 확인되지 않아 보류했습니다. 원본은 공개 패키지에 없습니다.

단순 버전 변경으로 모든 기존 매핑이 “공개 검증 완료”가 됐다고 주장하지 않습니다. 정확한 Registry를 늘리려면 공식 호환 근거를 하나씩 확인해야 합니다. OpenAI Web Search unified adapter는 이번 버전에 넣지 않았습니다. paid Provider 실호출, Agent host UI 설치, 다른 OS 실행은 별도 검증 항목입니다.

```bash
npm test
npm run validate
npm run release:build
npm run test:live
```

기본 테스트에는 API key나 외부 네트워크가 필요 없습니다. `test:live`는 `HSUF_RUN_PAID_TESTS=1`과 세 Provider 환경변수가 있을 때만 실행하고, 그렇지 않으면 SKIP합니다. [최종 검증 보고서](reports/FINAL_REPORT.md)에 관찰한 결과와 공개 전 체크리스트를 기록합니다.

새 Vendor나 규칙을 기여하려면 [CONTRIBUTING.md](CONTRIBUTING.md)를 읽어주세요. GitHub 업로드와 Tag/Release 준비는 [공개 가이드](docs/PUBLISHING.md), 이번 버전의 변경 사항은 [CHANGELOG.md](CHANGELOG.md)와 [Release Notes](reports/RELEASE_NOTES_v0.1.0.md)에 정리했습니다.
