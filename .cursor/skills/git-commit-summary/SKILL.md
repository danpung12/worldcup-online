---
name: git-commit-summary
description: Use this when the user asks to commit current git changes, summarize all work since the last git commit, create a professional backend-focused commit message, and push the commit.
---

# Git Commit Summary Skill

## When to use

사용자가 다음과 같이 말하면 이 스킬을 실행한다.

- "지금까지 작업한 거 커밋해줘"
- "현재 변경사항 커밋해줘"
- "마지막 커밋 이후 작업 커밋해줘"
- "git에 커밋해줘"
- "커밋 메시지 만들어줘"
- 이와 비슷하게, 현재 Git 변경사항을 커밋하거나 커밋 메시지를 정리해달라는 요청

## Project structure

이 프로젝트는 백엔드와 프론트엔드가 분리되어 있다.

- Backend folder: `server`
- Frontend folder: `web`

커밋 메시지는 백엔드 포트폴리오 용도로 작성한다.

따라서 백엔드 변경사항을 중심으로 요약하고, 프론트엔드 변경사항은 가능하면 마지막 줄에 간략하게 정리한다.

## Goal

가장 마지막 Git 커밋 이후의 모든 변경사항을 확인한 뒤, 기능 중심으로 현업에서 사용하는 스타일의 커밋 제목과 내용을 작성한다.

가능하면 실제 커밋까지 진행한다.

## Steps

1. 현재 Git 상태를 확인한다.

```bash
git status
```

2. 마지막 커밋 이후 변경된 파일 목록을 확인한다.

```bash
git diff --name-only HEAD
```

3. 백엔드 변경사항을 우선 확인한다.

```bash
git diff HEAD -- leesns-backend
```

4. 프론트엔드 변경사항이 있다면 간략히 확인한다.

```bash
git diff HEAD -- leesns-web
```

5. 변경사항을 기능 단위로 분류한다.

예시 분류:

- API 추가 또는 수정
- Service 로직 추가 또는 수정
- DTO 추가 또는 수정
- Prisma schema 변경
- DB 관계 변경
- 인증/인가 로직 변경
- 업로드 기능 변경
- 예외 처리 추가
- 응답 구조 변경
- 프론트엔드 연동 변경

6. 커밋 메시지를 작성한다.

## Commit message format

커밋 메시지는 반드시 아래 형식을 따른다.

```txt
feat: 커밋 제목


- 커밋 내용 1


- 커밋 내용 2


- 커밋 내용 3
```

규칙:

- 제목 아래에는 엔터를 두 줄 넣는다.
- 내용은 `-` 로 시작한다.
- 내용끼리는 엔터를 두 줄씩 띄운다.
- 제목은 기능 중심으로 작성한다.
- 불필요하게 파일명만 나열하지 않는다.
- 백엔드 변경사항을 먼저 정리한다.
- 프론트엔드 변경사항은 가능하면 가장 마지막 bullet에 간략히 작성한다.
- 백엔드 포트폴리오에 어울리도록 실무적인 표현을 사용한다.
- 사용자가 참고 레포나 예시 톤을 주면, 그 스타일에 맞춰 더 짧고 단단하게 쓴다.
- 너무 장황한 설명보다, 한 번에 읽히는 짧고 자연스러운 문장으로 정리한다.

## Commit title rules

제목은 아래 타입 중 가장 적절한 것을 사용한다.

- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `refactor:` 구조 개선 또는 리팩토링
- `chore:` 설정, 환경, 의존성, 기타 작업
- `docs:` 문서 변경
- `style:` 포맷팅, 스타일 변경
- `test:` 테스트 추가 또는 수정

예시:

```txt
feat: 프로필 이미지 업로드 및 사용자 정보 수정 기능 추가
```

```txt
feat: 팔로우 관계 생성 및 조회 기능 추가
```

```txt
refactor: 게시글 이미지 업로드 구조 개선
```

## Backend-first summary rules

백엔드 변경사항은 구체적으로 작성한다.

좋은 예시:

```txt
- 사용자 프로필 수정 API를 추가하고 nickname, avatarUrl 필드를 선택적으로 업데이트할 수 있도록 DTO를 구성
```

```txt
- Prisma User 모델에 avatarUrl 필드를 추가하여 프로필 이미지 경로를 저장할 수 있도록 확장
```

```txt
- 팔로우 관계 생성을 위한 Follow 모델을 추가하고 follower/following 관계를 명확히 분리
```

나쁜 예시:

```txt
- user 파일 수정
```

```txt
- 코드 고침
```

```txt
- 백엔드 작업
```

## Frontend summary rules

프론트엔드 변경사항은 백엔드 작업보다 중요도가 낮다.

프론트 변경사항이 있을 경우 마지막 bullet에 한 줄로만 간단히 적는다.

예시:

```txt
- 프론트엔드에서는 프로필 수정 API 연동을 위한 요청 로직을 간단히 반영
```

```txt
- 프론트엔드에서는 업로드 응답값을 화면 상태에 반영하도록 일부 연동 코드 수정
```

프론트 변경사항이 크더라도 백엔드 포트폴리오용 커밋이라면 너무 자세히 설명하지 않는다.

## Reference link rule

사용자가 Velog, 블로그, 문서, 강의 정리 글 등의 링크를 주면서 다음과 같이 말하면 해당 링크를 커밋 메시지 맨 마지막에 포함한다.

- "이것도 같이 넣어줘"
- "이 링크도 넣어줘"
- "velog 링크도 같이 넣어줘"
- "글 링크도 커밋에 넣어줘"
- 이와 비슷하게 참고 링크를 커밋 메시지에 포함해달라는 요청

링크를 추가할 때는 마지막 bullet 아래에 엔터를 두 줄 넣고, `-` 없이 링크만 그대로 작성한다.

예시:

```txt
feat: 댓글 기능 추가 및 DB 관계 정리


- 댓글 CRUD API를 추가하고 게시글별 댓글 조회 흐름을 구현


- Comment 모델을 추가하고 Post, User와의 관계를 정리


- 게시글 응답에 댓글 수와 작성자 정보를 포함하도록 서비스 로직 수정


- 프론트엔드에서는 댓글 API 연동을 위한 요청 흐름을 간단히 반영


https://velog.io/@aass6863/NestJs-댓글-comment
```

주의사항:

- 링크 앞에는 `-` 를 붙이지 않는다.
- 링크는 커밋 메시지의 가장 마지막 줄에 둔다.
- 링크 위에는 반드시 엔터를 두 줄 넣는다.
- 사용자가 여러 링크를 준 경우에는 각 링크를 줄바꿈해서 그대로 추가한다.

## Commit execution

커밋 메시지를 작성한 뒤, 변경사항을 스테이징한다.

```bash
git add .
```

그리고 작성한 메시지로 커밋한다.

커밋 메시지는 `git commit`의 여러 `-m` 옵션을 사용해서 작성한다.

예시:

```bash
git commit -m "feat: 프로필 이미지 업로드 및 사용자 정보 수정 기능 추가" \
  -m "- User 모델에 avatarUrl 필드를 추가하여 프로필 이미지 경로를 저장할 수 있도록 확장

- 프로필 수정을 위한 DTO를 구성하고 nickname, avatarUrl 값을 선택적으로 업데이트할 수 있도록 구현

- 사용자 정보 수정 서비스에서 본인 userId 기준으로 프로필 정보를 갱신하고 필요한 필드만 응답하도록 처리

- 프론트엔드에서는 프로필 이미지 업로드 및 수정 API 연동을 위한 요청 흐름을 간단히 반영"
```

참고 링크가 포함된 경우 예시:

```bash
git commit -m "feat: 댓글 기능 추가 및 DB 관계 정리" \
  -m "- 댓글 CRUD API를 추가하고 게시글별 댓글 조회 흐름을 구현

- Comment 모델을 추가하고 Post, User와의 관계를 정리

- 게시글 응답에 댓글 수와 작성자 정보를 포함하도록 서비스 로직 수정

- 프론트엔드에서는 댓글 API 연동을 위한 요청 흐름을 간단히 반영

https://velog.io/@aass6863/NestJs-댓글-comment"
```

커밋이 성공하면 원격 저장소로 push까지 진행한다.

```bash
git push
```

## Output to user

커밋 완료 후 사용자에게는 다음 내용을 짧게 알려준다.

- 커밋 완료 여부
- 사용한 커밋 제목
- 주요 변경 요약
- push 완료 여부

예시:

```txt
커밋하고 push까지 완료했어.

feat: 프로필 이미지 업로드 및 사용자 정보 수정 기능 추가

백엔드 기준으로 User 모델 확장, 프로필 수정 DTO/서비스/API 흐름을 중심으로 정리했고, 프론트 변경사항은 마지막 줄에 간략히 포함했어.
```

## Important notes

- 변경사항을 정확히 확인하지 않고 커밋 메시지를 추측하지 않는다.
- 프론트엔드 변경사항이 있더라도 백엔드 변경사항보다 앞에 두지 않는다.
- 사용자가 커밋만 원하면 불필요한 설명을 길게 하지 않는다.
- 커밋 메시지는 포트폴리오에서 봐도 자연스럽게 보이도록 기능 중심으로 작성한다.
- 하나의 커밋에 너무 많은 주제가 섞여 있으면, 가능하면 기능 단위로 커밋을 나눌지 판단한다.
- 단, 사용자가 “한 번에 커밋해줘”라고 했다면 하나의 커밋으로 정리한다.
- 사용자가 Velog나 글 링크를 커밋에 포함해달라고 하면, 마지막 bullet 아래에 엔터를 두 줄 넣고 `-` 없이 링크만 추가한다.

## User project commit tone

This project prefers concise commit messages similar to the existing commit history.

Use this style by default:

```txt
feat: 프로필 이미지 업로드 구현

- User 모델에 avatarUrl 필드 추가

- 프로필 이미지 업로드 API와 프로필 수정 API 추가

- 게시글과 댓글 작성자 정보에 avatarUrl 포함

- 프론트 프로필 수정 모달과 이미지 표시 연동

https://velog.io/@aass6863/NestJS-프로필-이미지-구현
```

Rules:

- Keep the title short and feature-centered.
- Keep the body to about 3-5 bullets.
- Do not over-explain implementation details.
- Do not mention incidental sample/test files unless the user explicitly asks.
- Backend changes should come first.
- Frontend changes should be summarized briefly near the end.
- If a Velog/reference link is provided, put it on the last line without a leading `-`.
- Match the tone of recent project commits such as:
  - `feat: 게시글 좋아요 기능 구현`
  - `feat: 마이페이지 프로필 및 작성 게시글 조회 연동`
  - `feat: 게시글 이미지 업로드 구현`
