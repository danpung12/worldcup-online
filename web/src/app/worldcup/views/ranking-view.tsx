"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Expand, Loader2, MessageCircle, Play, Send, Trash2 } from "lucide-react";
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

export function RankingView({
  authUser,
  game,
  onJoin,
}: {
  authUser: AuthUser | null;
  game: WorldcupGame;
  onJoin: () => void;
}) {
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

          <CommentSection
            key={`${game.id}:${authUser?.id ?? "guest"}:${authUser?.nickname ?? "익명"}`}
            authUser={authUser}
            gameId={game.id}
          />
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

function CommentSection({
  authUser,
  gameId,
}: {
  authUser: AuthUser | null;
  gameId: number;
}) {
  const queryClient = useQueryClient();
  const defaultNickname = useMemo(() => authUser?.nickname ?? "익명", [authUser?.nickname]);
  const [nickname, setNickname] = useState(defaultNickname);
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: comments = [], isError, isLoading } = useQuery({
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
      setErrorMessage("댓글을 저장하지 못했습니다.");
    },
    onSuccess: () => {
      setContent("");
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(gameId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteWorldcupComment(commentId),
    onError: () => {
      setErrorMessage("댓글을 삭제하지 못했습니다.");
    },
    onSuccess: () => {
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.comments(gameId) });
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
    <section className="mt-5 overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
      <div className="border-b border-[#f0f0f0] px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#0066cc]">
              <MessageCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-[#1d1d1f]">
                유저 의견
              </h2>
              <p className="mt-0.5 text-[13px] leading-[1.4] tracking-[-0.12px] text-[#7a7a7a]">
                {comments.length.toLocaleString()}개의 댓글
              </p>
            </div>
          </div>
        </div>

        <form className="mt-4 grid gap-2" onSubmit={handleSubmit}>
          <label className="flex h-11 items-center gap-2 rounded-full border border-[#d2d2d7] bg-white px-4 focus-within:border-[#0066cc]">
            <span className="shrink-0 text-[12px] font-semibold leading-none tracking-[-0.12px] text-[#8a8a8e]">
              닉네임
            </span>
            <input
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold tracking-[-0.224px] text-[#1d1d1f] outline-none placeholder:text-[#8a8a8e]"
              maxLength={20}
              placeholder="익명"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>
          <div className="rounded-[18px] border border-[#d2d2d7] bg-white focus-within:border-[#0066cc]">
            <textarea
              className="min-h-[92px] w-full resize-none rounded-[18px] bg-white px-4 py-3 text-[15px] leading-[1.5] tracking-[-0.224px] text-[#1d1d1f] outline-none placeholder:text-[#8a8a8e]"
              maxLength={300}
              placeholder="한마디 남기기"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <div className="flex items-center justify-between gap-3 border-t border-[#f0f0f0] px-4 pb-3 pt-2">
              <span className="text-[12px] leading-none tracking-[-0.12px] text-[#8a8a8e]">
                {content.length}/300
              </span>
            </div>
          </div>
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[15px] font-semibold tracking-[-0.224px] text-white active:scale-95 disabled:bg-[#8bbbe8] md:ml-auto md:w-[132px]"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            저장
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
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-[14px] tracking-[-0.224px] text-[#7a7a7a]">
            <Loader2 className="size-4 animate-spin" />
            댓글 불러오는 중
          </div>
        )}
        {isError && (
          <div className="px-4 py-8 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
            댓글을 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !isError && comments.length === 0 && (
          <div className="px-4 py-8 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#7a7a7a]">
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
    <article className="border-t border-[#f0f0f0] px-4 py-4 md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="max-w-[180px] truncate text-[15px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#1d1d1f]">
              {comment.nickname}
            </strong>
            <time className="text-[12px] leading-none tracking-[-0.12px] text-[#8a8a8e]">
              {formatCommentDate(comment.created_at)}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-[1.55] tracking-[-0.224px] text-[#333333]">
            {comment.content}
          </p>
        </div>
        {canDelete && (
          <button
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-[#7a7a7a] active:scale-95 disabled:opacity-50"
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
