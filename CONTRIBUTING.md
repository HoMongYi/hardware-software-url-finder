# 기여하기

제품 URL 하나를 추가하는 기여도 환영합니다. 후보를 많이 모으는 것보다 정확 모델과 공식 출처를 확인하는 것을 우선합니다.

## 시작하기

Node.js 22 이상을 설치하고 다음을 실행하세요.

```bash
npm ci --ignore-scripts --no-audit --no-fund
node bin/hsuf.mjs registry validate
npm test
npm run validate
```

기본 테스트에는 API key와 외부 네트워크가 필요하지 않습니다. 테스트와 예제에는 합성 데이터 또는 출처가 기록된 공개 자료만 사용하세요.

## Vendor / Software Ecosystem

1. 공식 제조사 또는 소프트웨어 제공자의 출처가 필요합니다. source URL을 provenance에 기록하세요.
2. active로 제안하는 레코드에는 실제 확인한 `verified_at`과 정확 모델의 지원 근거가 필요합니다. URL에 모델명이 들어 있거나 HTTP 200이라는 이유만으로 확정하지 마세요.
3. 아직 확인하지 못한 후보는 `needs-refresh`로 두고 `verified_at: null`로 기록합니다. 이 후보가 Offline에서 자동 fill되면 안 됩니다.
4. 지원 리비전, D4/D5, WiFi, SKU, 모델별 호환/제외 범위를 구분하세요. 공용 Ecosystem도 적용 모델 목록이나 family-rule 근거가 필요합니다.
5. Alias는 제조사 근거로 동일 모델임을 확인한 경우에만 Vendor 범위 안에서 추가합니다. 판매명이 비슷하다는 추정은 근거가 아닙니다.
6. Marketplace는 discovery-only입니다. 쇼핑몰·블로그·커뮤니티를 최종 공식 URL로 등록하지 마세요. 제3자 웹드라이버는 공식 모델 페이지의 위임 근거가 필요합니다.
7. 새 Rule이나 판정 변경에는 합성 입력으로 회귀 테스트를 추가해야 합니다. 정확 모델·리비전·Lifecycle·오답 후보를 함께 검증하세요.
8. registry validate와 build를 실행하고 전체 테스트를 통과시킵니다.

Schema와 필드 예제는 [Registry Guide](docs/REGISTRY.md)를 참고하세요. 이 프로젝트의 Lifecycle은 `active / deprecated / retired / replaced / needs-refresh`입니다. 별도의 verified 상태를 만들어 Schema를 우회하지 마세요. verified는 확인 근거와 날짜가 있다는 뜻입니다.

```bash
node bin/hsuf.mjs registry validate
node bin/hsuf.mjs registry build
npm test
npm run validate
```

PR에는 추가한 공식 출처, 확인 날짜, 적용 범위와 실행한 테스트를 적어주세요. 라이브 API를 실행하지 않았다면 그 사실도 적으면 됩니다.

## 공개 데이터 경계

회사 상품번호 매핑, 내부 검수 CSV, 고객·직원 정보, 내부 API 주소, DB dump, Private Overlay, 실제 API key/cookie/session은 기여할 수 없습니다. 조직별 연결은 Input/Result Adapter에서 구현하고 공개 프로젝트에는 범용 계약만 남깁니다.

기여한 코드에는 프로젝트의 [MIT License](LICENSE)를 적용합니다. 외부 자료를 복사하기 전에 재배포 권한과 출처 조건을 확인하세요. 취약점 신고는 [SECURITY.md](SECURITY.md)를 따릅니다.
