"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchResponse } from "@/lib/room-socket";

export function useMatchReveal() {
  const [reveal, setReveal] = useState<{
    match: MatchResponse;
    winnerId: number;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMatchId = useRef<number | null>(null);

  const clearReveal = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    lastMatchId.current = null;
    setReveal(null);
  }, []);

  const revealWinner = useCallback((match: MatchResponse, winnerId: number) => {
    // The same outcome may arrive through both the socket event and vote ack.
    if (lastMatchId.current === match.id) return;
    lastMatchId.current = match.id;
    if (timer.current) clearTimeout(timer.current);
    setReveal({ match, winnerId });
    timer.current = setTimeout(() => {
      setReveal(null);
      timer.current = null;
    }, 1100);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { reveal, revealWinner, clearReveal };
}
