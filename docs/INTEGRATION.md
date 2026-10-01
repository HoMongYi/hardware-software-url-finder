# 조직 개발팀을 위한 Integration Guide

HSUF는 내부 Catalog, DB, ERP, 인증을 구현하지 않습니다. 조직이 이미 가진 읽기 함수와 결과 처리 함수 사이에 Generic Adapter를 넣으세요.

```text
Internal Catalog → Input Adapter → HSUF Core
                 → Result Adapter → Internal System
```

입력은 제품 이름과 선택적인 category면 됩니다. input_id에는 해당 조직이 사용하는 opaque 식별자를 둘 수 있고, 이 값은 결과에서 그대로 돌려줍니다. Search/Judge에는 input_id와 metadata를 보내지 않습니다. 실제 상품명에 민감한 정보가 포함돼 있다면 외부 Provider를 켜기 전에 조직 보안 기준에 따라 분리하세요.

실행 가능한 DB 비의존 예제는 [../examples/integration-adapter.mjs](../examples/integration-adapter.mjs)입니다. `readCatalog()`와 `acceptResult()`는 조직이 소유한 함수입니다. 예제는 테이블·SQL·ERP 경로를 가정하지 않습니다.

blank는 소프트웨어가 필요 없다는 판정이고, review는 미확인입니다. legacy CSV에서는 둘 다 URL이 빈칸이므로 운영 상태 구분이 필요하면 structured result 또는 기본 CSV의 decision을 보관하세요. 자동 쓰기, 권한, 검수 승인, 변경 이력, 재검증 주기와 롤백은 조직에서 구현해야 합니다.

Private Overlay는 same-schema JSON을 `data/private/` 등에 보관하고 CLI `--private DIR`로 로드합니다. 외부 파일에는 권한을 제한하고 백업을 유지하세요. 공개 exact와 private exact가 모두 있으면 private가 우선입니다. Public Registry 없이는 private 대상 Vendor를 식별할 수 없는 상황은 안전하게 review합니다. 신규 Vendor부터 필요한 조직은 먼저 공개 generic Vendor 정의나 별도 검증된 host Registry를 구성하세요.

기존 Search API → 점수 → LLM 시스템은 유지해도 됩니다. Search/Judge 객체를 Provider 계약에 맞추고 마지막 판정을 HSUF Core로 연결하면 됩니다. API/LLM의 기존 confidence를 final truth로 넘기지는 않습니다.

이 프로젝트는 내부 시스템을 호출하는 코드를 제공하지 않습니다. Host가 결과를 어느 API나 DB에 기록할지는 그 개발팀의 설계와 승인이 필요합니다.
