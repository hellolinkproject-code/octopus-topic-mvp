# 옥토퍼스 토픽 MVP — Sprint Mission 7

매일 TOPIK 퀴즈와 TOPIK II 53·54번 쓰기 연습을 제공하는 React MVP입니다. Mission 7에서는 Vercel Functions 기반 REST API, JWT 로그인, Vercel Blob 데이터 저장을 연결했습니다.

## 핵심 기능

- 이메일과 비밀번호 형식 검증 후 7일 유효 JWT 발급
- 인증 사용자의 프로필, 포인트, 퀴즈 완료 기록 조회
- 퀴즈 채점과 포인트를 서버에서 계산하고 중복 보상 방지
- 53·54번 쓰기 답안 검증·저장과 포인트 지급
- 정상·오류 응답에 따른 로딩 및 오류 UI 처리

비밀번호 원문은 저장하지 않고 `scrypt` 솔트 해시로 검증합니다. 현재 로그인은 학습용 데모 인증이며 실제 서비스에서는 이메일 인증, 비밀번호 재설정, 요청 제한을 포함한 인증 제공자를 사용해야 합니다.

## 기술 스택과 데이터 모델

- Frontend: React, Vite, React Router
- Backend: Vercel Functions (Node.js)
- Validation/Auth: Zod, JWT (`jose`)
- Storage: Private Vercel Blob

사용자 데이터는 `users/{sha256(email)}.json`에 저장됩니다.

```json
{
  "id": "사용자 식별자",
  "email": "learner@example.com",
  "name": "learner",
  "passwordSalt": "서버 저장 전용 값",
  "passwordHash": "scrypt 해시 — API 응답에서 제외",
  "joinedAt": "ISO-8601",
  "points": 60,
  "completedQuizIds": ["quiz-id"],
  "latestQuizResult": {},
  "answers": [],
  "updatedAt": "ISO-8601"
}
```

답안 작성 중 초안과 JWT만 브라우저 `localStorage`에 보관하며, 초안 키는 사용자 ID별로 분리됩니다. 사용자 학습 상태는 서버 응답을 기준으로 동작합니다. 사용자 ID가 없는 기존 초안은 다른 계정에 복원하지 않으며 자동 삭제하지도 않습니다.

## API

오류 응답은 공통으로 `{ "error": { "code": "...", "message": "...", "details": {} } }` 형식입니다. 인증 API는 `Authorization: Bearer <token>` 헤더가 필요합니다.

### `POST /api/auth-login`

```json
{ "email": "learner@example.com", "password": "demo1234", "name": "learner" }
```

성공 시 `200`과 `{ accessToken, expiresIn, state }`를 반환합니다.

### `GET /api/me`

인증 사용자의 `user`, `points`, `completedQuizIds`, `latestQuizResult`, `answers`를 반환합니다.

### `PATCH /api/me`

```json
{
  "quizId": "daily-quiz-2026-09-03",
  "selections": [0, 1, 2]
}
```

요청 스키마는 위 두 필드만 허용합니다. 서버는 KST 기준 현재 또는 직전 날짜의 공식 문제를 재구성하고 선택지 개수·범위를 검증한 뒤 정답 수·점수·포인트를 계산합니다. 검증된 문제·정답·해설은 채점 완료 응답의 `latestQuizResult`에만 포함되며, 같은 공식 `quizId`에는 포인트를 한 번만 지급합니다.

### `GET /api/answers` / `POST /api/answers`

`GET`은 저장된 답안을 반환합니다. `POST`는 53번 200~300자 또는 54번 600~700자를 검증해 저장하고 각각 30P 또는 50P를 지급합니다. `userId + promptNumber + promptId + promptDate`의 결정적 키가 처음 저장되면 `201`과 `awarded: true`, 순차 재시도이면 기존 답안과 `200`, `awarded: false`를 반환합니다.

## 알려진 저장소 한계

현재 Private Blob 저장은 사용자 JSON 전체를 읽고 수정한 뒤 덮어쓰는 방식입니다. 결정적 키로 일반적인 순차 재시도와 중복 요청은 막지만, 서로 다른 함수 인스턴스가 완전히 동시에 같은 사용자 Blob을 갱신하는 경쟁 조건까지 원자적으로 해결하지는 않습니다. 실제 Blob 자격 증명을 사용하는 통합 테스트, 조건부 쓰기나 트랜잭션 저장소 도입, 기존 사용자별 JSON 및 사용자 ID 없는 로컬 초안의 마이그레이션·정리는 별도 단계에서 진행해야 합니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npx vercel dev
```

`.env.local`에 `JWT_SECRET`과 `BLOB_READ_WRITE_TOKEN`을 설정합니다. Blob 토큰이 없는 비배포 환경에서는 API 테스트용 메모리 저장소를 사용합니다.

## 검증 및 배포

```bash
npm test
npm run format:check
npm run build
npx vercel
npx vercel --prod
```

Vercel 프로젝트에 Private Blob 스토어를 연결하고 Production/Preview 환경에 `JWT_SECRET`을 설정해야 합니다. `vercel.json`의 다국어 SPA rewrite가 `/ko`, `/en`, `/zh`, `/vi`, `/mn`, `/ja` 경로를 지원합니다.
