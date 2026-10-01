# Hardware Software URL Finder v0.1.0

First public release · MIT License · Tag: `v0.1.0`

제품 이름이나 CSV에서 공식 드라이버·설정 프로그램 URL을 찾아 `fill / blank / review`로 돌려주는 범용 엔진입니다. 실제 PC 유통·고객지원 업무의 반복적인 URL 확인 문제에서 시작한 개인 오픈소스 프로젝트이며, 특정 회사의 공식 제품이 아닙니다.

## 포함된 기능

- Registry 우선 Offline Core와 정확 모델·리비전·SKU 보호
- Public Registry와 선택적인 Private Overlay 분리
- 독립 URL/page Audit, Lifecycle과 공식 출처 확인
- Hard filter → Candidate Scoring → Top 5 → Judge → Core Audit
- SerpAPI Search, OpenAI Responses Judge, Mock 및 Generic HTTP/Command Provider
- 환경변수 `OPENAI_MODEL`로 Judge 모델 선택
- CLI·CSV·legacy export, 로컬 HTTP API, MCP
- Codex/Claude Code 공통 Agent Skill과 Codex Plugin 패키지
- 조직별 Input/Result Adapter 가이드

HSUF는 조직의 DB Schema, ERP API나 인증 방식을 정의하지 않습니다. LLM의 URL 추천만으로 fill을 확정하지 않습니다. Marketplace는 discovery-only입니다.

## Registry 범위와 한계

Vendor 51개, 도메인 후보 85개, 규칙 58개, Software Ecosystem 24개, active exact model 2개, public alias 0개입니다.

active exact model은 ASUS PRIME A520M-K ARGB와 Canon PIXMA E3470입니다. 기존 공개 제조사 페이지 검증일은 2026-10-01이며 이번 공개 마무리 작업에서 날짜를 새 검증일로 바꾸지 않았습니다. Ecosystem 24개는 needs-refresh이고 공식 페이지 후보 8개는 추가 확인이 필요합니다. 이 항목들은 Offline 자동 fill 대상으로 올리지 않았습니다.

회사 confirmed mapping 1,549행과 별칭 31개는 공개 근거 부족으로 제외했습니다. 원본 회사 CSV, Private Overlay, credentials와 개발용 캐시는 Release에 없습니다.

## 검증

최종 합계는 **238 PASS / 0 FAIL / 3 SKIP**입니다. 원본 golden 104 + integrity 4, 공개 deterministic 130이며 유료 3개는 실행 조건이 없어 SKIP했습니다. 최종 실행 결과는 [FINAL_REPORT](https://github.com/HoMongYi/hardware-software-url-finder/blob/v0.1.0/reports/FINAL_REPORT.md)와 [verification.json](https://github.com/HoMongYi/hardware-software-url-finder/blob/v0.1.0/reports/verification.json)을 참고하세요. CLI/CSV/HTTP/MCP와 Provider Mock/Contract 테스트, 공개 파일·secret 검사, ZIP CRC 및 SHA-256를 확인했습니다.

실제 유료 SerpAPI/OpenAI 호출, Claude API Skill Upload, Codex/Claude UI 설치는 **Not run — credentials/environment not available**입니다. [GitHub Hosted CI](https://github.com/HoMongYi/hardware-software-url-finder/actions/runs/36897853577)의 Ubuntu/Windows × Node 22/24 네 조합은 모두 **Passed**입니다. 각 조합에서 deterministic 130개와 Registry·Release Packaging·Skill 검증을 통과했습니다. 최초 Node 22 테스트 옵션 오류는 호환되는 테스트 실행 명령으로 수정했습니다.

## Release Assets

- hsuf-agent-skill-v0.1.0.zip
- hsuf-codex-plugin-v0.1.0.zip
- hardware-software-url-finder-0.1.0.tgz — 로컬 설치용; npm registry publish는 하지 않음
- SHA256SUMS.txt
- release-manifest.json

GitHub는 Tag에서 Source Code ZIP/TAR를 자동 생성합니다. 자체 `hardware-software-url-finder-v0.1.0-source.zip`은 root가 평탄하고 공개 allowlist와 해시가 검증된 선택 Asset입니다. 전체 SHA256SUMS 검증을 위해 함께 첨부할 수 있습니다. GitHub 자동 Source 압축파일과 자체 ZIP의 해시는 같지 않습니다.

Node.js 22 이상이 필요합니다. 설치와 사용법은 repository README를 참고하세요.
