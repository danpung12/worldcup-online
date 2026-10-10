<p align="center">
  <img src="./web/public/pickon.svg" width="88" height="88" alt="PickOn 픽온 로고" />
</p>

<h1 align="center">PickOn · 픽온</h1>

<p align="center">
  <strong>친구와 함께 즐기는,<br />온라인 이상형 월드컵.</strong>
</p>

<p align="center">
  <a href="https://worldcup-online.vercel.app">서비스 바로가기</a> ·
  <a href="./docs/worldcup-planning.md">초기 개발 기획서</a>
</p>

## 1. 프로젝트 소개 📝

픽온은 친구들이 각자의 기기에서 같은 대결에 투표하며 최종 우승 후보를 고르는 온라인 이상형 월드컵입니다.

기존 이상형 월드컵을 친구와 즐기려면 한 화면을 함께 보거나 화면을 공유해야 했습니다. 링크를 공유해 함께 참여하는 게임의 방식에서 착안해, 방을 만들고 친구를 초대하면 같은 대결과 투표 결과가 실시간으로 전달되도록 구현했습니다.

이 프로젝트에서는 여러 사용자의 투표를 모아 다음 대결로 진행하는 과정, 동점 상황의 처리, 새로고침 후 상태 복구, 중복 요청에 따른 통계 집계 문제를 다뤘습니다. 운영 중 발생한 복구 지연은 로그와 트레이스로 구간별 실행시간을 측정하며 개선했습니다.

| 항목 | 내용 |
| --- | --- |
| 개발 기간 | 2026.05 ~ 진행 중 |
| 백엔드 | 인증, 월드컵·후보 관리, 실시간 게임 진행, 채팅, 상태 복구, 통계 집계 등을 직접 구현 |
| 프론트엔드 | AI 도구를 활용해 화면 구성과 백엔드 연동 구현 |
| 웹 배포 | [worldcup-online.vercel.app](https://worldcup-online.vercel.app) |
| API 서버 | [worldcupapi.duckdns.org](https://worldcupapi.duckdns.org) |

## 2. 주요 기능 ✨

| 기능 | 설명 |
| --- | --- |
| 혼자하기·친구들과 함께하기 | 혼자 후보를 고르거나, 방을 만들어 친구들과 같은 대결에 참여합니다. |
| 초대 링크 | 링크로 방에 접속해 닉네임을 입력하고 참가할 수 있습니다. 비로그인 플레이도 지원합니다. |
| 실시간 투표 | 참가자의 투표를 모아 다수결로 승자를 결정하고, 다음 대결을 같은 방의 사용자에게 전달합니다. |
| 동점 처리 | 결정자로 선정된 참가자가 최종 선택을 합니다. 결정자 선정 횟수가 적은 참가자를 우선합니다. |
| 실시간 채팅 | 같은 방에서 메시지를 주고받고 최근 채팅 기록을 확인합니다. |
| 진행 상태 복구 | 새로고침 후 기존 방·참가자·현재 대결·내 투표·동점 결정자 정보를 복구합니다. |
| 카카오 로그인 | OAuth 로그인 후 JWT를 HttpOnly Cookie로 관리하고 Access Token 갱신을 처리합니다. |
| 월드컵·후보 관리 | 로그인한 사용자가 월드컵과 후보를 만들고 자신의 콘텐츠를 수정·삭제할 수 있습니다. |
| 이미지 업로드 | R2 Presigned URL을 발급받아 브라우저에서 이미지를 직접 업로드합니다. |
| 랭킹·플레이 횟수 | 후보별 최종 우승 횟수와 월드컵의 플레이 완료 횟수를 집계합니다. |
| 유저 의견 | 월드컵별 댓글 조회·작성을 지원하고, 로그인 작성자는 자신의 댓글을 삭제할 수 있습니다. |

### 함께하기 흐름

1. 월드컵을 선택하고 방을 생성합니다.
2. 초대 링크를 공유하면 친구들이 닉네임을 입력해 참가합니다.
3. 방장이 후보 수에 맞는 토너먼트 규모를 선택해 시작합니다. 서버는 8·16·32·64·128강을 지원합니다.
4. 전원이 투표하면 다수결로 승자를 결정합니다. 동점이면 선정된 결정자가 선택합니다.
5. 다음 대결과 라운드를 진행하고, 결승이 끝나면 최종 우승 결과를 표시합니다.

## 3. 기술 스택과 구조 🗂️

| 영역 | 사용 기술 |
| --- | --- |
| Backend | TypeScript, NestJS 11 |
| Database | PostgreSQL, Prisma 7, node-postgres |
| 실시간 통신·상태 저장 | Socket.IO, Redis, ioredis |
| 인증 | Kakao OAuth, Passport, JWT, HttpOnly Cookie |
| 이미지 저장 | Cloudflare R2, AWS SDK, Presigned URL |
| 로깅·추적 | Pino, OpenTelemetry, Grafana Cloud / Tempo |
| 작업 예약 | Nest Schedule |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 프론트 상태 관리 | Zustand, TanStack Query |
| 프론트 배포 | Vercel |

```mermaid
flowchart LR
    Browser["사용자 브라우저<br/>Next.js · React"]
    Web["Vercel<br/>프론트 배포"]
    API["NestJS API 서버<br/>Socket.IO Gateway"]
    DB[(PostgreSQL)]
    Redis[(Redis)]
    R2["Cloudflare R2"]
    Kakao["Kakao OAuth"]
    Trace["Grafana Cloud / Tempo"]

    Web -->|프론트 제공| Browser
    Browser -->|HTTP API · 인증 쿠키| API
    Browser <-->|Socket.IO · 게임 진행과 채팅| API
    API -->|Prisma| DB
    API -->|방 상태 · 동점 결정자 · 채팅| Redis
    API <-->|OAuth 처리| Kakao
    API -->|Presigned URL 발급| Browser
    Browser -->|이미지 직접 업로드 · 조회| R2
    API -->|OpenTelemetry traces| Trace
```

현재 브라우저의 HTTP API와 Socket.IO 요청은 백엔드 도메인으로 직접 연결됩니다. 프론트 프록시나 소켓 인증 티켓은 아직 적용하지 않았습니다.

| 저장소 | 저장하는 정보 |
| --- | --- |
| PostgreSQL | 사용자, 월드컵·후보, 방·참가자, 매치·투표, 우승·플레이 횟수, 댓글 |
| Redis | 방 진행 상태, 동점 결정자, 최근 채팅 기록 |
| R2 | 업로드한 이미지 파일 |

## 4. 핵심 구현과 문제 해결 🔍

### 다수결 투표와 동점 결정자 선정

참가자별 투표를 저장한 뒤 참가 인원과 투표 수를 비교해 전원 투표 여부를 확인합니다. `WorldcupVote`에는 참가자와 매치의 복합 고유 제약을 두고, `upsert`로 같은 참가자의 투표를 관리합니다.

득표수가 같으면 기존 투표를 정리하고 결정자를 선정합니다. 결정자가 된 횟수인 `tie_count`가 가장 적은 참가자들 중 한 명을 무작위로 선택해 특정 참가자에게 역할이 반복되는 것을 줄였습니다. 선정 결과는 Redis에 저장하고, 해당 참가자의 선택으로 승자를 결정합니다.

### 새로고침 후 게임 상태 복구

브라우저에 방 코드와 참가자 정보를 보관하고, 다시 연결되면 `roomState` 이벤트로 서버의 현재 상태를 요청합니다. 서버는 PostgreSQL의 매치·투표 정보와 Redis의 방 상태·동점 결정자·채팅 기록을 조합해 반환합니다.

특히 동점 결정자 정보를 Redis에 저장해, 동점 상태에서 새로고침하더라도 누가 선택해야 하는지 복구하도록 했습니다. 방 진행 상태는 24시간, 동점 결정자는 1시간의 TTL을 사용합니다. 채팅은 방별 최근 50개를 유지하고 새 메시지 저장 시 TTL을 24시간으로 갱신합니다.

또한 매시간 생성 후 24시간이 지난 게임방을 정리합니다. 복구 기능은 방과 관련 상태가 유지되는 동안 사용할 수 있습니다.

### 우승·플레이 횟수 중복 집계 방지

결승 종료 처리가 반복되더라도 우승 횟수와 플레이 완료 횟수가 한 번만 증가해야 합니다.

이를 위해 방의 `winner_counted`가 `false`인 경우에만 `true`로 변경하고, 실제 변경된 행이 한 개일 때만 두 통계를 증가시킵니다. 이 작업을 Prisma 트랜잭션으로 묶었습니다. 일반 매치의 다수결 승자도 `winner_id`가 비어 있는 경우에만 조건부 갱신합니다.

관련 구현: [RoomService](./server/src/room/room.service.ts)

### 간헐적인 DB 연결 지연 분석

방 복구가 평소보다 오래 걸리는 요청을 OpenTelemetry로 추적하고 Grafana Tempo에서 비교했습니다. Redis 조회와 SQL 실행시간은 비슷했지만, 느린 요청의 `pg-pool.connect`에서 DB 연결을 얻는 시간이 길어지는 것을 확인했습니다.

Prisma의 PostgreSQL 드라이버 어댑터에 전달하는 `pg.Pool`의 `idleTimeoutMillis`를 10분으로 설정해 유휴 연결을 재사용하도록 조정했습니다.

| 관찰 항목 | 변경 전 기록 | 변경 후 기록 |
| --- | --- | --- |
| DB 연결 획득 | 최대 약 450ms | 관찰된 연결 획득 모두 1ms 미만 |
| 최대 방 복구시간 | 약 1.62초 | 약 0.84초 |
| 간헐적인 1.6초대 지연 | 발생 | 변경 후 8회 측정에서 재현되지 않음 |

**변경 후 결과는 운영 환경에서 방 복구를 8회 측정한 범위입니다.** 모든 요청의 성능이나 동시 접속 부하를 보장하는 수치가 아니라, 관찰한 간헐적 연결 지연을 줄인 결과로 기록했습니다. 순차적으로 실행되는 쿼리의 개수와 실행 방식은 추가 개선 대상으로 남아 있습니다.

관련 설정: [PrismaService의 연결 풀 설정](./server/prisma/prisma.service.ts)

## 5. 설치 및 실행 🚀

### 준비 사항

- Node.js **22.x 중 22.12.0 이상**, npm
- PostgreSQL 데이터베이스와 Redis 서버
- 카카오 로그인 설정, 이미지 업로드를 위한 R2 버킷·접근 키

```bash
git clone https://github.com/danpung12/worldcup-online.git
cd worldcup-online
```

<details>
<summary>환경변수 설정 보기</summary>

`server/.env`를 만들고 아래 예시를 자신의 개발 환경에 맞게 설정합니다. 비밀키와 비밀번호는 예시값을 교체해 사용합니다.

```dotenv
# 기본 실행 환경
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/worldcup
REDIS_URL=redis://localhost:6379

# 로그인·JWT
FRONTEND_URL=http://localhost:3000
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_CALLBACK_URL=http://localhost:4000/auth/kakao/callback
JWT_SECRET=replace_with_a_random_secret
JWT_ACCESS_SECRET=replace_with_a_separate_access_secret
JWT_REFRESH_SECRET=replace_with_a_separate_refresh_secret

# Cloudflare R2
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-image-domain.example

# 로컬에서는 추적 전송 비활성화
OTEL_SDK_DISABLED=true
```

카카오 개발자 콘솔에는 `KAKAO_CALLBACK_URL`과 같은 Redirect URI를 등록합니다. R2 버킷에는 브라우저가 이미지를 직접 올릴 수 있도록 프론트 주소에서의 `PUT` 요청과 `Content-Type` 헤더를 허용하는 CORS 설정이 필요합니다.

`web/.env.local`은 다음과 같이 설정합니다. 아래 주소는 개발 환경의 기본값과 같습니다.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

OpenTelemetry 추적을 사용하려면 `OTEL_SDK_DISABLED=false`로 바꾸고 Collector 또는 Grafana Cloud의 OTLP HTTP 수신 주소를 설정합니다.

```dotenv
OTEL_SDK_DISABLED=false
OTEL_SERVICE_NAME=worldcup-server
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://your-collector.example/v1/traces
# 수신 서버에서 인증을 요구할 때 설정
OTEL_EXPORTER_OTLP_HEADERS=Authorization=your_authorization_value
```

배포 시에는 `NODE_ENV=production`과 HTTPS 주소를 사용합니다. 프론트 도메인을 바꾸면 HTTP API와 Socket.IO의 CORS 허용 주소도 함께 맞춰야 합니다.

</details>

### Backend 실행

저장소 루트에서 실행합니다. `.env`가 가리키는 개발용 데이터베이스를 먼저 준비한 뒤 기존 마이그레이션을 적용합니다.

```bash
cd server
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

기본 주소는 `http://localhost:4000`입니다.

### Frontend 실행

새 터미널을 열고 저장소 루트에서 실행합니다.

```bash
cd web
npm ci
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 새 데이터베이스에는 월드컵이 없으므로 카카오 로그인 후 만들기 화면에서 후보를 등록할 수 있습니다.

<details>
<summary>빌드·테스트 명령 보기</summary>

각 프로젝트 디렉터리에서 실행합니다.

```bash
# server/
npm run build
npm test -- --runInBand
npm run test:e2e

# web/
npm run build
npm run lint
```

테스트 실행 환경에 따라 PostgreSQL·Redis와 인증·업로드 환경변수 설정이 필요합니다. 위 목록은 실행 명령이며 테스트 통과나 전체 기능의 자동 검증을 의미하지 않습니다.

</details>

## 6. API·소켓 이벤트와 프로젝트 구조 📚

<details>
<summary>주요 HTTP API</summary>

인증이 필요한 API는 `accessToken` 쿠키를 사용합니다. 월드컵·후보 수정과 삭제는 작성자 여부도 확인합니다.

| Method | Endpoint | 설명 |
| --- | --- | --- |
| GET | `/auth/kakao` | 카카오 로그인 시작 |
| GET | `/auth/kakao/callback` | 로그인 콜백·인증 쿠키 발급 |
| GET | `/auth/me` | 로그인 사용자 조회 |
| POST | `/auth/refresh` | Refresh Token 쿠키로 Access Token 갱신 |
| POST | `/auth/logout` | 인증 쿠키 제거 |
| GET | `/worldcup` | 월드컵 목록 조회 |
| GET | `/worldcup/mygame` | 내가 만든 월드컵 조회 |
| GET | `/worldcup/:gameId` | 월드컵 상세·후보·우승 횟수 조회 |
| POST | `/worldcup` | 월드컵과 후보 생성 |
| PATCH | `/worldcup/:gameId` | 월드컵 수정 |
| DELETE | `/worldcup/:gameId` | 월드컵 삭제 |
| POST | `/worldcup/:gameId/items` | 후보 추가 |
| PATCH | `/worldcup/items/:itemId` | 후보 수정 |
| DELETE | `/worldcup/items/:itemId` | 후보 삭제 |
| POST | `/upload/presigned-url` | 이미지 업로드 URL 발급 |
| GET | `/comment/:gameId` | 댓글 목록 조회 |
| POST | `/comment` | 댓글 작성·선택적 로그인 정보 연결 |
| DELETE | `/comment/:commentId` | 로그인 사용자의 본인 댓글 삭제 |

</details>

<details>
<summary>Socket.IO 이벤트</summary>

기본 namespace(`/`)를 사용합니다. 게임방별로 Socket.IO room에 참가자를 묶어 상태를 전달합니다.

| 방향 | Event | 설명 |
| --- | --- | --- |
| 클라이언트 → 서버 | `createRoom` | 방 생성·방장 등록, 응답으로 방 코드 반환 |
| 클라이언트 → 서버 | `joinRoom` | 방 코드로 참가 |
| 클라이언트 → 서버 | `startGame` | 방장이 토너먼트 시작 |
| 클라이언트 → 서버 | `vote` | 후보 선택·투표 결과 응답 |
| 클라이언트 → 서버 | `sendChat` | 메시지 전송 |
| 클라이언트 → 서버 | `roomState` | 새로고침 후 방·참가자·대결·투표 상태 조회 |
| 서버 → 클라이언트 | `roomUpdate` | 참가자 등 방 정보 갱신 |
| 서버 → 클라이언트 | `gameUpdate` | 투표 대기·동점·다음 대결·최종 우승 상태 전달 |
| 서버 → 클라이언트 | `chatUpdate` | 새 메시지 전달 |
| 서버 → 클라이언트 | `chatHistory` | 방 참가·복구 시 최근 채팅 전달 |

</details>

<details>
<summary>폴더 구조</summary>

```text
worldcup-online/
├─ server/
│  ├─ prisma/            # 스키마·마이그레이션·PrismaService
│  └─ src/
│     ├─ auth/          # 카카오 로그인·JWT·인증 가드
│     ├─ worldcup/      # 월드컵·후보 관리
│     ├─ room/          # 게임 진행·투표·복구·채팅
│     ├─ comment/       # 유저 의견
│     ├─ redis/         # Redis 연결
│     ├─ upload/        # R2 Presigned URL
│     ├─ tracing.ts     # OpenTelemetry 초기화
│     └─ trace-span.ts  # 구간별 실행 추적
├─ web/
│  ├─ public/           # 로고·정적 리소스
│  └─ src/
│     ├─ app/           # 페이지·월드컵 화면
│     ├─ lib/           # API·인증·Socket.IO 클라이언트
│     └─ store/         # Zustand 상태 관리
└─ docs/                # 기획·기능 설계 문서
```

</details>

## 7. 현재 과제와 배운 점 🧠

### Safari 로그인: 원인 확인, 해결 방식 검토 중

일부 Safari 환경에서 카카오 로그인 후에도 프론트가 비로그인 상태로 표시되는 문제가 있습니다. 같은 Safari에서 API의 `/auth/me`를 직접 열면 사용자 정보가 나오고, 크로스 사이트 추적 방지를 끄면 프론트에서도 로그인이 인식되는 것을 확인했습니다.

현재 프론트의 `vercel.app` 주소와 API의 `duckdns.org` 주소가 서로 다른 사이트라 인증 쿠키가 차단되는 상황입니다. 추적 방지를 켠 상태에서도 인증이 유지되도록 프론트 프록시, 소켓 인증 티켓, 같은 사이트의 도메인 구성 등을 검토하고 있습니다. 이 변경은 아직 구현하지 않았습니다.

### 상태의 수명에 맞춰 저장소 선택하기

월드컵·투표·우승 기록은 PostgreSQL에 저장하고, 방 진행 상태·동점 결정자·최근 채팅은 Redis에서 관리했습니다. 새로고침 복구를 구현하면서 화면에 보이는 상태뿐 아니라 결정자처럼 게임 진행에 필요한 정보도 복구 대상이라는 점을 배웠습니다.

### 반복 요청을 고려해 결과 저장하기

실시간 이벤트에서는 같은 결과를 처리하는 요청이 겹칠 수 있습니다. 고유 제약, 조건부 갱신, 트랜잭션을 사용해 투표 저장과 결승 통계 집계가 반복 요청에 어떻게 반응하는지 다뤘습니다.

### 느린 구간을 측정하고 원인 좁히기

복구가 느리다는 현상을 Redis 조회, SQL 실행, DB 연결 획득으로 나누어 확인했습니다. 전체 시간만 비교하기보다 구간별 트레이스와 라이브러리의 실제 설정을 함께 확인하는 과정을 배웠습니다.
