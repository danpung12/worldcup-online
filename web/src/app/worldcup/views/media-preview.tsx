"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff, Play } from "lucide-react";
import { ImageCredit } from "./image-credit";
import { getMediaImageSrc, getYouTubeId } from "./media-source";

export function MediaPreview({
  alt,
  className,
  fit = "cover",
  isPlaying = false,
  eager = false,
  onPlay,
  playControl = "overlay",
  src,
}: {
  alt: string;
  className: string;
  fit?: "cover" | "contain";
  isPlaying?: boolean;
  eager?: boolean;
  onPlay?: () => void;
  playControl?: "overlay" | "corner";
  src: string;
}) {
  const videoId = getYouTubeId(src);
  const imageSrc = getMediaImageSrc(src);
  const thumbnail = videoId ? imageSrc : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (videoId && isPlaying) {
    return (
      <div className={`relative overflow-hidden bg-black ${className}`}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={alt}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-[#edf3f6] ${className}`}>
      {!imageSrc || failedSrc === imageSrc ? (
        <div
          className="grid size-full place-content-center justify-items-center gap-2 text-[#63727c]"
          role="img"
          aria-label={`${alt} 없음`}
        >
          <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
        </div>
      ) : (
        <Image
          key={imageSrc}
          alt={alt}
          className={`size-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
          height={520}
          loading={eager ? "eager" : "lazy"}
          src={imageSrc}
          unoptimized={!videoId}
          onError={() => setFailedSrc(imageSrc)}
          width={820}
        />
      )}
      {thumbnail && onPlay && (
        <button
          aria-label={`${alt} 재생`}
          className={
            playControl === "corner"
              ? "absolute left-3 top-3 z-20 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-[#18212a]/90 px-3 text-[13px] font-semibold text-white"
              : "absolute inset-0 z-20 grid place-items-center bg-black/10"
          }
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPlay?.();
          }}
        >
          {playControl === "corner" ? (
            <>
              <Play size={14} aria-hidden="true" /> 영상 재생
            </>
          ) : (
            <span className="grid size-11 place-items-center rounded-full bg-white/95 text-[#27729b] shadow-sm">
              <Play className="ml-0.5 size-5 fill-current" />
            </span>
          )}
        </button>
      )}
      {thumbnail && !onPlay && (
        <span
          className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10"
          aria-hidden="true"
        >
          <Play className="size-5 fill-white text-white" />
        </span>
      )}
      {failedSrc !== imageSrc && <ImageCredit src={imageSrc} />}
    </div>
  );
}

export function ExpandedMedia({ alt, src }: { alt: string; src: string }) {
  const videoId = getYouTubeId(src);

  if (videoId) {
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="block aspect-video w-full bg-black"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={alt}
      />
    );
  }

  return (
    <div>
      <div className="relative">
        <Image
          alt={alt}
          className="block max-h-[72vh] w-full object-contain bg-black"
          height={760}
          src={src}
          unoptimized
          width={760}
        />
        <ImageCredit src={src} />
      </div>
    </div>
  );
}
