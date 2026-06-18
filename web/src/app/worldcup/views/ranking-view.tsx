"use client";

import { useState } from "react";
import { Expand, Play } from "lucide-react";
import type { WorldcupGame } from "@/lib/worldcup";
import { ExpandedMedia, MediaPreview } from "./media-preview";

export function RankingView({ game, onJoin }: { game: WorldcupGame; onJoin: () => void }) {
  const [expandedRank, setExpandedRank] = useState<WorldcupGame["ranking"][number] | null>(null);

  return (
    <>
      <section className="pb-8">
        <div className="bg-[#272729] px-5 pb-8 pt-8 text-white md:px-8 md:pb-12 md:pt-14">
          <div className="mx-auto max-w-[960px]">
          <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#cccccc]">랭킹보기</p>
          <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">{game.title}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-[960px] px-4 py-4 md:px-8 md:py-6">
          <div className="overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
            {game.ranking.map((rank, index) => (
              <button
                key={rank.name}
                className="grid w-full grid-cols-[36px_56px_1fr_auto] items-center gap-3 border-b border-[#f0f0f0] px-4 py-3 text-left last:border-b-0 active:bg-[#f5f5f7] md:grid-cols-[56px_76px_1fr_auto] md:px-6 md:py-4"
                type="button"
                onClick={() => setExpandedRank(rank)}
              >
                <span className="text-[14px] font-semibold tracking-[-0.224px] text-[#7a7a7a]">#{index + 1}</span>
                <MediaPreview
                  alt={`${rank.name} 랭킹 이미지`}
                  className="size-14 rounded-xl md:size-[76px]"
                  src={rank.imageUrl}
                />
                <div className="min-w-0">
                  <strong className="block truncate text-[17px] font-semibold tracking-[-0.374px]">{rank.name}</strong>
                  <span className="text-[13px] tracking-[-0.12px] text-[#7a7a7a]">
                    {rank.votes.toLocaleString()}표
                  </span>
                </div>
                <Expand className="size-4 text-[#7a7a7a]" />
              </button>
            ))}
            <div className="border-t border-[#f0f0f0] bg-white px-4 py-4 md:flex md:items-center md:justify-between md:gap-4 md:px-6">
              <p className="hidden text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a] md:block">
                친구와 함께 이 월드컵을 바로 시작할 수 있습니다.
              </p>
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 md:w-[260px]"
                type="button"
                onClick={onJoin}
              >
                <Play className="size-4 fill-white" />
                함께하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {expandedRank && (
        <button
          className="fixed inset-0 z-50 grid place-items-center bg-black/72 px-5"
          type="button"
          aria-label="랭킹 이미지 닫기"
          onClick={() => setExpandedRank(null)}
        >
          <div className="w-full max-w-[390px] overflow-hidden rounded-[18px] bg-white text-left md:max-w-[720px]">
            <ExpandedMedia alt={`${expandedRank.name} 확대 미디어`} src={expandedRank.imageUrl} />
            <div className="px-4 py-4">
              <p className="text-[13px] tracking-[-0.12px] text-[#7a7a7a]">이미지를 누르면 닫힙니다.</p>
              <strong className="mt-1 block text-[21px] font-semibold tracking-[0.231px]">{expandedRank.name}</strong>
            </div>
          </div>
        </button>
      )}
    </>
  );
}

