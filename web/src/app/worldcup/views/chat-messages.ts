import type { ChatResponse } from "@/lib/room-socket";

export type ChatMessage = ChatResponse & {
  localId?: string;
  delivery?: "sending" | "unconfirmed";
};

export type ChatState = {
  messages: ChatMessage[];
  // Keep outstanding sends even after they leave the 50-message viewport.
  pending: ChatMessage[];
  // History can arrive between server storage and the corresponding broadcast.
  historyEchoes: ChatResponse[];
};

export type ChatAction =
  | { type: "send"; chat: ChatMessage }
  | { type: "receive"; chat: ChatResponse }
  | { type: "history"; chats: ChatResponse[] }
  | { type: "unconfirmed"; localId: string }
  | { type: "reset" };

export const initialChatState: ChatState = {
  messages: [],
  pending: [],
  historyEchoes: [],
};

function matchesSend(local: ChatMessage, incoming: ChatResponse) {
  // The current server protocol has no message ID. Consume one matching send
  // at a time, rather than dropping every message from the current member.
  return (
    Number(local.memberId) === Number(incoming.memberId) &&
    local.message === incoming.message
  );
}

function serverKey(chat: ChatResponse) {
  return JSON.stringify([Number(chat.memberId), chat.createdAt, chat.message]);
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "send": {
      const chat: ChatMessage = { ...action.chat, delivery: "sending" };
      return {
        ...state,
        messages: [...state.messages, chat].slice(-50),
        pending: [...state.pending, chat],
      };
    }
    case "receive": {
      const historyIndex = state.historyEchoes.findIndex(
        (chat) => serverKey(chat) === serverKey(action.chat),
      );
      if (historyIndex !== -1) {
        return {
          ...state,
          historyEchoes: state.historyEchoes.filter(
            (_, index) => index !== historyIndex,
          ),
        };
      }
      const index = state.pending.findIndex((chat) =>
        matchesSend(chat, action.chat),
      );
      if (index === -1) {
        return {
          ...state,
          messages: [...state.messages, action.chat].slice(-50),
        };
      }
      const local = state.pending[index];
      return {
        ...state,
        messages: state.messages.map((chat) =>
          chat.localId === local.localId
            ? { ...action.chat, localId: local.localId }
            : chat,
        ),
        pending: state.pending.filter(
          (_, pendingIndex) => pendingIndex !== index,
        ),
      };
    }
    case "history": {
      const pending = [...state.pending];
      const historyEchoes = [...state.historyEchoes];
      const known = new Map<string, ChatMessage[]>();
      for (const chat of state.messages) {
        if (chat.delivery) continue;
        const key = serverKey(chat);
        known.set(key, [...(known.get(key) ?? []), chat]);
      }
      const messages = action.chats.map((chat): ChatMessage => {
        // An older identical message in history must not confirm a new send.
        const existing = known.get(serverKey(chat))?.shift();
        if (existing) return { ...chat, localId: existing.localId };
        historyEchoes.push(chat);
        const index = pending.findIndex((local) => matchesSend(local, chat));
        if (index === -1) return chat;
        const [local] = pending.splice(index, 1);
        return { ...chat, localId: local.localId };
      });
      return {
        messages: [...messages, ...pending].slice(-50),
        pending,
        historyEchoes: historyEchoes.slice(-50),
      };
    }
    case "unconfirmed": {
      const pending = state.pending.find(
        (chat) => chat.localId === action.localId,
      );
      if (!pending) return state;
      const mark = (chat: ChatMessage): ChatMessage =>
        chat.localId === action.localId
          ? { ...chat, delivery: "unconfirmed" }
          : chat;
      return {
        ...state,
        messages: state.messages.map(mark),
        pending: state.pending.map(mark),
      };
    }
    case "reset":
      return initialChatState;
  }
}
