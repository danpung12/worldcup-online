export type WorldcupGame = {
  id: number;
  title: string;
  description: string;
  participants: number;
  playCount?: number;
  rounds: number;
  updatedAt: string;
  updatedAtTime?: number;
  imageUrl: string;
  candidates: string[];
  ranking: Array<{ imageUrl: string; name: string; votes: number }>;
};

export type BackendWorldcupItem = {
  id: number;
  name: string;
  image_url: string;
};

export type BackendWorldcupGame = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  play_count: number;
  updated_at: string;
  items: BackendWorldcupItem[];
};

export type MyWorldcupGame = {
  id: number;
  title: string;
  description: string | null;
  thumbnail: string | null;
  play_count: number;
  created_at: string;
  updated_at: string;
};

type UploadResponse = {
  Key: string;
  fileUrl: string;
  uploadUrl: string;
};

export type CreateWorldcupItemInput = {
  image_url: string;
  name: string;
};

export type CreateWorldcupGameInput = {
  game: {
    description?: string;
    thumbnail?: string;
    title: string;
  };
  items: CreateWorldcupItemInput[];
};

export const queryKeys = {
  games: ["worldcup", "games"] as const,
  gameDetail: (gameId: number) => ["worldcup", "game", gameId] as const,
  myGames: ["worldcup", "my-games"] as const,
};

const defaultApiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://worldcupapi.duckdns.org"
    : "http://localhost:4000";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl;
export const socketBaseUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? apiBaseUrl;

const imageUrl = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const mockGames: WorldcupGame[] = [
  {
    id: 1,
    title: "2026 여자 아이돌 이상형 월드컵",
    description: "요즘 많이 언급되는 여자 아이돌 후보를 모은 128강",
    participants: 128,
    rounds: 128,
    updatedAt: "오늘 업데이트",
    imageUrl: imageUrl("photo-1516280440614-37939bbacd81"),
    candidates: ["카리나", "설윤", "장원영", "해린"],
    ranking: [
      { imageUrl: imageUrl("photo-1494790108377-be9c29b29330"), name: "카리나", votes: 18420 },
      { imageUrl: imageUrl("photo-1502823403499-6ccfcf4fb453"), name: "장원영", votes: 16210 },
      { imageUrl: imageUrl("photo-1534528741775-53994a69daeb"), name: "설윤", votes: 14889 },
      { imageUrl: imageUrl("photo-1524504388940-b1c1722653e1"), name: "해린", votes: 12750 },
    ],
  },
  {
    id: 2,
    title: "최애 음식 이상형 월드컵",
    description: "친구들이랑 고르면 은근히 싸움 나는 음식 취향 테스트",
    participants: 64,
    rounds: 64,
    updatedAt: "2시간 전",
    imageUrl: imageUrl("photo-1543353071-10c8ba85a904"),
    candidates: ["떡볶이", "치킨", "초밥", "마라탕"],
    ranking: [
      { imageUrl: imageUrl("photo-1569718212165-3a8278d5f624"), name: "떡볶이", votes: 9210 },
      { imageUrl: imageUrl("photo-1562967914-608f82629710"), name: "치킨", votes: 8940 },
      { imageUrl: imageUrl("photo-1579871494447-9811cf80d66c"), name: "초밥", votes: 7102 },
      { imageUrl: imageUrl("photo-1569718212165-3a8278d5f624"), name: "마라탕", votes: 6881 },
    ],
  },
  {
    id: 3,
    title: "여행지 월드컵",
    description: "다음 휴가 후보를 같이 고르는 여행 취향 월드컵",
    participants: 32,
    rounds: 32,
    updatedAt: "어제",
    imageUrl: imageUrl("photo-1507525428034-b723cf961d3e"),
    candidates: ["삿포로", "다낭", "파리", "제주"],
    ranking: [
      { imageUrl: imageUrl("photo-1513415277900-a62401e19be4"), name: "삿포로", votes: 6410 },
      { imageUrl: imageUrl("photo-1500530855697-b586d89ba3ee"), name: "제주", votes: 5982 },
      { imageUrl: imageUrl("photo-1507525428034-b723cf961d3e"), name: "다낭", votes: 5440 },
      { imageUrl: imageUrl("photo-1502602898657-3e91760cbb34"), name: "파리", votes: 5112 },
    ],
  },
  {
    id: 4,
    title: "애니 캐릭터 이상형 월드컵",
    description: "긴 설명 없이 바로 고르는 인기 애니 캐릭터 256강",
    participants: 256,
    rounds: 256,
    updatedAt: "3일 전",
    imageUrl: imageUrl("photo-1612036782180-6f0b6cd846fe"),
    candidates: ["마린", "카오루코", "아냐", "미쿠"],
    ranking: [
      { imageUrl: imageUrl("photo-1612036782180-6f0b6cd846fe"), name: "마린", votes: 12844 },
      { imageUrl: imageUrl("photo-1613376023733-0a73315d9b06"), name: "미쿠", votes: 12110 },
      { imageUrl: imageUrl("photo-1618331835717-801e976710b2"), name: "아냐", votes: 11720 },
      { imageUrl: imageUrl("photo-1601850494422-3cf14624b0b3"), name: "카오루코", votes: 10290 },
    ],
  },
];

export async function fetchWorldcupGames() {
  const response = await fetch(`${apiBaseUrl}/worldcup`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("월드컵 목록을 불러오지 못했습니다.");
  }

  const games = (await response.json()) as BackendWorldcupGame[];

  return games.map(mapBackendGame);
}

export async function fetchMyWorldcupGames() {
  const response = await fetch(`${apiBaseUrl}/worldcup/mygame`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }

  if (!response.ok) {
    throw new Error("내 월드컵 목록을 불러오지 못했습니다.");
  }

  return response.json() as Promise<MyWorldcupGame[]>;
}

export async function fetchWorldcupGameDetail(gameId: number) {
  const response = await fetch(`${apiBaseUrl}/worldcup/${gameId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("월드컵 상세 정보를 불러오지 못했습니다.");
  }

  return response.json() as Promise<BackendWorldcupGame>;
}

export async function uploadImageFile(file: File) {
  const presignedResponse = await fetch(`${apiBaseUrl}/upload/presigned-url`, {
    body: JSON.stringify({
      contentType: file.type,
      fileName: file.name,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!presignedResponse.ok) {
    throw new Error("이미지 업로드 URL을 만들지 못했습니다.");
  }

  const presigned = (await presignedResponse.json()) as UploadResponse;
  const uploadResponse = await fetch(presigned.uploadUrl, {
    body: file,
    headers: {
      "Content-Type": file.type,
    },
    method: "PUT",
  });

  if (!uploadResponse.ok) {
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  return presigned.fileUrl;
}

export async function createWorldcupGame(input: CreateWorldcupGameInput) {
  const response = await fetch(`${apiBaseUrl}/worldcup`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("월드컵을 만들지 못했습니다.");
  }

  return response.json() as Promise<BackendWorldcupGame>;
}

export async function updateWorldcupGame(
  gameId: number,
  input: CreateWorldcupGameInput["game"],
) {
  const response = await fetch(`${apiBaseUrl}/worldcup/${gameId}`, {
    body: JSON.stringify({ game: input }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("월드컵을 수정하지 못했습니다.");
  }

  return response.json() as Promise<MyWorldcupGame>;
}

export async function createWorldcupItem(
  gameId: number,
  input: CreateWorldcupItemInput,
) {
  const response = await fetch(`${apiBaseUrl}/worldcup/${gameId}/items`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("후보를 추가하지 못했습니다.");
  }

  return response.json() as Promise<BackendWorldcupItem>;
}

export async function updateWorldcupItem(
  itemId: number,
  input: CreateWorldcupItemInput,
) {
  const response = await fetch(`${apiBaseUrl}/worldcup/items/${itemId}`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("후보를 수정하지 못했습니다.");
  }

  return response.json() as Promise<BackendWorldcupItem>;
}

export async function deleteWorldcupItem(itemId: number) {
  const response = await fetch(`${apiBaseUrl}/worldcup/items/${itemId}`, {
    credentials: "include",
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("후보를 삭제하지 못했습니다.");
  }
}

export async function deleteWorldcupGame(gameId: number) {
  const response = await fetch(`${apiBaseUrl}/worldcup/${gameId}`, {
    credentials: "include",
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("월드컵을 삭제하지 못했습니다.");
  }
}

function mapBackendGame(game: BackendWorldcupGame): WorldcupGame {
  const imageUrl =
    game.thumbnail ??
    game.items[0]?.image_url ??
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80";

  return {
    id: game.id,
    title: game.title,
    description: game.description ?? "친구와 함께 고르는 이상형 월드컵",
    participants: game.items.length,
    playCount: game.play_count,
    rounds: game.items.length,
    updatedAt: formatUpdatedAt(game.updated_at),
    updatedAtTime: new Date(game.updated_at).getTime(),
    imageUrl,
    candidates: game.items.map((item) => item.name),
    ranking: game.items.slice(0, 4).map((item, index) => ({
      imageUrl: item.image_url,
      name: item.name,
      votes: Math.max(game.play_count - index * 7, 0),
    })),
  };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "최근 업데이트";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}
