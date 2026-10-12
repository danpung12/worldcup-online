This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 로그인 및 API 프록시

브라우저의 HTTP 요청은 같은 사이트의 `/api`를 사용합니다. Next.js가 `/api/:path*`를 백엔드의 `/:path*`로 전달합니다. 로그인 시작과 카카오 콜백, 로그인 확인, 토큰 갱신, 로그아웃도 이 경로를 사용하며, 요청의 쿠키와 응답의 `Set-Cookie` 헤더를 전달합니다. API 호출과 토큰 갱신, 로그아웃 요청에는 `fetch`의 `cache: "no-store"`를 적용해 브라우저 캐시를 사용하지 않습니다.

백엔드 전달 주소는 `BACKEND_API_URL`, 기존 `NEXT_PUBLIC_API_URL`의 절대 HTTP(S) 주소, 기본 주소 순서로 선택합니다. 기본 주소는 개발 환경에서 `http://localhost:4000`, 운영 환경에서 `https://worldcupapi.duckdns.org`입니다. 기존 배포 환경변수를 그대로 사용할 수 있으며, 브라우저의 API 주소는 항상 `/api`입니다.

백엔드를 다른 주소로 연결하려면 Vercel 환경변수 또는 `web/.env.local`에 다음 값을 설정합니다.

```dotenv
BACKEND_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

운영에서는 두 값 모두 실제 백엔드의 HTTPS 주소를 사용합니다. 전달 대상 변경 후에는 프론트를 다시 빌드·배포해야 합니다.

### 카카오 로그인 배포 설정

프론트 배포 후 백엔드의 `KAKAO_CALLBACK_URL`을 아래 주소로 변경하고, 카카오 개발자 콘솔에도 동일한 Redirect URI를 등록합니다.

```dotenv
KAKAO_CALLBACK_URL=https://worldcup-online.vercel.app/api/auth/kakao/callback
FRONTEND_URL=https://worldcup-online.vercel.app
```

로컬 콜백 주소는 `http://localhost:3000/api/auth/kakao/callback`입니다. 로그인 후에는 해당 프론트 주소의 인증 쿠키가 새로 발급되므로 다시 로그인해야 합니다. 현재 백엔드 쿠키처럼 `Domain`을 지정하지 않는 구성을 전제로 합니다.

### 소켓 인증 적용 단계

Socket.IO는 프록시를 통과하지 않고 기존 백엔드에 직접 연결합니다. 소켓 주소는 `NEXT_PUBLIC_SOCKET_URL`, 기존 `NEXT_PUBLIC_API_URL`의 절대 HTTP(S) 주소, 기본 백엔드 주소 순서로 선택합니다. `NEXT_PUBLIC_SOCKET_URL`에는 `/api`를 사용하지 않습니다.

이번 변경은 HTTP 인증 경로를 전환하는 1단계입니다. 로그인 쿠키는 프론트 주소에 저장되므로 기존 백엔드 소켓으로 전달되지 않습니다. 소켓에서 로그인 사용자를 인식하려면 2단계의 인증 티켓 발급·검증과 프론트 티켓 전달 기능이 필요합니다. 비로그인 함께하기 연결은 기존 경로를 사용합니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
