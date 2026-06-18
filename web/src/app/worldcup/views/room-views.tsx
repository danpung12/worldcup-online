"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Crown, Play, Send, SlidersHorizontal, Trophy } from "lucide-react";
import { type ChatResponse, type MatchResponse, type WorldcupItemResponse } from "@/lib/room-socket";
import type { WorldcupGame } from "@/lib/worldcup";
import { type Player, useWorldcupStore } from "@/store/worldcup-store";
import { MediaPreview } from "./media-preview";
import { getAvatarForName } from "./profile-view";

type VoteStamp = {
  avatar: string;
  memberId: number;
  name: string;
  rotate: number;
  scale: number;
  selectItemId: number;
  x: number;
  y: number;
};
type TiePhase = "idle" | "spinning" | "decided" | "revealed";
const validRoundSizes = [8, 16, 32, 64, 128];

function getRoundSizeOptions(candidateCount: number) {
  return validRoundSizes.filter((size) => size <= candidateCount);
}

export function getDefaultRoundSize(candidateCount: number) {
  return getRoundSizeOptions(candidateCount).at(-1);
}

function getMatchRoundLabel(match: MatchResponse, activeRoundSize: number) {
  const roundSize = Math.max(
    2,
    Math.floor(activeRoundSize / 2 ** Math.max(match.round_id - 1, 0)),
  );
  const totalMatches = Math.max(1, Math.ceil(roundSize / 2));

  return `${roundSize}강 · 매치 ${match.match_index}/${totalMatches}`;
}

export function LobbyView({
  currentMemberId,
  game,
  isCurrentHost,
  isStarting,
  messages,
  notice,
  onSendChat,
  onStart,
  roomCode,
}: {
  currentMemberId: number | null;
  game: WorldcupGame;
  isCurrentHost: boolean;
  isStarting: boolean;
  messages: ChatResponse[];
  notice: string | null;
  onSendChat: (message: string) => void;
  onStart: (roundSize?: number) => void;
  roomCode: string;
}) {
  const players = useWorldcupStore((state) => state.players);
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRoundSize, setSelectedRoundSize] = useState<number | undefined>(
    () => getDefaultRoundSize(game.participants),
  );
  const emptyCount = Math.max(6 - players.length, 0);
  const roundSizeOptions = getRoundSizeOptions(game.participants);
  const activeRoundSize =
    selectedRoundSize && roundSizeOptions.includes(selectedRoundSize)
      ? selectedRoundSize
      : getDefaultRoundSize(game.participants);
  const activeRoundLabel = activeRoundSize ? `${activeRoundSize}강` : "전체";
  const canStartWithRoundSize =
    roundSizeOptions.length > 0 || game.participants === 2 || game.participants === 4;

  async function copyInviteLink() {
    const inviteLink = `${window.location.origin}/room/${roomCode}`;

    await navigator.clipboard.writeText(inviteLink);
    setHasCopiedInvite(true);
    window.setTimeout(() => setHasCopiedInvite(false), 1600);
  }

  return (
    <section className="pb-24 md:mx-auto md:grid md:max-w-[1180px] md:grid-cols-[minmax(0,1fr)_360px] md:gap-4 md:px-8 md:py-6 md:pb-28">
      <div className="bg-white px-4 pb-3 pt-4 md:col-start-1 md:rounded-[18px] md:border md:border-[#e0e0e0] md:px-6 md:py-6">
        <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">함께 플레이할 월드컵</p>
        <h1 className="mt-1 text-[32px] font-semibold leading-[1.12] tracking-[-0.374px] md:text-[40px] md:leading-[1.1] md:tracking-normal">{game.title}</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
          <div className="min-w-0 rounded-[18px] border border-[#e0e0e0] bg-white px-3 py-3">
            <p className="text-[12px] tracking-[-0.12px] text-[#7a7a7a]">초대 코드</p>
            <strong className="block truncate text-[17px] tracking-[-0.374px]">{roomCode}</strong>
          </div>
          <button
            className={`flex min-w-0 items-center justify-between rounded-[18px] border px-3 py-3 text-left active:scale-[0.99] disabled:active:scale-100 ${
              isCurrentHost && isSettingsOpen
                ? "border-[#0066cc] bg-white text-[#0066cc]"
                : "border-[#e0e0e0] bg-white text-[#1d1d1f]"
            }`}
            type="button"
            aria-label="사전 설정"
            disabled={!isCurrentHost}
            onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          >
            <span className="min-w-0">
              <span className="block text-[12px] tracking-[-0.12px] text-[#7a7a7a]">사전 설정</span>
              <strong className="block truncate text-[17px] tracking-[-0.374px]">{activeRoundLabel}</strong>
            </span>
            {isCurrentHost && <SlidersHorizontal className="size-4 shrink-0" />}
          </button>
        </div>
        {hasCopiedInvite && (
          <p className="mt-2 px-1 text-[13px] tracking-[-0.12px] text-[#0066cc]">
            초대 링크를 복사했습니다.
          </p>
        )}
        {notice && (
          <p className="mt-2 px-1 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#b42318]">
            {notice}
          </p>
        )}
      </div>

      <div className="px-4 py-4 md:col-start-1 md:rounded-[18px] md:border md:border-[#e0e0e0] md:bg-white md:px-6 md:py-6">
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
          {players.map((player) => (
            <div key={player.id} className="w-[66px] shrink-0 text-center">
              <div className="relative mx-auto grid size-[58px] place-items-center overflow-hidden rounded-full border border-[#d2d2d7] bg-white">
                <Image
                  alt={`${player.name} 아바타`}
                  className="size-[58px]"
                  height={58}
                  src={player.avatar}
                  unoptimized
                  width={58}
                />
                {player.isHost && (
                  <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-[#0066cc] text-white">
                    <Crown className="size-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[12px] tracking-[-0.12px] text-[#333333]">{player.name}</p>
            </div>
          ))}
          {Array.from({ length: Math.min(emptyCount, 8) }).map((_, index) => (
            <div key={`empty-${index}`} className="w-[66px] shrink-0 text-center">
              <div className="mx-auto grid size-[58px] place-items-center rounded-full border border-dashed border-[#d2d2d7] bg-[#fafafc] text-[12px] text-[#7a7a7a]">
                빈 자리
              </div>
              <p className="mt-1 truncate text-[12px] tracking-[-0.12px] text-[#7a7a7a]">대기</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="hidden md:col-start-2 md:row-span-3 md:row-start-1 md:block">
        <div className="sticky top-16 space-y-3">
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-4">
            <p className="text-[12px] tracking-[-0.12px] text-[#7a7a7a]">초대 코드</p>
            <strong className="mt-1 block truncate text-[28px] font-semibold leading-[1.14] tracking-[0.196px]">{roomCode}</strong>
            <button
              className="mt-4 h-11 w-full rounded-full border border-[#0066cc] bg-white text-[17px] tracking-[-0.374px] text-[#0066cc] active:scale-95"
              type="button"
              onClick={copyInviteLink}
            >
              초대 링크 복사
            </button>
          </div>

          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[-0.12px] text-[#7a7a7a]">사전 설정</p>
                <strong className="mt-1 block text-[24px] font-semibold tracking-[0.231px]">{activeRoundLabel}</strong>
              </div>
              {isCurrentHost && <SlidersHorizontal className="size-5 text-[#0066cc]" />}
            </div>
            {isCurrentHost && roundSizeOptions.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {roundSizeOptions.map((roundSize) => (
                  <button
                    key={roundSize}
                    className={`h-10 rounded-full border text-[14px] tracking-[-0.224px] active:scale-95 ${
                      activeRoundSize === roundSize
                        ? "border-[#0066cc] bg-[#0066cc] text-white"
                        : "border-[#d2d2d7] bg-white text-[#1d1d1f]"
                    }`}
                    type="button"
                    onClick={() => setSelectedRoundSize(roundSize)}
                  >
                    {roundSize}강
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {isCurrentHost && isSettingsOpen && (
        <section className="px-4 pb-4 md:hidden">
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white">
            <div className="border-b border-[#e0e0e0] px-4 py-4">
              <h2 className="text-[21px] font-semibold tracking-[0.231px]">사전 설정</h2>
              <p className="mt-1 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
                시작할 라운드 크기를 선택해주세요.
              </p>
            </div>
            <div className="px-4 py-4">
              {roundSizeOptions.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold tracking-[-0.224px] text-[#1d1d1f]">라운드 선택</p>
                      <p className="mt-1 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#7a7a7a]">
                        후보 {game.participants.toLocaleString()}개 중 시작할 크기를 고르세요.
                      </p>
                    </div>
                    <Trophy className="size-5 shrink-0 text-[#0066cc]" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {roundSizeOptions.map((roundSize) => (
                      <button
                        key={roundSize}
                        className={`h-11 rounded-full border text-[15px] tracking-[-0.224px] active:scale-95 ${
                          activeRoundSize === roundSize
                            ? "border-[#0066cc] bg-[#0066cc] text-white"
                            : "border-[#d2d2d7] bg-white text-[#1d1d1f]"
                        }`}
                        type="button"
                        onClick={() => setSelectedRoundSize(roundSize)}
                      >
                        {roundSize}강
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f5f5f7] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
                  {canStartWithRoundSize
                    ? "후보가 8개 미만이라 전체 후보로 시작합니다."
                    : "후보 수를 2개, 4개 또는 8개 이상으로 맞춰야 시작할 수 있습니다."}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-4 md:col-start-1 md:px-0 md:pb-0">
        <div className="h-[280px] md:h-[360px]">
          <ChatPanel
            currentMemberId={currentMemberId}
            messages={messages}
            onSend={onSendChat}
            players={players}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] border-t border-black/5 bg-[#f5f5f7]/90 px-4 py-3 backdrop-blur-xl md:left-1/2 md:max-w-[1180px] md:-translate-x-1/2 md:rounded-t-[18px] md:border-x md:px-6">
        <div className="grid grid-cols-[1fr_1.35fr] gap-2">
          <button
            className="h-12 rounded-full border border-[#0066cc] bg-white text-[17px] tracking-[-0.374px] text-[#0066cc] active:scale-95"
            type="button"
            onClick={copyInviteLink}
          >
            초대
          </button>
          {isCurrentHost ? (
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 disabled:bg-[#8bbbe8]"
              type="button"
              disabled={isStarting || !canStartWithRoundSize}
              onClick={() => onStart(activeRoundSize)}
            >
              <Play className="size-4 fill-white" />
              {isStarting ? "시작 중" : "시작"}
            </button>
          ) : (
            <button
              className="h-12 rounded-full bg-[#e8e8ed] text-[16px] tracking-[-0.374px] text-[#6e6e73]"
              type="button"
              disabled
            >
              방장을 기다리는 중..
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function PlayView({
  activeRoundSize,
  currentMemberId,
  isSoloMode,
  isVoting,
  messages,
  match,
  notice,
  onSendChat,
  onVote,
  players,
  selectedItemId,
  tieBreakerMemberId,
  tiePhase,
  voteStamps,
}: {
  activeRoundSize: number;
  currentMemberId: number | null;
  isSoloMode: boolean;
  isVoting: boolean;
  messages: ChatResponse[];
  match: MatchResponse;
  notice: string | null;
  onSendChat: (message: string) => void;
  onVote: (selectItemId: number) => void;
  players: Player[];
  selectedItemId: number | null;
  tieBreakerMemberId: number | null;
  tiePhase: TiePhase;
  voteStamps: VoteStamp[];
}) {
  const roundLabel = getMatchRoundLabel(match, activeRoundSize);
  const isTieActive = tieBreakerMemberId !== null;
  const isTieSpinning = tiePhase === "spinning";
  const isTieBreaker = tieBreakerMemberId === currentMemberId;
  const isTieVoteLocked = isTieActive && (isTieSpinning || !isTieBreaker);
  const voteDisabled = isVoting || isTieVoteLocked;
  const isWaitingForOthers = selectedItemId !== null && !isVoting;
  const [waitingDotCount, setWaitingDotCount] = useState(1);

  useEffect(() => {
    if (!isWaitingForOthers) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setWaitingDotCount((count) => (count % 3) + 1);
    }, 450);

    return () => window.clearInterval(intervalId);
  }, [isWaitingForOthers]);

  return (
    <section
      className={`flex h-[calc(100dvh-44px)] flex-col overflow-hidden pb-3 ${
        isSoloMode
          ? "md:p-4"
          : "md:grid md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-[auto_minmax(0,1fr)] md:gap-4 md:p-4"
      }`}
    >
      <div className={`bg-white px-4 pb-3 pt-4 md:rounded-[18px] md:border md:border-[#e0e0e0] md:px-5 md:py-4 ${isSoloMode ? "" : "md:col-span-2"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold leading-[1.3] tracking-[-0.224px] text-[#1d1d1f]">
            {roundLabel}
          </p>
          {isWaitingForOthers && (
            <span className="shrink-0 rounded-full bg-[#f5f5f7] px-3 py-1 text-[12px] tracking-[-0.12px] text-[#7a7a7a]">
              대기 중{".".repeat(waitingDotCount)}
            </span>
          )}
        </div>
        {notice && !isWaitingForOthers && !isTieActive && (
          <p className="mt-2 rounded-2xl bg-[#f5f5f7] px-3 py-2 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#0066cc]">
            {notice}
          </p>
        )}
      </div>

      <div
        className={`relative grid grid-cols-2 items-stretch gap-px bg-black md:min-h-0 md:rounded-[18px] md:border md:border-black md:overflow-hidden ${
          isSoloMode ? "min-h-0 flex-1" : "shrink-0 md:h-full"
        }`}
      >
        <VoteCard
          disabled={voteDisabled || selectedItemId === match.item_a_id}
          item={match.item_a}
          onSelect={() => onVote(match.item_a_id)}
          selected={selectedItemId === match.item_a_id}
          stamps={voteStamps.filter((stamp) => stamp.selectItemId === match.item_a_id)}
        />
        <VoteCard
          disabled={voteDisabled || selectedItemId === match.item_b_id}
          item={match.item_b}
          onSelect={() => onVote(match.item_b_id)}
          selected={selectedItemId === match.item_b_id}
          stamps={voteStamps.filter((stamp) => stamp.selectItemId === match.item_b_id)}
        />
        {isTieActive && (
          <TieBreakerOverlay
            currentMemberId={currentMemberId}
            phase={tiePhase}
            players={players}
            tieBreakerMemberId={tieBreakerMemberId}
          />
        )}
      </div>

      {!isSoloMode && (
        <div className="min-h-0 flex-1 px-3 pt-3 md:px-0 md:pt-0">
          <ChatPanel
            currentMemberId={currentMemberId}
            messages={messages}
            onSend={onSendChat}
            players={players}
          />
        </div>
      )}
    </section>
  );
}

function VoteCard({
  disabled,
  item,
  onSelect,
  selected,
  stamps,
}: {
  disabled: boolean;
  item: WorldcupItemResponse;
  onSelect: () => void;
  selected: boolean;
  stamps: VoteStamp[];
}) {
  const [playingItemId, setPlayingItemId] = useState<number | null>(null);
  const isPlaying = playingItemId === item.id;

  function handleSelect() {
    if (!disabled) {
      onSelect();
    }
  }

  return (
    <div
      className={`relative h-[42dvh] min-h-[300px] max-h-[430px] min-w-0 overflow-hidden bg-black text-left active:scale-[0.995] disabled:opacity-80 md:h-full md:max-h-none ${
        selected ? "ring-2 ring-inset ring-[#0066cc]" : ""
      }`}
      onClick={handleSelect}
    >
      <MediaPreview
        alt={`${item.name} 후보 이미지`}
        className="absolute inset-0 size-full"
        isPlaying={isPlaying}
        onPlay={() => setPlayingItemId(item.id)}
        src={item.image_url}
      />
      <VoteStampLayer stamps={stamps} />
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-4 pt-16 text-center md:px-6 md:pb-8 md:pt-24">
        <div className="min-w-0">
          <strong className="line-clamp-2 block text-[20px] font-semibold leading-[1.15] tracking-[-0.374px] text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.75)] md:text-[34px] md:leading-[1.12]">
            {item.name}
          </strong>
        </div>
        <button
          className={`mx-auto mt-3 inline-flex h-9 items-center justify-center rounded-full px-4 text-[14px] font-semibold tracking-[-0.224px] shadow-[0_8px_20px_rgba(0,0,0,0.24)] disabled:opacity-70 ${
            selected ? "bg-white text-[#1d1d1f]" : "bg-[#0066cc] text-white"
          }`}
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
        >
          {selected ? "선택함" : "선택"}
        </button>
      </div>
    </div>
  );
}

function TieBreakerOverlay({
  currentMemberId,
  phase,
  players,
  tieBreakerMemberId,
}: {
  currentMemberId: number | null;
  phase: TiePhase;
  players: Player[];
  tieBreakerMemberId: number;
}) {
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const roulettePlayers = useMemo(
    () =>
      players.length > 0
        ? players
        : [
            {
              id: tieBreakerMemberId,
              name: "참가자",
              avatar: getAvatarForName(String(tieBreakerMemberId)),
            },
          ],
    [players, tieBreakerMemberId],
  );
  const targetPlayer =
    roulettePlayers.find((player) => player.id === tieBreakerMemberId) ??
    roulettePlayers[0];

  useEffect(() => {
    if (phase !== "spinning") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRouletteIndex((index) => (index + 1) % roulettePlayers.length);
    }, 90);

    return () => window.clearInterval(intervalId);
  }, [phase, roulettePlayers, tieBreakerMemberId]);

  const displayPlayer =
    phase !== "spinning"
      ? targetPlayer
      : roulettePlayers[rouletteIndex % roulettePlayers.length];
  const isCurrentUserTurn =
    phase !== "spinning" && tieBreakerMemberId === currentMemberId;
  const isCompactBannerVisible = phase === "revealed" || isCurrentUserTurn;
  const headline = phase === "spinning" ? "동점입니다!" : `${displayPlayer.name}님`;
  const description =
    phase === "spinning"
      ? "결정권자를 고르는 중입니다"
      : isCurrentUserTurn
        ? "결과를 정해주세요!"
        : `${displayPlayer.name}님이 결과를 정하고 있어요`;

  if (isCompactBannerVisible) {
    const compactDescription = isCurrentUserTurn
      ? "아래 두 후보 중 하나를 선택하세요."
      : "후보를 보며 채팅으로 의견을 나눠보세요.";

    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center md:top-5">
        <div className="tie-winner-pop flex w-full max-w-[420px] items-center gap-3 rounded-[18px] border border-white/15 bg-black/72 px-4 py-3 text-left text-white backdrop-blur-md">
          <Image
            alt={`${displayPlayer.name} 아바타`}
            className="size-12 shrink-0 rounded-full border border-white/20 bg-white object-cover"
            height={48}
            src={displayPlayer.avatar}
            unoptimized
            width={48}
          />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold leading-[1.24] tracking-[-0.374px]">
              {isCurrentUserTurn
                ? `${displayPlayer.name}님, 결과를 정해주세요!`
                : `${displayPlayer.name}님이 결과를 정하고 있어요`}
            </p>
            <p className="mt-1 text-[13px] font-normal leading-[1.35] tracking-[-0.12px] text-[#cccccc]">
              {compactDescription}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/72 px-4 text-center text-white backdrop-blur-md">
      <div className="w-full max-w-[360px]">
        <p className="text-[34px] font-semibold leading-[1.07] tracking-[-0.28px] md:text-[40px]">
          {headline}
        </p>
        <div
          key={`${phase}-${displayPlayer.id}-${rouletteIndex}`}
          className={`mx-auto mt-6 grid size-[118px] place-items-center rounded-full border border-white/20 bg-white shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0] md:size-[140px] ${
            phase === "decided" ? "tie-winner-pop" : "tie-slot-pop"
          }`}
        >
          <Image
            alt={`${displayPlayer.name} 아바타`}
            className="size-[104px] rounded-full object-cover md:size-[124px]"
            height={124}
            src={displayPlayer.avatar}
            unoptimized
            width={124}
          />
        </div>
        <p className="mt-4 truncate text-[21px] font-semibold leading-[1.19] tracking-[-0.12px]">
          {displayPlayer.name}
        </p>
        <p className="mx-auto mt-2 max-w-[280px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#cccccc]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ChatPanel({
  currentMemberId,
  messages,
  onSend,
  players,
}: {
  currentMemberId: number | null;
  messages: ChatResponse[];
  onSend: (message: string) => void;
  players: Player[];
}) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chatGroups = messages.reduce<
    Array<{ memberId: number; messages: ChatResponse[] }>
  >((groups, chat) => {
    const lastGroup = groups.at(-1);

    if (lastGroup?.memberId === chat.memberId) {
      lastGroup.messages.push(chat);
    } else {
      groups.push({ memberId: chat.memberId, messages: [chat] });
    }

    return groups;
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    onSend(trimmedMessage);
    setMessage("");
  }

  return (
    <section className="flex h-full min-h-[210px] flex-col overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[#fafafc] px-3 py-3 md:px-4 md:py-4"
      >
        {chatGroups.map((group, groupIndex) => {
          const isOwnGroup = currentMemberId === group.memberId;
          const player = players.find((currentPlayer) => currentPlayer.id === group.memberId);
          const lastMessage = group.messages.at(-1);

          return (
            <div
              key={`${group.memberId}-${group.messages[0]?.createdAt ?? groupIndex}`}
              className={`mt-3 flex items-start gap-2 first:mt-0 md:gap-3 ${
                isOwnGroup ? "justify-end" : ""
              }`}
            >
              <Image
                alt={`${player?.name ?? "참가자"} 아바타`}
                className={`${isOwnGroup ? "hidden " : ""}size-8 shrink-0 rounded-full border border-[#e0e0e0] bg-white md:size-10`}
                height={40}
                src={player?.avatar ?? getAvatarForName(String(group.memberId))}
                unoptimized
                width={40}
              />
              <div className={`flex min-w-0 max-w-[78%] flex-col md:max-w-[82%] ${isOwnGroup ? "items-end" : "items-start"}`}>
                {!isOwnGroup && (
                  <div className="mb-1 flex max-w-full items-center gap-2">
                    <span className="max-w-[120px] truncate text-[12px] font-normal leading-none tracking-[-0.12px] text-[#333333] md:max-w-[160px] md:text-[13px]">
                      {player?.name ?? "참가자"}
                    </span>
                    {lastMessage && (
                      <time className="text-[10px] leading-[1.3] tracking-[-0.08px] text-[#7a7a7a] md:text-[11px]">
                        {formatChatTime(lastMessage.createdAt)}
                      </time>
                    )}
                  </div>
                )}
                <div className={`flex max-w-full flex-col gap-1 ${isOwnGroup ? "items-end" : "items-start"}`}>
                  {group.messages.map((chat, messageIndex) => {
                    const isFirstInGroup = messageIndex === 0;
                    const isLastInGroup = messageIndex === group.messages.length - 1;

                    return (
                      <div
                        key={`${chat.memberId}-${chat.createdAt}-${messageIndex}`}
                        className={`flex max-w-full items-end gap-1.5 ${
                          isOwnGroup ? "justify-end" : "justify-start"
                        }`}
                      >
                        {isOwnGroup && isLastInGroup && (
                          <time className="shrink-0 pb-0.5 text-[10px] leading-[1.3] tracking-[-0.08px] text-[#7a7a7a] md:text-[11px]">
                            {formatChatTime(chat.createdAt)}
                          </time>
                        )}
                        <p
                          className={`w-fit max-w-full break-words px-3 py-2 text-[15px] font-normal leading-[1.47] tracking-[-0.374px] md:px-4 md:py-2.5 md:text-[16px] ${
                            isOwnGroup
                              ? `bg-[#0066cc] text-white ${
                                  isFirstInGroup ? "rounded-tr-[18px]" : "rounded-tr-[8px]"
                                } ${
                                  isLastInGroup ? "rounded-br-[18px]" : "rounded-br-[8px]"
                                } rounded-l-[18px]`
                              : `border border-[#f0f0f0] bg-white text-[#1d1d1f] shadow-sm ${
                                  isFirstInGroup ? "rounded-tl-[18px]" : "rounded-tl-[8px]"
                                } ${
                                  isLastInGroup ? "rounded-bl-[18px]" : "rounded-bl-[8px]"
                                } rounded-r-[18px]`
                          }`}
                        >
                          {chat.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form className="flex h-16 items-center gap-2 border-t border-[#f0f0f0] bg-[#f5f5f7]/90 px-3 py-2 backdrop-blur-xl md:h-[72px] md:px-4 md:py-3" onSubmit={handleSubmit}>
        <input
          className="h-11 min-w-0 flex-1 rounded-full border border-black/10 bg-white px-5 text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a] focus:border-[#0071e3] focus:ring-4 focus:ring-[#0066cc]/10 md:h-12"
          maxLength={120}
          placeholder="메시지"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button
          aria-label="채팅 보내기"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0066cc] text-white active:scale-95 disabled:bg-[#d2d2d7] disabled:text-[#7a7a7a] md:size-12"
          type="submit"
          disabled={message.trim().length === 0}
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

function formatChatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VoteStampLayer({ stamps }: { stamps: VoteStamp[] }) {
  if (stamps.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stamps.map((stamp) => (
        <div
          key={stamp.memberId}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{
            left: `${stamp.x}%`,
            top: `${stamp.y}%`,
            transform: `translate(-50%, -50%) rotate(${stamp.rotate}deg) scale(${stamp.scale})`,
          }}
        >
          <div className="rounded-full border-[3px] border-[#0066cc] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
            <Image
              alt={`${stamp.name} 투표 도장`}
              className="size-12 rounded-full"
              height={48}
              src={stamp.avatar}
              unoptimized
              width={48}
            />
          </div>
          <span className="mt-1 max-w-[82px] truncate rounded-full bg-[#0066cc] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.12px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            {stamp.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResultView({
  actionLabel = "로비로",
  match,
  onBackToLobby,
  winnerId,
}: {
  actionLabel?: string;
  match: MatchResponse | null;
  onBackToLobby: () => void;
  winnerId: number | null;
}) {
  const winner =
    match?.item_a_id === winnerId
      ? match.item_a
      : match?.item_b_id === winnerId
        ? match.item_b
        : null;

  return (
    <section className="pb-8">
      <div className="bg-[#272729] px-5 pb-8 pt-8 text-white md:px-8 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-[960px]">
        <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#cccccc]">최종 결과</p>
        <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
          우승자가 결정됐어요.
        </h1>
        </div>
      </div>
      <div className="mx-auto max-w-[780px] px-4 py-4 md:px-8 md:py-6">
        <div className="overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
          {winner ? (
            <>
              <MediaPreview
                alt={`${winner.name} 우승 이미지`}
                className="aspect-[16/11] w-full"
                src={winner.image_url}
              />
              <div className="px-4 py-5 text-center">
                <Trophy className="mx-auto size-8 text-[#0066cc]" />
                <p className="mt-3 text-[24px] font-semibold tracking-[0.231px]">{winner.name}</p>
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center text-[15px] text-[#7a7a7a]">
              결과 정보를 불러오는 중입니다.
            </div>
          )}
        </div>
        <button
          className="mt-4 h-12 w-full rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 md:mx-auto md:max-w-[320px]"
          type="button"
          onClick={onBackToLobby}
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
