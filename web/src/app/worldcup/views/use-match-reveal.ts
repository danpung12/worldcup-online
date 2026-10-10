"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import type { MatchResponse } from "@/lib/room-socket";
import { getMediaImageSrc, getYouTubeId } from "./media-source";

export function useMatchReveal(nextMatch: MatchResponse | null) {
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
    }, 700);
  }, []);

  useEffect(() => {
    if (!reveal || !nextMatch || nextMatch.id === reveal.match.id) return;
    // Warm exactly the same image URLs used by MediaPreview while
    // the confirmed winner is still on screen. A slow image never blocks play.
    for (const item of [nextMatch.item_a, nextMatch.item_b]) {
      const src = getMediaImageSrc(item.image_url);
      if (!src) continue;
      const { props } = getImageProps({
        src,
        alt: "",
        width: 820,
        height: 520,
        unoptimized: !getYouTubeId(item.image_url),
      });
      const image = new window.Image();
      image.decoding = "async";
      image.srcset = props.srcSet ?? "";
      image.src = props.src;
      void image.decode().catch(() => undefined);
    }
  }, [nextMatch, reveal]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { reveal, revealWinner, clearReveal };
}
