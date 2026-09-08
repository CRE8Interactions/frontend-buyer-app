"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CartButton from "@/components/organisms/CartButton";
import NavAuthActions from "@/components/molecules/NavAuthActions";
import PageLoader from "@/components/molecules/PageLoader";
import {
  ShopperSearchField,
  ShopperSearchMobile,
  ShopperSearchProvider,
} from "@/components/molecules/ShopperSearchBar";
import { useAuth, setLastKnown } from "@/lib/auth";
import {
  BLOCKTICKETS_GREEN,
  BLOCKTICKETS_NAVY,
  fieldFocusVars,
} from "@/lib/branding";

const PLATFORM_AUTH_STYLE: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  fontWeight: 600,
  color: BLOCKTICKETS_NAVY,
  background: BLOCKTICKETS_GREEN,
  border: "none",
  borderRadius: 999,
  padding: "11px 22px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
};

/**
 * AppShell — chrome for fan-app pages (search, purchase, storefront extras).
 * Navy variant keeps the marketing body; light variant matches checkout/login.
 */
export default function AppShell({
  children,
  search = true,
  requireAuth = false,
  hideHeader = false,
  variant = "navy",
  accent,
  brandLogoSrc,
  brandName,
}: {
  children: ReactNode;
  search?: boolean;
  requireAuth?: boolean;
  hideHeader?: boolean;
  variant?: "navy" | "light";
  accent?: string;
  brandLogoSrc?: string | null;
  brandName?: string | null;
}) {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();
  const isLight = variant === "light";
  const headerAccent = accent || BLOCKTICKETS_NAVY;
  const branded = Boolean(brandLogoSrc);
  const authStyle: CSSProperties = branded
    ? {
        ...PLATFORM_AUTH_STYLE,
        color: headerAccent,
        background: "#fff",
      }
    : PLATFORM_AUTH_STYLE;

  useEffect(() => {
    if (!ready || !requireAuth || isAuthenticated) return;
    if (typeof window !== "undefined") {
      const returnTo = window.location.pathname + window.location.search;
      setLastKnown(returnTo);
      router.replace(`/login/?from=${encodeURIComponent(returnTo)}`);
    }
  }, [ready, requireAuth, isAuthenticated, router]);

  const shell = (
    <div
      className={
        isLight
          ? "relative min-h-screen bg-[#f7f8fc] text-[#051b35]"
          : "relative min-h-screen bg-[#051B35] text-white"
      }
      style={fieldFocusVars(accent)}
    >
      {!isLight ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden">
          <div className="bg-grid absolute inset-0" />
          <span className="absolute -top-36 left-[10%] h-80 w-80 rounded-full bg-[#3874E0]/[0.16] blur-3xl" />
          <span className="absolute -top-24 right-[6%] h-96 w-96 rounded-full bg-[#60A5FA]/[0.12] blur-3xl" />
          <span className="absolute left-1/2 top-[-180px] h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-[#3B82F6]/[0.07] blur-3xl" />
        </div>
      ) : null}

      {!hideHeader && (
        <header
          className={
            isLight
              ? "sticky top-0 z-20 border-b border-white/10"
              : "relative border-b border-white/10 bg-[#071f3a]"
          }
          style={isLight ? { background: headerAccent } : undefined}
        >
          <div className="container-x flex h-[70px] items-center justify-between gap-6">
            {branded ? (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandLogoSrc || ""}
                  alt={brandName || ""}
                  className="max-h-full max-w-full object-contain"
                />
              </span>
            ) : (
              <Link href="/browse" aria-label="Blocktickets home" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/blocktickets-logo.svg" alt="Blocktickets" className="h-[22px] w-auto" />
              </Link>
            )}
            {search && (
              <div className="ssb-desktop max-w-[520px] flex-1">
                <ShopperSearchField variant="shell" />
              </div>
            )}
            <div className="flex shrink-0 items-center gap-3">
              <CartButton />
              {ready ? <NavAuthActions buttonStyle={authStyle} /> : null}
            </div>
          </div>
        </header>
      )}
      {search && !hideHeader ? <ShopperSearchMobile /> : null}
      <main className={`container-x relative pb-24 pt-10 lg:pt-12 ${hideHeader ? "pt-6" : ""}`}>
        {requireAuth && (!ready || !isAuthenticated) ? (
          <PageLoader label={ready ? "Redirecting" : "Loading"} />
        ) : (
          children
        )}
      </main>
    </div>
  );

  if (!search) return shell;

  return <ShopperSearchProvider>{shell}</ShopperSearchProvider>;
}
