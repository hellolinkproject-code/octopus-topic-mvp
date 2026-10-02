# Teacher Correction MVP 작업 결과

## 1. Branch / HEAD

- 저장소: hellolinkproject-code/octopus-topic-mvp (`octopus-topic-mvp-react`)
- 작업 브랜치: `feat/teacher-correction-mvp`
- 최신 origin/main을 fetch한 뒤 새 브랜치 생성.
- 기준 및 현재 HEAD: `ce2e33351f027c49713837298e64e7fa365a47e4`
- 변경은 작업 디렉터리에 있으며 commit / push / merge / tag / 배포하지 않았다.
- 상위 Mission 5 정적 랜딩 저장소는 수정하지 않았다.

## 2. 변경 파일

신규:

- api/_lib/correctionAuth.js
- api/_lib/correctionStore.js
- api/_lib/corrections.js
- api/admin-corrections.js
- api/corrections.js
- src/components/CorrectionShared.jsx
- src/i18n/correctionCopy.js
- src/lib/correctionApi.js
- src/lib/correctionProducts.js
- src/pages/AdminCorrectionsPage.jsx
- src/pages/CorrectionCompletePage.jsx
- src/pages/CorrectionPage.jsx
- tests/correction-blob.test.js
- tests/correction-ui.test.jsx
- tests/corrections.test.js
- docs/TEACHER-CORRECTION.md
- docs/TEACHER-CORRECTION-RESULT.md

수정:

- .env.example, .gitignore, README.md
- index.html, ko/index.html, en/index.html, zh/index.html, vi/index.html, mn/index.html, ja/index.html
- scripts/dev-server.mjs
- src/App.jsx
- src/i18n/LanguageContext.jsx, src/i18n/translations.js
- src/pages/LandingPage.jsx, src/pages/LoginPage.jsx
- src/pages/AnswerDetailPage.jsx, src/pages/WriteAnswerPage.jsx
- src/styles.css

삭제 파일: 없음. 기존 로그인 화면의 가상 후기 문구·이름을 제거하고 중립적 학습 안내로 교체했다. QA 이미지·스크립트는 tmp/teacher-qa에 있으며 Git에서 제외한다.

## 3. 구현 완료 기능

- Landing: Writing Coach Hero, 53·54 전문, AI + Teacher, 3개 상품, 사전 설문 12개, 예시 리포트, 이용 방법, FAQ, CTA.
- Correction Form: 로그인 없는 신청, 상품별 문제/답안, 세트 분리, 텍스트 또는 JPEG/PNG, 사진 압축, 필수 동의, 이중 제출 및 네트워크 재시도 방어.
- Completion: 주문번호·서버 가격·상품·계좌 안내·영업일 기준 제공 시간. 개인정보 비노출.
- Admin: 별도 30분 JWT, 주문 목록·필터·상세, 입금 확인·첨삭 시작·완료, PDF 업로드·다운로드, 답안 이미지 다운로드, 수동 발송 기록 및 이력.
- Blob: 비공개 주문 ledger와 파일 namespace, ETag 조건부 갱신, 일반 사용자 데이터 분리.
- PDF: 수동 작성 후 업로드; 자동 생성이나 이메일 발송 없음.
- 기존 쓰기 저장 이후 Teacher CTA. 기존 AI 피드백과 포인트 정책 유지.
- 고객 화면 한국어/영어, 나머지 네 언어 경로는 신규 문구 영어 fallback.

## 4. 데이터 구조

상세 schema는 TEACHER-CORRECTION.md 참고. 핵심은 random UUID, 상품/서버 가격, 고객 정보, 53/54 submissions, 동의 시각, 세 가지 상태, PDF 참조, sentAt, statusHistory, 해시한 idempotency key 및 payload다.

- `correction-orders/ledger-v1.json`: 작은 MVP를 위한 단일 원자적 ledger. 주문 index 불일치 방지.
- `correction-assets/{uuid}/{question}-{fileUuid}.{jpg|png}`
- `correction-reports/{uuid}/{fileUuid}.pdf`
- 상태: pending → confirmed / submitted → in_review → completed / not_sent → sent.
- 발송 완료는 PDF 및 첨삭 완료가 있어야 가능하며 sentAt을 기록한다.

## 5. 신규 API

| Method | Endpoint | 목적 |
| --- | --- | --- |
| POST | /api/corrections | 주문 생성 |
| GET | /api/corrections?id=… | 공개 완료 데이터 |
| POST | /api/admin-corrections?action=auth | 관리자 세션 발급 |
| GET | /api/admin-corrections | 주문 목록 |
| GET | /api/admin-corrections?id=… | 주문 상세 |
| PATCH | /api/admin-corrections?id=… | 상태 변경 |
| POST | /api/admin-corrections?id=…&action=report | PDF 저장 |
| GET | /api/admin-corrections?id=…&action=file&kind=report | PDF 다운로드 |
| GET | /api/admin-corrections?id=…&action=file&kind=answer&question=54 | 이미지 다운로드 |

## 6. 신규 환경 변수

ADMIN_SECRET (최소 32자 난수), BANK_NAME, BANK_ACCOUNT, BANK_ACCOUNT_HOLDER.
기존 JWT_SECRET, BLOB_READ_WRITE_TOKEN, OPENAI_API_KEY, OPENAI_MODEL 유지. 실제 값 추가/commit 없음.

## 7. 테스트

- `npm test`: 17개 테스트 파일 / 120개 테스트 통과 / 0 실패.
- 기존 테스트 84개 유지, 신규 테스트 36개 추가.
- `npm run format:check`: 통과.
- 추가 검증: private Blob 옵션과 동시 ledger 생성의 ETag 재시도, 순차·동시 중복 신청, 가격 조작, 상품/답안 일치, 고객 정보·동의, 파일 MIME/size/signature, 일반 사용자 관리자 접근 차단, 상태 선행 조건, PDF 다운로드, sentAt 멱등성, 다국어 공개 route, 학습 세션 복원 장애와 주문 폼 분리.

## 8. Build

`npm run build`: 성공. 기존 Vite 다국어 entry 및 Vercel Functions 구성을 유지하며 신규 패키지를 설치하지 않았다.

## 9. Browser QA

로컬 실제 HTTP API + 메모리 저장소, Chromium/Playwright로 확인. agent-browser CLI가 없어 제공된 Playwright 런타임 사용.

| 화면 | 360px | 768px | 1280px |
| --- | --- | --- | --- |
| /ko/ | 통과 | 통과 | 통과 |
| /ko/correction | 통과 | 통과 | 통과 |
| /ko/correction/complete/{실제 로컬 테스트 주문 UUID} | 통과 | 통과 | 통과 |
| /ko/admin/corrections (인증 전/후) | 통과 | 통과 | 통과 |
| /ko/writing (로그인 후) | 통과 | 통과 | 통과 |
| /ko/answers (로그인 후) | 통과 | 통과 | 통과 |

- 총 27개 화면/언어/키보드 점검 기록. 가로 overflow 및 깨진 로컬 이미지 없음.
- Hero CTA → 대표 54번 상품 → 고객 정보 → 답안 텍스트+사진 압축 → 동의 → 실제 API 주문 생성 → 29,900원 및 테스트 계좌 표시 확인.
- 빈 이름은 브라우저 validation, 빈 답안은 앱 오류 메시지 확인.
- 관리자 인증 → 답안 확인 → 입금 확인 → 첨삭 시작 → 테스트 PDF 업로드 → 인증된 PDF 다운로드 → 첨삭 완료 → 발송 완료 기록 확인.
- 실제 Gmail 이메일이나 입금은 수행하지 않았다. 발송 완료는 로컬 테스트 데이터 상태 확인이다.
- en/zh/vi/mn/ja 신규 신청 경로와 영어 fallback 확인. FAQ 키보드 Enter로 열림 확인.
- 앱 pageerror 0. Console에 기존 외부 폰트 CDN의 ERR_NETWORK_ACCESS_DENIED가 발생했다. 차단 URL은 fonts.googleapis.com 및 cdn.jsdelivr.net의 Pretendard CSS이며 환경의 외부 네트워크 제한이다. 기본 폰트로 검증했다.
- 스크린샷 및 결과: tmp/teacher-qa/*.png, results.json (Git 제외).

## 10. 남은 이슈 / 수동 운영 설정

- Preview/production의 ADMIN_SECRET, 은행 계좌 변수, Private Blob 연결을 설정해야 한다.
- 신규 correction 데이터의 실제 Vercel Private Blob 업로드/다운로드·동시 쓰기는 클라우드에서 아직 검증하지 않았다. SDK mock 검증과 로컬 E2E를 클라우드 실검증으로 표현하지 않는다.
- 교사 운영, 실제 PDF 작성, Gmail 전달, 영업일 기준 제공 시간 준수, 결제/환불 안내, 개인정보 보관·삭제 정책을 확정해야 한다.
- 파일 저장 후 주문 쓰기 실패·동시 중복 또는 PDF 교체 시 비참조 파일이 남을 수 있다. 원본을 보존하는 쪽으로 설계했으며 자동 정리는 이번 범위에 없다.
- 단일 ledger는 첫 10명 규모에 맞춘 선택이다. 주문량 증가 시 보관·목록 조회 규모를 재검토한다.
- 계좌 미설정 상태에서도 주문 생성은 가능하지만 완료 화면에는 준비 중 안내가 표시된다. 실서비스 공개 전 계좌 설정이 필요하다.

## 11. 배포 준비 여부

**READY FOR PREVIEW** — 로컬 기능, 자동 테스트, 포맷, 빌드, 반응형 QA 통과. 환경 변수 설정 후 Preview에서 실제 Private Blob 계약을 확인할 수 있는 상태다.

유료 production 공개는 운영 설정과 실제 클라우드 검증 완료 후 판단한다. Production deploy / push / merge / tag를 하지 않았다.
