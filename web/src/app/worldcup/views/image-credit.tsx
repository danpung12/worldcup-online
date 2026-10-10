import credits from "@/lib/image-credits.json";

export function ImageCredit({ src }: { src: string }) {
  const credit = credits.images.find((item) => item.image_url === src);
  if (!credit || credit.author === "PIKU 제공") return null;
  const label = credit.author.includes("AniList 제공")
    ? credit.author
    : `${credit.author} · ${credit.license}`;

  return (
    <span
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 truncate bg-black/70 px-2 py-1 text-[10px] leading-tight text-white"
      title={`${credit.title} · ${label}`}
    >
      {label}
    </span>
  );
}
