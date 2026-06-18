"use client";

import { useState } from "react";
import { BarChart3, Play, Search, Users } from "lucide-react";
import type { WorldcupGame } from "@/lib/worldcup";
import { MediaPreview } from "./media-preview";

type HomeSortMode = "popular" | "latest";
const applePrimaryPillClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#0066cc] px-4 text-[14px] font-normal tracking-[-0.224px] text-white active:scale-95 disabled:bg-[#8bbbe8] md:h-11 md:gap-2 md:px-[22px] md:text-[17px] md:tracking-[-0.374px]";
const appleSecondaryPillClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#0066cc] bg-white px-4 text-[14px] font-normal tracking-[-0.224px] text-[#0066cc] active:scale-95 disabled:text-[#8bbbe8] md:h-11 md:gap-2 md:px-[22px] md:text-[17px] md:tracking-[-0.374px]";

export function HomeView({
  games,
  hasBackendError,
  onJoin,
  onRanking,
}: {
  games: WorldcupGame[];
  hasBackendError: boolean;
  onJoin: (id: number) => void;
  onRanking: (id: number) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<HomeSortMode>("popular");
  const sortFilters: Array<{ label: string; value: HomeSortMode }> = [
    { label: "인기순", value: "popular" },
    { label: "최신순", value: "latest" },
  ];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleGames = [...games]
    .filter((game) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      return [game.title, game.description, ...game.candidates].some((text) =>
        text.toLowerCase().includes(normalizedSearchQuery),
      );
    })
    .sort((a, b) => {
      if (sortMode === "latest") {
        return getLatestValue(b) - getLatestValue(a);
      }

      return getPopularValue(b) - getPopularValue(a);
    });

  return (
    <section className="pb-8">
      <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-14 md:pt-16">
        <div className="mx-auto max-w-[1180px]">
          <div className="md:mx-auto md:max-w-[760px] md:text-center">
            <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a] md:text-[17px]">
              친구와 같이 고르는
            </p>
            <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[56px] md:leading-[1.07] md:tracking-[-0.28px]">
              온라인 이상형 월드컵
            </h1>
            <label className="mt-6 flex h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-[17px] tracking-[-0.374px] md:mx-auto md:h-12 md:max-w-[520px]">
              <Search className="size-4 text-[#7a7a7a]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-left outline-none placeholder:text-[#7a7a7a]"
                placeholder="월드컵 검색"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {hasBackendError && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-[#ffd4a3] bg-[#fff8ef] px-4 py-3 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#8a4b00]">
            백엔드에 연결하지 못해서 임시 목록을 보여주는 중입니다.
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-[1180px] gap-2 overflow-x-auto px-4 py-4 md:px-8 md:pt-5">
        {sortFilters.map((filter) => (
          <button
            key={filter.value}
            className={`h-9 shrink-0 rounded-full px-4 text-[14px] tracking-[-0.224px] active:scale-95 ${
              sortMode === filter.value ? "bg-[#1d1d1f] text-white" : "bg-white text-[#333333]"
            }`}
            type="button"
            onClick={() => setSortMode(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mx-auto grid max-w-[1180px] gap-3 px-3 md:grid-cols-2 md:gap-5 md:px-8 lg:grid-cols-3">
        {visibleGames.map((game) => (
          <GameCard key={game.id} game={game} onJoin={() => onJoin(game.id)} onRanking={() => onRanking(game.id)} />
        ))}
        {visibleGames.length === 0 && (
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-8 text-center text-[15px] tracking-[-0.224px] text-[#7a7a7a]">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function getPopularValue(game: WorldcupGame) {
  return game.playCount ?? game.ranking[0]?.votes ?? game.participants;
}

function getLatestValue(game: WorldcupGame) {
  return Number.isFinite(game.updatedAtTime) ? (game.updatedAtTime ?? 0) : game.id;
}

function GameCard({
  game,
  onJoin,
  onRanking,
}: {
  game: WorldcupGame;
  onJoin: () => void;
  onRanking: () => void;
}) {
  return (
    <article className="grid grid-cols-[104px_1fr] gap-4 rounded-[18px] border border-[#e0e0e0] bg-white p-4 md:flex md:min-h-full md:flex-col md:gap-0 md:overflow-hidden md:p-0">
      <div className="shrink-0 bg-[#fafafc] md:p-3">
        <MediaPreview
          alt={`${game.title} 대표 이미지`}
          className="size-[104px] rounded-lg shadow-[2px_4px_18px_rgba(0,0,0,0.18)] md:aspect-[16/11] md:size-auto md:w-full md:shadow-[3px_5px_30px_rgba(0,0,0,0.18)]"
          src={game.imageUrl}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pt-0 md:px-5 md:pb-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] md:text-[19px] md:leading-[1.22] md:tracking-[-0.374px]">
              {game.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
              {game.description}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[12px] text-[#333333] sm:inline-block">
            {game.rounds}강
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[12px] tracking-[-0.12px] text-[#7a7a7a] md:mt-3">
          <Users className="size-3.5" />
          <span>{game.participants.toLocaleString()} 후보</span>
          <span>·</span>
          <span>{game.updatedAt}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5 md:mt-auto md:gap-2 md:pt-5">
          <button
            className={`${applePrimaryPillClass} min-w-0 whitespace-nowrap !h-9 !gap-1 !px-2 !text-[12px] !leading-none !tracking-[-0.12px] md:!h-11 md:!gap-2 md:!px-[22px] md:!text-[17px] md:!tracking-[-0.374px]`}
            type="button"
            onClick={onJoin}
          >
            <Play className="size-3 shrink-0 fill-white md:size-4" />
            함께하기
          </button>
          <button
            className={`${appleSecondaryPillClass} min-w-0 whitespace-nowrap !h-9 !gap-1 !px-2 !text-[12px] !leading-none !tracking-[-0.12px] md:!h-11 md:!gap-2 md:!px-[22px] md:!text-[17px] md:!tracking-[-0.374px]`}
            type="button"
            onClick={onRanking}
          >
            <BarChart3 className="size-3 shrink-0 md:size-4" />
            랭킹보기
          </button>
        </div>
      </div>
    </article>
  );
}

