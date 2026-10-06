# Teacher Correction MVP — Preview 검증 결과

검증 완료일: 2026-10-06 (Asia/Seoul).

## 1. Git

- Branch: feat/teacher-correction-mvp
- 구현 commit: 870411e — feat: add teacher correction mvp
- 배포 코드 commit: 2838a327ddc590de113adc0f7a2577234a7b2ecb — chore: exclude local artifacts from preview uploads
- Remote push: SUCCESS
- Remote branch: https://github.com/hellolinkproject-code/octopus-topic-mvp/tree/feat/teacher-correction-mvp
- Preview와 production이 같은 Blob 연결을 사용하므로 preview/{branch hash}/ namespace를 추가했다. 학습 사용자와 첨삭 주문·파일 모두 격리하며 production 저장 경로는 유지한다.
- .vercelignore를 추가하고 deploy --dry로 .env, .vercel, tmp, dist, docs, tests, 로그가 업로드되지 않음을 확인했다.
- 이 보고서의 추가 commit은 문서만 변경한다. 검증한 배포 코드는 위 2838a32이다.

## 2. Verification

- Tests: 18 files / 123 passed / 0 failed.
- Format: PASS.
- Build: PASS.
- 기존 120개 테스트에 production/preview 저장 경로 및 브랜치 격리 테스트 3개를 추가했다.

## 3. Vercel Project

- Project name: octopus-topic-mvp
- Project ID: prj_McEKU2Gb0z10UKCxIrUrbpLx6xOU
- Org ID: team_SCeATFoUJI9txKTVnGLAKT6i
- Local Git repository: hellolinkproject-code/octopus-topic-mvp
- Vercel Git integration: 연결 없음. 자동 배포 대신 CLI Preview 배포.
- Environment: PREVIEW
- octopus-topic-landing과의 혼동 여부: CONFIRMED — 로컬 project.json과 CLI project inspect가 MVP 프로젝트로 일치.

## 4. Preview

- 첫 Preview: https://octopus-topic-gc3z22r46-eeiiii.vercel.app
- 최신 Preview: https://octopus-topic-fo2f6t155-eeiiii.vercel.app
- 최신 Deployment ID: dpl_TBsZCn69wpieRFG6wL8K1faCGSju
- Deployment status: READY / target preview (CLI inspect 확인).
- 동일 코드로 두 번째 Preview를 만들어 새 배포에서도 기존 주문과 파일을 읽는지 검증했다. Production 배포·promote·alias 변경 없음.

## 5. Environment variables

- JWT_SECRET: configured (Preview sensitive).
- BLOB_READ_WRITE_TOKEN: configured.
- OPENAI_API_KEY: missing in Preview. Production 키는 복사하거나 변경하지 않았다.
- OPENAI_MODEL: missing in Preview; 기존 서버 기본 모델을 유지.
- ADMIN_SECRET: configured, Preview 전용 테스트 난수. 값 미출력.
- BANK_NAME / BANK_ACCOUNT / BANK_ACCOUNT_HOLDER: configured, Preview 전용 입금 불가 테스트 안내.
- 실제 secret과 계좌 값은 source/commit/report에 포함하지 않는다. 로컬 검증 설정은 Git 및 배포에서 제외된 .vercel 아래에 보관한다.

## 6. Private Blob — PASS

실제 SDK get/list로 Preview namespace의 ledger와 주문 소속 이미지·PDF 존재를 확인했다. 메모리 저장소 검증으로 대체하지 않았다.

- Order persistence: PASS.
- Image persistence: PASS.
- PDF persistence: PASS.
- Completion refresh/revisit: PASS.
- 새 Serverless 배포에서 주문·이미지·PDF·상태·sentAt 복원: PASS.
- raw Blob URL의 비로그인 접근: 403.
- public API의 Blob path / URL 노출: 없음.

## 7. Customer Flow — PASS

- Landing의 Writing Coach, 53·54, AI + Teacher, 상품 및 설문 12개 확인.
- 54번 29,900원 신청 → 이름/이메일/급수/시험일/입금자명 → 문제 → 답안 및 이미지 → 동의 → 주문 생성 → 완료 화면 확인.
- 필수 입력과 빈 답안 오류 상태 확인.
- 48 business-hour notice 및 토·일·대한민국 공휴일 제외 안내 확인.
- 360 / 768 / 1280px 완료된 폰트·이미지 로딩 후 최종 레이아웃 점검 통과.
- 실제 입금이나 이메일 발송은 하지 않았다.

## 8. Admin Flow — PASS

- 잘못된 secret 거절 / 올바른 secret 인증.
- 주문 목록·상세 및 제출 답안 확인.
- 입금 확인 → in_review → PDF 업로드·다운로드 → completed → sent.
- 각 상태 변경 후 독립 GET에서 저장 확인, 관리자 화면 재인증 후 sentAt 확인.
- PDF 업로드는 실제 Private Blob에 저장되고 새 배포에서도 다운로드 가능.

## 9. Security — PASS

- Server price: amount=100을 전송해도 q54 가격 29,900 적용.
- Admin protection: 비로그인 및 일반 사용자 JWT 접근 거절.
- Public PII: 완료 API는 허용된 최소 필드만 반환. 이름/이메일/답안/문제/파일 경로/관리자 상태 비노출.
- Private Blob exposure: raw 파일 비로그인 조회 403, 관리자 파일 API 비인증 조회 401.
- Duplicate submit: 동일 key로 순차·동시 재요청해도 같은 주문 UUID, ledger에 한 건.
- JPEG: 브라우저 압축 후 실제 업로드 확인. PNG: 직접 API 업로드 확인.
- 지원하지 않는 MIME, 크기 제한 위반, PDF 아닌 report 업로드 거절.
- PDF 및 completed 이전 sent 거절.

## 10. Existing App Regression

- Login: PASS (Preview UI 및 API).
- Dashboard: PASS.
- 53: PASS (화면 + 실제 저장).
- 54: PASS (화면 + 실제 저장).
- Answers: PASS (화면 + 실제 조회).
- AI feedback: NOT TESTED in Preview — OPENAI_API_KEY missing. 기존 자동 회귀 테스트는 통과.
- ko/en/zh/vi/mn/ja 신규 신청 URL 및 영어 fallback 확인.
- 전체 브라우저 점검: 37개 통과. pageerror 0, console error 0.
- 처음 이미지와 폰트가 로딩 중일 때 발생한 검증 스크립트의 조기 판단을 수정했다. 폰트·이미지 로딩이 완료된 최종 레이아웃에서는 overflow나 깨진 이미지가 없었다. 이 문제로 앱 소스 CSS를 수정하지 않았다.

## 11. Logs

- 두 Preview의 최근 런타임 로그를 deployment ID로 조회했다.
- 조회 범위에서 5xx / error / fatal 및 uncaught/Blob/upload 오류 발견 없음.
- 관리자 Secret·키 패턴·테스트 고객 이메일의 로그 노출 발견 없음.
- API 요청의 기대된 400/401/409 거절은 보안 테스트 결과다.
- 로그 점검은 조회한 시간·항목 범위에 한정하며 전체 과거 로그의 무오류를 주장하지 않는다.

## 12. Final Judgment

**NOT READY**

Teacher Correction의 실제 Preview 흐름·Private Blob·새 배포 지속성·보안 검증은 통과했다. Preview OPENAI_API_KEY를 설정하고 기존 AI feedback의 실제 호출 회귀를 확인해야 production review의 미검증 항목을 해소할 수 있다. 현재 계좌는 테스트 안내이며 실제 유료 공개용 설정이 아니다.

main merge, production deploy/promote/alias 변경, 실제 고객 모집은 수행하지 않았다.
