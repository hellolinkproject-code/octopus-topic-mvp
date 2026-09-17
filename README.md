# 옥토퍼스 토픽 — Sprint Mission 8

**퀴즈 → 53번 그래프 쓰기 → 학습 포인트로 54번 AI 맞춤 첨삭**

- GitHub: https://github.com/hellolinkproject-code/octopus-topic-mvp
- 서비스: https://octopus-topic-mvp.vercel.app
- 상세 설계·검증 시나리오: [docs/MISSION8.md](docs/MISSION8.md)
- 제출용 고도화 기능 설계 및 흐름 정의: [docs/MISSION8-DESIGN.md](docs/MISSION8-DESIGN.md)
- 최종 제출 점검표: [docs/MISSION8-CHECKLIST.md](docs/MISSION8-CHECKLIST.md)

## 선택한 고도화 기능

OpenAI API를 활용한 TOPIK II 54번 답안 맞춤 첨삭입니다. 기존 MVP는 답안 저장과 공통 해설을 제공했지만, 개별 답안의 내용·구성·표현을 분석하지 못했습니다. 이번 기능은 사용자가 다음 쓰기에서 무엇을 바꿀지 알 수 있게 합니다.

로그인 → 퀴즈·53번 연습으로 포인트 적립 → 54번 답안 저장 → 답안 상세에서 전송 동의 → 50P로 첨삭 → 결과 확인·복습. 학습 순서는 강제하지 않습니다.

## 포인트 정책

| 활동 | 포인트 |
| --- | --- |
| 퀴즈 | 완료 20P + 정답당 10P, 같은 퀴즈 중복 지급 없음 |
| 53번 답안 저장 | 30P, 동일 문제·날짜 중복 지급 없음 |
| 54번 답안 저장 | 무료, 신규 적립 없음 |
| 54번 AI 첨삭 | 결과 저장과 함께 50P 사용 |
| 저장된 첨삭 다시 보기 | 무료 |

기존 미션에서 지급한 포인트는 유지합니다. 내부 학습 포인트이며 현금·상품권으로 교환하지 않습니다.

## 주요 기능

- 로그인, 사용자별 퀴즈 기록·포인트·답안 보관
- 53번 200~300자, 54번 600~700자 서버 검증
- 서버 문제 목록과 날짜 검증으로 임의 문제 ID를 이용한 포인트 적립 차단
- 총평, 잘한 점, 개선할 점, 최대 5개 문장 수정과 이유, 다음 연습 제안
- 결과 저장, 동일 답안 중복 차감 방지, 사용자당 동시 첨삭 1건
- 하루 최대 5회 요청(KST, 실패한 외부 호출 시도 포함), 외부 호출 45초 제한
- 처리 중·포인트 부족·전송 실패·결과 없음 상태 안내

**공식 TOPIK 성적이 아닌 AI 학습용 분석**입니다. 예상 점수, 전체 답안 대필, 결제, 챗봇 추가 대화는 이번 범위에서 제외했습니다. 첨삭 내용은 한국어입니다. 한국어·영어 첨삭 UI를 제공하며 나머지 기존 언어 경로는 영어 첨삭 UI를 사용합니다.

## 기술 선택

기존 React/Vite, Vercel Functions, Private Vercel Blob, Zod, JWT 구성을 확장했습니다. 서버에서 OpenAI Responses API를 직접 호출하며 별도 AI 프레임워크를 추가하지 않았습니다. 기본 모델은 `gpt-4.1-mini`이고 `OPENAI_MODEL`로 변경할 수 있습니다. Structured Outputs와 Zod로 응답 구조를 검증하며 인용 원문이 답안에 있는지도 확인합니다. 형식 검증이 내용의 정확성을 보장하지는 않습니다.

Blob의 `ifMatch`와 ETag를 사용해 사용자 문서가 읽은 뒤 변경되었으면 재조회·재시도합니다. 결과와 50P 차감은 같은 문서의 한 번의 조건부 쓰기로 확정합니다. 퀴즈·답안 저장도 동일한 갱신 경로를 사용합니다. 단일 서버 메모리 잠금에 의존하지 않습니다.

## 로컬 실행

Node.js 22 이상을 권장합니다.

```bash
npm install
# .env.example을 참고하여 .env.local 작성
npm run dev:full
```

`http://127.0.0.1:5173`에서 프론트엔드와 API를 함께 실행합니다. 로컬에서 Blob 환경 변수가 없으면 메모리 저장소를 사용하므로 서버 재시작 시 테스트 계정·기록은 사라집니다. JWT 키를 생략하면 로컬 개발 서버만 임시 키를 생성합니다. 배포 서버에는 반드시 고정된 안전한 `JWT_SECRET`을 설정해야 합니다.

프론트엔드만 실행하려면 `npm run dev`, Vercel 환경에서 직접 실행하려면 `npx vercel dev`를 사용할 수 있습니다.

### 서버 환경 변수

| 변수 | 용도 |
| --- | --- |
| `JWT_SECRET` | JWT 서명용 충분히 긴 임의 비밀값 |
| `BLOB_READ_WRITE_TOKEN` | 기존 Private Blob 연결 |
| `OPENAI_API_KEY` | OpenAI API 호출용 키 |
| `OPENAI_MODEL` | 선택 사항, 기본 `gpt-4.1-mini` |

`.env.local`과 모든 실제 키는 Git에 포함하지 않습니다. `VITE_` 접두사를 붙이지 않습니다. Vercel 프로젝트의 Production/Preview에 필요한 변수를 설정한 후 재배포해야 합니다. OpenAI 키가 없으면 첨삭 API는 `503 AI_NOT_CONFIGURED`를 반환하며 포인트를 차감하지 않습니다. 데모 응답을 실제 AI 결과로 대신 보여주지 않습니다.

## API

오류 형식: `{ "error": { "code": "...", "message": "..." } }`. 로그인 외 API는 `Authorization: Bearer <token>`이 필요합니다.

| API | 동작 |
| --- | --- |
| `POST /api/auth/login` | 데모 계정 생성/로그인, JWT 발급 |
| `GET /api/me` | 사용자 학습 상태 조회 |
| `POST /api/quiz-attempts` | 서버 채점과 중복 없는 보상 |
| `GET /api/answers` | 내 답안 조회 |
| `POST /api/answers` | 답안 검증·저장 |
| `POST /api/feedback` | 내 54번 답안 첨삭, 결과와 차감 저장 |

```json
{ "answerId": "answer-...", "consent": true }
```

첨삭 응답은 `{ feedback, charged, state }`입니다. 브라우저가 보낸 포인트·모델·프롬프트·답안 본문을 첨삭 요청에서 받지 않고 서버 저장값을 사용합니다. 저장된 첨삭은 다시 요청해도 반환만 하며 외부 API를 호출하지 않습니다.

## 테스트와 배포

```bash
npm test
npm run format:check
npm run build
npx vercel
npx vercel --prod
```

자동 테스트의 OpenAI 호출은 모의 응답입니다. 2026-09-17에 별도로 운영 환경의 실제 OpenAI 호출, 결과 저장, 50P 차감, 재조회 시 추가 차감 없음을 API와 브라우저에서 확인했습니다. 최종 전체 테스트는 80개 통과했으며, 구체적인 검증 범위와 운영 한계는 `docs/MISSION8.md`와 `docs/MISSION8-CHECKLIST.md`에 기록합니다.

## 운영 전 남은 범위

- 현재 인증은 학습용 데모입니다. 이메일 인증·비밀번호 재설정·가입 남용 방어는 별도 고도화가 필요합니다.
- 사용자별 5회 제한은 다중 계정 남용을 막지 못하므로 OpenAI 프로젝트의 비용 관리도 필요합니다.
- Blob 사용자 문서는 학습 기록이 늘수록 커집니다. 이후 기록별 저장·페이지 조회와 트랜잭션 데이터베이스로 확장할 수 있습니다.
- 외부 AI 호출과 Blob 저장은 하나의 분산 트랜잭션이 아닙니다. 함수 중단이나 저장 장애로 AI 호출 비용만 발생하고 사용자 결과가 저장되지 않을 수 있습니다. 포인트는 결과 저장 없이 차감하지 않습니다.
- 기존 사용자와 포인트는 유지하며, 문제를 확인할 수 없는 오래된 답안은 새 54번 문제 작성을 안내합니다.
