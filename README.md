# 항공기술영어 가이드북

교재 TXT 두 파일을 브라우저에서 분석하고, 로그인한 학생의 정리 데이터와 개인 기록을 Supabase에 저장하는 학습 앱입니다. 공개 소스에는 수업용 교재 원문이나 학생 데이터가 포함되지 않습니다.

## 배포 준비

1. 전용 Supabase 프로젝트에서 `supabase/migrations/20261110000000_flightbook.sql`을 적용합니다.
2. Supabase의 Authentication → URL Configuration에서 GitHub Pages 배포 주소를 Site URL과 허용 리디렉션 주소로 지정합니다. 이메일 인증을 활성화한 상태에서 실제 이메일 확인 링크를 검증합니다.
3. GitHub 저장소 Settings → Secrets and variables → Actions → Variables에 `VITE_SUPABASE_URL` 및 `VITE_SUPABASE_PUBLISHABLE_KEY`를 등록합니다. 공개 클라이언트용 키를 사용하며 관리자 키는 등록하지 않습니다.
4. Settings → Pages에서 Source를 GitHub Actions로 선택하고 GitHub Pages 워크플로를 실행합니다. 연결 값 없이 배포하면 비로그인 시연 모드만 제공됩니다.
5. 서로 다른 두 이메일 계정으로 로그인, 기기 간 저장, 비공개 기록 차단, 공유와 해제를 확인합니다.

로컬 확인은 `npm ci`, `npm test`, `npm run dev` 순서입니다. 계정 연결이 필요하면 `.env.example`을 참고해 `.env.local`을 만듭니다.
