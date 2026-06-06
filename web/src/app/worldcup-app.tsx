"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  Crown,
  Expand,
  ImagePlus,
  LogOut,
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
  sendChat,
  startGame,
  vote,
  type ChatResponse,
  type GameUpdateResponse,
  type MatchResponse,
  type RoomMemberResponse,
  type WorldcupItemResponse,
} from "@/lib/room-socket";
import {
  apiBaseUrl,
  createWorldcupGame,
  fetchWorldcupGames,
  mockGames,
  queryKeys,
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
const validRoundSizes = [8, 16, 32, 64, 128];

function getAuthProfile(user: AuthUser): Pick<Player, "name" | "avatar"> {
  return {
    name: user.nickname,
    avatar: user.profile_image ?? getAvatarForName(user.nickname),
  };
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
  const [chatMessages, setChatMessages] = useState<ChatResponse[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [voteStamps, setVoteStamps] = useState<VoteStamp[]>([]);
  const nextMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setView("profile");
    }
  }, [initialRoomCode, setView]);

  useEffect(() => {
    return () => {
      if (nextMatchTimerRef.current) {
        clearTimeout(nextMatchTimerRef.current);
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
        setCurrentMatch(update);
        setWinnerId(null);
        setGameNotice(null);
        setSelectedItemId(null);
        setVoteStamps([]);
        setView("play");
        return;
      }

      if ("finished" in update && update.finished) {
        clearNextMatchTimer();
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
        clearNextMatchTimer();
        setCurrentMatch(update.match);
        setSelectedItemId(null);
        setVoteStamps([]);
        setGameNotice("동점입니다. 같은 매치를 다시 투표해주세요.");
        setView("play");
        return;
      }

      if (update.status === "nextMatch") {
        if (!update.vote) {
          clearNextMatchTimer();
          setCurrentMatch(update.match);
          setSelectedItemId(null);
          setVoteStamps([]);
          setGameNotice(null);
          setView("play");
          return;
        }

        addVoteStamp(update.vote);

        if (update.vote.memberId === currentMember?.memberId) {
          setSelectedItemId(update.vote.selectItemId);
        }
        setGameNotice("다음 매치로 넘어갑니다.");

        if (nextMatchTimerRef.current) {
          clearTimeout(nextMatchTimerRef.current);
        }

        nextMatchTimerRef.current = setTimeout(() => {
          setCurrentMatch(update.match);
          setSelectedItemId(null);
          setVoteStamps([]);
          setGameNotice(null);
          setView("play");
          nextMatchTimerRef.current = null;
        }, 1000);
      }
    },
    [addVoteStamp, clearNextMatchTimer, currentMember?.memberId, setView],
  );

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
    setGameNotice(null);
    setVoteStamps([]);
    setSelectedItemId(null);
    setActiveRoundSize(roundSize ?? selectedGame.participants);
    setIsStarting(true);
    startGame(roundSize ? { roundSize } : undefined);
  }

  async function handleVote(selectItemId: number) {
    if (!currentMember) {
      return;
    }

    const previousSelectedItemId = selectedItemId;

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
    }
  }

  function handleBackToHome() {
    clearNextMatchTimer();
    setView("home");
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
    setView("home");

    if (initialRoomCode) {
      router.replace("/");
    }
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

      setCurrentMember(memberContext);
      setChatMessages([]);
      enterLobby(
        result.roomCode ?? result.room.room_code,
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

    setCurrentMember(memberContext);
    setChatMessages([]);
    enterLobby(
      result.roomCode ?? result.room.room_code,
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

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f5f5f7] md:max-w-none">
        <AppChrome
          title={titleByView[view]}
          canGoBack={view !== "home"}
          showBrandBar={view !== "play" && view !== "lobby"}
          authUser={authUser}
          onBack={handleBackToHome}
          onCreate={() => setView("create")}
          onHome={handleBackToHome}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        {view === "home" && (
          <HomeView
            games={games}
            hasBackendError={hasGamesError}
            onJoin={handleGameJoin}
            onRanking={(id) => selectGame(id, "ranking")}
          />
        )}
        {view === "create" && <CreateView onComplete={handleCreateComplete} />}
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
      </div>
    </main>
  );
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
          <button aria-label="공유" className="grid size-8 place-items-center rounded-full text-white/90" type="button">
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
      <div className="flex h-8 min-w-0 items-center rounded-full bg-white/10 pl-2 pr-1 text-white">
        <UserRound className="size-4 shrink-0 text-white/90" />
        <span className="ml-1.5 hidden max-w-[92px] truncate text-xs tracking-[-0.12px] text-white/90 sm:inline">
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
    <article className="overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white md:flex md:min-h-full md:flex-col">
      <div className="bg-[#fafafc] p-3">
        <MediaPreview
          alt={`${game.title} 대표 이미지`}
          className="aspect-[16/10] w-full rounded-lg shadow-[3px_5px_30px_rgba(0,0,0,0.18)] md:aspect-[16/11]"
          src={game.imageUrl}
        />
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-[19px] font-semibold leading-[1.22] tracking-[-0.374px]">
              {game.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
              {game.description}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#f5f5f7] px-2.5 py-1 text-[12px] text-[#333333]">
            {game.rounds}강
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[12px] tracking-[-0.12px] text-[#7a7a7a]">
          <Users className="size-3.5" />
          <span>{game.participants.toLocaleString()} 후보</span>
          <span>·</span>
          <span>{game.updatedAt}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:mt-auto md:pt-5">
          <button
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95"
            type="button"
            onClick={onJoin}
          >
            <Play className="size-4 fill-white" />
            함께하기
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#0066cc] bg-white text-[17px] tracking-[-0.374px] text-[#0066cc] active:scale-95"
            type="button"
            onClick={onRanking}
          >
            <BarChart3 className="size-4" />
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

function CreateView({ onComplete }: { onComplete: () => Promise<void> }) {
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
          thumbnail: uploadedItems[0].image_url,
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
              <div key={item.id} className="rounded-2xl border border-[#eeeeef] p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[14px] tracking-[-0.224px]">후보 {index + 1}</strong>
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
                <input
                  className="mt-3 h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#0066cc] focus:ring-4 focus:ring-[#0066cc]/10"
                  placeholder="후보 이름"
                  value={item.name}
                  onChange={(event) => updateItem(item.id, { name: event.target.value })}
                />
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
                  <input
                    className="block w-full text-[14px] tracking-[-0.224px] text-[#6e6e73]"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      updateItem(item.id, {
                        file,
                        previewUrl: file ? URL.createObjectURL(file) : null,
                      });
                    }}
                  />
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

        <button
          className="h-12 rounded-full bg-[#0066cc] text-[17px] tracking-[-0.374px] text-white active:scale-95 disabled:bg-[#8bbbe8]"
          type="button"
          disabled={!canSubmit || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "만드는 중" : "월드컵 만들기"}
        </button>
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
  isVoting,
  messages,
  match,
  notice,
  onSendChat,
  onVote,
  players,
  selectedItemId,
  voteStamps,
}: {
  activeRoundSize: number;
  isVoting: boolean;
  messages: ChatResponse[];
  match: MatchResponse;
  notice: string | null;
  onSendChat: (message: string) => void;
  onVote: (selectItemId: number) => void;
  players: Player[];
  selectedItemId: number | null;
  voteStamps: VoteStamp[];
}) {
  const roundLabel = getMatchRoundLabel(match, activeRoundSize);
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
        {notice && !isWaitingForOthers && (
          <p className="mt-2 rounded-2xl bg-[#f5f5f7] px-3 py-2 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#0066cc]">
            {notice}
          </p>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-2 items-stretch gap-px bg-black md:min-h-0 md:rounded-[18px] md:border md:border-black md:h-full md:overflow-hidden">
        <VoteCard
          disabled={isVoting}
          item={match.item_a}
          onSelect={() => onVote(match.item_a_id)}
          selected={selectedItemId === match.item_a_id}
          stamps={voteStamps.filter((stamp) => stamp.selectItemId === match.item_a_id)}
        />
        <VoteCard
          disabled={isVoting}
          item={match.item_b}
          onSelect={() => onVote(match.item_b_id)}
          selected={selectedItemId === match.item_b_id}
          stamps={voteStamps.filter((stamp) => stamp.selectItemId === match.item_b_id)}
        />
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
