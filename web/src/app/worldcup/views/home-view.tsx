"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ImageIcon,
  Layers3,
  Play,
  Search,
  Users,
  X,
} from "lucide-react";
import type { WorldcupGame } from "@/lib/worldcup";
import styles from "./home.module.css";
import { ImageCredit } from "./image-credit";

type HomeSortMode = "popular" | "latest";

export function HomeView({
  games,
  hasBackendError,
  isLoading = false,
  onJoin,
  onRanking,
  onStart,
}: {
  games: WorldcupGame[];
  hasBackendError: boolean;
  isLoading?: boolean;
  onJoin: (id: number) => void;
  onRanking: (id: number) => void;
  onStart: (id: number) => void;
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
    <section className={styles.home} aria-label="월드컵 둘러보기">
      <div className={styles.hero}>
        <div className={styles.heroShapes} aria-hidden="true">
          <span className={styles.heroCircle} />
          <span className={styles.heroArc} />
          <span className={styles.heroCardFront} />
        </div>
        <div className={`${styles.container} ${styles.heroContent}`}>
          <h1>
            친구와 함께 즐기는,
            <br />
            <span>온라인 이상형 월드컵.</span>
          </h1>
          <p className={styles.heroDescription}>
            혼자 즐겨도, 친구와 함께해도.
          </p>
        </div>
      </div>

      <div
        className={`${styles.container} ${styles.catalog}`}
        id="worldcup-list"
      >
        <div className={styles.catalogHeading}>
          <h2>어떤 월드컵을 해볼까요?</h2>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchBox} role="search">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="월드컵 검색"
              type="search"
              placeholder="어떤 취향을 찾고 있나요?"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearch}
                aria-label="검색어 지우기"
                onClick={() => setSearchQuery("")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div
            className={styles.sortFilters}
            role="group"
            aria-label="월드컵 정렬"
          >
            {sortFilters.map((filter) => (
              <button
                key={filter.value}
                aria-pressed={sortMode === filter.value}
                className={
                  sortMode === filter.value
                    ? styles.sortActive
                    : styles.sortButton
                }
                type="button"
                onClick={() => setSortMode(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        {hasBackendError && (
          <div className={styles.errorNotice} role="status">
            <AlertCircle size={18} aria-hidden="true" />
            <p>
              목록을 불러오지 못해 예시 월드컵을 보여드려요. 실제 플레이는 서버
              연결 후 이용할 수 있어요.
            </p>
          </div>
        )}
        <p className={styles.resultCount} role="status" aria-live="polite">
          {isLoading ? (
            "월드컵을 불러오고 있어요"
          ) : (
            <>
              {normalizedSearchQuery
                ? "검색 결과"
                : hasBackendError
                  ? "예시 월드컵"
                  : "전체 월드컵"}{" "}
              <strong>{visibleGames.length}</strong>
            </>
          )}
        </p>
        <div className={styles.grid} aria-busy={isLoading}>
          {isLoading
            ? Array.from({ length: 3 }, (_, index) => (
                <div
                  className={styles.skeletonCard}
                  key={index}
                  aria-hidden="true"
                >
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonBody}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))
            : visibleGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onJoin={() => onJoin(game.id)}
                  onRanking={() => onRanking(game.id)}
                  onStart={() => onStart(game.id)}
                />
              ))}
          {!isLoading && visibleGames.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <Search size={28} aria-hidden="true" />
              </span>
              <h3>
                {normalizedSearchQuery
                  ? "아직 찾는 월드컵이 없어요"
                  : "첫 번째 월드컵을 기다리고 있어요"}
              </h3>
              <p>
                {normalizedSearchQuery
                  ? "다른 검색어로 새로운 취향을 찾아보세요."
                  : "상단의 만들기 버튼으로 나만의 월드컵을 시작해 보세요."}
              </p>
              {normalizedSearchQuery && (
                <button
                  className={styles.emptyReset}
                  type="button"
                  onClick={() => setSearchQuery("")}
                >
                  전체 월드컵 보기 <ChevronRight size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getPopularValue(game: WorldcupGame) {
  return game.playCount ?? game.ranking[0]?.wins ?? game.participants;
}

function getLatestValue(game: WorldcupGame) {
  return Number.isFinite(game.updatedAtTime)
    ? (game.updatedAtTime ?? 0)
    : game.id;
}

function GameCard({
  game,
  onJoin,
  onRanking,
  onStart,
}: {
  game: WorldcupGame;
  onJoin: () => void;
  onRanking: () => void;
  onStart: () => void;
}) {
  return (
    <article
      className={styles.gameCard}
      aria-labelledby={`home-game-${game.id}`}
    >
      <div className={styles.cardMedia}>
        <HomeThumbnail
          key={game.imageUrl}
          src={game.imageUrl}
          title={game.title}
        />
        <span className={styles.roundBadge}>{game.rounds}강</span>
      </div>
      <div className={styles.cardBody}>
        <h3 id={`home-game-${game.id}`} title={game.title}>
          {game.title}
        </h3>
        <p className={styles.cardDescription}>{game.description}</p>
        <div className={styles.cardMeta}>
          <span>
            <Layers3 size={14} aria-hidden="true" /> 후보{" "}
            {game.participants.toLocaleString()}개
          </span>
          <button
            className={styles.rankingButton}
            type="button"
            aria-label={`${game.title} 랭킹 보기`}
            onClick={onRanking}
          >
            <BarChart3 size={14} aria-hidden="true" /> 랭킹
          </button>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.soloButton} type="button" onClick={onStart}>
            <Play size={15} aria-hidden="true" /> 혼자 하기
          </button>
          <button className={styles.joinButton} type="button" onClick={onJoin}>
            <Users size={16} aria-hidden="true" /> 함께하기{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

// 홈에서는 영상도 대표 썸네일만 표시하고, 재생 UI는 기존 게임 화면에 둡니다.
function HomeThumbnail({ src, title }: { src: string; title: string }) {
  const [hasError, setHasError] = useState(false);
  const videoId = src.match(
    /(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
  )?.[1];
  const thumbnail = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : src;

  if (!thumbnail || hasError) {
    return (
      <div
        className={styles.imageFallback}
        role="img"
        aria-label={`${title} 대표 이미지 없음`}
      >
        <ImageIcon size={30} aria-hidden="true" />
        <span>이미지를 준비하고 있어요</span>
      </div>
    );
  }

  return (
    <>
      <Image
        alt={`${title} 대표 이미지`}
        src={thumbnail}
        fill
        sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 72px) / 2), 370px"
        className={styles.thumbnail}
        onError={() => setHasError(true)}
      />
      <ImageCredit src={thumbnail} />
    </>
  );
}
