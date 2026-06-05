"use client";

import { useEffect, type ReactNode } from "react";
import { fetchAuthMe } from "@/lib/auth";
import { useAuthStore } from "@/store/auth-store";

function clearLoginQuery() {
  const url = new URL(window.location.href);

  if (!url.searchParams.has("login")) {
    return;
  }

  url.searchParams.delete("login");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const isLoaded = useAuthStore((state) => state.isLoaded);
  const setLoaded = useAuthStore((state) => state.setLoaded);
  const setLoggedOut = useAuthStore((state) => state.setLoggedOut);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    let isCancelled = false;

    async function loadUser() {
      try {
        const user = await fetchAuthMe();

        if (isCancelled) {
          return;
        }

        if (user) {
          setUser(user);
        } else {
          setLoggedOut();
        }
      } catch {
        if (!isCancelled) {
          setLoaded();
        }
      } finally {
        if (!isCancelled) {
          clearLoginQuery();
        }
      }
    }

    loadUser();

    return () => {
      isCancelled = true;
    };
  }, [setLoaded, setLoggedOut, setUser]);

  return isLoaded ? <>{children}</> : null;
}
