# Teacher Correction MVP

## 서비스와 범위

옥토퍼스 TOPIK — TOPIK Writing Coach. AI 쓰기 연습과 한국어 선생님의 TOPIK II 53·54번 PDF 첨삭을 제공한다. 기존 로그인, 퀴즈, 포인트, 답안 저장·보관, 54번 AI 첨삭을 유지한다. 학습 기능은 현금 결제가 없으며 AI 피드백은 기존 내부 포인트 50P 정책을 유지한다. 교사 첨삭은 별도 계좌이체 상품이다.

신청 → 계좌이체 → 운영자 입금 확인 → 교사 첨삭 → PDF 업로드 → Gmail 수동 발송 → 발송 완료 기록. 자동 이메일, PG, 교사 계정, PDF 생성, 후기 CRUD는 없다.

상품의 유일한 원본은 `src/lib/correctionProducts.js`이다. 53번 19,900원, 대표 상품 54번 29,900원, 세트 39,900원. API는 productId를 검증하고 서버 설정에서 가격을 결정한다.

제공 시간: **입금 확인 후 영업일 기준 48시간 이내**. 입금 확인 후 토요일·일요일 및 대한민국 법정공휴일을 제외한 48시간 이내에 PDF 첨삭 리포트를 이메일로 보낸다. 자동 마감일 계산 기능은 없으며 운영자가 관리한다.

## 화면

| Route | 용도 |
| --- | --- |
| `/:lang/` | Writing Coach, 53·54 전문, 상품, 사전 설문 12개, 리포트 예시, 이용 방법, FAQ |
| `/:lang/correction` | 로그인 없는 신청. `?product=q53|q54|bundle`, `?question=53|54` 지원 |
| `/:lang/correction/complete/:orderId` | 상품·금액·주문번호·서버 계좌 설정 안내 |
| `/:lang/admin/corrections` | 관리자 인증, 목록·필터·상세·상태 변경·파일 다운로드 |

한국어·영어 신규 고객 UI를 제공한다. zh/vi/mn/ja의 신규 문구는 영어로 표시하며 기존 언어 URL을 유지한다. 관리자 운영 화면은 한국어다. 학습 세션 복원 실패가 있어도 correction 및 admin 화면은 사용할 수 있다.

설문은 사용자가 제공한 사전 설문 요약 12개이며 결제 고객 후기나 직접 인용으로 표시하지 않는다. 실제 고객 후기는 별도 데이터로 추후 확장한다. 확장 후보는 productType, targetLevel, review, rating, displayName, consentToPublish, createdAt이며 이번에는 수집·노출하지 않는다.

## API

기존 Vercel Functions 파일 라우팅을 유지하고 함수 수를 줄이기 위해 query parameter로 세부 작업을 구분한다. 기존 API 계약과 vercel.json rewrite는 유지한다.

| Endpoint | Method | 목적 |
| --- | --- | --- |
| `/api/corrections` | POST | 주문 생성. 로그인 불필요 |
| `/api/corrections?id={uuid}` | GET | 공개 완료 화면용 최소 정보와 계좌 설정 |
| `/api/admin-corrections?action=auth` | POST | Secret 검증, 30분 관리자 JWT 발급 |
| `/api/admin-corrections` | GET | 전체 주문 목록, 최신 신청순 |
| `/api/admin-corrections?id={uuid}` | GET | 관리자 주문 상세 |
| `/api/admin-corrections?id={uuid}` | PATCH | 허용된 상태 필드 하나 변경 |
| `/api/admin-corrections?id={uuid}&action=report` | POST | PDF 업로드 |
| `/api/admin-corrections?id={uuid}&action=file&kind=report` | GET | 인증된 PDF 다운로드 |
| `/api/admin-corrections?id={uuid}&action=file&kind=answer&question=53` | GET | 인증된 답안 이미지 다운로드 (54도 지원) |

관리자 auth 외 모든 관리자 API는 별도 Bearer JWT가 필요하다. 일반 학습 JWT는 issuer/audience/signing key가 달라 거절한다. 브라우저는 관리자 Secret을 저장하지 않고 인증 이후 지운다. 세션 token은 React 메모리에만 보관하고 새로고침·로그아웃·인증 실패 시 다시 인증한다. Secret은 최소 32자 난수로 설정한다.

공개 주문 응답: orderId, productName, productNameEn, amount, createdAt, bank(name/account/holder 또는 null). 이름, 이메일, 문제, 답안, 상태, 경로는 노출하지 않는다. 관리자 JSON에도 raw Blob URL/path나 중복 방지 해시는 내려주지 않는다. 파일은 주문 소속을 조회한 뒤 인증된 API로만 내려준다. 모든 신규 API는 no-store 및 nosniff를 설정한다.

## 데이터 및 동시성

```text
correction-orders/ledger-v1.json
correction-assets/{randomOrderUuid}/{53|54}-{randomFileUuid}.{jpg|png}
correction-reports/{randomOrderUuid}/{randomFileUuid}.pdf
```

모두 Private Blob이다. 기존 users namespace와 분리한다. 첫 유료 고객 10명을 위한 작은 규모에서는 **하나의 ledger 문서에 전체 주문과 중복 방지 정보를 원자적으로 저장**한다. 별도 index/individual document의 불일치를 피하는 선택이다. 일반 사용자 store의 strong ETag / ifMatch 패턴을 따라 최대 8회 재시도한다. 데이터 규모가 커지면 목록·보관 전략을 재검토해야 한다.

주문 필드:

- id: 서버 randomUUID (클라이언트 idempotencyKey와 다름)
- keyHash: 클라이언트 UUID의 SHA-256; 원문 idempotencyKey는 보관하지 않음
- payloadHash: 동일 키에 다른 입력을 재사용하면 409
- createdAt, updatedAt, productId, 서버 amount
- customer: name, email, currentLevel, targetLevel, examDate, depositorName
- submissions: questionNumber, questionText, answerText, attachments(path/mime/size)
- consent: version, at
- paymentStatus: pending → confirmed
- correctionStatus: submitted → in_review → completed
- deliveryStatus: not_sent → sent
- report: null 또는 pdfPath/uploadedAt
- sentAt, statusHistory(type/value/at)

상태 변경은 Zod enum 및 단일 필드 allowlist를 사용한다. 상태 역행 불가, 입금 전 첨삭 진행 불가, PDF 없는 첨삭 완료 불가, PDF 및 첨삭 완료 없는 발송 완료 불가. 재요청은 중복 이력과 sentAt 변경을 만들지 않는다. 발송 후 PDF 교체를 금지한다.

파일을 먼저 저장한 후 ledger에서 참조한다. 파일은 고유 경로에 immutable로 저장한다. 실패·동시 중복 신청 또는 PDF 교체 시 참조되지 않는 비공개 파일이 남을 수 있다. 자동 삭제 작업은 없으며 향후 정리 시 ledger에 없는 파일만 충분한 대기 후 확인하여 제거한다. 운영 중 ledger와 원본 파일을 임의 삭제하지 않는다.

## 파일과 폼

문제는 필수 텍스트(최대 10,000자), 답안은 텍스트(최대 10,000자) 또는 문제별 이미지 1개. 세트는 53/54를 각각 검증한다. 기존 daily-writing 길이·문제은행·날짜·포인트 정책을 가져오지 않는다.

사진 원본은 브라우저에서 20MB까지 읽고 최대 1800px, 1MB 이하 JPEG로 압축해 전송한다. 서버는 JPEG/PNG MIME, base64, 실제 byte 길이, magic bytes를 검증한다. PDF는 최대 3MB, application/pdf 및 PDF signature를 검증한다. JSON base64 전송은 최대 PDF에서도 약 4.2MB로 Vercel 요청 제한 이내가 되도록 크기를 제한한다. 새 라이브러리나 업로드 token API를 추가하지 않는다.

폼에는 개인정보 수집·이용 안내와 필수 동의가 있다. 유료 신청 정보는 서버 private 저장소로 전송하며 localStorage에 저장하지 않는다. 무료 Mission 5 폼과 별도 서비스다. 제출 중 입력·버튼을 비활성화하고, 같은 입력으로 네트워크 재시도하면 같은 idempotency key를 사용한다.

## 환경 변수와 운영

신규: ADMIN_SECRET, BANK_NAME, BANK_ACCOUNT, BANK_ACCOUNT_HOLDER.
기존: JWT_SECRET, BLOB_READ_WRITE_TOKEN (또는 기존 Blob store 연결), OPENAI_API_KEY, OPENAI_MODEL 유지. 어떤 secret에도 VITE_ 접두사를 붙이지 않는다. 실제 값은 commit하지 않는다.

계좌 변수 세 개가 모두 있을 때만 완료 화면에 계좌를 표시한다. 미설정이면 준비 중 안내가 보이며 임의 계좌를 표시하지 않는다. 신청은 저장될 수 있으므로 실제 주문을 받기 전에 반드시 계좌를 설정한다.

`npm run dev:full`은 로컬 .env.local 설정을 읽는다. Blob 설정이 없고 production이 아닌 경우 메모리 store를 사용한다. 서버 재시작 시 테스트 주문과 파일이 사라진다. production은 메모리 fallback을 사용하지 않는다.

운영 절차:

1. 관리자 URL에 접속해 Secret으로 인증한다.
2. 주문 상세의 입금자명·금액을 실제 계좌 입금 내역과 대조하고 입금 확인한다.
3. 첨삭 시작 후 문제·답안 확인, 필요한 이미지는 인증된 다운로드 버튼으로 연다.
4. 교사가 직접 PDF를 작성하고 관리자 화면에 업로드한다.
5. 첨삭 완료 처리 후 PDF를 다운로드하여 Gmail로 고객에게 직접 보낸다.
6. 실제 전송을 확인한 뒤 발송 완료 버튼을 누른다. 버튼은 이메일을 발송하지 않는다.

실제 출시 전 수동 설정: Vercel 환경 변수, Private Blob 연결·권한, 계좌정보, 교사 운영 및 48시간 제공 일정, 실제 PDF 제작·발송, 결제·환불 안내, 개인정보 보유·삭제 정책. 확정되지 않은 환불 조건은 코드에서 만들지 않았다.

## 검증

`npm test`, `npm run format:check`, `npm run build`를 실행한다. 기존 Mission 6/7/8 테스트를 변경하지 않고 신규 API·Blob 동시성·UI 테스트를 추가했다. 상세 검증 결과는 `docs/TEACHER-CORRECTION-RESULT.md`에 기록한다.

실제 Vercel Private Blob에 대한 신규 주문 업로드 및 production 배포는 수행하지 않았다. 로컬 메모리 API의 E2E와 SDK mock의 private/ETag 계약 검증을 실제 클라우드 저장 검증으로 간주하지 않는다.

## Preview 데이터 격리

Production과 Preview에 같은 Blob 연결이 설정되어 있어 Preview에서는 모든 학습·첨삭 저장 경로 앞에 `preview/{SHA256(branch)의 앞 20자리}/`를 붙인다. 동일 브랜치 재배포 간에는 경로가 유지되며 production 경로는 변경하지 않는다. `VERCEL_ENV=preview`인데 `VERCEL_GIT_COMMIT_REF`가 없으면 저장을 중단한다. CLI Preview 배포도 해당 feature branch 메타데이터가 있어야 한다.

## 2026-10-06 문제·답안 연결 보완

- 저장 완료 화면과 답안 상세의 선생님 첨삭 CTA가 `answerId`를 전달한다. 신청 화면은 현재 계정의 저장 답안을 복원한 뒤 `promptId`로 원래 문제를 찾고 문제·답안을 자동 입력한다. 날짜가 달라도 오늘의 문제로 대체하지 않는다.
- 직접 신청 시 53·54번 서비스 문제 선택 목록을 제공한다. 53번에는 시리즈명·모든 그래프 수치·자료 출처, 54번에는 주제·설명·질문을 포함한다. 외부 문제 직접 입력과 제출 전 수정도 가능하다.
- 선택한 답안이나 원문을 찾지 못하면 안내하고, 다른 문제를 임의로 연결하지 않는다. 문제 선택 변경 시 이전 답안·첨부파일을 초기화한다.
- 코드 커밋: `ee6d55d`. Preview: https://octopus-topic-ebo7cnyjb-eeiiii.vercel.app/ko/correction (Ready).
- 검증: 18개 테스트 파일 / 126개 테스트 통과, format check 및 build 통과. 배포 화면에서 360·768·1280px, 외부 문제, 저장 답안 CTA, 새로고침 복원, 신청 payload의 원래 문제·답안, 영어 화면 등 8개 브라우저 확인 통과; 페이지 오류 0.
- 이번 브라우저 검증의 세션 복원·신청 API는 테스트 데이터로 가로채 확인했다. 실제 고객 주문·입금·메일 전송은 하지 않았다. 기존 실제 Blob 검증과 AI 환경 제한은 `TEACHER-CORRECTION-PREVIEW-RESULT.md` 참조. Production 배포나 main 병합은 하지 않았다.
