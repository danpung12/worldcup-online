"use client";

import Image from "next/image";
import { Play } from "lucide-react";

function getYouTubeId(url: string) {
  const match = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);

  return match?.[1] ?? null;
}

export function MediaPreview({
  alt,
  className,
  isPlaying = false,
  onPlay,
  src,
}: {
  alt: string;
  className: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  src: string;
}) {
  const videoId = getYouTubeId(src);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

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
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        alt={alt}
        className="size-full object-cover"
        height={520}
        src={thumbnail ?? src}
        width={820}
      />
      {thumbnail && (
        <button
          aria-label={`${alt} 재생`}
          className="absolute inset-0 z-20 grid place-items-center bg-black/10"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPlay?.();
          }}
        >
          <span className="grid size-11 place-items-center rounded-full bg-white/95 text-[#0066cc] shadow-sm">
            <Play className="ml-0.5 size-5 fill-[#0066cc]" />
          </span>
        </button>
      )}
    </div>
  );
}

export function ExpandedMedia({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  const videoId = getYouTubeId(src);

  if (videoId) {
    return (
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video w-full bg-black"
        src={`https://www.youtube.com/embed/${videoId}`}
        title={alt}
      />
    );
  }

  return (
    <Image
      alt={alt}
      className="max-h-[72vh] w-full object-contain bg-black"
      height={760}
      src={src}
      width={760}
    />
  );
}

