# 옥토퍼스 토픽 MVP

매일 TOPIK 퀴즈를 풀고, 학습 포인트와 TOPIK II 53번 그래프 쓰기 답안을 브라우저에 저장하는 React 프론트엔드 MVP입니다.

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run build
```

로그인 정보, 포인트, 퀴즈 완료 기록, 답안은 `localStorage`에 저장됩니다. `vercel.json`에 SPA 경로 재작성 규칙이 포함되어 있어 Vercel에 바로 배포할 수 있습니다.
