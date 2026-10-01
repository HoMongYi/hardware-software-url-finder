# GitHub 공개 준비

대상은 https://github.com/HoMongYi/hardware-software-url-finder 입니다. 준비 단계는 실제 push나 publish를 실행하지 않습니다. npm publish도 이번 범위에 포함하지 않습니다.

## Source Root

공개용 `dist/hardware-software-url-finder-v0.1.0-source.zip`만 **새 빈 폴더**에 풉니다. 이번 Source ZIP은 한 단계 중첩 없이 package.json, README.md, LICENSE가 바로 보이는 구조입니다. 바깥 개발 ZIP과 개발 작업 디렉터리를 통째로 업로드하지 마세요.

Source Root에는 .git, node_modules, .cache, data/private, exports, .env, 원본 migration bundle을 넣지 않습니다. .env.example은 값 없는 변수 예시로 포함합니다. 의존성을 설치한 경우 node_modules는 Git ignore 대상입니다.

## GitHub 업로드

remote 저장소가 비어 있는지 maintainer가 확인한 뒤 Source Root에서 실행합니다. 기존 remote 이력이 있으면 force push하지 말고 먼저 내용을 대조하세요.

```bash
git init
git branch -M main
git add .
git status --short
git commit -m "feat: initial public release v0.1.0"
git remote add origin https://github.com/HoMongYi/hardware-software-url-finder.git
git push -u origin main
```

위 명령은 사용자가 승인 후 실행할 절차입니다. 준비 작업에서 실행한 명령이 아닙니다. push 후 GitHub Actions의 Ubuntu/Windows, Node 22/24 matrix를 확인하세요.

## Tag와 Release

CI를 확인한 후 해당 최초 공개 commit을 대상으로 Tag를 만듭니다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Release Title: **Hardware Software URL Finder v0.1.0**

Release Notes: `reports/RELEASE_NOTES_v0.1.0.md`

권장 Release Assets:

- hsuf-agent-skill-v0.1.0.zip
- hsuf-codex-plugin-v0.1.0.zip
- hardware-software-url-finder-0.1.0.tgz
- SHA256SUMS.txt
- release-manifest.json

GitHub는 Tag 기준 Source Code ZIP/TAR를 자동 생성하므로 자체 Source ZIP 첨부는 필수가 아닙니다. 다만 자체 Source ZIP은 이 작업에서 CRC·공개 allowlist·MIT·SHA-256까지 확인한 파일이고 GitHub 자동 압축파일과 해시는 다릅니다. **배포 묶음 전체의 SHA256SUMS를 그대로 검증할 수 있도록 자체 Source ZIP도 선택 Asset으로 첨부하는 것을 권장합니다.** 자동 Source ZIP의 해시를 이 SHA256SUMS와 대조하지 마세요.

## 로컬 산출물 검증

```bash
npm run release:build
python scripts/check-artifacts.py
```

네 패키지의 실제 크기와 SHA-256, ZIP CRC, 경로, LICENSE 및 npm metadata를 검사합니다. release-manifest.json과 SHA256SUMS.txt는 그 네 패키지를 설명하는 metadata이므로 자기 자신의 해시를 포함하지 않습니다.

유료 API·Agent UI·GitHub Hosted CI를 로컬 준비 작업에서 검증했다고 주장하지 않습니다. 회사 DB/ERP 연결과 개인정보 경계는 연결하는 조직의 개발팀이 검토합니다.
