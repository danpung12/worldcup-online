"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Loader2,
  Play,
  Trophy,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoom,
  joinRoom,
  onGameUpdate,
  onRoomUpdate,
  onSocketException,
  roomState,
  startGame,
  vote,
  type GameUpdateResponse,
  type MatchResponse,
  type RoomMemberResponse,
  type RoomStateResponse,
} from "@/lib/room-socket";
import {
  apiBaseUrl,
  fetchWorldcupGames,
  mockGames,
  queryKeys,
} from "@/lib/worldcup";
import { logoutAuth, type AuthUser } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { type AppView, type Player, useWorldcupStore } from "@/store/worldcup-store";
import { CreateView } from "./worldcup/views/create-view";
import { HomeView } from "./worldcup/views/home-view";
import { HomeHeader } from "./worldcup/views/home-header";
import homeStyles from "./worldcup/views/home.module.css";
import { getAvatarForName, ProfileView } from "./worldcup/views/profile-view";
import { RankingView } from "./worldcup/views/ranking-view";
import { getDefaultRoundSize, LobbyView, PlayView, ResultView } from "./worldcup/views/room-views";
import { getConfirmedMatchWinner, getGameTransitionKey } from "./worldcup/views/match-winner";
import { useMatchReveal } from "./worldcup/views/use-match-reveal";
import { useRoomChat } from "./worldcup/views/use-room-chat";

type WorldcupAppProps = {
  initialGameId?: number;
  initialRoomCode?: string;
  initialView?: AppView;
  skipRoomRestore?: boolean;
};
type LegalDocumentKey = "terms" | "privacy" | "content" | "report";
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
type RoomMode = "solo" | "multi";
const legalDocuments: Record<
  LegalDocumentKey,
  {
    title: string;
    effectiveDate: string;
    sections: Array<{ body: string[]; heading: string }>;
  }
> = {
  terms: {
    title: "이용약관",
    effectiveDate: "2026년 6월 10일",
    sections: [
      {
        heading: "서비스의 성격",
        body: [
          "픽온(PickOn)은 이용자가 이상형 월드컵을 만들고, 참여하고, 친구와 함께 실시간으로 즐길 수 있는 콘텐츠 제작·공유 서비스입니다.",
          "서비스에 표시되는 외부 출처의 이미지, 텍스트, 상표, 인물명, 작품명 등은 각 원저작자와 권리자의 정책 및 권리를 따릅니다.",
        ],
      },
      {
        heading: "이용자의 의무",
        body: [
          "이용자는 저작권, 초상권, 상표권, 명예권, 개인정보 등 타인의 권리를 침해하는 콘텐츠를 등록하거나 공유해서는 안 됩니다.",
          "타인을 사칭하거나, 비방·괴롭힘·혐오 표현·불법 정보·음란물·스팸성 콘텐츠를 게시하는 행위는 금지됩니다.",
        ],
      },
      {
        heading: "콘텐츠 권리와 사용 범위",
        body: [
          "이용자가 직접 등록한 콘텐츠의 권리와 책임은 해당 이용자에게 있습니다.",
          "이용자는 서비스 운영, 저장, 노출, 공유, 검색, 통계, 신고 처리, 홍보에 필요한 범위에서 운영자에게 비독점적 사용 권한을 부여합니다.",
          "운영자는 이용자의 동의 없이 이용자 콘텐츠 자체를 제3자에게 판매하거나 양도하지 않습니다.",
        ],
      },
      {
        heading: "게시물 조치",
        body: [
          "운영자는 약관 또는 운영정책 위반이 의심되는 콘텐츠에 대해 사전 통지 없이 비공개, 삭제, 노출 제한, 이용 제한 조치를 할 수 있습니다.",
          "권리침해 신고가 접수된 콘텐츠는 사실 확인 전이라도 임시 비공개 처리될 수 있습니다.",
        ],
      },
      {
        heading: "면책",
        body: [
          "운영자는 이용자 간 또는 이용자와 제3자 사이에서 발생한 분쟁에 원칙적으로 개입할 의무가 없습니다.",
          "다만 운영자가 권리침해나 금지행위를 인지한 경우, 합리적인 범위에서 필요한 조치를 취합니다.",
        ],
      },
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    effectiveDate: "2026년 6월 10일",
    sections: [
      {
        heading: "수집하는 정보",
        body: [
          "회원 로그인 시 이메일, 닉네임, 프로필 이미지 등 인증 제공자로부터 전달받은 기본 정보를 수집할 수 있습니다.",
          "방 생성, 채팅, 투표, 월드컵 제작 과정에서 닉네임, 프로필, 작성한 텍스트, 업로드 이미지, 이용 기록이 저장될 수 있습니다.",
          "서비스 안정성과 부정 이용 방지를 위해 IP 주소, 접속 로그, 기기·브라우저 정보, 쿠키가 자동 수집될 수 있습니다.",
        ],
      },
      {
        heading: "이용 목적",
        body: [
          "수집한 정보는 회원 식별, 월드컵 제작·참여, 실시간 방 운영, 채팅, 랭킹, 고객 문의, 신고 처리, 서비스 개선 및 보안 유지에 사용합니다.",
          "개인을 식별할 수 있는 정보는 별도 동의나 법령상 근거 없이 목적 외로 사용하지 않습니다.",
        ],
      },
      {
        heading: "보관과 삭제",
        body: [
          "회원 정보는 회원 탈퇴 또는 수집 목적 달성 시 지체 없이 삭제합니다.",
          "법령상 보관 의무가 있거나 부정 이용 대응에 필요한 기록은 필요한 기간 동안 분리 보관할 수 있습니다.",
          "이용자가 만든 공개 콘텐츠는 삭제 요청, 신고 처리, 서비스 운영 정책에 따라 삭제 또는 비공개 처리될 수 있습니다.",
        ],
      },
      {
        heading: "제3자 제공 및 외부 서비스",
        body: [
          "운영자는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.",
          "로그인, 이미지 저장, 분석, 광고 등 외부 서비스를 사용할 경우 해당 서비스의 정책이 함께 적용될 수 있습니다.",
        ],
      },
      {
        heading: "이용자의 권리",
        body: [
          "이용자는 자신의 개인정보 열람, 수정, 삭제, 처리 정지를 요청할 수 있습니다.",
          "개인정보와 관련한 문의는 운영자에게 접수할 수 있으며, 운영자는 합리적인 범위에서 순차적으로 처리합니다.",
        ],
      },
    ],
  },
  content: {
    title: "콘텐츠 운영정책",
    effectiveDate: "2026년 6월 10일",
    sections: [
      {
        heading: "기본 원칙",
        body: [
          "픽온(PickOn)은 재미있는 취향 공유를 위한 서비스이며, 타인의 권리와 안전을 해치지 않는 콘텐츠를 지향합니다.",
          "음식, 장소, 사물 등 일반 콘텐츠는 권리 문제가 없는 이미지 사용을 권장합니다.",
          "인물 콘텐츠는 저작권뿐 아니라 초상권, 퍼블리시티권, 명예훼손 이슈가 함께 발생할 수 있으므로 특히 신중하게 등록해야 합니다.",
        ],
      },
      {
        heading: "금지 콘텐츠",
        body: [
          "저작권자 허락 없이 복제·캡처·편집한 사진, 영상, 움짤, 방송 클립 등 권리침해 가능성이 높은 콘텐츠는 제한될 수 있습니다.",
          "특정 인물에 대한 모욕, 성적 대상화, 허위사실, 사생활 침해, 스토킹, 악의적 비교를 유도하는 콘텐츠는 금지됩니다.",
          "불법 정보, 혐오 표현, 음란물, 잔혹물, 개인정보 노출, 스팸성 홍보 콘텐츠는 삭제될 수 있습니다.",
        ],
      },
      {
        heading: "운영 조치",
        body: [
          "운영자는 신고, 모니터링, 권리자 요청, 서비스 안정성 판단에 따라 콘텐츠를 비공개, 삭제, 수정 요청, 검색 제외, 이용 제한 처리할 수 있습니다.",
          "반복적으로 문제가 되는 콘텐츠를 등록하는 이용자는 일시 또는 영구 제한될 수 있습니다.",
        ],
      },
      {
        heading: "출처와 대체 이미지",
        body: [
          "이미지를 등록할 때는 가능한 한 직접 촬영, 직접 제작, 라이선스가 확인된 이미지, 사용 허락을 받은 이미지를 사용해야 합니다.",
          "권리 확인이 어려운 인물사진은 등록하지 않거나, 텍스트·일러스트·권리 문제가 없는 대체 이미지를 사용하는 것을 권장합니다.",
        ],
      },
    ],
  },
  report: {
    title: "권리침해 신고안내",
    effectiveDate: "2026년 6월 10일",
    sections: [
      {
        heading: "신고 대상",
        body: [
          "저작권, 초상권, 상표권, 개인정보, 명예훼손 등 권리침해가 의심되는 월드컵, 후보 이미지, 댓글, 채팅은 신고할 수 있습니다.",
          "권리자 본인, 권리자의 대리인, 피해를 입은 당사자는 삭제 또는 비공개 조치를 요청할 수 있습니다.",
        ],
      },
      {
        heading: "신고 시 필요한 정보",
        body: [
          "문제가 되는 콘텐츠의 URL 또는 위치, 침해가 의심되는 권리의 종류, 권리자임을 확인할 수 있는 정보, 연락 가능한 이메일을 함께 보내 주세요.",
          "대리인이 신고하는 경우 권리자로부터 위임받았음을 확인할 수 있는 자료가 필요할 수 있습니다.",
        ],
      },
      {
        heading: "처리 절차",
        body: [
          "신고가 접수되면 운영자는 내용을 검토하고, 필요 시 콘텐츠를 임시 비공개 처리합니다.",
          "신고 내용이 타당하다고 판단되면 해당 콘텐츠를 삭제하거나 노출을 제한합니다.",
          "신고 내용이 불명확한 경우 추가 자료를 요청할 수 있으며, 허위 신고나 악의적 신고는 제한될 수 있습니다.",
        ],
      },
      {
        heading: "문의",
        body: [
          "정식 신고 기능이 준비되기 전까지 권리침해 신고는 운영자 이메일 aass6863@naver.com 또는 서비스 내 문의 채널을 통해 접수하는 것을 원칙으로 합니다.",
          "신고 접수 후 운영자는 필요한 경우 추가 자료를 요청할 수 있으며, 검토 결과에 따라 콘텐츠 비공개 또는 삭제 조치를 진행합니다.",
        ],
      },
    ],
  },
};

function getAuthProfile(user: AuthUser): Pick<Player, "name" | "avatar"> {
  return {
    name: user.nickname,
    avatar: user.profile_image ?? getAvatarForName(user.nickname),
  };
}

function getStoredRoomMember(roomCode: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(`worldcup-room-member:${roomCode}`);

  if (!rawValue) {
    return null;
  }

  try {
    const value = JSON.parse(rawValue) as { avatar?: string; memberId?: number };

    if (typeof value.memberId !== "number") {
      return null;
    }

    return {
      avatar: value.avatar,
      memberId: value.memberId,
    };
  } catch {
    return null;
  }
}

function setStoredRoomMember(
  roomCode: string,
  member: { avatar?: string; memberId: number },
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `worldcup-room-member:${roomCode}`,
    JSON.stringify(member),
  );
}

function getStoredRoomMode(roomCode: string): RoomMode {
  if (typeof window === "undefined") {
    return "multi";
  }

  return window.localStorage.getItem(`worldcup-room-mode:${roomCode}`) === "solo"
    ? "solo"
    : "multi";
}

function setStoredRoomMode(roomCode: string, mode: RoomMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`worldcup-room-mode:${roomCode}`, mode);
}

function clearStoredRoomMembers() {
  if (typeof window === "undefined") {
    return;
  }

  const prefixes = ["worldcup-room-member:", "worldcup-room-mode:"];

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  }
}

export default function WorldcupApp({
  initialGameId,
  initialRoomCode,
  initialView,
  skipRoomRestore = false,
}: WorldcupAppProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: games = mockGames,
    isError: hasGamesError,
    isPlaceholderData: isGamesPlaceholder,
    isFetching: isGamesFetching,
  } = useQuery({
    queryKey: queryKeys.games,
    queryFn: fetchWorldcupGames,
    placeholderData: mockGames,
    retry: false,
    staleTime: 60_000,
  });

  const view = useWorldcupStore((state) => state.view);
  const selectedGameId = useWorldcupStore((state) => state.selectedGameId);
  const roomCode = useWorldcupStore((state) => state.roomCode);
  const players = useWorldcupStore((state) => state.players);
  const setView = useWorldcupStore((state) => state.setView);
  const selectGame = useWorldcupStore((state) => state.selectGame);
  const enterLobby = useWorldcupStore((state) => state.enterLobby);
  const setRoomContext = useWorldcupStore((state) => state.setRoomContext);
  const setPlayers = useWorldcupStore((state) => state.setPlayers);
  const authUser = useAuthStore((state) => state.user);
  const setLoggedOut = useAuthStore((state) => state.setLoggedOut);
  const [currentMember, setCurrentMember] = useState<{
    avatar: string;
    memberId: number;
  } | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchResponse | null>(null);
  const { reveal: matchReveal, revealWinner, clearReveal } = useMatchReveal(currentMatch);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [gameNotice, setGameNotice] = useState<string | null>(null);
  const [activeRoundSize, setActiveRoundSize] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isRestoringRoom, setIsRestoringRoom] = useState(
    Boolean(initialRoomCode && !skipRoomRestore),
  );
  const [roomMode, setRoomMode] = useState<RoomMode>("multi");
  const {
    messages: chatMessages,
    reset: resetChatMessages,
    send: sendRoomChat,
  } = useRoomChat();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [voteStamps, setVoteStamps] = useState<VoteStamp[]>([]);
  const [tieBreakerMemberId, setTieBreakerMemberId] = useState<number | null>(null);
  const [tiePhase, setTiePhase] = useState<TiePhase>("idle");
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [soloSetupGameId, setSoloSetupGameId] = useState<number | null>(null);
  const [soloSetupError, setSoloSetupError] = useState<string | null>(null);
  const [openLegalDocument, setOpenLegalDocument] = useState<LegalDocumentKey | null>(null);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);
  const appliedTransitionsRef = useRef(new Set<string>());
  const tieDecisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMatchIdRef = useRef<number | null>(null);
  const settledMatchIdRef = useRef<number | null>(null);
  const pendingVoteItemIdRef = useRef<number | null>(null);
  const confirmedVotesRef = useRef<{
    matchId: number;
    choices: Map<number, number>;
  } | null>(null);
  const activeView = initialView ?? view;
  const activeSelectedGameId = initialGameId ?? selectedGameId;
  const selectedGame =
    games.find((game) => game.id === activeSelectedGameId) ?? games[0] ?? mockGames[0];
  const soloSetupGame = games.find((game) => game.id === soloSetupGameId) ?? null;
  const currentPlayer = currentMember
    ? players.find((player) => player.id === currentMember.memberId)
    : null;
  const isCurrentHost = currentPlayer?.isHost ?? false;
  const isSoloMode = roomMode === "solo";
  const titleByView = {
    home: "이상형 월드컵",
    create: "만들기",
    profile: "입장 준비",
    lobby: "함께하기",
    play: "투표",
    result: "결과",
    ranking: "랭킹",
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeSelectedGameId, activeView]);

  useEffect(() => {
    return () => {
      if (tieDecisionTimerRef.current) {
        clearTimeout(tieDecisionTimerRef.current);
      }
      if (shareToastTimerRef.current) {
        clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  const clearTieDecisionTimer = useCallback(() => {
    if (tieDecisionTimerRef.current) {
      clearTimeout(tieDecisionTimerRef.current);
      tieDecisionTimerRef.current = null;
    }
  }, []);

  const resetTieBreaker = useCallback(() => {
    clearTieDecisionTimer();
    setTieBreakerMemberId(null);
    setTiePhase("idle");
  }, [clearTieDecisionTimer]);

  const addVoteStamp = useCallback(
    (vote: { memberId: number; selectItemId: number }) => {
      if (roomMode === "solo") {
        return;
      }

      const player = players.find((currentPlayer) => currentPlayer.id === vote.memberId);

      setVoteStamps((current) => {
        const stamp = createVoteStamp({
          avatar: player?.avatar ?? getAvatarForName(String(vote.memberId)),
          existingStamps: current,
          matchId: currentMatch?.id ?? 0,
          memberId: vote.memberId,
          name: player?.name ?? "참가자",
          selectItemId: vote.selectItemId,
        });

        return [
          ...current.filter((currentStamp) => currentStamp.memberId !== stamp.memberId),
          stamp,
        ];
      });
    },
    [currentMatch?.id, players, roomMode],
  );

  const removeVoteStamp = useCallback((memberId: number) => {
    setVoteStamps((current) =>
      current.filter((currentStamp) => currentStamp.memberId !== memberId),
    );
  }, []);

  const applyGameUpdate = useCallback(
    (update: GameUpdateResponse) => {
      // A vote is broadcast and acknowledged separately. A delayed duplicate
      // must not restart the reveal or put an already played match back on screen.
      const transitionKey = getGameTransitionKey(update);
      if (transitionKey) {
        if (appliedTransitionsRef.current.has(transitionKey)) return;
        appliedTransitionsRef.current.add(transitionKey);
      }
      // Keep accepted votes synchronous: socket events and their acknowledgements
      // can arrive before React has rendered the latest vote stamps.
      if (currentMatch && confirmedVotesRef.current?.matchId !== currentMatch.id) {
        confirmedVotesRef.current = { matchId: currentMatch.id, choices: new Map() };
      }
      if ("status" in update && update.status === "tie") {
        confirmedVotesRef.current?.choices.clear();
      }
      if (
        "status" in update &&
        (update.status === "voting" || update.status === "nextMatch") &&
        update.vote
      ) {
        confirmedVotesRef.current?.choices.set(update.vote.memberId, update.vote.selectItemId);
      }
      const confirmedWinner = getConfirmedMatchWinner({
        match: currentMatch,
        update,
        soloVoteItemId: players.length === 1
          ? pendingVoteItemIdRef.current ?? selectedItemId
          : null,
        tieBreakerMemberId,
        participantCount: players.length,
        votes: Array.from(confirmedVotesRef.current?.choices ?? [], ([memberId, selectItemId]) => ({ memberId, selectItemId })),
      });
      if (currentMatch && confirmedWinner !== null) {
        revealWinner(currentMatch, confirmedWinner);
      }
      setIsStarting(false);
      setIsVoting(false);

      if (isMatchResponse(update)) {
        resetTieBreaker();
        pendingVoteItemIdRef.current = null;
        currentMatchIdRef.current = update.id;
        settledMatchIdRef.current = null;
        setCurrentMatch(update);
        setWinnerId(null);
        setGameNotice(null);
        setSelectedItemId(null);
        setVoteStamps([]);
        setGameNotice(null);
        setSoloSetupGameId(null);
        setSoloSetupError(null);
        setView("play");
        return;
      }

      if ("finished" in update && update.finished) {
        resetTieBreaker();
        pendingVoteItemIdRef.current = null;
        currentMatchIdRef.current = null;
        settledMatchIdRef.current = null;
        setWinnerId(update.winnerId);
        setSelectedItemId(null);
        setGameNotice("월드컵이 종료되었습니다.");
        setVoteStamps([]);
        setView("result");
        return;
      }

      if (!("status" in update)) {
        return;
      }

      if (update.status === "voting") {
        if (update.vote) {
          addVoteStamp(update.vote);

          if (update.vote.memberId === currentMember?.memberId) {
            setSelectedItemId(update.vote.selectItemId);
          }
        }
        setGameNotice(null);
        return;
      }

      if (update.status === "tie") {
        if (
          currentMatchIdRef.current !== null &&
          (update.match.id !== currentMatchIdRef.current ||
            update.match.id === settledMatchIdRef.current)
        ) {
          return;
        }
        clearTieDecisionTimer();
        const nextTieBreakerMemberId = update.tieBreakerMemberId ?? update.tieMembers ?? null;
        currentMatchIdRef.current = update.match.id;
        settledMatchIdRef.current = null;
        setCurrentMatch(update.match);
        setTieBreakerMemberId(nextTieBreakerMemberId);
        setTiePhase(nextTieBreakerMemberId ? "spinning" : "decided");
        setSelectedItemId(null);
        setVoteStamps([]);
        setGameNotice(null);
        if (nextTieBreakerMemberId) {
          tieDecisionTimerRef.current = setTimeout(() => {
            setTiePhase("decided");
            tieDecisionTimerRef.current = setTimeout(() => {
              setTiePhase("revealed");
              tieDecisionTimerRef.current = null;
            }, 1500);
          }, 1800);
        }
        setGameNotice("동점입니다. 같은 매치를 다시 투표해주세요.");
        setView("play");
        return;
      }

      if (update.status === "nextMatch") {
        resetTieBreaker();
        pendingVoteItemIdRef.current = null;
        // Commit the next match now; matchReveal alone holds the old pair for
        // the animation. There is no second timer that can expose the old pair.
        currentMatchIdRef.current = update.match.id;
        settledMatchIdRef.current = null;
        setCurrentMatch(update.match);
        setSelectedItemId(null);
        setVoteStamps([]);
        setGameNotice(null);
        setView("play");
      }
    },
    [
      addVoteStamp,
      clearTieDecisionTimer,
      currentMember?.memberId,
      currentMatch,
      players.length,
      revealWinner,
      selectedItemId,
      tieBreakerMemberId,
      resetTieBreaker,
      setView,
    ],
  );

  const applyRoomState = useCallback(
    (state: RoomStateResponse) => {
      clearReveal();
      appliedTransitionsRef.current.clear();
      const memberContext = {
        avatar: state.member.avatar ?? getAvatarForName(state.member.nickname),
        memberId: state.member.id,
      };
      const restoredRoomMode = getStoredRoomMode(state.room.room_code);
      resetTieBreaker();
      currentMatchIdRef.current = state.match?.id ?? null;
      settledMatchIdRef.current = null;
      pendingVoteItemIdRef.current = null;
      setRoomMode(restoredRoomMode);
      setCurrentMember(memberContext);
      setPlayers(
        mapRoomMembers(state.room.member, memberContext.memberId, memberContext.avatar),
      );
      if (state.room.game_id) {
        selectGame(state.room.game_id, "lobby");
      }
      enterLobby(
        state.room.room_code,
        mapRoomMembers(state.room.member, memberContext.memberId, memberContext.avatar),
      );
      setActiveRoundSize(null);
      setGameNotice(null);
      setVoteStamps([]);
      setSelectedItemId(state.vote?.select_item_id ?? null);

      if (state.status === "PLAYING" && state.match) {
        setCurrentMatch(state.match);
        setTieBreakerMemberId(state.tieVoteMemberId);
        setTiePhase(state.tieVoteMemberId === null ? "idle" : "revealed");
        setWinnerId(null);
        setView("play");
        return;
      }

      if (state.status === "FINISHED") {
        setCurrentMatch(null);
        setWinnerId(null);
        setView("result");
        return;
      }

      setCurrentMatch(null);
      setWinnerId(null);
      setView("lobby");
    },
    [
      clearReveal,
      enterLobby,
      resetTieBreaker,
      selectGame,
      setPlayers,
      setView,
    ],
  );

  useEffect(() => {
    if (!initialRoomCode) {
      return;
    }

    if (skipRoomRestore) {
      window.history.replaceState(null, "", `/room/${initialRoomCode}`);
    }

    const roomCodeToRestore: string = initialRoomCode;
    let isCanceled = false;

    async function restoreRoomState() {
      const storedMember = getStoredRoomMember(roomCodeToRestore);

      if (!storedMember) {
        if (!isCanceled) {
          setIsRestoringRoom(false);
          setView("profile");
        }
        return;
      }

      const memberToRestore = storedMember;
      setRoomMode(getStoredRoomMode(roomCodeToRestore));
      setCurrentMember({
        avatar: memberToRestore.avatar ?? getAvatarForName(String(memberToRestore.memberId)),
        memberId: memberToRestore.memberId,
      });

      try {
        const state = await roomState({
          memberId: memberToRestore.memberId,
          roomCode: roomCodeToRestore,
        });

        if (isCanceled) {
          return;
        }

        applyRoomState(state);
        setStoredRoomMember(roomCodeToRestore, {
          avatar: state.member.avatar ?? memberToRestore.avatar,
          memberId: state.member.id,
        });
        setIsRestoringRoom(false);
      } catch {
        if (!isCanceled) {
          setIsRestoringRoom(false);
          setView("profile");
        }
      }
    }

    restoreRoomState();

    return () => {
      isCanceled = true;
    };
  }, [applyRoomState, initialRoomCode, setView, skipRoomRestore]);

  useEffect(() => {
    const offGameUpdate = onGameUpdate((update) => {
      applyGameUpdate(update);
    });
    const offSocketException = onSocketException((error) => {
      setSoloSetupError(readSocketError(error));
      setIsStarting(false);
      setIsVoting(false);
      setGameNotice(readSocketError(error));
    });

    return () => {
      offGameUpdate();
      offSocketException();
    };
  }, [applyGameUpdate]);

  useEffect(() => {
    if (!currentMember) {
      return;
    }

    const offRoomUpdate = onRoomUpdate((room) => {
      setPlayers(
        mapRoomMembers(room.member, currentMember.memberId, currentMember.avatar),
      );
    });

    return () => {
      offRoomUpdate();
    };
  }, [currentMember, setPlayers]);

  const handleStartGame = useCallback((roundSize?: number) => {
    clearReveal();
    appliedTransitionsRef.current.clear();
    resetTieBreaker();
    setGameNotice(null);
    setVoteStamps([]);
    setSelectedItemId(null);
    currentMatchIdRef.current = null;
    settledMatchIdRef.current = null;
    pendingVoteItemIdRef.current = null;
    setActiveRoundSize(roundSize ?? selectedGame.participants);
    setIsStarting(true);
    startGame(roundSize ? { roundSize } : undefined);
  }, [clearReveal, resetTieBreaker, selectedGame.participants]);

  async function handleVote(selectItemId: number) {
    if (!currentMember || matchReveal) {
      return;
    }

    if (
      selectedItemId === selectItemId ||
      pendingVoteItemIdRef.current === selectItemId
    ) {
      return;
    }

    if (
      tieBreakerMemberId !== null &&
      (tiePhase === "spinning" || tieBreakerMemberId !== currentMember.memberId)
    ) {
      return;
    }

    const previousSelectedItemId = selectedItemId;
    const votedMatchId = currentMatchIdRef.current;

    pendingVoteItemIdRef.current = selectItemId;
    setGameNotice(null);
    setSelectedItemId(selectItemId);
    addVoteStamp({
      memberId: currentMember.memberId,
      selectItemId,
    });

    try {
      const update = await vote(selectItemId);
      // The broadcast may already have advanced the game while this ack was
      // in flight. Only apply an ack to the match that submitted the vote.
      if (currentMatchIdRef.current === votedMatchId) applyGameUpdate(update);
    } catch {
      if (currentMatchIdRef.current !== votedMatchId) return;
      setIsVoting(false);
      setSelectedItemId(previousSelectedItemId);

      if (previousSelectedItemId) {
        addVoteStamp({
          memberId: currentMember.memberId,
          selectItemId: previousSelectedItemId,
        });
      } else {
        removeVoteStamp(currentMember.memberId);
      }
      setGameNotice("투표에 실패했습니다. 이미 투표했거나 현재 매치가 바뀌었을 수 있습니다.");
    } finally {
      if (currentMatchIdRef.current === votedMatchId && pendingVoteItemIdRef.current === selectItemId) {
        pendingVoteItemIdRef.current = null;
      }
    }
  }

  function handleBackToHome() {
    clearReveal();
    appliedTransitionsRef.current.clear();
    resetTieBreaker();
    setView("home");
    currentMatchIdRef.current = null;
    settledMatchIdRef.current = null;
    pendingVoteItemIdRef.current = null;
    setCurrentMatch(null);
    setWinnerId(null);
    setGameNotice(null);
    setActiveRoundSize(null);
    resetChatMessages();
    setSelectedItemId(null);
    setVoteStamps([]);
    setRoomMode("multi");
    setSoloSetupGameId(null);
    setSoloSetupError(null);

    if (initialRoomCode || initialView || window.location.pathname !== "/") {
      router.replace("/");
    }
  }

  async function handleCreateComplete() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.games });
    await queryClient.invalidateQueries({ queryKey: queryKeys.myGames });
  }

  async function enterRoomWithProfile(
    profile: Pick<Player, "name" | "avatar">,
    gameId = selectedGame.id,
  ) {
    setRoomMode("multi");
    resetChatMessages();

    if (initialRoomCode) {
      const result = await joinRoom({
        avatar: profile.avatar,
        roomCode: initialRoomCode,
        nickname: profile.name,
      });
      const memberContext = {
        avatar: profile.avatar,
        memberId: result.member.id,
      };
      const nextRoomCode = result.roomCode ?? result.room.room_code;

      setCurrentMember(memberContext);
      setStoredRoomMember(nextRoomCode, memberContext);
      setStoredRoomMode(nextRoomCode, "multi");
      router.replace(`/room/${nextRoomCode}?fresh=1`);
      enterLobby(
        nextRoomCode,
        mapRoomMembers(
          result.room.member,
          memberContext.memberId,
          memberContext.avatar,
        ),
      );
      return;
    }

    const result = await createRoom({
      avatar: profile.avatar,
      gameId,
      nickname: profile.name,
    });
    const createdMember = result.member ?? result.room.member[0];

    if (!createdMember) {
      throw new Error("방 참가자 정보를 찾을 수 없습니다.");
    }

    const memberContext = {
      avatar: profile.avatar,
      memberId: createdMember.id,
    };
    const nextRoomCode = result.roomCode ?? result.room.room_code;

    setCurrentMember(memberContext);
    setStoredRoomMember(nextRoomCode, memberContext);
    setStoredRoomMode(nextRoomCode, "multi");
    router.replace(`/room/${nextRoomCode}?fresh=1`);
    resetChatMessages();
    enterLobby(
      nextRoomCode,
      mapRoomMembers(
        result.room.member,
        memberContext.memberId,
        memberContext.avatar,
      ),
    );
  }

  async function handleSoloStart(roundSize?: number) {
    if (!soloSetupGame) {
      return;
    }

    const profile = authUser
      ? getAuthProfile(authUser)
      : {
          avatar: getAvatarForName("혼자하기"),
          name: "혼자하기",
        };

    setIsStarting(true);
    setSoloSetupError(null);
    setRoomMode("solo");
    resetTieBreaker();
    setCurrentMatch(null);
    setWinnerId(null);
    setGameNotice(null);
    setSelectedItemId(null);
    setVoteStamps([]);
    currentMatchIdRef.current = null;
    settledMatchIdRef.current = null;
    pendingVoteItemIdRef.current = null;

    try {
      const result = await createRoom({
        avatar: profile.avatar,
        gameId: soloSetupGame.id,
        nickname: profile.name,
      });
      const createdMember = result.member ?? result.room.member[0];

      if (!createdMember) {
        throw new Error("방 참가자 정보를 찾을 수 없습니다.");
      }

      const memberContext = {
        avatar: profile.avatar,
        memberId: createdMember.id,
      };
      const nextRoomCode = result.roomCode ?? result.room.room_code;
      const nextPlayers = mapRoomMembers(
        result.room.member,
        memberContext.memberId,
        memberContext.avatar,
      );

      setCurrentMember(memberContext);
      setPlayers(nextPlayers);
      setRoomContext(nextRoomCode, nextPlayers);
      setStoredRoomMember(nextRoomCode, memberContext);
      setStoredRoomMode(nextRoomCode, "solo");
      window.history.replaceState(null, "", `/room/${nextRoomCode}`);
      resetChatMessages();
      handleStartGame(roundSize);
    } catch {
      setIsStarting(false);
      setSoloSetupError("게임을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  async function handleProfileComplete(profile: Pick<Player, "name" | "avatar">) {
    await enterRoomWithProfile(profile);
  }

  async function handleGameJoin(gameId: number) {
    setRoomMode("multi");
    selectGame(gameId, authUser ? "home" : "profile");

    if (!authUser) {
      if (initialView) {
        router.replace("/");
      }
      return;
    }

    try {
      await enterRoomWithProfile(getAuthProfile(authUser), gameId);
    } catch {
      selectGame(gameId, "profile");
    }
  }

  function handleGameStart(gameId: number) {
    setRoomMode("solo");
    selectGame(gameId, "home");
    setSoloSetupGameId(gameId);
    setSoloSetupError(null);
  }

  function handleSendChat(message: string) {
    sendRoomChat(message, currentMember?.memberId ?? null);
  }

  function handleCreateClick() {
    if (!authUser) {
      setShowLoginRequiredModal(true);
      return;
    }

    router.push("/create");
  }

  async function handleShareHomeUrl() {
    const homeUrl = `${window.location.origin}/`;

    try {
      await copyTextToClipboard(homeUrl);
      setShareToastMessage("링크가 복사되었습니다");
    } catch {
      setShareToastMessage("링크 복사에 실패했습니다");
    }

    if (shareToastTimerRef.current) {
      clearTimeout(shareToastTimerRef.current);
    }

    shareToastTimerRef.current = setTimeout(() => {
      setShareToastMessage(null);
      shareToastTimerRef.current = null;
    }, 1600);
  }

  function handleLogin() {
    window.location.href = `${apiBaseUrl}/auth/kakao`;
  }

  async function handleLogout() {
    try {
      await logoutAuth();
    } finally {
      clearStoredRoomMembers();
      setCurrentMember(null);
      setCurrentMatch(null);
      setWinnerId(null);
      setGameNotice(null);
      setActiveRoundSize(null);
      resetChatMessages();
      setSelectedItemId(null);
      setVoteStamps([]);
      setPlayers([]);
      setRoomMode("multi");
      setLoggedOut();
    }
  }

  if (isRestoringRoom) {
    return <RoomRestoreLoading />;
  }

  return (
    <main
      className={homeStyles.shell}
    >
      <div
        className="min-h-screen w-full"
      >
        <HomeHeader
          authUser={authUser}
          onBack={activeView === "home" ? undefined : handleBackToHome}
          title={titleByView[activeView]}
          compact={activeView === "play" || activeView === "lobby" || (activeView === "result" && Boolean(matchReveal))}
          onHome={handleBackToHome}
          onCreate={handleCreateClick}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onShare={handleShareHomeUrl}
        />

        {activeView === "home" && (
          <HomeView
            games={games}
            hasBackendError={hasGamesError}
            isLoading={isGamesPlaceholder && isGamesFetching}
            onJoin={handleGameJoin}
            onRanking={(id) => {
              router.push(`/ranking/${id}`);
            }}
            onStart={handleGameStart}
          />
        )}
        {activeView === "create" && (
          <CreateView
            authUser={authUser}
            onComplete={handleCreateComplete}
            onLogin={handleLogin}
          />
        )}
        {activeView === "profile" && (
          <ProfileView
            game={selectedGame}
            mode={roomMode}
            onComplete={handleProfileComplete}
          />
        )}
        {activeView === "lobby" && (
          <LobbyView
            currentMemberId={currentMember?.memberId ?? null}
            game={selectedGame}
            roomCode={roomCode ?? initialRoomCode ?? "-----"}
            isCurrentHost={isCurrentHost}
            isStarting={isStarting}
            messages={chatMessages}
            notice={gameNotice}
            onSendChat={handleSendChat}
            onStart={handleStartGame}
          />
        )}
        {(activeView === "play" || (activeView === "result" && matchReveal)) && currentMatch && (
          <PlayView
            isVoting={isVoting || Boolean(matchReveal)}
            revealedWinnerId={matchReveal?.winnerId ?? null}
            activeRoundSize={activeRoundSize ?? getDefaultRoundSize(selectedGame.participants) ?? selectedGame.participants}
            isSoloMode={isSoloMode}
            messages={chatMessages}
            match={matchReveal?.match ?? currentMatch}
            notice={matchReveal ? null : gameNotice}
            onSendChat={isSoloMode ? () => undefined : handleSendChat}
            onVote={handleVote}
            players={players}
            selectedItemId={matchReveal?.winnerId ?? selectedItemId}
            currentMemberId={currentMember?.memberId ?? null}
            tieBreakerMemberId={matchReveal ? null : tieBreakerMemberId}
            tiePhase={tiePhase}
            voteStamps={isSoloMode ? [] : voteStamps}
          />
        )}
        {activeView === "result" && !matchReveal && (
          <ResultView
            actionLabel={isSoloMode ? "홈으로" : "로비로"}
            match={currentMatch}
            winnerId={winnerId}
            onBackToLobby={isSoloMode ? handleBackToHome : () => setView("lobby")}
          />
        )}
        {activeView === "ranking" && (
          <RankingView
            authUser={authUser}
            game={selectedGame}
            onJoin={() => handleGameJoin(selectedGame.id)}
          />
        )}

        {activeView !== "play" && activeView !== "lobby" && !(activeView === "result" && matchReveal) && (
          <LegalFooter onOpenLegalDocument={setOpenLegalDocument} />
        )}

        {showLoginRequiredModal && (
          <LoginRequiredModal
            onCancel={() => setShowLoginRequiredModal(false)}
            onConfirm={handleLogin}
          />
        )}

        {soloSetupGame && (
          <SoloStartModal
            key={soloSetupGame.id}
            errorMessage={soloSetupError}
            game={soloSetupGame}
            isStarting={isStarting}
            onCancel={() => {
              setSoloSetupGameId(null);
              setSoloSetupError(null);
              setIsStarting(false);
              if (roomMode === "solo") {
                setRoomMode("multi");
              }
            }}
            onStart={handleSoloStart}
          />
        )}

        {openLegalDocument && (
          <LegalModal
            document={legalDocuments[openLegalDocument]}
            onClose={() => setOpenLegalDocument(null)}
          />
        )}

        {shareToastMessage && <AppToast message={shareToastMessage} />}
      </div>
    </main>
  );
}

function RoomRestoreLoading() {
  return (
    <main className="min-h-screen bg-[#f1f6f9] text-[#25343e]">
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[#f1f6f9] px-4 py-10 md:max-w-none">
        <div className="w-full max-w-[360px] rounded-[18px] border border-[#e2e9ed] bg-white px-5 py-6 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a]">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-[21px] font-semibold leading-[1.19] tracking-[0.231px]">
            게임으로 돌아가는 중
          </h1>
        </div>
      </section>
    </main>
  );
}

function SoloStartModal({
  errorMessage,
  game,
  isStarting,
  onCancel,
  onStart,
}: {
  errorMessage: string | null;
  game: typeof mockGames[number];
  isStarting: boolean;
  onCancel: () => void;
  onStart: (roundSize?: number) => void;
}) {
  const roundOptions = [8, 16, 32, 64, 128].filter((roundSize) => roundSize <= game.participants);
  const defaultRoundSize = getDefaultRoundSize(game.participants);
  const [selectedRoundSize, setSelectedRoundSize] = useState<number | undefined>(defaultRoundSize);

  const startLabel = selectedRoundSize ? `${selectedRoundSize}강 시작` : "전체 후보로 시작";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/38 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[390px] rounded-[18px] border border-[#e2e9ed] bg-white px-5 py-5 md:max-w-[560px] md:px-7 md:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
              혼자 시작하기
            </p>
            <h2 className="mt-1 line-clamp-2 text-[28px] font-semibold leading-[1.12] tracking-[-0.374px] text-[#25343e] md:text-[34px]">
              {game.title}
            </h2>
          </div>
          <button
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f9] text-[#425563] active:scale-95 disabled:opacity-50"
            type="button"
            aria-label="혼자 시작 닫기"
            disabled={isStarting}
            onClick={onCancel}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-[18px] bg-[#f1f6f9] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold leading-[1.3] tracking-[-0.224px] text-[#25343e]">
                시작 라운드
              </p>
              <p className="mt-1 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#63727c]">
                후보 {game.participants.toLocaleString()}개
              </p>
            </div>
            <Trophy className="size-5 shrink-0 text-[#27729b]" />
          </div>

          {roundOptions.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
              {roundOptions.map((roundSize) => (
                <button
                  key={roundSize}
                  className={`h-11 rounded-xl border text-[15px] tracking-[-0.224px] active:scale-95 ${
                    selectedRoundSize === roundSize
                      ? "border-[#27729b] bg-[#dceef7] text-[#245a7a]"
                      : "border-[#dce5eb] bg-white text-[#25343e]"
                  }`}
                  type="button"
                  disabled={isStarting}
                  onClick={() => setSelectedRoundSize(roundSize)}
                >
                  {roundSize}강
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-white px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
              후보가 8개 미만이라 전체 후보로 시작합니다.
            </div>
          )}
        </div>

        {errorMessage && (
          <p className="mt-3 rounded-2xl bg-[#fff8ef] px-4 py-3 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#8a4b00]">
            {errorMessage}
          </p>
        )}

        <button
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#dceef7] text-[17px] tracking-[-0.374px] text-[#245a7a] active:scale-95 disabled:bg-[#afcfe0] md:h-14"
          type="button"
          disabled={isStarting}
          onClick={() => onStart(selectedRoundSize)}
        >
          {isStarting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
          {isStarting ? "시작 중" : startLabel}
        </button>
      </section>
    </div>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a temporary textarea when the Clipboard API is blocked.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const didCopy = document.execCommand("copy");

    if (!didCopy) {
      throw new Error("Copy command failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

function mapRoomMembers(
  members: RoomMemberResponse[],
  currentMemberId: number,
  currentAvatar: string,
): Player[] {
  return members.map((member) => ({
    id: member.id,
    name: member.nickname,
    avatar:
      member.avatar ??
      (member.id === currentMemberId
        ? currentAvatar
        : getAvatarForName(member.nickname)),
    isHost: member.is_host,
  }));
}

function isMatchResponse(update: GameUpdateResponse): update is MatchResponse {
  return "item_a" in update && "item_b" in update;
}

function readSocketError(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "게임 요청을 처리하지 못했습니다.";
}

function createVoteStamp({
  avatar,
  existingStamps,
  matchId,
  memberId,
  name,
  selectItemId,
}: {
  avatar: string;
  existingStamps: VoteStamp[];
  matchId: number;
  memberId: number;
  name: string;
  selectItemId: number;
}): VoteStamp {
  const seed = hashVoteStamp(`${matchId}:${memberId}:${selectItemId}`);
  const sameItemStamps = existingStamps.filter(
    (stamp) => stamp.memberId !== memberId && stamp.selectItemId === selectItemId,
  );
  const { x, y } = findVoteStampPosition(seed, sameItemStamps);
  const rotate = (seedToUnit(seed * 31) - 0.5) * 18;
  const scale = 0.94 + seedToUnit(seed * 47) * 0.12;

  return {
    avatar,
    memberId,
    name,
    rotate,
    scale,
    selectItemId,
    x,
    y,
  };
}

function findVoteStampPosition(seed: number, existingStamps: VoteStamp[]) {
  const positions = Array.from({ length: 16 }, (_, index) =>
    createVoteStampPosition(seed + index * 101),
  );

  if (existingStamps.length === 0) {
    return positions[0];
  }

  let bestPosition = positions[0];
  let bestScore = getVoteStampPositionScore(bestPosition, existingStamps);

  for (const position of positions.slice(1)) {
    const score = getVoteStampPositionScore(position, existingStamps);

    if (score > bestScore) {
      bestPosition = position;
      bestScore = score;
    }
  }

  return bestPosition;
}

function createVoteStampPosition(seed: number) {
  return {
    x: 50 + (seedToUnit(seed) - 0.5) * 42,
    y: 50 + (seedToUnit(seed * 17) - 0.5) * 34,
  };
}

function getVoteStampPositionScore(
  position: { x: number; y: number },
  existingStamps: VoteStamp[],
) {
  return Math.min(
    ...existingStamps.map((stamp) => {
      const dx = (position.x - stamp.x) / 22;
      const dy = (position.y - stamp.y) / 18;

      return dx * dx + dy * dy;
    }),
  );
}

function hashVoteStamp(value: string) {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seedToUnit(seed: number) {
  const next = Math.imul(seed ^ (seed >>> 16), 2246822507) >>> 0;

  return next / 4294967295;
}



function LegalFooter({
  onOpenLegalDocument,
}: {
  onOpenLegalDocument: (documentKey: LegalDocumentKey) => void;
}) {
  const legalLinks: Array<{ key: LegalDocumentKey; label: string }> = [
    { key: "terms", label: "이용약관" },
    { key: "privacy", label: "개인정보처리방침" },
    { key: "content", label: "콘텐츠 운영정책" },
    { key: "report", label: "권리침해 신고안내" },
  ];

  return (
    <footer className="border-t border-black/5 bg-[#f1f6f9] px-5 py-8 text-[#425563] md:px-8 md:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10">
          <div>
            <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px]">
              PickOn · 픽온
            </p>
            <p className="mt-2 max-w-[620px] break-keep text-pretty text-[12px] leading-[1.55] tracking-[-0.12px] text-[#63727c]">
              친구와 함께 취향을 고르고, 직접 만든 월드컵을 공유하는 온라인 이상형 월드컵 서비스입니다.
              이용자가 등록한 콘텐츠는 각 권리자의 권리를 존중해야 하며, 신고 접수 시 운영정책에 따라 조치될 수 있습니다.
            </p>
          </div>

          <nav aria-label="약관 및 정책" className="text-left md:pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#666666] md:justify-end">
              {legalLinks.map((link) => (
                <span key={link.key} className="flex items-center gap-x-2">
                  <button
                    className="text-[#555555] underline-offset-4 transition hover:text-[#25343e] hover:underline active:scale-[0.98]"
                    type="button"
                    onClick={() => onOpenLegalDocument(link.key)}
                  >
                    {link.label}
                  </button>
                  {link.key !== "report" && <span className="text-[#c7c7cc]">|</span>}
                </span>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-7 border-t border-black/10 pt-4 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#6d7e89] md:flex md:items-center md:justify-between md:gap-4">
          <p>© 2026 PickOn. All rights reserved.</p>
          <p className="mt-2 md:mt-0">권리침해 문의: aass6863@naver.com</p>
        </div>
      </div>
    </footer>
  );
}

function LegalModal({
  document,
  onClose,
}: {
  document: (typeof legalDocuments)[LegalDocumentKey];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 backdrop-blur-sm md:items-center md:px-6">
      <section
        aria-labelledby="legal-modal-title"
        aria-modal="true"
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[18px] bg-white text-[#25343e] md:max-w-[720px] md:rounded-[18px]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#edf1f4] px-5 py-5 md:px-7">
          <div>
            <p className="text-[12px] leading-none tracking-[-0.12px] text-[#63727c]">
              시행일 {document.effectiveDate}
            </p>
            <h2
              className="mt-2 text-[24px] font-semibold leading-[1.16] tracking-[-0.224px] md:text-[28px]"
              id="legal-modal-title"
            >
              {document.title}
            </h2>
          </div>
          <button
            aria-label="닫기"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1f6f9] text-[#425563] active:scale-95"
            type="button"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-7 md:py-6">
          <div className="grid gap-7">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px]">
                  {section.heading}
                </h3>
                <div className="mt-2 grid gap-2 text-[15px] leading-[1.55] tracking-[-0.224px] text-[#425563]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-[#edf1f4] px-5 py-4 md:px-7">
          <button
            className="h-11 w-full rounded-xl bg-[#dceef7] text-[17px] tracking-[-0.374px] text-[#245a7a] active:scale-95"
            type="button"
            onClick={onClose}
          >
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function LoginRequiredModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-5 backdrop-blur-sm">
      <section
        aria-modal="true"
        className="w-full max-w-[340px] overflow-hidden rounded-[18px] bg-white text-center"
        role="dialog"
      >
        <div className="px-5 pb-5 pt-6">
          <h2 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#25343e]">
            로그인이 필요합니다.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-[#edf1f4] bg-[#edf1f4]">
          <button
            className="h-12 bg-white text-[17px] tracking-[-0.374px] text-[#63727c] active:scale-95"
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="h-12 bg-white text-[17px] font-semibold tracking-[-0.374px] text-[#27729b] active:scale-95"
            type="button"
            onClick={onConfirm}
          >
            로그인
          </button>
        </div>
      </section>
    </div>
  );
}

function AppToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 md:bottom-8">
      <div className="rounded-xl bg-[#25343e] px-5 py-3 text-[14px] leading-none tracking-[-0.224px] text-white">
        {message}
      </div>
    </div>
  );
}






