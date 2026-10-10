export function getYouTubeId(url: string) {
  return url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/)?.[1] ?? null;
}

export function getMediaImageSrc(src: string) {
  const videoId = getYouTubeId(src);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : src;
}
