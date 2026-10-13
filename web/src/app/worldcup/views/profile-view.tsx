"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, Shuffle } from "lucide-react";
import type { WorldcupGame } from "@/lib/worldcup";
import type { Player } from "@/store/worldcup-store";
import { PageIntro } from "./pickon-ui";
import ui from "./pickon-ui.module.css";

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
      <circle cx="38" cy="50" r="3.2" fill="#25343e"/>
      <circle cx="58" cy="50" r="3.2" fill="#25343e"/>
      ${muzzle}
      <path d="M45 58h6l-3 4z" fill="#25343e"/>
      <path d="M39 66c5 4 13 4 18 0" fill="none" stroke="#25343e" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="28" cy="58" r="5" fill="${accent}" opacity=".16"/>
      <circle cx="68" cy="58" r="5" fill="${accent}" opacity=".16"/>
    </svg>
  `)}`;
}

export function getAvatarForName(name: string) {
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

export function ProfileView({
  game,
  mode = "multi",
  onComplete,
}: {
  game: WorldcupGame;
  mode?: "solo" | "multi";
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
      setErrorMessage(
        "방에 연결하지 못했습니다. 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={ui.page}>
      <PageIntro
        label={mode === "solo" ? "혼자 시작하기" : "함께 시작하기"}
        title="닉네임 설정"
        description={game.title}
      />
      <div className={ui.content}>
        <div className={`${ui.surface} ${ui.profileCard}`}>
          <div className={ui.avatarArea}>
            <button
              className="grid size-24 place-items-center overflow-hidden rounded-full border border-black/10 bg-white md:size-32"
              type="button"
              aria-label={`${avatar.name} 아바타 변경`}
              onClick={() =>
                setAvatarIndex((index) => (index + 1) % avatarOptions.length)
              }
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
              className="mt-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#f1f6f9] px-4 text-[14px] tracking-[-0.224px] text-[#27729b] active:scale-95 md:mt-4 md:h-10 md:px-5 md:text-[15px]"
              type="button"
              onClick={() =>
                setAvatarIndex((index) => (index + 1) % avatarOptions.length)
              }
            >
              <Shuffle className="size-3.5" />
              아바타 바꾸기
            </button>
          </div>

          <div>
            <p className={ui.profileHint}>
              친구들이 알아볼 수 있는 이름을 정해주세요.
            </p>
            <label className="block">
              <span className="text-[13px] tracking-[-0.12px] text-[#63727c]">
                닉네임
              </span>
              <input
                className="mt-2 h-12 w-full rounded-xl border border-[#dce5eb] bg-white px-4 text-[17px] tracking-[-0.374px] outline-none transition focus:border-[#27729b] focus:ring-4 focus:ring-[#27729b]/10 md:h-14"
                maxLength={12}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>

            <button
              className={`${ui.primary} mt-5 w-full`}
              type="button"
              disabled={nickname.trim().length === 0 || isSubmitting}
              onClick={handleSubmit}
            >
              <Check className="size-4" />
              {isSubmitting ? "입장 중" : "참여하기"}
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
