"use client";

import { useEffect, useState } from "react";

export type AuthUser = {
  id: number | string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dob?: string;
  role?: { name?: string };
  [key: string]: unknown;
};

export type AuthSession = {
  jwt: string;
  user: AuthUser;
};

const USER_KEY = "user";
const LOCATION_KEY = "location";

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.jwt || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return parseSession(sessionStorage.getItem(USER_KEY));
}

export function setSession(session: AuthSession) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(USER_KEY);
}

export function getToken(): string | undefined {
  return getSession()?.jwt;
}

export function isLoggedIn(): boolean {
  const session = getSession();
  return Boolean(session && Object.keys(session).length > 0);
}

export function setLastKnown(path: string) {
  sessionStorage.setItem(LOCATION_KEY, path);
}

export function getLastKnown(): string | null {
  return sessionStorage.getItem(LOCATION_KEY);
}

export function displayName(user?: AuthUser | null): string {
  if (!user) return "Fan";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (user.email) return user.email.split("@")[0] || "Fan";
  return "Fan";
}

/** Hook for client components — mirrors the old sessionStorage JWT auth. */
export function useAuth() {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionState(getSession());
    setReady(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_KEY || e.key === null) setSessionState(getSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = (next: AuthSession) => {
    setSession(next);
    setSessionState(next);
  };

  const logout = () => {
    clearSession();
    setSessionState(null);
  };

  const refresh = () => setSessionState(getSession());

  return {
    session,
    user: session?.user ?? null,
    ready,
    isAuthenticated: Boolean(session),
    login,
    logout,
    refresh,
  };
}
