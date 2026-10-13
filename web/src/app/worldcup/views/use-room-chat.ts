"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { onChatHistory, onChatUpdate, sendChat } from "@/lib/room-socket";
import { chatReducer, initialChatState } from "./chat-messages";

export function useRoomChat() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const reset = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    dispatch({ type: "reset" });
  }, []);

  useEffect(() => {
    const pendingTimers = timers.current;
    const offHistory = onChatHistory((chats) => {
      dispatch({ type: "history", chats: chats ?? [] });
    });
    const offUpdate = onChatUpdate((chat) => {
      dispatch({ type: "receive", chat });
    });
    return () => {
      offHistory();
      offUpdate();
      for (const timer of pendingTimers.values()) clearTimeout(timer);
      pendingTimers.clear();
    };
  }, []);

  const send = useCallback((message: string, memberId: number | null) => {
    const text = message.trim();
    if (!text || memberId === null) return;
    const localId = crypto.randomUUID();
    dispatch({
      type: "send",
      chat: {
        localId,
        memberId,
        message: text,
        createdAt: new Date().toISOString(),
      },
    });
    // The server currently confirms delivery through chatUpdate, not an ACK.
    // A timeout is uncertainty, so don't silently claim success or resend.
    timers.current.set(
      localId,
      setTimeout(() => {
        timers.current.delete(localId);
        dispatch({ type: "unconfirmed", localId });
      }, 10_000),
    );
    try {
      sendChat(text);
    } catch {
      clearTimeout(timers.current.get(localId));
      timers.current.delete(localId);
      dispatch({ type: "unconfirmed", localId });
    }
  }, []);

  return { messages: state.messages, reset, send };
}
