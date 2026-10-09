"use client";

import Image from "next/image";
import { type ClipboardEvent, useRef, useState } from "react";
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
  "overflow-hidden rounded-xl border border-[#e2e9ed] bg-[#f2f6f9]";
const primaryButtonClass = ui.primary;
const secondaryButtonClass = ui.secondary;
const fileButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-[11px] border border-[#dce5eb] bg-white px-3 text-[13px] tracking-[-0.12px] text-[#425563] active:scale-95 md:h-10 md:px-3.5 md:text-[14px] md:tracking-[-0.224px]";
const myWorldcupActionButtonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border bg-white px-3 text-[13px] tracking-[-0.12px] active:scale-95 disabled:text-[#c7c7cc] md:h-8 md:px-3";
const inputClass =
  "h-10 w-full rounded-xl border border-black/10 bg-white px-4 text-[15px] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:h-11 md:text-[17px] md:tracking-[-0.374px]";
const textAreaClass =
  "min-h-20 w-full resize-none rounded-[18px] border border-black/10 bg-white px-4 py-3 text-[15px] leading-[1.45] tracking-[-0.224px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:min-h-24 md:text-[17px] md:leading-[1.47] md:tracking-[-0.374px]";

function getPastedImageFile(event: ClipboardEvent<HTMLElement>) {
  return Array.from(event.clipboardData.files).find((file) =>
    file.type.startsWith("image/"),
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
          label="내 월드컵"
          title="나만의 월드컵을 만들어보세요."
          description="로그인하면 월드컵을 만들고, 후보와 소개를 관리할 수 있어요."
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
    <section className={ui.page}>
      <PageIntro
        label="MY PICKON"
        title="내 월드컵"
        description={`${authUser.nickname}님의 취향이 담긴 월드컵을 관리해보세요.`}
      />

      <div className={ui.editorBody}>
        <button
          className={ui.newGameCard}
          type="button"
          onClick={() => setMode("new")}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a] md:size-14">
            <Plus className="size-5" />
          </span>
          <span className="min-w-0">
            <strong className="block text-[18px] font-semibold leading-[1.2] tracking-[-0.12px] text-[#25343e] md:text-[21px] md:leading-[1.19] md:tracking-[0.231px]">
              새 월드컵 만들기
            </strong>
            <span className="mt-1.5 block text-[15px] leading-[1.45] tracking-[-0.224px] text-[#63727c] md:mt-2 md:text-[17px] md:leading-[1.47] md:tracking-[-0.374px]">
              주제를 정하고, 나만의 후보를 모아보세요.
            </span>
          </span>
        </button>

        {isLoading && (
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
              height={144}
              src={game.thumbnail}
              unoptimized
              width={144}
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
              <p className="mt-1 line-clamp-2 text-[14px] leading-[1.43] tracking-[-0.224px] text-[#63727c] md:text-[15px] md:leading-[1.45]">
                {game.description || "설명이 없습니다."}
              </p>
              <p className="mt-2 text-[12px] tracking-[-0.12px] text-[#63727c]">
                최근 수정 {formatMyWorldcupDate(game.updated_at)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className={`${myWorldcupActionButtonClass} border-[#c9e1ee] text-[#27729b]`}
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
  const title =
    gameDraft?.gameId === gameId ? gameDraft.title : (game?.title ?? "");
  const description =
    gameDraft?.gameId === gameId
      ? gameDraft.description
      : (game?.description ?? "");

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
    <section className={ui.page}>
      <PageIntro
        label="내 월드컵 / 수정"
        title="월드컵 수정하기"
        description="소개와 후보를 하나씩 다듬어보세요."
        action={
          <button className={ui.secondary} type="button" onClick={onBack}>
            <ArrowLeft size={15} /> 목록
          </button>
        }
      />

      <div className={ui.editorBody}>
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

        {game && (
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
                  disabled={isSavingGame}
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
      className={`${surfaceCardClass} outline-none transition focus-within:border-[#b9b9bf] focus:border-[#b9b9bf]`}
      tabIndex={0}
      onPasteCapture={handlePaste}
    >
      <div className="grid grid-cols-[1fr_40px] items-center gap-2">
        <input
          className={inputClass}
          aria-label="후보 이름"
          placeholder="후보 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="grid size-10 place-items-center rounded-xl bg-[#f7fafc] text-[#b42318] active:scale-95 disabled:text-[#c7c7cc]"
          type="button"
          aria-label="후보 삭제"
          disabled={!canDelete || isDeleting}
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
            className={fileButtonClass}
            type="button"
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
        onChange={(event) => setName(event.target.value)}
      />
      <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4">
        <div className={`${previewImageClass} grid size-24 place-items-center`}>
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
            <ImagePlus className="size-5 text-[#63727c]" />
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
            className={fileButtonClass}
            type="button"
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
    <section className={ui.page}>
      <PageIntro
        label="내 월드컵 / 만들기"
        title="어떤 취향을 나눠볼까요?"
        description="제목과 후보 이미지만 있으면 나만의 월드컵이 완성돼요."
      />

      <div className={ui.editorBody}>
        <div className={`${ui.surface} ${ui.editorSection}`}>
          <h2 className={ui.editorSectionTitle}>
            <span>01</span> 기본 정보
          </h2>
          <label className="block">
            <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
              제목
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={ui.editorSectionTitle}>
                <span>02</span> 후보 모으기
              </h2>
              <p className="mt-1 text-[14px] tracking-[-0.224px] text-[#63727c]">
                이미지는 선택하거나 붙여넣을 수 있어요. 최소 2개부터 시작해요.
              </p>
            </div>
            <button
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#dceef7] text-[#245a7a] active:scale-95"
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
                  <div className="grid size-20 place-items-center overflow-hidden rounded-xl bg-[#f1f6f9]">
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

        <div className={ui.editorActions}>
          <button className={ui.secondary} type="button" onClick={onCancel}>
            취소
          </button>
          <button
            className={ui.primary}
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
