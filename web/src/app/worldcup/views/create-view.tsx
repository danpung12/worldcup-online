"use client";

import Image from "next/image";
import {
  type ClipboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Trophy,
  Trash2,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import {
  createWorldcupGame,
  createWorldcupItem,
  deleteWorldcupGame,
  deleteWorldcupItem,
  fetchMyWorldcupGames,
  fetchWorldcupGameDetail,
  queryKeys,
  updateWorldcupGame,
  updateWorldcupItem,
  uploadImageFile,
  type BackendWorldcupItem,
  type MyWorldcupGame,
} from "@/lib/worldcup";

import { PageIntro } from "./pickon-ui";
import ui from "./pickon-ui.module.css";
import {
  readCreateDraft,
  splitDescription,
  writeCreateDraft,
  type SavedCreateDraft,
} from "./create-draft";

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

const surfaceCardClass =
  "rounded-[18px] border border-[#e2e9ed] bg-white p-4 md:p-6";
const previewImageClass =
  "relative overflow-hidden rounded-xl border border-[#e2e9ed] bg-[#f2f6f9]";
const primaryButtonClass = ui.primary;
const secondaryButtonClass = ui.secondary;
const fileButtonClass = ui.editorFileButton;
const myWorldcupActionButtonClass = ui.editorActionButton;
const inputClass =
  "h-10 w-full rounded-xl border border-black/10 bg-white px-4 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:h-11 md:text-[17px] md:tracking-[-0.374px]";
const textAreaClass =
  "min-h-20 w-full resize-none rounded-[18px] border border-black/10 bg-white px-4 py-3 text-[15px] leading-[1.45] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:min-h-24 md:text-[17px] md:leading-[1.47] md:tracking-[-0.374px]";

function getPastedImageFile(event: ClipboardEvent<HTMLElement>) {
  return Array.from(event.clipboardData.files).find((file) =>
    file.type.startsWith("image/"),
  );
}

function useImagePreviews() {
  const urls = useRef(new Set<string>());
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    },
    [],
  );
  return useCallback((file: File | null) => {
    if (!file) return null;
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  }, []);
}

function StatusNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className={ui.editorNotice} role="status">
      <Check size={16} aria-hidden="true" />
      {children}
    </p>
  );
}

export function CreateView({
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
  const [notice, setNotice] = useState<string | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const userId = authUser?.id;
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled || !userId) return;
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(`pickon-editor-view:${userId}`) ?? "null",
        );
        if (saved?.mode === "new") setMode("new");
        else if (saved?.mode === "detail" && Number.isInteger(saved.gameId)) {
          setSelectedMyGameId(saved.gameId);
          setMode("detail");
        } else {
          setSelectedMyGameId(null);
          setMode("list");
        }
      } catch {
        /* Browser storage is optional. */
      }
      setViewReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function openEditor(
    next: "list" | "new" | "detail",
    gameId: number | null = null,
  ) {
    try {
      sessionStorage.setItem(
        `pickon-editor-view:${userId}`,
        JSON.stringify({ mode: next, gameId }),
      );
    } catch {
      /* Keep navigation available. */
    }
    setMode(next);
    setSelectedMyGameId(gameId);
  }
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
      <section className={ui.page}>
        <PageIntro
          title="내 월드컵"
          description="월드컵을 만들려면 로그인이 필요합니다."
        />
        <div className={`${ui.content} text-center`}>
          <button className={ui.primary} type="button" onClick={onLogin}>
            로그인하기
          </button>
        </div>
      </section>
    );
  }

  if (mode === "new") {
    return (
      <CreateWorldcupForm
        key={authUser.id}
        draftKey={`new-worldcup:${authUser.id}`}
        onCancel={() => openEditor("list")}
        onComplete={async () => {
          await onComplete();
          await refreshMyGames();
          setNotice("월드컵을 만들었어요. 목록에서 후보를 관리할 수 있어요.");
          openEditor("list");
        }}
      />
    );
  }

  if (mode === "detail" && selectedMyGameId) {
    return (
      <WorldcupDetailEditor
        key={selectedMyGameId}
        gameId={selectedMyGameId}
        draftKey={`edit-worldcup:${authUser.id}:${selectedMyGameId}`}
        onBack={() => openEditor("list")}
        onChanged={refreshMyGames}
      />
    );
  }

  return (
    <section className={ui.page}>
      <PageIntro title="내 월드컵" />

      <div className={ui.editorBody}>
        {notice && <StatusNotice>{notice}</StatusNotice>}
        <button
          className={ui.newGameCard}
          type="button"
          onClick={() => openEditor("new")}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a] md:size-14">
            <Plus className="size-5" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] text-[#25343e] md:text-[21px] md:leading-[1.19] md:tracking-[0.231px]">
              새 월드컵 만들기
            </strong>
          </span>
        </button>

        {(!viewReady || isLoading) && (
          <div className="rounded-[18px] border border-[#e2e9ed] bg-white px-4 py-8 text-center text-[15px] tracking-[-0.224px] text-[#63727c]">
            내 월드컵을 불러오는 중입니다.
          </div>
        )}

        {isError && (
          <div className="rounded-[18px] border border-[#ffd4a3] bg-[#fff8ef] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#8a4b00]">
            내 월드컵 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {!isLoading && !isError && myGames.length === 0 && (
          <div className="rounded-[18px] border border-[#e2e9ed] bg-white px-5 py-8 text-center">
            <Trophy className="mx-auto size-8 text-[#27729b]" />
            <strong className="mt-3 block text-[21px] font-semibold tracking-[0.231px]">
              아직 만든 월드컵이 없습니다.
            </strong>
            <p className="mt-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
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
                openEditor("detail", game.id);
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
  const { summary, sources } = splitDescription(game.description);

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
    <article
      className={`${surfaceCardClass} flex flex-col gap-3 md:gap-3 md:p-4`}
    >
      <div className="grid grid-cols-[104px_1fr] gap-4 md:grid-cols-[120px_1fr] md:gap-4">
        <div
          className={`${previewImageClass} grid size-[104px] place-items-center md:size-[120px]`}
        >
          {game.thumbnail ? (
            <Image
              alt={`${game.title} 썸네일`}
              className="size-full object-cover"
              fill
              sizes="120px"
              src={game.thumbnail}
              unoptimized
            />
          ) : (
            <Trophy className="size-7 text-[#63727c] md:size-9" />
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center md:justify-start md:py-1">
          {isEditing ? (
            <div className="space-y-2">
              <input
                className="h-10 w-full rounded-xl border border-[#dce5eb] bg-white px-3 text-[15px] tracking-[-0.224px] outline-none focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="min-h-20 w-full resize-none rounded-xl border border-[#dce5eb] bg-white px-3 py-2 text-[14px] leading-[1.43] tracking-[-0.224px] outline-none focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          ) : (
            <>
              <h2 className="line-clamp-2 text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] text-[#25343e] md:text-[20px] md:leading-[1.2] md:tracking-[-0.12px]">
                {game.title}
              </h2>
              {summary && (
                <p className="mt-1 line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c] md:text-[15px] md:leading-[1.45]">
                  {summary}
                </p>
              )}
              {sources.length > 0 && (
                <details className={ui.editorSources}>
                  <summary>사진 출처 보기</summary>
                  {sources.map((source, index) => (
                    <a
                      key={source}
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      사진 출처 {index + 1}
                    </a>
                  ))}
                </details>
              )}
              <div className={ui.editorMeta}>
                {game.candidateCount !== undefined && (
                  <span>후보 {game.candidateCount}개</span>
                )}
                <span>플레이 {game.play_count.toLocaleString()}회</span>
              </div>
              <p className="mt-2 text-[12px] tracking-[-0.12px] text-[#63727c]">
                최근 수정 {formatMyWorldcupDate(game.updated_at)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={myWorldcupActionButtonClass}
                  type="button"
                  onClick={onEdit}
                >
                  <Pencil className="size-4" />
                  수정
                </button>
                <button
                  className={myWorldcupActionButtonClass}
                  data-variant="danger"
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
            className="inline-flex h-11 items-center justify-center gap-1.5 bg-white text-[14px] tracking-[-0.224px] text-[#63727c] active:scale-95"
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
            className="inline-flex h-11 items-center justify-center gap-1.5 bg-white text-[14px] tracking-[-0.224px] text-[#27729b] active:scale-95 disabled:text-[#afcfe0]"
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
  draftKey,
}: {
  gameId: number;
  onBack: () => void;
  onChanged: () => Promise<void>;
  draftKey: string;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [dirtyCandidates, setDirtyCandidates] = useState<Set<number>>(
    new Set(),
  );
  const [candidateDrafts, setCandidateDrafts] = useState<
    Map<number, DraftItem>
  >(new Map());
  const [restoredDraft, setRestoredDraft] = useState<{
    title: string;
    description: string;
    items: DraftItem[];
  } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const latestDraft = useRef<SavedCreateDraft | null>(null);
  const createPreview = useImagePreviews();
  const trackDirty = useCallback(
    (id: number, dirty: boolean, draft?: DraftItem) => {
      setDirtyCandidates((current) => {
        if (current.has(id) === dirty) return current;
        const next = new Set(current);
        if (dirty) next.add(id);
        else next.delete(id);
        return next;
      });
      setCandidateDrafts((current) => {
        const previous = current.get(id);
        if (
          dirty &&
          draft &&
          previous?.name === draft.name &&
          previous.file === draft.file
        )
          return current;
        if (!dirty && !current.has(id)) return current;
        const next = new Map(current);
        if (dirty && draft) next.set(id, draft);
        else next.delete(id);
        return next;
      });
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
    void readCreateDraft(draftKey)
      .then((saved) => {
        if (cancelled) return;
        if (saved) {
          setGameDraft({
            gameId,
            title: saved.title,
            description: saved.description,
          });
          setRestoredDraft({
            ...saved,
            items: saved.items.map((item) => ({
              ...item,
              previewUrl: createPreview(item.file),
            })),
          });
          setNotice("작성 중이던 수정 내용을 복원했어요.");
        }
      })
      .catch(() => {
        if (!cancelled)
          setNotice(
            "이 브라우저에서는 수정 내용의 임시 저장을 사용할 수 없어요.",
          );
      })
      .finally(() => {
        if (!cancelled) setDraftReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey, gameId, createPreview]);
  const title =
    gameDraft?.gameId === gameId ? gameDraft.title : (game?.title ?? "");
  const description =
    gameDraft?.gameId === gameId
      ? gameDraft.description
      : (game?.description ?? "");
  const isGameDirty = Boolean(
    game && (title !== game.title || description !== (game.description ?? "")),
  );
  const hasUnsavedChanges = isGameDirty || dirtyCandidates.size > 0;
  useEffect(() => {
    if (!draftReady || !game) return;
    latestDraft.current = hasUnsavedChanges
      ? {
          title,
          description,
          items: [...candidateDrafts.values()].map(({ id, name, file }) => ({
            id,
            name,
            file,
          })),
        }
      : null;
    const timer = window.setTimeout(() => {
      void writeCreateDraft(draftKey, latestDraft.current).catch(() =>
        setNotice(
          "수정 내용의 임시 저장에 실패했어요. 저장 버튼으로 변경사항을 반영해주세요.",
        ),
      );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    draftReady,
    game,
    title,
    description,
    candidateDrafts,
    hasUnsavedChanges,
    draftKey,
  ]);
  useEffect(() => {
    const flush = () => {
      if (latestDraft.current)
        void writeCreateDraft(draftKey, latestDraft.current).catch(
          () => undefined,
        );
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [draftKey]);

  function handleBack() {
    if (isSavingGame) return;
    onBack();
  }

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
    setNotice(null);
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
      setGameDraft(null);
      setNotice("월드컵 정보를 저장했어요.");
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
    setNotice(null);
    await updateWorldcupItem(item.id, input);
    setRestoredDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((draft) => draft.id !== item.id),
          }
        : null,
    );
    await refreshDetail();
    setNotice("후보를 저장했어요.");
  }

  async function handleDeleteItem(itemId: number) {
    setNotice(null);
    await deleteWorldcupItem(itemId);
    await refreshDetail();
    setNotice("후보를 삭제했어요.");
  }

  async function handleAddItem(input: { image_url: string; name: string }) {
    setNotice(null);
    await createWorldcupItem(gameId, input);
    await refreshDetail();
    setNotice("새 후보를 추가했어요.");
  }

  return (
    <section className={ui.page}>
      <PageIntro
        label="내 월드컵 / 수정"
        title="월드컵 수정하기"
        description="이 브라우저에 임시 저장 · 저장 버튼을 누르면 반영"
        action={
          <button
            className={ui.secondary}
            type="button"
            disabled={isSavingGame}
            onClick={handleBack}
          >
            <ArrowLeft size={15} /> 목록
          </button>
        }
      />

      <div className={ui.editorBody}>
        {notice && <StatusNotice>{notice}</StatusNotice>}
        {isLoading && (
          <div className="rounded-[18px] border border-[#e2e9ed] bg-white px-4 py-8 text-center text-[15px] tracking-[-0.224px] text-[#63727c]">
            상세 정보를 불러오는 중입니다.
          </div>
        )}

        {isError && (
          <div className="rounded-[18px] border border-[#ffd4a3] bg-[#fff8ef] px-4 py-4 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#8a4b00]">
            상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        )}

        {game && draftReady && (
          <>
            <div className={surfaceCardClass}>
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end md:gap-5">
                <label className="block">
                  <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
                    제목
                  </span>
                  <input
                    className={`mt-2 ${inputClass}`}
                    value={title}
                    onChange={(event) =>
                      updateGameDraft({ title: event.target.value })
                    }
                  />
                </label>
                <button
                  className={`w-full md:w-auto ${primaryButtonClass}`}
                  type="button"
                  disabled={isSavingGame || !isGameDirty || !title.trim()}
                  onClick={handleSaveGame}
                >
                  <Check className="size-4" />
                  {isSavingGame ? "저장 중" : "정보 저장"}
                </button>
              </div>
              <label className="mt-4 block">
                <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
                  설명
                </span>
                <textarea
                  className={`mt-2 ${textAreaClass}`}
                  value={description}
                  onChange={(event) =>
                    updateGameDraft({ description: event.target.value })
                  }
                />
              </label>
            </div>

            <div className={surfaceCardClass}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-[21px] font-semibold tracking-[0.231px]">
                    후보
                  </h2>
                  <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#63727c]">
                    현재 {game.items.length.toLocaleString()}개
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {game.items.map((item, index) => (
                  <CandidateEditorCard
                    key={`${item.id}-${item.name}-${item.image_url}`}
                    item={item}
                    number={index + 1}
                    onDirty={trackDirty}
                    draft={restoredDraft?.items.find(
                      (draft) => draft.id === item.id,
                    )}
                    canDelete={game.items.length > 2}
                    onDelete={() => handleDeleteItem(item.id)}
                    onSave={(input) => handleSaveItem(item, input)}
                  />
                ))}
                <AddCandidateCard
                  onAdd={handleAddItem}
                  onDirty={trackDirty}
                  draft={restoredDraft?.items.find((draft) => draft.id === -1)}
                />
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
  number,
  onDirty,
  draft,
}: {
  canDelete: boolean;
  item: BackendWorldcupItem;
  onDelete: () => Promise<void>;
  onSave: (input: { image_url: string; name: string }) => Promise<void>;
  number: number;
  onDirty: (id: number, dirty: boolean, draft?: DraftItem) => void;
  draft?: DraftItem;
}) {
  const [name, setName] = useState(draft?.name ?? item.name);
  const [file, setFile] = useState<File | null>(draft?.file ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    draft?.previewUrl ?? null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPreview = useImagePreviews();
  const dirty = name !== item.name || Boolean(file);
  useEffect(() => {
    onDirty(item.id, dirty, { id: item.id, name, file, previewUrl });
  }, [item.id, dirty, name, file, previewUrl, onDirty]);
  useEffect(() => () => onDirty(item.id, false), [item.id, onDirty]);

  function updateFile(nextFile: File | null) {
    if (isSaving || isDeleting) return;
    setFile(nextFile);
    setPreviewUrl(createPreview(nextFile));
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (isSaving || isDeleting) return;
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
      setName(name.trim());
      setFile(null);
      setPreviewUrl(null);
    } catch {
      setErrorMessage("후보를 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `‘${item.name}’ 후보를 삭제할까요? 삭제한 후보는 복구할 수 없어요.`,
      )
    )
      return;
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
      className={`${surfaceCardClass} outline-none transition focus-within:border-[#b9b9bf] focus:border-[#b9b9bf]`}
      tabIndex={0}
      onPasteCapture={handlePaste}
    >
      <div className={ui.candidateHeading}>
        <span>후보 {number}</span>
        <span>{dirty ? "변경사항 있음" : "등록 완료"}</span>
      </div>
      <div className="grid grid-cols-[1fr_40px] items-center gap-2">
        <input
          className={inputClass}
          aria-label="후보 이름"
          placeholder="후보 이름"
          value={name}
          disabled={isSaving || isDeleting}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="grid size-10 place-items-center rounded-xl bg-[#f7fafc] text-[#b42318] active:scale-95 disabled:text-[#c7c7cc]"
          type="button"
          aria-label="후보 삭제"
          disabled={!canDelete || isDeleting || isSaving}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className={`${previewImageClass} grid size-24 place-items-center`}>
          <Image
            alt={`${name || item.name} 후보 이미지`}
            className="size-full object-cover"
            fill
            sizes="96px"
            src={previewUrl ?? item.image_url}
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={isSaving || isDeleting}
            onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
          />
          <button
            className={fileButtonClass}
            type="button"
            disabled={isSaving || isDeleting}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            이미지 선택
          </button>
        </div>
      </div>
      <button
        className={`mt-5 w-full ${secondaryButtonClass}`}
        type="button"
        disabled={isSaving || isDeleting || !dirty || !name.trim()}
        onClick={handleSave}
      >
        <Check className="size-4" />
        {isSaving ? "저장 중" : "후보 저장"}
      </button>
      {!name.trim() && (
        <p className={ui.editorHint}>후보 이름을 입력해주세요.</p>
      )}
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
  onDirty,
  draft,
}: {
  onAdd: (input: { image_url: string; name: string }) => Promise<void>;
  onDirty: (id: number, dirty: boolean, draft?: DraftItem) => void;
  draft?: DraftItem;
}) {
  const [name, setName] = useState(draft?.name ?? "");
  const [file, setFile] = useState<File | null>(draft?.file ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    draft?.previewUrl ?? null,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAdd = name.trim().length > 0 && file;
  const createPreview = useImagePreviews();
  const dirty = Boolean(name || file);
  useEffect(() => {
    onDirty(-1, dirty, { id: -1, name, file, previewUrl });
  }, [dirty, name, file, previewUrl, onDirty]);
  useEffect(() => () => onDirty(-1, false), [onDirty]);

  function updateFile(nextFile: File | null) {
    setFile(nextFile);
    setPreviewUrl(createPreview(nextFile));
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    if (isAdding) return;
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
      className={`${surfaceCardClass} border-[#c9e1ee] outline-none transition focus-within:border-[#94bdd4] focus:border-[#94bdd4]`}
      tabIndex={0}
      onPasteCapture={handlePaste}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a]">
          <Plus className="size-4" />
        </span>
        <strong className="text-[14px] tracking-[-0.224px]">후보 추가</strong>
      </div>
      <input
        className={`mt-4 ${inputClass}`}
        placeholder="후보 이름"
        value={name}
        disabled={isAdding}
        onChange={(event) => setName(event.target.value)}
      />
      <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className={`${previewImageClass} grid size-24 place-items-center`}>
          {previewUrl ? (
            <Image
              alt={`${name || "새 후보"} 미리보기`}
              className="size-full object-cover"
              fill
              sizes="96px"
              src={previewUrl}
              unoptimized
            />
          ) : (
            <ImagePlus className="size-5 text-[#63727c]" />
          )}
        </div>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/*"
          disabled={isAdding}
          onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
        />
        <div className="min-w-0">
          <button
            className={fileButtonClass}
            type="button"
            disabled={isAdding}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            이미지 선택
          </button>
        </div>
      </div>
      <button
        className={`mt-5 w-full ${primaryButtonClass}`}
        type="button"
        disabled={!canAdd || isAdding}
        onClick={handleAdd}
      >
        <Plus className="size-4" />
        {isAdding ? "추가 중" : "후보 추가"}
      </button>
      {!canAdd && (
        <p className={ui.editorHint}>
          {!name.trim()
            ? "새 후보의 이름을 입력해주세요."
            : "새 후보의 이미지를 선택해주세요."}
        </p>
      )}
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
        className="w-full max-w-[360px] overflow-hidden rounded-[18px] bg-white text-[#25343e]"
        role="dialog"
      >
        <div className="px-5 pb-5 pt-6 text-center">
          <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[#fff1f0] text-[#b42318]">
            <Trash2 className="size-5" />
          </div>
          <h2
            className="mt-4 text-[21px] font-semibold leading-[1.19] tracking-[0.231px]"
            id="delete-worldcup-title"
          >
            이 월드컵을 삭제할까요?
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] leading-[1.43] tracking-[-0.224px] text-[#63727c]">
            {gameTitle}
          </p>
          <p className="mt-2 text-[13px] leading-[1.45] tracking-[-0.12px] text-[#6d7e89]">
            삭제한 월드컵은 다시 복구할 수 없습니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-[#edf1f4] bg-[#edf1f4]">
          <button
            className="h-12 bg-white text-[17px] tracking-[-0.374px] text-[#63727c] active:scale-95 disabled:text-[#c7c7cc]"
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
  draftKey,
}: {
  onCancel: () => void;
  onComplete: () => Promise<void>;
  draftKey: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<DraftItem[]>(() =>
    Array.from({ length: 2 }, (_, index) => createDraftItem(index)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [restored, setRestored] = useState(false);
  const [draftStatus, setDraftStatus] = useState("임시 저장 준비 중");
  const [discardedDraft, setDiscardedDraft] = useState<SavedCreateDraft | null>(
    null,
  );
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    phase: "",
  });
  const latestDraft = useRef<SavedCreateDraft | null>(null);
  const submissionLock = useRef(false);
  const created = useRef(false);
  const [isCreated, setIsCreated] = useState(false);
  const uploaded = useRef(new Map<number, { file: File; url: string }>());
  const bulkInput = useRef<HTMLInputElement>(null);
  const createPreview = useImagePreviews();
  const hasDraft = Boolean(
    title ||
      description ||
      items.length > 2 ||
      items.some((item) => item.name || item.file),
  );
  const completeCount = items.filter(
    (item) => item.name.trim() && item.file,
  ).length;
  const incompleteIndex = items.findIndex(
    (item) => !item.name.trim() || !item.file,
  );
  const missing = !title.trim()
    ? "월드컵 제목을 입력해주세요."
    : incompleteIndex >= 0
      ? `후보 ${incompleteIndex + 1}의 ${!items[incompleteIndex].name.trim() ? "이름을 입력" : "이미지를 선택"}해주세요.`
      : null;
  const canSubmit = ready && !missing && items.length >= 2;

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const saved = await readCreateDraft(draftKey);
        if (cancelled) return;
        if (saved && saved.items.length >= 2) {
          setTitle(saved.title);
          setDescription(saved.description);
          setItems(
            saved.items.map((item) => ({
              ...item,
              previewUrl: createPreview(item.file),
            })),
          );
          setRestored(true);
        }
        setDraftStatus("이 브라우저에 자동 임시 저장");
      } catch {
        if (!cancelled)
          setDraftStatus(
            "임시 저장을 사용할 수 없어요. 화면을 나가기 전에 등록해주세요.",
          );
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [draftKey, createPreview]);

  useEffect(() => {
    if (!ready || created.current) return;
    latestDraft.current = hasDraft
      ? {
          title,
          description,
          items: items.map(({ id, name, file }) => ({ id, name, file })),
        }
      : null;
    if (isSubmitting) return;
    const timer = window.setTimeout(() => {
      setDraftStatus("임시 저장 중…");
      void writeCreateDraft(draftKey, latestDraft.current)
        .then(() => {
          setDraftStatus(
            hasDraft
              ? "이 브라우저에 임시 저장 완료"
              : "이 브라우저에 자동 임시 저장",
          );
        })
        .catch(() =>
          setDraftStatus(
            "임시 저장에 실패했어요. 화면을 나가기 전에 등록해주세요.",
          ),
        );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [ready, title, description, items, hasDraft, isSubmitting, draftKey]);

  useEffect(() => {
    const flush = () => {
      if (latestDraft.current)
        void writeCreateDraft(draftKey, latestDraft.current).catch(
          () => undefined,
        );
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [draftKey]);

  function handleCancel() {
    if (isSubmitting) return;
    onCancel();
  }

  async function discardDraft() {
    const previous = {
      title,
      description,
      items: items.map(({ id, name, file }) => ({ id, name, file })),
    };
    latestDraft.current = null;
    try {
      await writeCreateDraft(draftKey, null);
      setDiscardedDraft(previous);
      setTitle("");
      setDescription("");
      setItems(Array.from({ length: 2 }, (_, index) => createDraftItem(index)));
      setRestored(false);
      uploaded.current.clear();
      setErrorMessage(null);
    } catch {
      setErrorMessage("임시 저장 내용을 지우지 못했어요. 다시 시도해주세요.");
    }
  }

  function undoDiscard() {
    if (!discardedDraft) return;
    setTitle(discardedDraft.title);
    setDescription(discardedDraft.description);
    setItems(
      discardedDraft.items.map((item) => ({
        ...item,
        previewUrl: createPreview(item.file),
      })),
    );
    setDiscardedDraft(null);
    setRestored(true);
  }

  function updateItem(id: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function updateItemFile(id: number, file: File | null) {
    updateItem(id, {
      file,
      previewUrl: createPreview(file),
    });
  }

  function addImages(files: FileList | null) {
    const images = Array.from(files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (!images.length) return;
    const drafts = images.map((file, index) => ({
      ...createDraftItem(items.length + index),
      name: file.name.replace(/\.[^.]+$/, ""),
      file,
      previewUrl: createPreview(file),
    }));
    setItems((current) => {
      const next = [...current];
      drafts.forEach((draft) => {
        const empty = next.findIndex((item) => !item.name && !item.file);
        if (empty >= 0) next[empty] = draft;
        else next.push(draft);
      });
      return next;
    });
  }

  function handleItemPaste(id: number, event: ClipboardEvent<HTMLElement>) {
    if (isSubmitting || isCreated) return;
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
    if (!canSubmit || submissionLock.current) return;
    submissionLock.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (!created.current) {
        let completed = 0;
        setProgress({ completed, total: items.length, phase: "이미지 업로드" });
        for (let start = 0; start < items.length; start += 3) {
          const results = await Promise.allSettled(
            items.slice(start, start + 3).map(async (item) => {
              if (!item.file) throw new Error("이미지가 없는 후보가 있어요.");
              const cached = uploaded.current.get(item.id);
              const url =
                cached?.file === item.file
                  ? cached.url
                  : await uploadImageFile(item.file);
              uploaded.current.set(item.id, { file: item.file, url });
              completed += 1;
              setProgress({
                completed,
                total: items.length,
                phase: "이미지 업로드",
              });
            }),
          );
          if (results.some((result) => result.status === "rejected"))
            throw new Error("upload");
        }
        setProgress({
          completed: items.length,
          total: items.length,
          phase: "월드컵 등록",
        });
        await createWorldcupGame({
          game: {
            description: description.trim() || undefined,
            title: title.trim(),
          },
          items: items.map((item) => ({
            name: item.name.trim(),
            image_url: uploaded.current.get(item.id)!.url,
          })),
        });
        created.current = true;
        setIsCreated(true);
        latestDraft.current = null;
        await writeCreateDraft(draftKey, null).catch(() => undefined);
      }
      await onComplete();
    } catch {
      setErrorMessage(
        created.current
          ? "월드컵은 등록됐지만 목록을 불러오지 못했어요. 아래 버튼으로 목록을 다시 확인해주세요."
          : "월드컵을 만들지 못했어요. 입력한 내용은 유지됩니다. 연결을 확인하고 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
      submissionLock.current = false;
    }
  }

  return (
    <section className={ui.page}>
      <PageIntro
        label="내 월드컵 / 만들기"
        title="월드컵 만들기"
      />

      <div className={ui.editorBody}>
        <div className={ui.draftBar}>
          <p role="status">
            {discardedDraft && !hasDraft
              ? "입력 내용을 초기화했어요. 되돌리기로 복원할 수 있어요. "
              : restored
                ? "이전에 작성한 내용을 복원했어요. "
                : ""}
            {draftStatus}
          </p>
          {discardedDraft && !hasDraft && (
            <button type="button" disabled={isSubmitting} onClick={undoDiscard}>
              되돌리기
            </button>
          )}
          {hasDraft && (
            <button
              type="button"
              disabled={isSubmitting || !ready || isCreated}
              onClick={discardDraft}
            >
              초기화
            </button>
          )}
        </div>
        <fieldset
          className={ui.editorFields}
          disabled={isSubmitting || !ready || isCreated}
        >
          <div className={`${ui.surface} ${ui.editorSection}`}>
            <h2 className={ui.editorSectionTitle}>
              <span>01</span> 기본 정보
            </h2>
            <label className="block">
              <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
                제목
                <span className={ui.requiredLabel}>필수</span>
              </span>
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#dce5eb] bg-white px-4 text-[17px] tracking-[-0.374px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10"
                placeholder="예: 내 최애 간식 월드컵"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="mt-4 block">
              <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
                설명
                <span className={ui.optionalLabel}>선택</span>
              </span>
              <textarea
                className="mt-2 min-h-24 w-full resize-none rounded-xl border border-[#dce5eb] bg-white px-4 py-3 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10"
                placeholder="간단한 소개를 적어주세요"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          <div className={`${ui.surface} ${ui.editorSection}`}>
            <div className={ui.candidateToolbar}>
              <div>
                <h2 className={ui.editorSectionTitle}>
                  <span>02</span> 후보 모으기
                </h2>
                <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#63727c]">
                  등록 준비 {completeCount}/{items.length}개 · 이름과 이미지가
                  필요해요.
                </p>
              </div>
              <div className={ui.candidateToolbarActions}>
                <input
                  ref={bulkInput}
                  type="file"
                  multiple
                  accept="image/*"
                  className="sr-only"
                  aria-label="후보 이미지 여러 장 선택"
                  onChange={(event) => {
                    addImages(event.target.files);
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className={fileButtonClass}
                  onClick={() => bulkInput.current?.click()}
                >
                  <ImagePlus size={16} /> 여러 장 추가
                </button>
                <button
                  className={ui.primary}
                  type="button"
                  aria-label="후보 추가"
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      createDraftItem(current.length),
                    ])
                  }
                >
                  <Plus className="size-4" />
                  후보 추가
                </button>
              </div>
            </div>
            <p className={ui.editorHint}>
              후보 카드에 사진을 붙여넣거나 여러 장을 한 번에 선택할 수 있어요.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[#eeeeef] p-3 outline-none transition focus-within:border-[#b9b9bf] focus:border-[#b9b9bf]"
                  tabIndex={0}
                  onPasteCapture={(event) => handleItemPaste(item.id, event)}
                >
                  <div className={ui.candidateHeading}>
                    <span>후보 {index + 1}</span>
                    <span>
                      {item.name.trim() && item.file
                        ? "준비 완료"
                        : "입력 필요"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_32px] items-center gap-2">
                    <input
                      className="h-11 w-full rounded-xl border border-[#dce5eb] bg-white px-3 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10"
                      aria-label={`후보 ${index + 1} 이름`}
                      placeholder="후보 이름"
                      value={item.name}
                      onChange={(event) =>
                        updateItem(item.id, { name: event.target.value })
                      }
                    />
                    <button
                      className="grid size-8 place-items-center rounded-xl text-[#b42318] disabled:text-[#c7c7cc]"
                      type="button"
                      aria-label="후보 삭제"
                      disabled={items.length <= 2}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (currentItem) => currentItem.id !== item.id,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-[82px_1fr] items-center gap-3">
                    <div
                      className={`${previewImageClass} grid size-20 place-items-center`}
                    >
                      {item.previewUrl ? (
                        <Image
                          alt={`${item.name || "후보"} 미리보기`}
                          className="size-full object-cover"
                          fill
                          sizes="80px"
                          src={item.previewUrl}
                          unoptimized
                        />
                      ) : (
                        <ImagePlus className="size-5 text-[#63727c]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className={fileButtonClass}>
                        <ImagePlus className="size-4" />
                        이미지 선택
                        <input
                          className="sr-only"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            updateItemFile(item.id, file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {item.file && (
                        <button
                          className={ui.clearImage}
                          type="button"
                          onClick={() => updateItemFile(item.id, null)}
                        >
                          사진 지우기
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </fieldset>

        {isSubmitting && (
          <div className={ui.uploadProgress} role="status" aria-live="polite">
            <span>
              {progress.phase} · {progress.completed}/{progress.total}개
            </span>
            <progress
              value={progress.completed}
              max={progress.total || 1}
              aria-label="이미지 업로드 진행률"
            />
          </div>
        )}

        {errorMessage && (
          <p className="rounded-2xl bg-[#fff1f0] px-4 py-3 text-center text-[14px] leading-[1.43] tracking-[-0.224px] text-[#b42318]">
            {errorMessage}
          </p>
        )}

        <div className={ui.editorActions}>
          <p className={ui.editorHint}>
            {!isSubmitting && !isCreated
              ? (missing ?? "모든 후보가 준비됐어요.")
              : ""}
          </p>
          <button
            className={ui.secondary}
            type="button"
            disabled={isSubmitting || !ready}
            onClick={handleCancel}
          >
            취소
          </button>
          <button
            className={ui.primary}
            type="button"
            disabled={(!canSubmit && !isCreated) || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting
              ? "만드는 중…"
              : isCreated
                ? "목록 다시 확인"
                : "월드컵 만들기"}
          </button>
        </div>
      </div>
    </section>
  );
}
