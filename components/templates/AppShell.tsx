"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import CartButton from "@/components/organisms/CartButton";
import WalletMenu from "@/components/organisms/WalletMenu";
import PageLoader from "@/components/molecules/PageLoader";
import { displayName, useAuth, setLastKnown } from "@/lib/auth";
import Button from "@/components/atoms/Button";

/**
 * AppShell — chrome for fan-app pages (wallet, settings, purchase, browse).
 * Brand navy with elevated surfaces, ambient glow, green accents for actives.
 */
export default function AppShell({
  children,
  search = true,
  requireAuth = false,
  hideHeader = false,
}: {
  children: ReactNode;
  search?: boolean;
  requireAuth?: boolean;
  hideHeader?: boolean;
}) {
  const { user, ready, isAuthenticated, logout } = useAuth();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!ready || !requireAuth || isAuthenticated) return;
    if (typeof window !== "undefined") {
      const returnTo = window.location.pathname + window.location.search;
      setLastKnown(returnTo);
      window.location.href = `/login/?from=${encodeURIComponent(returnTo)}`;
    }
  }, [ready, requireAuth, isAuthenticated]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    window.location.href = `/search/?query=${encodeURIComponent(q)}`;
  };

  const menuUser = user
    ? { email: user.email || "", name: displayName(user) }
    : null;

  return (
    <div className="relative min-h-screen bg-background text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden">
        <div className="bg-grid absolute inset-0" />
        <span className="absolute -top-36 left-[10%] h-80 w-80 rounded-full bg-seat/[0.16] blur-3xl" />
        <span className="absolute -top-24 right-[6%] h-96 w-96 rounded-full bg-seat/[0.12] blur-3xl" />
        <span className="absolute left-1/2 top-[-180px] h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-seat/[0.07] blur-3xl" />
      </div>

      {!hideHeader && (
        <header className="relative border-b border-white/10 bg-card">
          <div className="container-x flex h-[70px] items-center justify-between gap-6">
            <a href="/browse" aria-label="Blocktickets home" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/blocktickets-logo.svg" alt="Blocktickets" className="h-[22px] w-auto" />
            </a>
            {search && (
              <form onSubmit={onSearch} className="hidden max-w-[520px] flex-1 md:block">
                <div className="flex h-11 items-center gap-3 rounded-xl border border-white/15 bg-background px-4 transition-colors focus-within:border-primary">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for events"
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder-mute"
                  />
                  <button type="submit" aria-label="Search" className="text-ink2">
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                    </svg>
                  </button>
                </div>
              </form>
            )}
            <div className="flex shrink-0 items-center gap-3">
              <CartButton />
              {ready &&
                (menuUser ? (
                  <WalletMenu
                    user={menuUser}
                    onLogout={() => {
                      logout();
                      window.location.href = "/";
                    }}
                  />
                ) : (
                  <Button href="/login/" size="sm" className="shrink-0">
                    Log in
                  </Button>
                ))}
            </div>
          </div>
        </header>
      )}
      <main className={`container-x relative pb-24 pt-10 lg:pt-12 ${hideHeader ? "pt-6" : ""}`}>
        {requireAuth && (!ready || !isAuthenticated) ? (
          <PageLoader label={ready ? "Redirecting" : "Loading"} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
