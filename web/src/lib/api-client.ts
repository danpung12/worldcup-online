const defaultApiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://worldcupapi.duckdns.org"
    : "http://localhost:4000";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl;
export const socketBaseUrl =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? apiBaseUrl;

let refreshPromise: Promise<boolean> | null = null;

function isRefreshRequest(input: RequestInfo | URL) {
  const url = typeof input === "string" ? input : input.toString();

  return url.includes("/auth/refresh");
}

async function refreshAccessToken() {
  refreshPromise ??= fetch(`${apiBaseUrl}/auth/refresh`, {
    credentials: "include",
    method: "POST",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function fetchWithAuthRefresh(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const requestInit: RequestInit = {
    ...init,
    credentials: init.credentials ?? "include",
  };
  const response = await fetch(input, requestInit);

  if (response.status !== 401 || isRefreshRequest(input)) {
    return response;
  }

  const didRefresh = await refreshAccessToken();

  if (!didRefresh) {
    return response;
  }

  return fetch(input, requestInit);
}
