"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowDown,
  Check,
  Crown,
  MessageCircle,
  Play,
  Send,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import {
  type MatchResponse,
  type WorldcupItemResponse,
} from "@/lib/room-socket";
import type { WorldcupGame } from "@/lib/worldcup";
import { type Player, useWorldcupStore } from "@/store/worldcup-store";
import { MediaPreview } from "./media-preview";
import type { ChatMessage } from "./chat-messages";
import { getAvatarForName } from "./profile-view";
import ui from "./pickon-ui.module.css";

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

  return roundSize === 2
    ? "결승 · 마지막 선택"
    : `${roundSize}강 · 매치 ${match.match_index}/${totalMatches}`;
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
  messages: ChatMessage[];
  notice: string | null;
  onSendChat: (message: string) => void;
  onStart: (roundSize?: number) => void;
  roomCode: string;
}) {
  const players = useWorldcupStore((state) => state.players);
  const [inviteToast, setInviteToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRoundSize, setSelectedRoundSize] = useState<
    number | undefined
  >(() => getDefaultRoundSize(game.participants));
  const emptyCount = Math.max(6 - players.length, 0);
  const roundSizeOptions = getRoundSizeOptions(game.participants);
  const activeRoundSize =
    selectedRoundSize && roundSizeOptions.includes(selectedRoundSize)
      ? selectedRoundSize
      : getDefaultRoundSize(game.participants);
  const activeRoundLabel = activeRoundSize ? `${activeRoundSize}강` : "전체";
  const canStartWithRoundSize =
    roundSizeOptions.length > 0 ||
    game.participants === 2 ||
    game.participants === 4;

  useEffect(() => {
    if (!inviteToast) return;
    const timer = window.setTimeout(() => setInviteToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [inviteToast]);

  async function copyInviteLink() {
    const inviteLink = `${window.location.origin}/room/${roomCode}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteToast({ message: "초대 링크를 복사했습니다.", type: "success" });
    } catch {
      setInviteToast({ message: "초대 링크를 복사하지 못했습니다.", type: "error" });
    }
  }

  return (
    <section className={ui.lobby}>
      <div className={`${ui.surface} ${ui.lobbyIntro}`}>
        <p className={ui.eyebrow}>
          <Users size={15} aria-hidden="true" /> 함께하는 대기실
        </p>
        <h1 title={game.title}>{game.title}</h1>
        <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
          <div className="min-w-0 rounded-[18px] border border-[#e2e9ed] bg-white px-3 py-3">
            <p className="text-[12px] tracking-[-0.12px] text-[#63727c]">
              초대 코드
            </p>
            <strong className="block truncate text-[17px] tracking-[-0.374px]">
              {roomCode}
            </strong>
          </div>
          <button
            className={`flex min-w-0 items-center justify-between rounded-[18px] border px-3 py-3 text-left active:scale-[0.99] disabled:active:scale-100 ${
              isCurrentHost && isSettingsOpen
                ? "border-[#27729b] bg-white text-[#27729b]"
                : "border-[#e2e9ed] bg-white text-[#25343e]"
            }`}
            type="button"
            aria-label="시작 라운드"
            disabled={!isCurrentHost}
            onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
          >
            <span className="min-w-0">
              <span className="block text-[12px] tracking-[-0.12px] text-[#63727c]">
                시작 라운드
              </span>
              <strong className="block truncate text-[17px] tracking-[-0.374px]">
                {activeRoundLabel}
              </strong>
            </span>
            {isCurrentHost && <SlidersHorizontal className="size-4 shrink-0" />}
          </button>
        </div>
        {notice && (
          <p className="mt-2 px-1 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#b42318]">
            {notice}
          </p>
        )}
      </div>

      <div className={`${ui.surface} ${ui.participants}`}>
        <h2 className={ui.sectionLabel}>
          참여한 친구들 <span>{players.length}명</span>
        </h2>
        <div
          className={ui.participantGrid}
          role="region"
          aria-label="참가자 목록"
          tabIndex={0}
        >
          {players.map((player) => (
            <div key={player.id} className={ui.participant}>
              <div className="relative mx-auto grid size-[58px] place-items-center rounded-full border border-[#dce5eb] bg-white">
                <Image
                  alt={`${player.name} 아바타`}
                  className="size-full rounded-full object-cover"
                  height={58}
                  src={player.avatar}
                  unoptimized
                  width={58}
                />
                {player.isHost && (
                  <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-[#dceef7] text-[#245a7a]">
                    <Crown className="size-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[12px] tracking-[-0.12px] text-[#425563]">
                {player.name}
              </p>
            </div>
          ))}
          {Array.from({ length: Math.min(emptyCount, 8) }).map((_, index) => (
            <div
              key={`empty-${index}`}
              className={ui.participant}
            >
              <div className="mx-auto grid size-[58px] place-items-center rounded-full border border-dashed border-[#dce5eb] bg-[#f7fafc] text-[12px] text-[#63727c]">
                빈 자리
              </div>
              <p className="mt-1 truncate text-[12px] tracking-[-0.12px] text-[#63727c]">
                대기
              </p>
            </div>
          ))}
        </div>
      </div>

      <aside className="hidden md:col-start-2 md:row-span-3 md:row-start-1 md:block">
        <div className="sticky top-16 space-y-3">
          <div className="rounded-[18px] border border-[#e2e9ed] bg-white px-4 py-4">
            <p className="text-[12px] tracking-[-0.12px] text-[#63727c]">
              초대 코드
            </p>
            <strong className="mt-1 block truncate text-[28px] font-semibold leading-[1.14] tracking-[0.196px]">
              {roomCode}
            </strong>
            <button
              className={`${ui.secondary} mt-4 w-full`}
              type="button"
              onClick={copyInviteLink}
            >
              초대 링크 복사
            </button>
          </div>

          <div className="rounded-[18px] border border-[#e2e9ed] bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[-0.12px] text-[#63727c]">
                  시작 라운드
                </p>
                <strong className="mt-1 block text-[24px] font-semibold tracking-[0.231px]">
                  {activeRoundLabel}
                </strong>
              </div>
              {isCurrentHost && (
                <SlidersHorizontal className="size-5 text-[#27729b]" />
              )}
            </div>
            {isCurrentHost && roundSizeOptions.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {roundSizeOptions.map((roundSize) => (
                  <button
                    key={roundSize}
                    className={`h-10 rounded-xl border text-[14px] tracking-[-0.224px] active:scale-95 ${
                      activeRoundSize === roundSize
                        ? "border-[#27729b] bg-[#dceef7] text-[#245a7a]"
                        : "border-[#dce5eb] bg-white text-[#25343e]"
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
        <section className="md:hidden">
          <div className="rounded-[18px] border border-[#e2e9ed] bg-white">
            <div className="border-b border-[#e2e9ed] px-4 py-4">
              <h2 className="text-[21px] font-semibold tracking-[0.231px]">
                시작 라운드
              </h2>
            </div>
            <div className="px-4 py-4">
              {roundSizeOptions.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] leading-[1.4] tracking-[-0.12px] text-[#63727c]">
                        후보 {game.participants.toLocaleString()}개
                      </p>
                    </div>
                    <Trophy className="size-5 shrink-0 text-[#27729b]" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {roundSizeOptions.map((roundSize) => (
                      <button
                        key={roundSize}
                        className={`h-11 rounded-xl border text-[15px] tracking-[-0.224px] active:scale-95 ${
                          activeRoundSize === roundSize
                            ? "border-[#27729b] bg-[#dceef7] text-[#245a7a]"
                            : "border-[#dce5eb] bg-white text-[#25343e]"
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
                <div className="rounded-2xl bg-[#f1f6f9] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
                  {canStartWithRoundSize
                    ? "후보가 8개 미만이라 전체 후보로 시작합니다."
                    : "후보 수를 2개, 4개 또는 8개 이상으로 맞춰야 시작할 수 있습니다."}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className={ui.lobbyChat}>
        <div className={ui.lobbyChatPanel}>
          <ChatPanel
            currentMemberId={currentMemberId}
            messages={messages}
            onSend={onSendChat}
            players={players}
          />
        </div>
      </section>

      {inviteToast && (
        <div
          className={ui.inviteToast}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {inviteToast.type === "success" ? (
            <Check size={18} className="shrink-0 text-[#c9e1ee]" aria-hidden="true" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-[#ffd4a3]" aria-hidden="true" />
          )}
          <span>{inviteToast.message}</span>
        </div>
      )}

      <div className={ui.lobbyActions}>
        <div>
          <button
            className={ui.secondary}
            type="button"
            onClick={copyInviteLink}
          >
            초대
          </button>
          {isCurrentHost ? (
            <button
              className={ui.primary}
              type="button"
              disabled={isStarting || !canStartWithRoundSize}
              onClick={() => onStart(activeRoundSize)}
            >
              <Play className="size-4" aria-hidden="true" />
              {isStarting ? "시작 중" : "함께 시작하기"}
            </button>
          ) : (
            <button
              className="h-12 rounded-xl bg-[#e8e8ed] text-[16px] tracking-[-0.374px] text-[#63727c]"
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
  revealedWinnerId = null,
  selectedItemId,
  tieBreakerMemberId,
  tiePhase,
  voteStamps,
}: {
  activeRoundSize: number;
  currentMemberId: number | null;
  isSoloMode: boolean;
  isVoting: boolean;
  messages: ChatMessage[];
  match: MatchResponse;
  notice: string | null;
  onSendChat: (message: string) => void;
  onVote: (selectItemId: number) => void;
  players: Player[];
  revealedWinnerId?: number | null;
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
  const voteDisabled = isVoting || isTieVoteLocked || revealedWinnerId !== null;
  const isWaitingForOthers =
    !isSoloMode && selectedItemId !== null && !isVoting && revealedWinnerId === null;
  const revealedWinner =
    revealedWinnerId === match.item_a_id
      ? match.item_a
      : revealedWinnerId === match.item_b_id
        ? match.item_b
        : null;
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
    <section className={`${ui.play} ${isSoloMode ? ui.soloPlay : ""}`}>
      <div className={ui.playHeading}>
        <div className={ui.playStatus}>
          <p className={ui.roundLabel}>
            <Trophy size={17} aria-hidden="true" /> {roundLabel}
          </p>
          {isWaitingForOthers && (
            <span className={ui.playHint}>
              선택 완료 · 친구들을 기다리는 중{".".repeat(waitingDotCount)}
            </span>
          )}
          {!isWaitingForOthers && !isTieActive && !revealedWinner && (
            <span className={ui.playHint}>
              {isVoting
                ? "선택을 전달하고 있어요"
                : isSoloMode && selectedItemId !== null
                  ? "다음 대결을 준비하고 있어요"
                  : "마음에 드는 사진을 눌러주세요"}
            </span>
          )}
        </div>
        {notice && !isWaitingForOthers && !isTieActive && (
          <p className="mt-2 rounded-2xl bg-[#f1f6f9] px-3 py-2 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#27729b]">
            {notice}
          </p>
        )}
      </div>

      <div className={ui.matchArena}>
        <VoteCard
          key={match.item_a.id}
          disabled={voteDisabled || selectedItemId === match.item_a_id}
          item={match.item_a}
          onSelect={() => onVote(match.item_a_id)}
          selected={selectedItemId === match.item_a_id}
          stamps={voteStamps.filter(
            (stamp) => stamp.selectItemId === match.item_a_id,
          )}
        />
        <VoteCard
          key={match.item_b.id}
          disabled={voteDisabled || selectedItemId === match.item_b_id}
          item={match.item_b}
          onSelect={() => onVote(match.item_b_id)}
          selected={selectedItemId === match.item_b_id}
          stamps={voteStamps.filter(
            (stamp) => stamp.selectItemId === match.item_b_id,
          )}
        />
        {!revealedWinner && !isTieActive && (
          <span className={ui.versus} aria-hidden="true">
            VS
          </span>
        )}
        {revealedWinner && (
          <div
            key={`${match.id}:${revealedWinner.id}`}
            className={`${ui.winnerReveal} ${revealedWinner.id === match.item_b_id ? ui.winnerFromRight : ""}`}
            role="status"
            aria-live="polite"
            aria-label={`${revealedWinner.name} 승리`}
          >
            <div className={ui.revealMedia}>
              <MediaPreview
                alt={`${revealedWinner.name} 승리 후보`}
                className={ui.votePreview}
                fit="cover"
                eager
                src={revealedWinner.image_url}
              />
            </div>
            <div className={ui.revealCaption}>
              <span>
                <Trophy size={16} aria-hidden="true" /> 승리
              </span>
              <strong>{revealedWinner.name}</strong>
            </div>
          </div>
        )}
        {isTieActive && !revealedWinner && (
          <TieBreakerOverlay
            currentMemberId={currentMemberId}
            phase={tiePhase}
            players={players}
            tieBreakerMemberId={tieBreakerMemberId}
          />
        )}
      </div>

      {!isSoloMode && (
        <div className={ui.playChat}>
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
    <div className={`${ui.voteCard} ${selected ? ui.voteSelected : ""}`}>
      <MediaPreview
        alt={`${item.name} 후보 이미지`}
        className={`${ui.votePreview} ${isPlaying ? ui.votePlaying : ""}`}
        fit="cover"
        eager
        isPlaying={isPlaying}
        onPlay={() => setPlayingItemId(item.id)}
        playControl="corner"
        src={item.image_url}
      />
      <button
        className={ui.voteTarget}
        type="button"
        aria-label={`${item.name} ${selected ? "선택함" : "선택"}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={handleSelect}
      >
        {selected && !isPlaying && (
          <span className={ui.selectedBadge}>
            <Check size={15} aria-hidden="true" /> 선택 완료
          </span>
        )}
        <span className={ui.voteCaption}>
          <span className={ui.voteName} title={item.name}>
            {item.name}
          </span>
          {isPlaying && (
            <span className={ui.videoVoteHint}>
              {selected ? "선택 완료" : "이 후보 선택"}
            </span>
          )}
        </span>
      </button>
      <VoteStampLayer stamps={stamps} />
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
  const headline =
    phase === "spinning" ? "동점입니다!" : `${displayPlayer.name}님`;
  const description =
    phase === "spinning"
      ? "결정권자를 고르는 중입니다"
      : isCurrentUserTurn
        ? "결과를 정해주세요!"
        : `${displayPlayer.name}님이 결과를 정하고 있어요`;

  if (isCompactBannerVisible) {
    const compactDescription = isCurrentUserTurn
      ? "아래 두 후보 중 하나를 선택하세요."
      : null;

    return (
      <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex justify-center md:top-5">
        <div className="tie-winner-pop flex w-full max-w-[420px] items-center gap-3 rounded-[18px] border border-[#c9e1ee] bg-white/95 px-4 py-3 text-left text-[#25343e] backdrop-blur-md">
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
            {compactDescription && (
              <p className="mt-1 text-[13px] font-normal leading-[1.35] tracking-[-0.12px] text-[#63727c]">
                {compactDescription}
              </p>
            )}
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
  messages: ChatMessage[];
  onSend: (message: string) => void;
  players: Player[];
}) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followsLatestRef = useRef(true);
  const previousLastMessageKeyRef = useRef<string | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const chatGroups = messages.reduce<
    Array<{ memberId: number; messages: ChatMessage[] }>
  >((groups, chat) => {
    const memberId = Number(chat.memberId);
    const lastGroup = groups.at(-1);

    if (lastGroup?.memberId === memberId) {
      lastGroup.messages.push(chat);
    } else {
      groups.push({ memberId, messages: [chat] });
    }

    return groups;
  }, []);

  useEffect(() => {
    // Measure after layout, using the reader's position before messages arrived.
    const frame = window.requestAnimationFrame(() => {
      const scrollArea = scrollRef.current;
      if (!scrollArea) return;
      const lastMessage = messages.at(-1);
      const lastMessageKey = lastMessage
        ? lastMessage.localId ?? JSON.stringify([lastMessage.memberId, lastMessage.createdAt, lastMessage.message])
        : null;

      if (followsLatestRef.current) {
        scrollArea.scrollTo({
          top: scrollArea.scrollHeight,
          behavior: "instant",
        });
        setHasNewMessages(false);
      } else if (lastMessageKey !== previousLastMessageKeyRef.current) {
        setHasNewMessages(true);
      }
      previousLastMessageKeyRef.current = lastMessageKey;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  function handleChatScroll() {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const isNearBottom =
      scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight <
      40;
    followsLatestRef.current = isNearBottom;
    if (isNearBottom) setHasNewMessages(false);
  }

  function scrollToLatest() {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    followsLatestRef.current = true;
    setHasNewMessages(false);
    scrollArea.scrollTo({
      top: scrollArea.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    followsLatestRef.current = true;
    setHasNewMessages(false);
    onSend(trimmedMessage);
    setMessage("");
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-[#e2e9ed] bg-white"
      aria-label="실시간 채팅"
    >
      <div className={ui.chatHeader}>
        <span>
          <MessageCircle size={15} aria-hidden="true" /> 실시간 채팅
        </span>
        <small>{players.length}명 참여 중</small>
      </div>
      <div className={ui.chatBody}>
        <div
          ref={scrollRef}
          className={ui.chatMessages}
          onScroll={handleChatScroll}
          role="region"
          aria-label="채팅 내역"
          tabIndex={0}
        >
          {chatGroups.length === 0 && (
            <div className={ui.chatEmpty}>
              <MessageCircle size={24} strokeWidth={1.5} aria-hidden="true" />
              <p>친구들과 가볍게 인사를 나눠보세요.</p>
            </div>
          )}
          {chatGroups.map((group, groupIndex) => {
            const isOwnGroup =
              currentMemberId !== null &&
              Number(currentMemberId) === group.memberId;
            const player = players.find(
              (currentPlayer) => Number(currentPlayer.id) === group.memberId,
            );
            const lastMessage = group.messages.at(-1);

            return (
              <div
                key={group.messages[0]?.localId ?? `${group.memberId}-${group.messages[0]?.createdAt ?? groupIndex}`}
                className={`mt-3 flex items-start gap-2 first:mt-0 ${
                  isOwnGroup ? "justify-end" : ""
                }`}
              >
                <Image
                  alt={`${player?.name ?? "참가자"} 아바타`}
                  className={`${isOwnGroup ? "hidden " : ""}size-8 shrink-0 rounded-full border border-[#e2e9ed] bg-white`}
                  height={32}
                  src={
                    player?.avatar ?? getAvatarForName(String(group.memberId))
                  }
                  unoptimized
                  width={32}
                />
                <div
                  className={`flex min-w-0 flex-col ${isOwnGroup ? "max-w-[90%] items-end" : "max-w-[calc(100%-40px)] items-start"}`}
                >
                  {!isOwnGroup && (
                    <div className="mb-1 flex max-w-full items-center gap-2">
                      <span className="min-w-0 max-w-[120px] truncate text-[12px] font-normal leading-none tracking-[-0.12px] text-[#425563] md:max-w-[160px] md:text-[13px]">
                        {player?.name ?? "참가자"}
                      </span>
                      {lastMessage && (
                        <time className="shrink-0 text-[10px] leading-[1.3] tracking-[-0.08px] text-[#63727c] md:text-[11px]">
                          {formatChatTime(lastMessage.createdAt)}
                        </time>
                      )}
                    </div>
                  )}
                  <div
                    className={`flex max-w-full flex-col gap-1 ${isOwnGroup ? "items-end" : "items-start"}`}
                  >
                    {group.messages.map((chat, messageIndex) => {
                      const isFirstInGroup = messageIndex === 0;
                      const isLastInGroup =
                        messageIndex === group.messages.length - 1;

                      return (
                        <div
                          key={chat.localId ?? `${chat.memberId}-${chat.createdAt}-${messageIndex}`}
                          className={`flex max-w-full items-end gap-1.5 ${
                            isOwnGroup ? "justify-end" : "justify-start"
                          }`}
                        >
                          {isOwnGroup && (chat.delivery || isLastInGroup) && (
                            <span className="shrink-0 pb-0.5 text-[10px] leading-[1.3] tracking-[-0.08px] text-[#63727c] md:text-[11px]">
                              {chat.delivery
                                ? <span role="status">{chat.delivery === "sending" ? "전송 중" : "전송 확인 지연"}</span>
                                : <time>{formatChatTime(chat.createdAt)}</time>}
                            </span>
                          )}
                          <p
                            className={`w-fit min-w-0 max-w-full whitespace-pre-wrap break-words px-3 py-2 text-[15px] font-normal leading-[1.47] tracking-[-0.374px] md:py-2.5 md:text-[16px] ${
                              isOwnGroup
                                ? `bg-[#dceef7] text-[#245a7a] ${
                                    isFirstInGroup
                                      ? "rounded-tr-[18px]"
                                      : "rounded-tr-[8px]"
                                  } ${
                                    isLastInGroup
                                      ? "rounded-br-[18px]"
                                      : "rounded-br-[8px]"
                                  } rounded-l-[18px]`
                                : `border border-[#edf1f4] bg-white text-[#25343e] shadow-sm ${
                                    isFirstInGroup
                                      ? "rounded-tl-[18px]"
                                      : "rounded-tl-[8px]"
                                  } ${
                                    isLastInGroup
                                      ? "rounded-bl-[18px]"
                                      : "rounded-bl-[8px]"
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
        {hasNewMessages && (
          <button
            className={ui.chatLatest}
            type="button"
            onClick={scrollToLatest}
          >
            <ArrowDown size={14} aria-hidden="true" /> 새 메시지
          </button>
        )}
      </div>
      <form
        className="flex h-16 shrink-0 items-center gap-2 border-t border-[#edf1f4] bg-[#f1f6f9]/90 px-3 py-2 backdrop-blur-xl md:h-[72px] md:px-4 md:py-3"
        onSubmit={handleSubmit}
      >
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#25343e] outline-none placeholder:text-[#63727c] focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:h-12"
          maxLength={120}
          aria-label="채팅 메시지"
          placeholder="메시지 보내기"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button
          aria-label="채팅 보내기"
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a] active:scale-95 disabled:bg-[#dce5eb] disabled:text-[#63727c] md:size-12"
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
          <div className="rounded-full border-[3px] border-[#27729b] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
            <Image
              alt={`${stamp.name} 투표 도장`}
              className="size-12 rounded-full"
              height={48}
              src={stamp.avatar}
              unoptimized
              width={48}
            />
          </div>
          <span className="mt-1 max-w-[82px] truncate rounded-full bg-[#dceef7] px-2 py-0.5 text-[11px] font-semibold tracking-[-0.12px] text-[#245a7a] shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
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
    <section className={ui.result}>
      <header className={ui.resultHeading}>
        <p className={ui.resultBadge}>
          <Trophy size={18} aria-hidden="true" />
          {winner ? "최종 우승" : "최종 결과"}
        </p>
        <h1>{winner?.name ?? "우승자 확인 중"}</h1>
      </header>
      <div className={ui.resultCard}>
        {winner ? (
          <MediaPreview
            alt={`${winner.name} 우승 이미지`}
            className={ui.resultImage}
            eager
            src={winner.image_url}
          />
        ) : (
          <p className={ui.empty} role="status">
            결과 정보를 불러오는 중입니다.
          </p>
        )}
      </div>
      <button
        className={`${ui.primary} ${ui.resultAction}`}
        type="button"
        onClick={onBackToLobby}
      >
        {actionLabel}
      </button>
    </section>
  );
}
