import { apiBaseUrl } from "@/lib/worldcup";

export type AuthUser = {
  id: number;
  nickname: string;
  profile_image: string | null;
};

export async function fetchAuthMe() {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch authenticated user.");
  }

  return response.json() as Promise<AuthUser>;
}

export async function logoutAuth() {
  await fetch(`${apiBaseUrl}/auth/logout`, {
    credentials: "include",
    method: "POST",
  });
}
