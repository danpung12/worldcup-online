"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ClipboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Crown,
  Expand,
  ImagePlus,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Play,
  Search,
  Send,
  Share2,
  Shuffle,
  SlidersHorizontal,
  Trophy,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoom,
  joinRoom,
  onChatHistory,
  onChatUpdate,
  onGameUpdate,
  onRoomUpdate,
  onSocketException,
  roomState,
  sendChat,
  startGame,
  vote,
  type ChatResponse,
  type GameUpdateResponse,
  type MatchResponse,
  type RoomMemberResponse,
  type RoomStateResponse,
  type WorldcupItemResponse,
} from "@/lib/room-socket";
import {
  apiBaseUrl,
  createWorldcupItem,
  createWorldcupGame,
  deleteWorldcupGame,
  deleteWorldcupItem,
  fetchMyWorldcupGames,
  fetchWorldcupGameDetail,
  fetchWorldcupGames,
  mockGames,
  queryKeys,
  updateWorldcupItem,
  updateWorldcupGame,
  type BackendWorldcupItem,
  type MyWorldcupGame,
  type WorldcupGame,
  uploadImageFile,
} from "@/lib/worldcup";
import { logoutAuth, type AuthUser } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";
import { type Player, useWorldcupStore } from "@/store/worldcup-store";

type WorldcupAppProps = {
  initialRoomCode?: string;
};
type HomeSortMode = "popular" | "latest";
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
const validRoundSizes = [8, 16, 32, 64, 128];
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
          "Worldcup Online은 이용자가 이상형 월드컵을 만들고, 참여하고, 친구와 함께 실시간으로 즐길 수 있는 콘텐츠 제작·공유 서비스입니다.",
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
          "Worldcup Online은 재미있는 취향 공유를 위한 서비스이며, 타인의 권리와 안전을 해치지 않는 콘텐츠를 지향합니다.",
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

export default function WorldcupApp({ initialRoomCode }: WorldcupAppProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: games = mockGames, isError: hasGamesError } = useQuery({
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
  const setPlayers = useWorldcupStore((state) => state.setPlayers);
  const authUser = useAuthStore((state) => state.user);
  const setLoggedOut = useAuthStore((state) => state.setLoggedOut);
  const [currentMember, setCurrentMember] = useState<{
    avatar: string;
    memberId: number;
  } | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchResponse | null>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [gameNotice, setGameNotice] = useState<string | null>(null);
  const [activeRoundSize, setActiveRoundSize] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isRestoringRoom, setIsRestoringRoom] = useState(Boolean(initialRoomCode));
  const [chatMessages, setChatMessages] = useState<ChatResponse[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [voteStamps, setVoteStamps] = useState<VoteStamp[]>([]);
  const [tieBreakerMemberId, setTieBreakerMemberId] = useState<number | null>(null);
  const [tiePhase, setTiePhase] = useState<TiePhase>("idle");
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [openLegalDocument, setOpenLegalDocument] = useState<LegalDocumentKey | null>(null);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);
  const nextMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tieDecisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentMatchIdRef = useRef<number | null>(null);
  const settledMatchIdRef = useRef<number | null>(null);
  const pendingVoteItemIdRef = useRef<number | null>(null);
  const selectedGame =
    games.find((game) => game.id === selectedGameId) ?? games[0] ?? mockGames[0];
  const currentPlayer = currentMember
    ? players.find((player) => player.id === currentMember.memberId)
    : null;
  const isCurrentHost = currentPlayer?.isHost ?? false;
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
  }, [selectedGameId, view]);

  useEffect(() => {
    if (initialRoomCode) {
      const storedMember = getStoredRoomMember(initialRoomCode);

      if (!storedMember) {
        setIsRestoringRoom(false);
        setView("profile");
      }
    }
  }, [initialRoomCode, setView]);

  useEffect(() => {
    return () => {
      if (nextMatchTimerRef.current) {
        clearTimeout(nextMatchTimerRef.current);
      }
      if (tieDecisionTimerRef.current) {
        clearTimeout(tieDecisionTimerRef.current);
      }
      if (shareToastTimerRef.current) {
        clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const offChatHistory = onChatHistory((chats) => {
      setChatMessages(chats ?? []);
    });
    const offChatUpdate = onChatUpdate((chat) => {
      setChatMessages((current) => [...current, chat].slice(-50));
    });

    return () => {
      offChatHistory();
      offChatUpdate();
    };
  }, []);

  const clearNextMatchTimer = useCallback(() => {
    if (nextMatchTimerRef.current) {
      clearTimeout(nextMatchTimerRef.current);
      nextMatchTimerRef.current = null;
    }
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
    [currentMatch?.id, players],
  );

  const removeVoteStamp = useCallback((memberId: number) => {
    setVoteStamps((current) =>
      current.filter((currentStamp) => currentStamp.memberId !== memberId),
    );
  }, []);

  const applyGameUpdate = useCallback(
    (update: GameUpdateResponse) => {
      setIsStarting(false);
      setIsVoting(false);

      if (isMatchResponse(update)) {
        clearNextMatchTimer();
        resetTieBreaker();
        currentMatchIdRef.current = update.id;
        settledMatchIdRef.current = null;
        setCurrentMatch(update);
        setWinnerId(null);
        setGameNotice(null);
        setSelectedItemId(null);
        setVoteStamps([]);
        setGameNotice(null);
        setView("play");
        return;
      }

      if ("finished" in update && update.finished) {
        clearNextMatchTimer();
        resetTieBreaker();
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

        clearNextMatchTimer();
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
        if (!update.vote) {
          clearNextMatchTimer();
          currentMatchIdRef.current = update.match.id;
          settledMatchIdRef.current = null;
          setCurrentMatch(update.match);
          setSelectedItemId(null);
          setVoteStamps([]);
          setGameNotice(null);
          setView("play");
          return;
        }

        addVoteStamp(update.vote);
        settledMatchIdRef.current = currentMatchIdRef.current;

        if (update.vote.memberId === currentMember?.memberId) {
          setSelectedItemId(update.vote.selectItemId);
        }
        setGameNotice("다음 매치로 넘어갑니다.");

        if (nextMatchTimerRef.current) {
          clearTimeout(nextMatchTimerRef.current);
        }

        nextMatchTimerRef.current = setTimeout(() => {
          currentMatchIdRef.current = update.match.id;
          settledMatchIdRef.current = null;
          setCurrentMatch(update.match);
          setSelectedItemId(null);
          setVoteStamps([]);
          setGameNotice(null);
          setView("play");
          nextMatchTimerRef.current = null;
        }, 1000);
      }
    },
    [
      addVoteStamp,
      clearNextMatchTimer,
      clearTieDecisionTimer,
      currentMember?.memberId,
      resetTieBreaker,
      setView,
    ],
  );

  const applyRoomState = useCallback(
    (state: RoomStateResponse) => {
      const memberContext = {
        avatar: state.member.avatar ?? getAvatarForName(state.member.nickname),
        memberId: state.member.id,
      };

      clearNextMatchTimer();
      resetTieBreaker();
      currentMatchIdRef.current = state.match?.id ?? null;
      settledMatchIdRef.current = null;
      pendingVoteItemIdRef.current = null;
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
      clearNextMatchTimer,
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

    const roomCodeToRestore = initialRoomCode;
    const storedMember = getStoredRoomMember(roomCodeToRestore);

    if (!storedMember) {
      return;
    }

    setIsRestoringRoom(true);
    const memberToRestore = storedMember;
    let isCanceled = false;

    async function restoreRoomState() {
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
  }, [applyRoomState, initialRoomCode, setView]);

  useEffect(() => {
    if (!currentMember) {
      return;
    }

    const offRoomUpdate = onRoomUpdate((room) => {
      setPlayers(
        mapRoomMembers(room.member, currentMember.memberId, currentMember.avatar),
      );
    });
    const offGameUpdate = onGameUpdate((update) => {
      applyGameUpdate(update);
    });
    const offSocketException = onSocketException((error) => {
      setIsStarting(false);
      setIsVoting(false);
      setGameNotice(readSocketError(error));
    });

    return () => {
      offRoomUpdate();
      offGameUpdate();
      offSocketException();
    };
  }, [applyGameUpdate, currentMember, setPlayers]);

  function handleStartGame(roundSize?: number) {
    clearNextMatchTimer();
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
  }

  async function handleVote(selectItemId: number) {
    if (!currentMember) {
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
      (tiePhase !== "decided" || tieBreakerMemberId !== currentMember.memberId)
    ) {
      return;
    }

    const previousSelectedItemId = selectedItemId;

    pendingVoteItemIdRef.current = selectItemId;
    setGameNotice(null);
    setSelectedItemId(selectItemId);
    addVoteStamp({
      memberId: currentMember.memberId,
      selectItemId,
    });

    try {
      applyGameUpdate(await vote(selectItemId));
    } catch {
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
      if (pendingVoteItemIdRef.current === selectItemId) {
        pendingVoteItemIdRef.current = null;
      }
    }
  }

  function handleBackToHome() {
    clearNextMatchTimer();
    resetTieBreaker();
    setView("home");
    currentMatchIdRef.current = null;
    settledMatchIdRef.current = null;
    pendingVoteItemIdRef.current = null;
    setCurrentMatch(null);
    setWinnerId(null);
    setGameNotice(null);
    setActiveRoundSize(null);
    setChatMessages([]);
    setSelectedItemId(null);
    setVoteStamps([]);

    if (initialRoomCode) {
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
      router.replace(`/room/${nextRoomCode}`);
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
    router.replace(`/room/${nextRoomCode}`);
    setChatMessages([]);
    enterLobby(
      nextRoomCode,
      mapRoomMembers(
        result.room.member,
        memberContext.memberId,
        memberContext.avatar,
      ),
    );
  }

  async function handleProfileComplete(profile: Pick<Player, "name" | "avatar">) {
    await enterRoomWithProfile(profile);
  }

  async function handleGameJoin(gameId: number) {
    selectGame(gameId, authUser ? "home" : "profile");

    if (!authUser) {
      return;
    }

    try {
      await enterRoomWithProfile(getAuthProfile(authUser), gameId);
    } catch {
      selectGame(gameId, "profile");
    }
  }

  function handleSendChat(message: string) {
    sendChat(message);
  }

  function handleCreateClick() {
    if (!authUser) {
      setShowLoginRequiredModal(true);
      return;
    }

    setView("create");
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
      setLoggedOut();
    }
  }

  if (isRestoringRoom) {
    return <RoomRestoreLoading />;
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f5f5f7] md:max-w-none">
        <AppChrome
          title={titleByView[view]}
          canGoBack={view !== "home"}
          showBrandBar={view !== "play" && view !== "lobby"}
          authUser={authUser}
          onBack={handleBackToHome}
          onCreate={handleCreateClick}
          onHome={handleBackToHome}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onShare={handleShareHomeUrl}
        />

        {view === "home" && (
          <HomeView
            games={games}
            hasBackendError={hasGamesError}
            onJoin={handleGameJoin}
            onRanking={(id) => selectGame(id, "ranking")}
          />
        )}
        {view === "create" && (
          <CreateView
            authUser={authUser}
            onComplete={handleCreateComplete}
            onLogin={handleLogin}
          />
        )}
        {view === "profile" && <ProfileView game={selectedGame} onComplete={handleProfileComplete} />}
        {view === "lobby" && (
          <LobbyView
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
        {view === "play" && currentMatch && (
          <PlayView
            isVoting={isVoting}
            activeRoundSize={activeRoundSize ?? getDefaultRoundSize(selectedGame.participants) ?? selectedGame.participants}
            messages={chatMessages}
            match={currentMatch}
            notice={gameNotice}
            onSendChat={handleSendChat}
            onVote={handleVote}
            players={players}
            selectedItemId={selectedItemId}
            currentMemberId={currentMember?.memberId ?? null}
            tieBreakerMemberId={tieBreakerMemberId}
            tiePhase={tiePhase}
            voteStamps={voteStamps}
          />
        )}
        {view === "result" && (
          <ResultView
            match={currentMatch}
            winnerId={winnerId}
            onBackToLobby={() => setView("lobby")}
          />
        )}
        {view === "ranking" && <RankingView game={selectedGame} onJoin={() => handleGameJoin(selectedGame.id)} />}

        {view !== "play" && view !== "lobby" && (
          <LegalFooter onOpenLegalDocument={setOpenLegalDocument} />
        )}

        {showLoginRequiredModal && (
          <LoginRequiredModal
            onCancel={() => setShowLoginRequiredModal(false)}
            onConfirm={handleLogin}
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
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <section className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center bg-[#f5f5f7] px-4 py-10 md:max-w-none">
        <div className="w-full max-w-[360px] rounded-[18px] border border-[#e0e0e0] bg-white px-5 py-6 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#0066cc] text-white">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-[21px] font-semibold leading-[1.19] tracking-[0.231px]">
            게임으로 돌아가는 중
          </h1>
          <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#6e6e73]">
            네트워크 연결이 끊겼거나 새로고침된 경우에도 이어서 참여할 수 있도록 현재 상태를 확인하고 있습니다.
          </p>
        </div>
      </section>
    </main>
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

function getYouTubeId(url: string) {
  const match = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);

  return match?.[1] ?? null;
}

function MediaPreview({
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

function ExpandedMedia({
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

function AppChrome({
  title,
  canGoBack,
  showBrandBar = true,
  authUser,
  onBack,
  onCreate,
  onHome,
  onLogin,
  onLogout,
  onShare,
}: {
  title: string;
  canGoBack: boolean;
  showBrandBar?: boolean;
  authUser: AuthUser | null;
  onBack: () => void;
  onCreate: () => void;
  onHome: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onShare: () => void;
}) {
  return (
    <>
      <header className="bg-black text-white">
        <div className="mx-auto flex h-11 w-full max-w-[1180px] items-center justify-between gap-2 px-4 md:px-8">
          <button
            aria-label="뒤로"
            className={`grid size-8 place-items-center rounded-full text-white/90 ${canGoBack ? "" : "invisible"}`}
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 truncate text-center text-xs font-normal tracking-[-0.12px]">{title}</div>
          <AuthControl authUser={authUser} onLogin={onLogin} onLogout={onLogout} />
          <button
            aria-label="공유"
            className="grid size-8 place-items-center rounded-full text-white/90 active:scale-95"
            type="button"
            onClick={onShare}
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </header>
      {showBrandBar && (
        <div className="sticky top-0 z-10 h-[52px] border-b border-black/5 bg-[#f5f5f7]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-full w-full max-w-[1180px] items-center justify-between px-4 md:px-8">
            <button
              className="text-[21px] font-semibold leading-none tracking-[0.231px] active:scale-[0.99]"
              type="button"
              onClick={onHome}
            >
              Worldcup
            </button>
            <button
              className="rounded-full bg-[#0066cc] px-[18px] py-[9px] text-[14px] font-normal tracking-[-0.224px] text-white active:scale-95"
              type="button"
              onClick={onCreate}
            >
              만들기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AuthControl({
  authUser,
  onLogin,
  onLogout,
}: {
  authUser: AuthUser | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (authUser) {
    return (
      <div className="flex h-8 min-w-0 max-w-[132px] items-center rounded-full bg-white/10 pl-2 pr-1 text-white sm:max-w-[170px]">
        <UserRound className="size-4 shrink-0 text-white/90" />
        <span className="ml-1.5 max-w-[64px] truncate text-xs tracking-[-0.12px] text-white/90 sm:max-w-[92px]">
          {authUser.nickname}
        </span>
        <button
          aria-label="로그아웃"
          className="ml-1 grid size-6 shrink-0 place-items-center rounded-full text-white/80 active:scale-95"
          type="button"
          onClick={onLogout}
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      aria-label="카카오 로그인"
      className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#FEE500] px-2.5 text-xs font-semibold text-black/85 shadow-sm ring-1 ring-black/5 active:scale-95 sm:px-3"
      type="button"
      onClick={onLogin}
    >
      <KakaoSymbol className="size-3.5 shrink-0 text-black" />
      <span className="hidden sm:inline">카카오 로그인</span>
      <span className="sm:hidden">로그인</span>
    </button>
  );
}

function KakaoSymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4C6.48 4 2 7.45 2 11.7c0 2.72 1.84 5.12 4.62 6.48l-.72 2.62c-.1.37.32.66.64.45l3.17-2.08c.73.11 1.5.17 2.29.17 5.52 0 10-3.45 10-7.7C22 7.45 17.52 4 12 4Z"
        fill="currentColor"
      />
    </svg>
  );
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
    <footer className="border-t border-black/5 bg-[#f5f5f7] px-5 py-8 text-[#333333] md:px-8 md:py-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10">
          <div>
            <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px]">
              Worldcup Online
            </p>
            <p className="mt-2 max-w-[620px] text-[12px] leading-[1.55] tracking-[-0.12px] text-[#7a7a7a]">
              친구와 함께 취향을 고르고, 직접 만든 월드컵을 공유하는 온라인 이상형 월드컵 서비스입니다.
              이용자가 등록한 콘텐츠는 각 권리자의 권리를 존중해야 하며, 신고 접수 시 운영정책에 따라 조치될 수 있습니다.
            </p>
          </div>

          <nav aria-label="약관 및 정책" className="text-left md:pt-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#666666] md:justify-end">
              {legalLinks.map((link) => (
                <span key={link.key} className="flex items-center gap-x-2">
                  <button
                    className="text-[#555555] underline-offset-4 transition hover:text-[#1d1d1f] hover:underline active:scale-[0.98]"
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

        <div className="mt-7 border-t border-black/10 pt-4 text-[12px] leading-[1.45] tracking-[-0.12px] text-[#8a8a8e] md:flex md:items-center md:justify-between md:gap-4">
          <p>© 2026 Worldcup Online. All rights reserved.</p>
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
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-[18px] bg-white text-[#1d1d1f] md:max-w-[720px] md:rounded-[18px]"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#f0f0f0] px-5 py-5 md:px-7">
          <div>
            <p className="text-[12px] leading-none tracking-[-0.12px] text-[#7a7a7a]">
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
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#333333] active:scale-95"
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
                <div className="mt-2 grid gap-2 text-[15px] leading-[1.55] tracking-[-0.224px] text-[#333333]">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-[#f0f0f0] px-5 py-4 md:px-7">
          <button
            className="h-11 w-full rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95"
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
          <h2 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]">
            로그인이 필요합니다.
          </h2>
          <p className="mt-2 text-[15px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
            로그인 하시겠습니까?
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-[#f0f0f0] bg-[#f0f0f0]">
          <button
            className="h-12 bg-white text-[17px] tracking-[-0.374px] text-[#7a7a7a] active:scale-95"
            type="button"
            onClick={onCancel}
          >
            아니요
          </button>
          <button
            className="h-12 bg-white text-[17px] font-semibold tracking-[-0.374px] text-[#0066cc] active:scale-95"
            type="button"
            onClick={onConfirm}
          >
            예
          </button>
        </div>
      </section>
    </div>
  );
}

function AppToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 md:bottom-8">
      <div className="rounded-full bg-[#1d1d1f] px-5 py-3 text-[14px] leading-none tracking-[-0.224px] text-white">
        {message}
      </div>
    </div>
  );
}

function HomeView({
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

type DraftItem = {
  file: File | null;
  id: number;
  name: string;
  previewUrl: string | null;
};

function createDraftItem(index: number): DraftItem {
  return {
    file: null,
    id: Date.now() + index,
    name: "",
    previewUrl: null,
  };
}

const appleUtilityCardClass =
  "rounded-[18px] border border-[#e0e0e0] bg-white p-4 md:p-6";
const appleImageClass =
  "overflow-hidden rounded-lg bg-[#fafafc] shadow-[2px_4px_18px_rgba(0,0,0,0.18)] md:shadow-[3px_5px_30px_rgba(0,0,0,0.22)]";
const applePrimaryPillClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#0066cc] px-4 text-[14px] font-normal tracking-[-0.224px] text-white active:scale-95 disabled:bg-[#8bbbe8] md:h-11 md:gap-2 md:px-[22px] md:text-[17px] md:tracking-[-0.374px]";
const appleSecondaryPillClass =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#0066cc] bg-white px-4 text-[14px] font-normal tracking-[-0.224px] text-[#0066cc] active:scale-95 disabled:text-[#8bbbe8] md:h-11 md:gap-2 md:px-[22px] md:text-[17px] md:tracking-[-0.374px]";
const applePearlButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[11px] border border-[#d2d2d7] bg-[#f5f5f7] px-3 text-[13px] tracking-[-0.12px] text-[#333333] active:scale-95 disabled:text-[#c7c7cc] md:h-10 md:px-3.5 md:text-[14px] md:tracking-[-0.224px]";
const appleFileButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[11px] border border-[#d2d2d7] bg-white px-3 text-[13px] tracking-[-0.12px] text-[#333333] active:scale-95 md:h-10 md:px-3.5 md:text-[14px] md:tracking-[-0.224px]";
const myWorldcupActionButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border bg-white px-3 text-[13px] tracking-[-0.12px] active:scale-95 disabled:text-[#c7c7cc] md:h-8 md:px-3";
const appleInputClass =
  "h-10 w-full rounded-full border border-black/10 bg-white px-4 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0066cc]/10 md:h-11 md:text-[17px] md:tracking-[-0.374px]";
const appleTextAreaClass =
  "min-h-20 w-full resize-none rounded-[18px] border border-black/10 bg-white px-4 py-3 text-[15px] leading-[1.45] tracking-[-0.224px] outline-none transition focus:border-[#0071e3] focus:ring-4 focus:ring-[#0066cc]/10 md:min-h-24 md:text-[17px] md:leading-[1.47] md:tracking-[-0.374px]";

function getPastedImageFile(event: ClipboardEvent<HTMLElement>) {
  return Array.from(event.clipboardData.files).find((file) =>
    file.type.startsWith("image/"),
  );
}

function CreateView({
  authUser,
  onComplete,
  onLogin,
}: {
  authUser: AuthUser | null;
  onComplete: () => Promise<void>;
  onLogin: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"detail" | "list" | "new">("list");
  const [selectedMyGameId, setSelectedMyGameId] = useState<number | null>(null);
  const {
    data: myGames = [],
    isError,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.myGames,
    queryFn: fetchMyWorldcupGames,
    enabled: Boolean(authUser),
    retry: false,
    staleTime: 30_000,
  });

  async function refreshMyGames() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.myGames });
    await queryClient.invalidateQueries({ queryKey: queryKeys.games });
  }

  if (!authUser) {
    return (
      <section className="pb-8">
        <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-12 md:pt-14">
          <div className="mx-auto max-w-[760px] md:text-center">
            <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
              내 월드컵 관리
            </p>
            <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
              로그인 후 만들 수 있어요.
            </h1>
            <p className="mt-3 text-[15px] leading-[1.45] tracking-[-0.224px] text-[#6e6e73]">
              만든 월드컵을 한곳에서 보고, 새 월드컵을 추가하고, 제목과 설명을 수정할 수 있습니다.
            </p>
            <button
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 md:w-[280px]"
              type="button"
              onClick={onLogin}
            >
              로그인하기
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "new") {
    return (
      <CreateWorldcupForm
        onCancel={() => setMode("list")}
        onComplete={async () => {
          await onComplete();
          setMode("list");
        }}
      />
    );
  }

  if (mode === "detail" && selectedMyGameId) {
    return (
      <WorldcupDetailEditor
        gameId={selectedMyGameId}
        onBack={() => setMode("list")}
        onChanged={refreshMyGames}
      />
    );
  }

  return (
    <section className="pb-8">
      <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-[960px]">
          <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
            내 월드컵 관리
          </p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
              만든 월드컵
            </h1>
            <button
              aria-label="월드컵 만들기"
              className="hidden size-12 shrink-0 place-items-center rounded-full bg-[#0066cc] text-white active:scale-95 md:grid"
              type="button"
              onClick={() => setMode("new")}
            >
              <Plus className="size-5" />
            </button>
          </div>
          <p className="mt-3 text-[15px] leading-[1.45] tracking-[-0.224px] text-[#6e6e73]">
            {authUser.nickname}님이 만든 월드컵을 한눈에 보고 관리할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[960px] gap-4 px-4 py-4 md:gap-5 md:px-8 md:py-8">
        <button
          className={`${appleUtilityCardClass} flex min-h-[104px] items-center gap-4 text-left active:scale-[0.99] md:min-h-[132px] md:gap-5`}
          type="button"
          onClick={() => setMode("new")}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0066cc] text-white md:size-14">
            <Plus className="size-5" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] text-[#1d1d1f] md:text-[21px] md:leading-[1.19] md:tracking-[0.231px]">
              새 월드컵 만들기
            </strong>
            <span className="mt-1.5 block text-[15px] leading-[1.45] tracking-[-0.224px] text-[#7a7a7a] md:mt-2 md:text-[17px] md:leading-[1.47] md:tracking-[-0.374px]">
              후보 이미지를 올리고 바로 목록에 추가합니다.
            </span>
          </span>
        </button>

        {isLoading && (
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-8 text-center text-[15px] tracking-[-0.224px] text-[#7a7a7a]">
            내 월드컵을 불러오는 중입니다.
          </div>
        )}

        {isError && (
          <div className="rounded-[18px] border border-[#ffd4a3] bg-[#fff8ef] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#8a4b00]">
            내 월드컵 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {!isLoading && !isError && myGames.length === 0 && (
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-5 py-8 text-center">
            <Trophy className="mx-auto size-8 text-[#0066cc]" />
            <strong className="mt-3 block text-[21px] font-semibold tracking-[0.231px]">
              아직 만든 월드컵이 없습니다.
            </strong>
            <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
              첫 월드컵을 만들면 이곳에서 수정하고 삭제할 수 있습니다.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {myGames.map((game) => (
            <MyWorldcupCard
              key={game.id}
              game={game}
              onChanged={refreshMyGames}
              onEdit={() => {
                setSelectedMyGameId(game.id);
                setMode("detail");
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MyWorldcupCard({
  game,
  onChanged,
  onEdit,
}: {
  game: MyWorldcupGame;
  onChanged: () => Promise<void>;
  onEdit: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) {
      setErrorMessage("제목을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateWorldcupGame(game.id, {
        description: description.trim() || undefined,
        title: title.trim(),
      });
      await onChanged();
      setIsEditing(false);
    } catch {
      setErrorMessage("수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteWorldcupGame(game.id);
      await onChanged();
      setShowDeleteConfirm(false);
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  return (
    <article className={`${appleUtilityCardClass} flex flex-col gap-3 md:gap-3 md:p-4`}>
      <div className="grid grid-cols-[104px_1fr] gap-4 md:grid-cols-[120px_1fr] md:gap-4">
        <div className={`${appleImageClass} grid size-[104px] place-items-center md:size-[120px]`}>
          {game.thumbnail ? (
            <Image
              alt={`${game.title} 썸네일`}
              className="size-full object-cover"
              height={144}
              src={game.thumbnail}
              unoptimized
              width={144}
            />
          ) : (
            <Trophy className="size-7 text-[#7a7a7a] md:size-9" />
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center md:justify-start md:py-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-[15px] tracking-[-0.224px] outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="min-h-20 w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-[14px] leading-[1.43] tracking-[-0.224px] outline-none focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          ) : (
            <>
              <h2 className="line-clamp-2 text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] text-[#1d1d1f] md:text-[20px] md:leading-[1.2] md:tracking-[-0.12px]">
                {game.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a] md:text-[15px] md:leading-[1.45]">
                {game.description || "설명이 없습니다."}
              </p>
              <p className="mt-2 text-[12px] tracking-[-0.12px] text-[#7a7a7a]">
                최근 수정 {formatMyWorldcupDate(game.updated_at)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={`${myWorldcupActionButtonClass} border-[#b9d8f7] text-[#0066cc]`}
                  type="button"
                  onClick={onEdit}
                >
                  <Pencil className="size-4" />
                  수정
                </button>
                <button
                  className={`${myWorldcupActionButtonClass} border-[#f0d2d2] text-[#d92d20]`}
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="size-4" />
                  {isDeleting ? "삭제 중" : "삭제"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="mx-3 mb-2 rounded-xl bg-[#fff1f0] px-3 py-2 text-[13px] tracking-[-0.12px] text-[#b42318]">
          {errorMessage}
        </p>
      )}

      {isEditing && (
        <div className="flex flex-wrap gap-2 md:pl-[136px]">
          <button
            className="inline-flex h-11 items-center justify-center gap-1.5 bg-white text-[14px] tracking-[-0.224px] text-[#7a7a7a] active:scale-95"
            type="button"
            onClick={() => {
              setIsEditing(false);
              setTitle(game.title);
              setDescription(game.description ?? "");
              setErrorMessage(null);
            }}
          >
            <X className="size-4" />
            취소
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-1.5 bg-white text-[14px] tracking-[-0.224px] text-[#0066cc] active:scale-95 disabled:text-[#8bbbe8]"
            type="button"
            disabled={isSaving}
            onClick={handleSave}
          >
            <Check className="size-4" />
            {isSaving ? "저장 중" : "저장"}
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <DeleteWorldcupModal
          gameTitle={game.title}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setShowDeleteConfirm(false);
            }
          }}
          onConfirm={handleDelete}
        />
      )}
    </article>
  );
}

function WorldcupDetailEditor({
  gameId,
  onBack,
  onChanged,
}: {
  gameId: number;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const {
    data: game,
    isError,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.gameDetail(gameId),
    queryFn: () => fetchWorldcupGameDetail(gameId),
    retry: false,
    staleTime: 10_000,
  });
  const [gameDraft, setGameDraft] = useState<{
    description: string;
    gameId: number;
    title: string;
  } | null>(null);
  const [isSavingGame, setIsSavingGame] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const title = gameDraft?.gameId === gameId ? gameDraft.title : (game?.title ?? "");
  const description =
    gameDraft?.gameId === gameId ? gameDraft.description : (game?.description ?? "");

  function updateGameDraft(
    patch: Partial<Omit<NonNullable<typeof gameDraft>, "gameId">>,
  ) {
    setGameDraft({
      description,
      gameId,
      title,
      ...patch,
    });
  }

  async function refreshDetail() {
    await Promise.all([
      onChanged(),
      queryClient.invalidateQueries({ queryKey: queryKeys.gameDetail(gameId) }),
    ]);
  }

  async function handleSaveGame() {
    if (!title.trim()) {
      setErrorMessage("제목을 입력해주세요.");
      return;
    }

    setIsSavingGame(true);
    setErrorMessage(null);

    try {
      await updateWorldcupGame(gameId, {
        description: description.trim() || undefined,
        title: title.trim(),
      });
      await refreshDetail();
    } catch {
      setErrorMessage("월드컵 정보를 저장하지 못했습니다.");
    } finally {
      setIsSavingGame(false);
    }
  }

  async function handleSaveItem(
    item: BackendWorldcupItem,
    input: { image_url: string; name: string },
  ) {
    await updateWorldcupItem(item.id, input);
    await refreshDetail();
  }

  async function handleDeleteItem(itemId: number) {
    await deleteWorldcupItem(itemId);
    await refreshDetail();
  }

  async function handleAddItem(input: { image_url: string; name: string }) {
    await createWorldcupItem(gameId, input);
    await refreshDetail();
  }

  return (
    <section className="pb-8">
      <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-[960px]">
          <button
            className={applePearlButtonClass}
            type="button"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            목록
          </button>
          <h1 className="mt-5 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
            월드컵 수정하기
          </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-[960px] gap-4 px-4 py-4 md:gap-5 md:px-8 md:py-8">
        {isLoading && (
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-8 text-center text-[15px] tracking-[-0.224px] text-[#7a7a7a]">
            상세 정보를 불러오는 중입니다.
          </div>
        )}

        {isError && (
          <div className="rounded-[18px] border border-[#ffd4a3] bg-[#fff8ef] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#8a4b00]">
            상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}

        {game && (
          <>
            <div className={appleUtilityCardClass}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end md:gap-5">
                <label className="block">
                  <span className="text-[13px] tracking-[-0.12px] text-[#6e6e73]">제목</span>
                  <input
                    className={`mt-2 ${appleInputClass}`}
                    value={title}
                    onChange={(event) => updateGameDraft({ title: event.target.value })}
                  />
                </label>
                <button
                  className={`w-full md:w-auto ${applePrimaryPillClass}`}
                  type="button"
                  disabled={isSavingGame}
                  onClick={handleSaveGame}
                >
                  <Check className="size-4" />
                  {isSavingGame ? "저장 중" : "정보 저장"}
                </button>
              </div>
              <label className="mt-4 block">
                <span className="text-[13px] tracking-[-0.12px] text-[#6e6e73]">설명</span>
                <textarea
                  className={`mt-2 ${appleTextAreaClass}`}
                  value={description}
                  onChange={(event) =>
                    updateGameDraft({ description: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={appleUtilityCardClass}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-[21px] font-semibold tracking-[0.231px]">후보</h2>
                  <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#7a7a7a]">
                    현재 {game.items.length.toLocaleString()}개
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-2 md:gap-5">
                {game.items.map((item) => (
                  <CandidateEditorCard
                    key={`${item.id}-${item.name}-${item.image_url}`}
                    item={item}
                    canDelete={game.items.length > 2}
                    onDelete={() => handleDeleteItem(item.id)}
                    onSave={(input) => handleSaveItem(item, input)}
                  />
                ))}
                <AddCandidateCard onAdd={handleAddItem} />
              </div>
            </div>
          </>
        )}

        {errorMessage && (
          <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#b42318]">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function CandidateEditorCard({
  canDelete,
  item,
  onDelete,
  onSave,
}: {
  canDelete: boolean;
  item: BackendWorldcupItem;
  onDelete: () => Promise<void>;
  onSave: (input: { image_url: string; name: string }) => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateFile(nextFile: File | null) {
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const pastedFile = getPastedImageFile(event);

    if (!pastedFile) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    updateFile(pastedFile);
  }

  async function handleSave() {
    if (!name.trim()) {
      setErrorMessage("후보 이름을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const imageUrl = file ? await uploadImageFile(file) : item.image_url;
      await onSave({ image_url: imageUrl, name: name.trim() });
    } catch {
      setErrorMessage("후보를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await onDelete();
    } catch {
      setErrorMessage("후보를 삭제하지 못했습니다.");
      setIsDeleting(false);
    }
  }

  return (
    <div
      className={`${appleUtilityCardClass} outline-none transition focus-within:border-[#b9b9bf] focus:border-[#b9b9bf]`}
      tabIndex={0}
      onPasteCapture={handlePaste}
    >
      <div className="grid grid-cols-[1fr_40px] items-center gap-2">
        <input
          className={appleInputClass}
          aria-label="후보 이름"
          placeholder="후보 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="grid size-10 place-items-center rounded-full bg-[#fafafc] text-[#b42318] active:scale-95 disabled:text-[#c7c7cc]"
          type="button"
          aria-label="후보 삭제"
          disabled={!canDelete || isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className={`${appleImageClass} grid size-24 place-items-center`}>
          <Image
            alt={`${name || item.name} 후보 이미지`}
            className="size-full object-cover"
            height={80}
            src={previewUrl ?? item.image_url}
            unoptimized
            width={80}
          />
        </div>
        <div className="min-w-0">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
          />
          <button
            className={appleFileButtonClass}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            이미지 선택
          </button>
        </div>
      </div>
      <button
        className={`mt-5 w-full ${appleSecondaryPillClass}`}
        type="button"
        disabled={isSaving}
        onClick={handleSave}
      >
        <Check className="size-4" />
        {isSaving ? "저장 중" : "후보 저장"}
      </button>
      {errorMessage && (
        <p className="mt-2 rounded-xl bg-[#fff1f0] px-3 py-2 text-[13px] tracking-[-0.12px] text-[#b42318]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function AddCandidateCard({
  onAdd,
}: {
  onAdd: (input: { image_url: string; name: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAdd = name.trim().length > 0 && file;

  function updateFile(nextFile: File | null) {
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const pastedFile = getPastedImageFile(event);

    if (!pastedFile) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setErrorMessage(null);
    updateFile(pastedFile);
  }

  async function handleAdd() {
    if (!file || !name.trim()) {
      setErrorMessage("후보 이름과 이미지를 입력해주세요.");
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);

    try {
      await onAdd({
        image_url: await uploadImageFile(file),
        name: name.trim(),
      });
      setName("");
      updateFile(null);
    } catch {
      setErrorMessage("후보를 추가하지 못했습니다.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div
      className={`${appleUtilityCardClass} border-[#b9d8f7] outline-none transition focus-within:border-[#8abcf0] focus:border-[#8abcf0]`}
      tabIndex={0}
      onPasteCapture={handlePaste}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-[#0066cc] text-white">
          <Plus className="size-4" />
        </span>
        <strong className="text-[14px] tracking-[-0.224px]">후보 추가</strong>
      </div>
      <input
        className={`mt-4 ${appleInputClass}`}
        placeholder="후보 이름"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className={`${appleImageClass} grid size-24 place-items-center`}>
          {previewUrl ? (
            <Image
              alt={`${name || "새 후보"} 미리보기`}
              className="size-full object-cover"
              height={80}
              src={previewUrl}
              unoptimized
              width={80}
            />
          ) : (
            <ImagePlus className="size-5 text-[#7a7a7a]" />
          )}
        </div>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
        />
        <div className="min-w-0">
          <button
            className={appleFileButtonClass}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            이미지 선택
          </button>
        </div>
      </div>
      <button
        className={`mt-5 w-full ${applePrimaryPillClass}`}
        type="button"
        disabled={!canAdd || isAdding}
        onClick={handleAdd}
      >
        <Plus className="size-4" />
        {isAdding ? "추가 중" : "후보 추가"}
      </button>
      {errorMessage && (
        <p className="mt-2 rounded-xl bg-[#fff1f0] px-3 py-2 text-[13px] tracking-[-0.12px] text-[#b42318]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function DeleteWorldcupModal({
  gameTitle,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  gameTitle: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-5 backdrop-blur-sm">
      <section
        aria-labelledby="delete-worldcup-title"
        aria-modal="true"
        className="w-full max-w-[360px] overflow-hidden rounded-[18px] bg-white text-[#1d1d1f]"
        role="dialog"
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#fff1f0] text-[#b42318]">
            <Trash2 className="size-5" />
          </div>
          <h2
            className="mt-4 text-[21px] font-semibold leading-[1.19] tracking-[0.231px]"
            id="delete-worldcup-title"
          >
            이 월드컵을 삭제할까요?
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
            {gameTitle}
          </p>
          <p className="mt-2 text-[13px] leading-[1.45] tracking-[-0.12px] text-[#8a8a8e]">
            삭제한 월드컵은 다시 복구할 수 없습니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-[#f0f0f0] bg-[#f0f0f0]">
          <button
            className="h-12 bg-white text-[17px] tracking-[-0.374px] text-[#7a7a7a] active:scale-95 disabled:text-[#c7c7cc]"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="h-12 bg-white text-[17px] font-semibold tracking-[-0.374px] text-[#b42318] active:scale-95 disabled:text-[#d08a83]"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "삭제 중" : "삭제"}
          </button>
        </div>
      </section>
    </div>
  );
}

function formatMyWorldcupDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "최근";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function CreateWorldcupForm({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>(() =>
    Array.from({ length: 2 }, (_, index) => createDraftItem(index)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit =
    title.trim().length > 0 &&
    items.length >= 2 &&
    items.every((item) => item.name.trim().length > 0 && item.file);

  function updateItem(id: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function updateItemFile(id: number, file: File | null) {
    updateItem(id, {
      file,
      previewUrl: file ? URL.createObjectURL(file) : null,
    });
  }

  function handleItemPaste(id: number, event: ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find((pastedFile) =>
      pastedFile.type.startsWith("image/"),
    );

    if (!file) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    setErrorMessage(null);
    updateItemFile(id, file);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          if (!item.file) {
            throw new Error("후보 이미지를 선택해주세요.");
          }

          return {
            image_url: await uploadImageFile(item.file),
            name: item.name.trim(),
          };
        }),
      );
      await createWorldcupGame({
        game: {
          description: description.trim() || undefined,
          title: title.trim(),
        },
        items: uploadedItems,
      });
      await onComplete();
    } catch {
      setErrorMessage(
        "월드컵 생성에 실패했습니다. 이미지 업로드 설정과 서버 로그를 확인해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="pb-8">
      <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-[960px]">
        <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
          친구와 함께 플레이할
        </p>
        <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
          월드컵을 만들어주세요.
        </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-[960px] gap-3 px-4 py-4 md:gap-5 md:px-8 md:py-6">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-5">
          <label className="block">
            <span className="text-[13px] tracking-[-0.12px] text-[#6e6e73]">제목</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[17px] tracking-[-0.374px] outline-none transition focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
              placeholder="예: 내 최애 간식 월드컵"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-[13px] tracking-[-0.12px] text-[#6e6e73]">설명</span>
            <textarea
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
              placeholder="간단한 소개를 적어주세요"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[21px] font-semibold tracking-[0.231px]">후보</h2>
              <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#7a7a7a]">
                최소 2개 이상 필요합니다.
              </p>
            </div>
            <button
              className="grid size-10 place-items-center rounded-full bg-[#0066cc] text-white active:scale-95"
              type="button"
              aria-label="후보 추가"
              onClick={() => setItems((current) => [...current, createDraftItem(current.length)])}
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#eeeeef] p-3 outline-none transition focus-within:border-[#b9b9bf] focus:border-[#b9b9bf]"
                tabIndex={0}
                onPasteCapture={(event) => handleItemPaste(item.id, event)}
              >
                <div className="grid grid-cols-[1fr_32px] items-center gap-2">
                  <input
                    className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
                    aria-label={`후보 ${index + 1} 이름`}
                    placeholder="후보 이름"
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                  />
                  <button
                    className="grid size-8 place-items-center rounded-full text-[#b42318] disabled:text-[#c7c7cc]"
                    type="button"
                    aria-label="후보 삭제"
                    disabled={items.length <= 2}
                    onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-[82px_1fr] items-center gap-3">
                  <div className="grid size-20 place-items-center overflow-hidden rounded-xl bg-[#f5f5f7]">
                    {item.previewUrl ? (
                      <Image
                        alt={`${item.name || "후보"} 미리보기`}
                        className="size-full object-cover"
                        height={80}
                        src={item.previewUrl}
                        unoptimized
                        width={80}
                      />
                    ) : (
                      <ImagePlus className="size-5 text-[#7a7a7a]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <label className={appleFileButtonClass}>
                      <ImagePlus className="size-4" />
                      이미지 선택
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          updateItemFile(item.id, file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {errorMessage && (
          <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#b42318]">
            {errorMessage}
          </p>
        )}

        <div className="grid grid-cols-[0.9fr_1.4fr] gap-2">
          <button
            className="h-12 rounded-full border border-[#0066cc] bg-white text-[17px] tracking-[-0.374px] text-[#0066cc] active:scale-95"
            type="button"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="h-12 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 disabled:bg-[#8bbbe8]"
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "만드는 중" : "월드컵 만들기"}
          </button>
        </div>
      </div>
    </section>
  );
}

const avatarOptions = [
  {
    name: "고양이",
    image: makeAnimalAvatar({
      accent: "#f2a06b",
      bg: "#e9f3ff",
      ear: "cat",
      face: "#fff4df",
    }),
  },
  {
    name: "토끼",
    image: makeAnimalAvatar({
      accent: "#f5adc4",
      bg: "#f6efff",
      ear: "rabbit",
      face: "#ffffff",
    }),
  },
  {
    name: "곰",
    image: makeAnimalAvatar({
      accent: "#9b7653",
      bg: "#fff3e0",
      ear: "bear",
      face: "#d9b98f",
    }),
  },
  {
    name: "여우",
    image: makeAnimalAvatar({
      accent: "#e87b37",
      bg: "#fff0e8",
      ear: "fox",
      face: "#ffb26f",
    }),
  },
  {
    name: "판다",
    image: makeAnimalAvatar({
      accent: "#30343b",
      bg: "#edf7ee",
      ear: "panda",
      face: "#ffffff",
    }),
  },
];

function makeAnimalAvatar({
  accent,
  bg,
  ear,
  face,
}: {
  accent: string;
  bg: string;
  ear: "bear" | "cat" | "fox" | "panda" | "rabbit";
  face: string;
}) {
  const ears = {
    bear: `<circle cx="31" cy="35" r="12" fill="${accent}"/><circle cx="65" cy="35" r="12" fill="${accent}"/>`,
    cat: `<path d="M28 42 35 20l14 20z" fill="${accent}"/><path d="M68 42 61 20 47 40z" fill="${accent}"/>`,
    fox: `<path d="M27 43 34 17l17 24z" fill="${accent}"/><path d="M69 43 62 17 45 41z" fill="${accent}"/>`,
    panda: `<circle cx="31" cy="34" r="12" fill="${accent}"/><circle cx="65" cy="34" r="12" fill="${accent}"/>`,
    rabbit: `<rect x="29" y="12" width="13" height="34" rx="8" fill="${face}"/><rect x="54" y="12" width="13" height="34" rx="8" fill="${face}"/>`,
  }[ear];
  const eyePatch =
    ear === "panda"
      ? `<ellipse cx="38" cy="50" rx="9" ry="11" fill="${accent}"/><ellipse cx="58" cy="50" rx="9" ry="11" fill="${accent}"/>`
      : "";
  const muzzle =
    ear === "fox"
      ? `<path d="M30 56c8 20 28 20 36 0-8 7-28 7-36 0Z" fill="#fff7ef" opacity=".92"/>`
      : `<ellipse cx="48" cy="60" rx="17" ry="12" fill="#fffaf2" opacity=".82"/>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="${bg}"/>
      ${ears}
      <circle cx="48" cy="52" r="31" fill="${face}"/>
      ${eyePatch}
      <circle cx="38" cy="50" r="3.2" fill="#1d1d1f"/>
      <circle cx="58" cy="50" r="3.2" fill="#1d1d1f"/>
      ${muzzle}
      <path d="M45 58h6l-3 4z" fill="#1d1d1f"/>
      <path d="M39 66c5 4 13 4 18 0" fill="none" stroke="#1d1d1f" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="28" cy="58" r="5" fill="${accent}" opacity=".16"/>
      <circle cx="68" cy="58" r="5" fill="${accent}" opacity=".16"/>
    </svg>
  `)}`;
}

function getAvatarForName(name: string) {
  let hash = 0;

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return avatarOptions[hash % avatarOptions.length].image;
}

const nicknameAdjectives = [
  "용감한",
  "새침한",
  "느긋한",
  "명랑한",
  "차분한",
  "엉뚱한",
  "반짝이는",
  "든든한",
];

const nicknameAnimals = [
  "곰돌이",
  "고양이",
  "토끼",
  "여우",
  "판다",
  "강아지",
  "다람쥐",
  "수달",
];

function getRandomProfilePreset() {
  const adjective =
    nicknameAdjectives[Math.floor(Math.random() * nicknameAdjectives.length)];
  const animal =
    nicknameAnimals[Math.floor(Math.random() * nicknameAnimals.length)];

  return {
    avatarIndex: Math.floor(Math.random() * avatarOptions.length),
    nickname: `${adjective} ${animal}`,
  };
}

function ProfileView({
  game,
  onComplete,
}: {
  game: WorldcupGame;
  onComplete: (profile: Pick<Player, "name" | "avatar">) => Promise<void>;
}) {
  const [profilePreset] = useState(getRandomProfilePreset);
  const [nickname, setNickname] = useState(profilePreset.nickname);
  const [avatarIndex, setAvatarIndex] = useState(profilePreset.avatarIndex);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const avatar = avatarOptions[avatarIndex];

  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onComplete({ name: nickname.trim(), avatar: avatar.image });
    } catch {
      setErrorMessage("백엔드 방 연결에 실패했습니다. 서버 실행과 CORS/소켓 설정을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="pb-8">
      <div className="bg-white px-5 pb-7 pt-8 md:px-8 md:pb-12 md:pt-14">
        <div className="mx-auto max-w-[860px]">
        <p className="text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
          함께 플레이하기 전에
        </p>
        <h1 className="mt-1 text-[34px] font-semibold leading-[1.08] tracking-[-0.374px] md:text-[48px] md:leading-[1.08]">
          프로필을 정해주세요.
        </h1>
        <p className="mt-3 text-[15px] leading-[1.45] tracking-[-0.224px] text-[#6e6e73]">
          {game.title}
        </p>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-4 md:px-8 md:py-8">
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-5 md:grid md:min-h-[340px] md:grid-cols-[280px_1fr] md:items-center md:gap-10 md:px-10 md:py-10">
          <div className="flex flex-col items-center md:justify-center">
            <button
              className="grid size-24 place-items-center overflow-hidden rounded-full border border-black/10 bg-white md:size-32"
              type="button"
              aria-label={`${avatar.name} 아바타 변경`}
              onClick={() => setAvatarIndex((index) => (index + 1) % avatarOptions.length)}
            >
              <Image
                alt={`${avatar.name} 아바타`}
                className="size-24 md:size-32"
                height={128}
                src={avatar.image}
                unoptimized
                width={128}
              />
            </button>
            <button
              className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f5f5f7] px-4 text-[14px] tracking-[-0.224px] text-[#0066cc] active:scale-95 md:mt-4 md:h-10 md:px-5 md:text-[15px]"
              type="button"
              onClick={() => setAvatarIndex((index) => (index + 1) % avatarOptions.length)}
            >
              <Shuffle className="size-3.5" />
              아바타 바꾸기
            </button>
          </div>

          <div className="md:py-4">
          <label className="mt-6 block md:mt-0">
            <span className="text-[13px] tracking-[-0.12px] text-[#6e6e73]">닉네임</span>
            <input
              className="mt-2 h-12 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-[17px] tracking-[-0.374px] outline-none transition focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10 md:h-14"
              maxLength={12}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>

          <button
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 disabled:bg-[#8bbbe8] md:mt-6 md:h-14"
            type="button"
            disabled={nickname.trim().length === 0 || isSubmitting}
            onClick={handleSubmit}
          >
            <Check className="size-4" />
            {isSubmitting ? "입장 중" : "설정 완료"}
          </button>
          {errorMessage && (
            <p className="mt-3 text-center text-[13px] leading-[1.4] tracking-[-0.12px] text-[#b42318]">
              {errorMessage}
            </p>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getRoundSizeOptions(candidateCount: number) {
  return validRoundSizes.filter((size) => size <= candidateCount);
}

function getDefaultRoundSize(candidateCount: number) {
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

function LobbyView({
  game,
  isCurrentHost,
  isStarting,
  messages,
  notice,
  onSendChat,
  onStart,
  roomCode,
}: {
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
          <ChatPanel messages={messages} onSend={onSendChat} players={players} />
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

function PlayView({
  activeRoundSize,
  currentMemberId,
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
    <section className="flex h-[calc(100dvh-44px)] flex-col overflow-hidden pb-3 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-[auto_minmax(0,1fr)] md:gap-4 md:p-4">
      <div className="bg-white px-4 pb-3 pt-4 md:col-span-2 md:rounded-[18px] md:border md:border-[#e0e0e0] md:px-5 md:py-4">
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

      <div className="relative grid shrink-0 grid-cols-2 items-stretch gap-px bg-black md:min-h-0 md:rounded-[18px] md:border md:border-black md:h-full md:overflow-hidden">
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

      <div className="min-h-0 flex-1 px-3 pt-3 md:px-0 md:pt-0">
        <ChatPanel messages={messages} onSend={onSendChat} players={players} />
      </div>
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
  messages,
  onSend,
  players,
}: {
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
          const player = players.find((currentPlayer) => currentPlayer.id === group.memberId);
          const lastMessage = group.messages.at(-1);

          return (
            <div
              key={`${group.memberId}-${group.messages[0]?.createdAt ?? groupIndex}`}
              className="mt-3 flex items-start gap-2 first:mt-0 md:gap-3"
            >
              <Image
                alt={`${player?.name ?? "참가자"} 아바타`}
                className="size-8 shrink-0 rounded-full border border-[#e0e0e0] bg-white md:size-10"
                height={40}
                src={player?.avatar ?? getAvatarForName(String(group.memberId))}
                unoptimized
                width={40}
              />
              <div className="flex min-w-0 max-w-[78%] flex-col items-start md:max-w-[82%]">
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
                <div className="flex max-w-full flex-col items-start gap-1">
                  {group.messages.map((chat, messageIndex) => {
                    const isFirstInGroup = messageIndex === 0;
                    const isLastInGroup = messageIndex === group.messages.length - 1;

                    return (
                      <p
                        key={`${chat.memberId}-${chat.createdAt}-${messageIndex}`}
                        className={`w-fit max-w-full break-words border border-[#f0f0f0] bg-white px-3 py-2 text-[15px] font-normal leading-[1.47] tracking-[-0.374px] text-[#1d1d1f] shadow-sm md:px-4 md:py-2.5 md:text-[16px] ${
                          isFirstInGroup ? "rounded-tl-[18px]" : "rounded-tl-[8px]"
                        } ${isLastInGroup ? "rounded-bl-[18px]" : "rounded-bl-[8px]"} rounded-r-[18px]`}
                      >
                        {chat.message}
                      </p>
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

function ResultView({
  match,
  onBackToLobby,
  winnerId,
}: {
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
          로비로
        </button>
      </div>
    </section>
  );
}

function RankingView({ game, onJoin }: { game: WorldcupGame; onJoin: () => void }) {
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
