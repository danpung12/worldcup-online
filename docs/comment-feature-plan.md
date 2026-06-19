# 댓글 기능 요구사항 및 구현 계획

## 1. 목적

월드컵 랭킹 페이지에서 사용자가 해당 월드컵에 대한 의견을 남길 수 있도록 댓글 기능을 추가한다.

PIKU처럼 가볍게 작성할 수 있는 공개 댓글을 목표로 하되, 로그인 사용자는 본인이 작성한 댓글을 삭제할 수 있게 한다.

## 2. 기능 범위

### 댓글 작성

- 랭킹 페이지에서 댓글을 작성할 수 있다.
- 로그인하지 않은 사용자도 댓글을 작성할 수 있다.
- 닉네임 입력값은 사용자가 수정할 수 있다.
- 비로그인 사용자의 닉네임 기본값은 `익명`으로 표시한다.
- 로그인 사용자의 닉네임 기본값은 로그인 계정의 닉네임으로 표시한다.
- 댓글 내용이 비어 있으면 저장하지 않는다.

### 댓글 조회

- 월드컵별 댓글 목록을 조회한다.
- 댓글 목록에는 닉네임, 내용, 작성 시간이 표시된다.
- 최신 댓글이 위에 오도록 정렬한다.

### 댓글 삭제

- 로그인 사용자는 본인이 작성한 댓글만 삭제할 수 있다.
- 비로그인 사용자가 작성한 댓글은 1차 구현에서는 삭제를 지원하지 않는다.
- 댓글 작성자와 현재 로그인 사용자가 다르면 삭제 버튼을 보여주지 않는다.

## 3. DB 설계

`Comment` 모델을 사용한다.

```prisma
  model Comment {

    id Int @id @default(autoincrement())

    user_id Int?
    user User? @relation(fields:[user_id], references: [id], onDelete: Cascade)


    nickname  String
    content String
    created_at  DateTime @default(now())


    game_id Int
    game  WorldcupGame  @relation(fields: [game_id], references: [id], onDelete: Cascade)
  }

```
필드 의미:

- `user_id`: 로그인 사용자가 작성한 댓글이면 저장한다. 비로그인 댓글은 `null`이다.
- `nickname`: 화면에 표시할 닉네임이다. 로그인/비로그인 모두 사용자가 수정한 값을 저장한다.
- `content`: 댓글 내용이다.
- `game_id`: 댓글이 달린 월드컵 ID다.

## 4. API 계획

### 댓글 목록 조회

```http
GET /comments?gameId=1
```

응답:

```ts
{
  id: number;
  nickname: string;
  content: string;
  created_at: string;
  user_id: number | null;
}
[];
```

### 댓글 작성

```http
POST /comments
```

요청:

```ts
{
  gameId: number;
  nickname: string;
  content: string;
}
```

처리 기준:

- 로그인 상태면 `req.user.id`를 `user_id`에 저장한다.
- 비로그인 상태면 `user_id`는 `null`로 저장한다.
- `nickname`, `content`는 필수값으로 검증한다.

### 댓글 삭제

```http
DELETE /comments/:commentId
```

처리 기준:

- 로그인한 사용자만 요청할 수 있다.
- 댓글의 `user_id`와 현재 로그인한 사용자의 ID가 같을 때만 삭제한다.
- 권한이 없으면 `403 Forbidden`을 반환한다.

## 5. 프론트 구현 계획

### 랭킹 페이지

- 랭킹 목록 아래에 댓글 영역을 배치한다.
- 입력 영역은 닉네임 input, 댓글 textarea 또는 input, 저장 버튼으로 구성한다.
- 닉네임 기본값은 로그인 여부에 따라 다르게 채운다.

기본값:

```ts
const defaultNickname = user?.nickname ?? "익명";
```

### 댓글 목록

- 댓글 작성 후 목록을 다시 불러오거나, 생성된 댓글을 목록에 바로 추가한다.
- 로그인 유저의 댓글이면 삭제 버튼을 표시한다.

삭제 버튼 표시 조건:

```ts
comment.user_id && user?.id === comment.user_id;
```

## 6. 구현 순서

1. Prisma `Comment` 모델 및 migration 추가
2. 댓글 조회 API 구현
3. 댓글 작성 API 구현
4. 댓글 삭제 API 구현
5. 랭킹 페이지 댓글 UI 추가
6. 로그인/비로그인 닉네임 기본값 처리
7. 본인 댓글 삭제 버튼 조건 처리

## 7. 추후 개선

- 비로그인 댓글 삭제 추가를 검토한다.
- 댓글 신고 기능을 추가할 수 있다.
- 페이지네이션 또는 더보기 방식으로 댓글 목록을 나눌 수 있다.
- 관리자 또는 월드컵 작성자의 댓글 삭제 권한을 추가할 수 있다.
