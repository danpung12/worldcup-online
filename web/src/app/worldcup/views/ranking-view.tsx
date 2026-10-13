"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Expand,
  Loader2,
  MessageCircle,
  Play,
  Send,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/auth";
import {
  createWorldcupComment,
  deleteWorldcupComment,
  fetchWorldcupComments,
  queryKeys,
  type WorldcupComment,
  type WorldcupGame,
} from "@/lib/worldcup";
import { ExpandedMedia, MediaPreview } from "./media-preview";
import { PageIntro } from "./pickon-ui";
import ui from "./pickon-ui.module.css";

export function RankingView({
  authUser,
  game,
  onJoin,
}: {
  authUser: AuthUser | null;
  game: WorldcupGame;
  onJoin: () => void;
}) {
  const [expandedRank, setExpandedRank] = useState<
    WorldcupGame["ranking"][number] | null
  >(null);
  const hasNoWins =
    game.ranking.length > 0 && game.ranking.every((rank) => rank.wins === 0);

  return (
    <section className={ui.page}>
      <PageIntro
        label={
          <>
            <BarChart3 size={15} aria-hidden="true" /> 우승 랭킹
          </>
        }
        title={game.title}
        description={
          hasNoWins
            ? undefined
            : "마지막까지 선택받은 후보들을 만나보세요."
        }
      />
      <div className={ui.content}>
        <div className={ui.rankingSummary}>
          <h2 className={ui.sectionLabel}>
            전체 순위 <span>{game.ranking.length}</span>
          </h2>
        </div>
        {hasNoWins && (
          <p className={ui.rankingNotice}>
            <Trophy size={16} aria-hidden="true" />
            아직 우승 기록이 없어요. 게임을 끝내면 우승 횟수가 반영돼요.
          </p>
        )}
        <div className={`${ui.surface} ${ui.rankingList}`}>
          {game.ranking.length === 0 && (
            <p className={ui.empty}>아직 등록된 후보가 없습니다.</p>
          )}
          {game.ranking.map((rank, index) => (
            <button
              key={`${rank.name}-${index}`}
              className={`${ui.rankRow} ${index === 0 && rank.wins > 0 ? ui.rankLeader : ""}`}
              type="button"
              aria-label={`${index + 1}위 ${rank.name}, ${rank.wins}회 우승, 크게 보기`}
              onClick={() => setExpandedRank(rank)}
            >
              <span className={ui.rankNumber}>
                {index === 0 && rank.wins > 0 && <Trophy aria-hidden="true" />}
                {String(index + 1).padStart(2, "0")}
              </span>
              <MediaPreview
                alt={`${rank.name} 랭킹 이미지`}
                className={ui.rankImage}
                src={rank.imageUrl}
              />
              <strong className={ui.rankName} title={rank.name}>
                {rank.name}
              </strong>
              <span className={ui.rankWins}>
                <strong>{rank.wins.toLocaleString()}</strong>
                <span>회 우승</span>
              </span>
              <Expand size={15} className="text-[#71838e]" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className={ui.rankingCta}>
          <button className={ui.primary} type="button" onClick={onJoin}>
            <Play size={15} aria-hidden="true" /> 함께하기
          </button>
        </div>
        <CommentSection
          key={`${game.id}:${authUser?.id ?? "guest"}:${authUser?.nickname ?? "익명"}`}
          authUser={authUser}
          gameId={game.id}
        />
      </div>
      {expandedRank && (
        <RankMediaDialog
          rank={expandedRank}
          onClose={() => setExpandedRank(null)}
        />
      )}
    </section>
  );
}

function RankMediaDialog({
  rank,
  onClose,
}: {
  rank: WorldcupGame["ranking"][number];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={ui.mediaDialog}
      aria-labelledby="rank-media-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={ui.mediaDialogHeader}>
        <h2 id="rank-media-title">{rank.name}</h2>
        <button type="button" onClick={onClose} aria-label="랭킹 이미지 닫기">
          <X size={18} />
        </button>
      </div>
      <ExpandedMedia alt={`${rank.name} 확대 미디어`} src={rank.imageUrl} />
    </dialog>
  );
}

function CommentSection({
  authUser,
  gameId,
}: {
  authUser: AuthUser | null;
  gameId: number;
}) {
  const queryClient = useQueryClient();
  const defaultNickname = useMemo(
    () => authUser?.nickname ?? "익명",
    [authUser?.nickname],
  );
  const [nickname, setNickname] = useState(defaultNickname);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: comments = [],
    isError,
    isLoading,
  } = useQuery({
    queryKey: queryKeys.comments(gameId),
    queryFn: () => fetchWorldcupComments(gameId),
    retry: false,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createWorldcupComment({
        content,
        gameId,
        nickname,
      }),
    onError: () => {
      setErrorMessage("댓글을 등록하지 못했습니다.");
    },
    onSuccess: () => {
      setContent("");
      setErrorMessage(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments(gameId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteWorldcupComment(commentId),
    onError: () => {
      setErrorMessage("댓글을 삭제하지 못했습니다.");
    },
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments(gameId),
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nickname.trim() || !content.trim()) {
      setErrorMessage("닉네임과 댓글을 입력해주세요.");
      return;
    }

    createMutation.mutate();
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[18px] border border-[#e2e9ed] bg-white">
      <div className="border-b border-[#edf1f4] px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f9] text-[#27729b]">
              <MessageCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#25343e]">
                유저 의견
              </h2>
              <p className="mt-0.5 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#63727c]">
                {comments.length.toLocaleString()}개의 댓글
              </p>
            </div>
          </div>
        </div>

        <form className="mt-4 grid gap-2" onSubmit={handleSubmit}>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#dce5eb] bg-white px-4 focus-within:border-[#27729b]">
            <span className="shrink-0 text-[12px] font-semibold leading-none tracking-[-0.12px] text-[#6d7e89]">
              닉네임
            </span>
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold tracking-[-0.224px] text-[#25343e] outline-none placeholder:text-[#6d7e89]"
              maxLength={20}
              placeholder="익명"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>
          <div className="rounded-[18px] border border-[#dce5eb] bg-white focus-within:border-[#27729b]">
            <textarea
              aria-label="댓글 내용"
              className="min-h-[92px] w-full resize-none rounded-[18px] bg-white px-4 py-3 text-[15px] leading-[1.5] tracking-[-0.224px] text-[#25343e] outline-none placeholder:text-[#6d7e89]"
              maxLength={300}
              placeholder="한마디 남기기"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="flex items-center justify-between gap-3 border-t border-[#edf1f4] px-4 pb-3 pt-2">
              <span className="text-[12px] leading-none tracking-[-0.12px] text-[#6d7e89]">
                {content.length}/300
              </span>
            </div>
          </div>
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#dceef7] text-[15px] font-semibold tracking-[-0.224px] text-[#245a7a] active:scale-95 disabled:bg-[#afcfe0] md:ml-auto md:w-[132px]"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {createMutation.isPending ? "등록 중" : "댓글 등록"}
          </button>
          {errorMessage && (
            <p className="mt-2 rounded-2xl bg-[#fff8ef] px-4 py-3 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#8a4b00]">
              {errorMessage}
            </p>
          )}
        </form>
      </div>

      <div>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-[14px] tracking-[-0.224px] text-[#63727c]">
            <Loader2 className="size-4 animate-spin" />
            댓글 불러오는 중
          </div>
        )}
        {isError && (
          <div className="px-4 py-8 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
            댓글을 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !isError && comments.length === 0 && (
          <div className="px-4 py-8 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
            아직 댓글이 없습니다.
          </div>
        )}
        {!isLoading &&
          !isError &&
          comments.map((comment) => (
            <CommentRow
              key={comment.id}
              authUser={authUser}
              comment={comment}
              isDeleting={deleteMutation.isPending}
              onDelete={() => deleteMutation.mutate(comment.id)}
            />
          ))}
      </div>
    </section>
  );
}

function CommentRow({
  authUser,
  comment,
  isDeleting,
  onDelete,
}: {
  authUser: AuthUser | null;
  comment: WorldcupComment;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  const canDelete = Boolean(authUser?.id && comment.user_id === authUser.id);

  return (
    <article className="border-t border-[#edf1f4] px-4 py-4 md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="max-w-[180px] truncate text-[15px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#25343e]">
              {comment.nickname}
            </strong>
            <time className="text-[12px] leading-none tracking-[-0.12px] text-[#6d7e89]">
              {formatCommentDate(comment.created_at)}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-[1.55] tracking-[-0.224px] text-[#425563]">
            {comment.content}
          </p>
        </div>
        {canDelete && (
          <button
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f1f6f9] text-[#63727c] active:scale-95 disabled:opacity-50"
            type="button"
            aria-label="댓글 삭제"
            disabled={isDeleting}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}

function formatCommentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
