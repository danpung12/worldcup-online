import { io, type Socket } from "socket.io-client";
import { socketBaseUrl } from "@/lib/worldcup";

type RoomMemberResponse = {
  avatar?: string | null;
  id: number;
  nickname: string;
  is_host: boolean;
};

type RoomResponse = {
  id: number;
  game_id?: number;
  room_code: string;
  member: RoomMemberResponse[];
};

type WorldcupItemResponse = {
  id: number;
  name: string;
  image_url: string;
};

type MatchResponse = {
  id: number;
  round_id: number;
  match_index: number;
  item_a_id: number;
  item_b_id: number;
  winner_id: number | null;
  item_a: WorldcupItemResponse;
  item_b: WorldcupItemResponse;
};

type GameUpdateResponse =
  | MatchResponse
  | {
      status: "voting";
      vote?: {
        memberId: number;
        selectItemId: number;
      };
    }
  | {
      status: "tie";
      match: MatchResponse;
    }
  | {
      status: "nextMatch";
      match: MatchResponse;
      vote?: {
        memberId: number;
        selectItemId: number;
      };
    }
  | {
      winnerId: number;
      finished: true;
    };

type CreateRoomAck = {
  message: string;
  roomCode: string;
  member?: RoomMemberResponse;
  room: RoomResponse;
};

type JoinRoomAck = {
  message: string;
  roomCode?: string;
  member: RoomMemberResponse;
  room: RoomResponse;
};

let socket: Socket | null = null;

export function getRoomSocket() {
  socket ??= io(socketBaseUrl, {
    autoConnect: false,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export async function createRoom(payload: {
  avatar: string;
  gameId: number;
  nickname: string;
}) {
  const activeSocket = getRoomSocket();

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket.timeout(5000).emitWithAck("createRoom", payload) as Promise<CreateRoomAck>;
}

export async function joinRoom(payload: {
  avatar: string;
  roomCode: string;
  nickname: string;
}) {
  const activeSocket = getRoomSocket();

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket.timeout(5000).emitWithAck("joinRoom", payload) as Promise<JoinRoomAck>;
}

export function startGame(payload?: { roundSize?: number }) {
  const activeSocket = getRoomSocket();

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  activeSocket.emit("startGame", payload ?? {});
}

export async function vote(selectItemId: number) {
  const activeSocket = getRoomSocket();

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket.timeout(5000).emitWithAck("vote", {
    selectItemId,
  }) as Promise<GameUpdateResponse>;
}

export function onRoomUpdate(callback: (room: RoomResponse) => void) {
  const activeSocket = getRoomSocket();

  activeSocket.on("roomUpdate", callback);

  return () => {
    activeSocket.off("roomUpdate", callback);
  };
}

export function onGameUpdate(callback: (update: GameUpdateResponse) => void) {
  const activeSocket = getRoomSocket();

  activeSocket.on("gameUpdate", callback);

  return () => {
    activeSocket.off("gameUpdate", callback);
  };
}

export function onSocketException(callback: (error: unknown) => void) {
  const activeSocket = getRoomSocket();

  activeSocket.on("exception", callback);

  return () => {
    activeSocket.off("exception", callback);
  };
}

export type {
  GameUpdateResponse,
  MatchResponse,
  RoomMemberResponse,
  RoomResponse,
  WorldcupItemResponse,
};
