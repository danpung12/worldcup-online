# 온라인 이상형 월드컵 기획서

## 1. 개발 배경

이상형 월드컵은  예전부터 굉장히 인기 있는 게임이었다.

하지만 현재 이상형 월드컵 서비스는 혼자 플레이하는 1인용 구조에 가깝다.

그래서 친구와 함께 즐기고 싶을 때는 화면공유를 해야 한다거나 불편한 경우가 많았다

이 점에서 링크를 공유해 친구와 가볍게 같이 즐기는 ‘갈틱폰’의 방식에서 착안하여, 

기존 이상형 월드컵을 온라인으로 친구와 함께 참여할 수 있게 만들기로 했다.

## 2. 기능 목표

 - 초대 링크 기반 실시간 월드컵 방 생성 및 입장.

 - [Socket.IO](http://Socket.IO) 기반 참가자 상태 및  게임 진행 동기화

 - 다수결 투표를 통한 라운드 진행

 - 최종 우승 결과 저장 및 통계 집계

 - 채팅 기능



## 3. 사용자 흐름

1. 사용자가 저장된 월드컵 게임을 선택한다.

2. 방을 생성하면 대기방으로 이동한다.

3. 방장은 현재 URL을 복사해 친구에게 공유한다.

4. 친구는 링크로 접속해 닉네임을 입력하고 방에 입장한다.

5. 방장이 게임을 시작하면 모든 참가자에게 같은 매치가 표시된다.

6. 참가자들이 각 매치마다 투표한다.

7. 전원 투표 완료 시 서버가 다수결로 승자를 결정한다.

8. 다음 매치 또는 다음 라운드가 모든 참가자 화면에 동기화된다.

9. 마지막 매치 종료 후 최종 우승 결과를 저장하고 결과 화면을 보여준다.

---


## 5. DB 설계

### 5-1. 주요 모델 요약

| 모델명 | 역할 |
| --- | --- |
| `WorldcupGame` | 저장된 월드컵 게임 정보 관리 |
| `WorldcupItem` | 월드컵 후보 아이템 관리 |
| `WorldcupRoom` | 실시간 플레이 방 상태 관리 |
| `RoomMember` | 방 참가자 정보 관리 |
| `WorldcupMatch` | 라운드별 매치 정보 관리 |
| `WorldcupVote` | 참가자별 투표 기록 관리 |
| `Chat` | 방 단위 채팅 메시지 관리 |

---

## 5-2. 상세 테이블 명세

### 1. 월드컵 게임 `worldcup_games`

저장된 월드컵 게임의 기본 정보를 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 월드컵 게임 고유 ID |
| `title` | `varchar` | Not Null |  | 월드컵 제목 |
| `description` | `text` | Nullable |  | 월드컵 설명 |
| `thumbnail` | `text` | Nullable |  | 썸네일 이미지 URL |
| `play_count` | `int` | Not Null | `0` | 월드컵 플레이 수 |
| `creator_id` | `int` | FK, Nullable |  | 생성자 유저 ID |
| `created_at` | `datetime` | Not Null | `now()` | 생성 일시 |
| `updated_at` | `datetime` | Not Null |  | 수정 일시 |

---

### 2. 월드컵 후보 `worldcup_items`

각 월드컵 게임에 포함되는 후보 아이템을 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 후보 아이템 고유 ID |
| `game_id` | `int` | FK |  | 월드컵 게임 ID |
| `name` | `varchar` | Not Null |  | 후보 이름 |
| `image_url` | `text` | Not Null |  | 후보 이미지 URL |
| `created_at` | `datetime` | Not Null | `now()` | 생성 일시 |

---

### 3. 월드컵 방 `worldcup_rooms`

실시간 월드컵 플레이 방의 상태와 진행 정보를 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 방 고유 ID |
| `game_id` | `int` | FK |  | 플레이할 월드컵 게임 ID |
| `invite_code` | `varchar` | Unique, Not Null |  | 초대 링크에 사용되는 코드 |
| `status` | `enum` | Not Null | `WAITING` | 방 상태 |
| `current_match_id` | `int` | FK, Nullable |  | 현재 진행 중인 매치 ID |
| `winner_id` | `int` | FK, Nullable |  | 최종 우승 후보 ID |
| `created_at` | `datetime` | Not Null | `now()` | 생성 일시 |
| `updated_at` | `datetime` | Not Null |  | 수정 일시 |

#### 방 상태값

| 값 | 설명 |
| --- | --- |
| `WAITING` | 참가자 대기 중 |
| `PLAYING` | 게임 진행 중 |
| `FINISHED` | 게임 종료 |

---

### 4. 방 참가자 `room_members`

월드컵 방에 참여한 사용자 정보를 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 참가자 고유 ID |
| `room_id` | `int` | FK |  | 참여한 방 ID |
| `user_id` | `int` | FK, Nullable |  | 로그인 유저 ID |
| `nickname` | `varchar` | Not Null |  | 비로그인 참여자 닉네임 |
| `is_host` | `boolean` | Not Null | `false` | 방장 여부 |
| `socket_id` | `varchar` | Nullable |  | 현재 연결된 소켓 ID |
| `created_at` | `datetime` | Not Null | `now()` | 입장 일시 |

---

### 5. 월드컵 매치 `worldcup_matches`

라운드별 A vs B 대결 정보를 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 매치 고유 ID |
| `room_id` | `int` | FK |  | 방 ID |
| `round` | `int` | Not Null |  | 현재 라운드 |
| `match_index` | `int` | Not Null |  | 라운드 내 매치 순서 |
| `item_a_id` | `int` | FK |  | 첫 번째 후보 ID |
| `item_b_id` | `int` | FK |  | 두 번째 후보 ID |
| `winner_id` | `int` | FK, Nullable |  | 매치 승자 후보 ID |
| `created_at` | `datetime` | Not Null | `now()` | 생성 일시 |

---

### 6. 월드컵 투표 `worldcup_votes`

참가자별 매치 투표 기록을 관리한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 투표 고유 ID |
| `room_id` | `int` | FK |  | 방 ID |
| `match_id` | `int` | FK |  | 매치 ID |
| `member_id` | `int` | FK |  | 투표한 참가자 ID |
| `selected_item_id` | `int` | FK |  | 선택한 후보 ID |
| `created_at` | `datetime` | Not Null | `now()` | 투표 일시 |

#### 추가 제약 조건

| 제약 조건 | 설명 |
| --- | --- |
| `unique(match_id, member_id)` | 같은 참가자가 같은 매치에 중복 투표하지 못하도록 방지 |

---

### 7. 채팅 메시지 `chats`

월드컵 방 안에서 주고받는 채팅 메시지를 저장한다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 기본값 | 설명 |
| --- | --- | --- | --- | --- |
| `id` | `int` | PK | autoincrement | 채팅 메시지 고유 ID |
| `room_id` | `int` | FK |  | 방 ID |
| `member_id` | `int` | FK |  | 메시지를 보낸 참가자 ID |
| `message` | `text` | Not Null |  | 메시지 내용 |
| `created_at` | `datetime` | Not Null | `now()` | 생성 일시 |

---





## 6. API 설계 요약

### Worldcup

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/worldcup` | 월드컵 목록 조회 |
| `GET` | `/worldcup/:gameId` | 월드컵 상세 조회 |
| `POST` | `/worldcup` | 월드컵 생성 |
| `PATCH` | `/worldcup/:gameId` | 월드컵 수정 |
| `DELETE` | `/worldcup/:gameId` | 월드컵 삭제 |

### Worldcup Item

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/worldcup/:gameId/items` | 월드컵 후보 추가 |
| `DELETE` | `/worldcup/items/:itemId` | 월드컵 후보 삭제 |

### Room

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/worldcup-rooms` | 월드컵 방 생성 |
| `GET` | `/worldcup-rooms/:inviteCode` | 초대 코드로 방 조회 |
| `POST` | `/worldcup-rooms/:inviteCode/join` | 방 입장 |
| `POST` | `/worldcup-rooms/:roomId/start` | 게임 시작 |
| `GET` | `/worldcup-rooms/:roomId/current-match` | 현재 매치 조회 |
| `GET` | `/worldcup-rooms/:roomId/result` | 최종 결과 조회 |

### Vote

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `POST` | `/worldcup-rooms/:roomId/matches/:matchId/vote` | 매치 투표 |

### Chat

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/worldcup-rooms/:roomId/chats` | 방 채팅 내역 조회 |



---

## 7. Socket 이벤트 설계

### Client → Server

| 이벤트명 | 설명 |
| --- | --- |
| `joinRoom` | 소켓 방 입장 |
| `leaveRoom` | 소켓 방 퇴장 |
| `sendChatMessage` | 채팅 메시지 전송 |
| `submitVote` | 투표 제출 |
| `startGame` | 게임 시작 요청 |

### Server → Client

| 이벤트명 | 설명 |
| --- | --- |
| `participantJoined` | 참가자 입장 알림 |
| `participantLeft` | 참가자 퇴장 알림 |
| `chatMessageCreated` | 채팅 메시지 생성 알림 |
| `voteSubmitted` | 투표 현황 알림 |
| `nextMatch` | 다음 매치 진행 알림 |
| `gameFinished` | 게임 종료 및 최종 결과 알림 |
| `roomStateUpdated` | 방 상태 변경 알림 |

---

## 8. 예상 문제

### 8-1. 중복 투표 문제

같은 참가자가 같은 매치에 여러 번 투표할 수 있으므로, 투표 테이블에 `unique(match_id, member_id)` 제약을 추가하고 서비스 로직에서도 기존 투표 여부를 검증한다.

### 8-2. 다음 매치 중복 진행 문제

여러 참가자의 투표 요청이 거의 동시에 처리될 경우 다음 매치 진행 로직이 중복 실행될 수 있다.

이를 방지하기 위해 이미 `winner_id`가 존재하는 매치는 다시 처리하지 않도록 검증한다.

### 8-3. 새로고침 시 상태 유실 문제

소켓 이벤트에만 의존하면 새로고침 시 현재 게임 상태를 잃을 수 있다.

따라서 현재 방 상태, 현재 매치, 투표 여부를 DB에 저장하고 복구 API를 제공한다.


