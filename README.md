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

답안 작성 중 초안과 JWT만 브라우저 `localStorage`에 보관하며, 사용자 학습 상태는 서버 응답을 기준으로 동작합니다.

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
  "action": "completeQuiz",
  "quizId": "daily-quiz-id",
  "result": {
    "selections": [0, 1, 2],
    "questions": [{ "answer": 0 }],
    "quizId": "daily-quiz-id",
    "quizDate": "2026-09-02",
    "completedAt": "2026-09-02T00:00:00.000Z"
  }
}
```

서버가 정답 수·점수·포인트를 다시 계산하며, 같은 `quizId`에는 포인트를 한 번만 지급합니다.

### `GET /api/answers` / `POST /api/answers`

`GET`은 저장된 답안을 반환합니다. `POST`는 53번 200~300자 또는 54번 600~700자를 검증해 저장하고 각각 30P 또는 50P를 지급합니다.

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
