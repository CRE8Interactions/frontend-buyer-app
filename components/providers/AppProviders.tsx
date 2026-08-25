"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GrowthBookProvider } from "@growthbook/growthbook-react";
import { getGrowthBook, initGrowthBook } from "@/lib/growthbook";
import {
  bootIntercom,
  hideIntercomLauncher,
  showIntercomLauncher,
  updateIntercom,
} from "@/lib/intercom";
import { useAuth, displayName } from "@/lib/auth";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { markInAppNavigation } from "@/lib/inAppBack";

const HOTJAR_ID = 3697606;

function injectHotjar() {
  if (typeof window === "undefined") return;
  // Session replay interferes with Stripe Elements keystrokes in local/dev.
  if (process.env.NEXT_PUBLIC_CLIENT_ENV === "development") return;
  if (window.hj || document.getElementById("hotjar-script")) return;

  window.hj =
    window.hj ||
    function (...args: unknown[]) {
      (window.hj as unknown as { q: unknown[] }).q =
        (window.hj as unknown as { q?: unknown[] }).q || [];
      (window.hj as unknown as { q: unknown[] }).q.push(args);
    };
  window._hjSettings = { hjid: HOTJAR_ID, hjsv: 6 };

  const script = document.createElement("script");
  script.id = "hotjar-script";
  script.async = true;
  script.src = `https://static.hotjar.com/c/hotjar-${HOTJAR_ID}.js?sv=6`;
  document.head.appendChild(script);
}

const PURCHASE_ROUTE =
  /^\/(e\/|checkout\/|checkout$|group\/)/;

function GrowthBookGate({ children }: { children: ReactNode }) {
  // Same provider tree on server and client — avoids hydration mismatch and
  // prevents remounting pages when a loading gate flips.
  const gb = getGrowthBook();

  useEffect(() => {
    initGrowthBook();
  }, []);

  return <GrowthBookProvider growthbook={gb}>{children}</GrowthBookProvider>;
}

function IntercomAndHotjar() {
  const pathname = usePathname() || "/";
  const { session, ready } = useAuth();
  const onPurchaseRoute = PURCHASE_ROUTE.test(pathname);

  useEffect(() => {
    // Hotjar session recording can break Stripe Elements keyboard input
    // (focus works, typing does not). Skip it on purchase flows.
    if (!onPurchaseRoute) {
      injectHotjar();
    }
    bootIntercom();
  }, [onPurchaseRoute]);

  useEffect(() => {
    if (!ready) return;

    if (session?.user) {
      updateIntercom({
        name: displayName(session.user),
        email: session.user.email,
        user_id: String(session.user.id),
      });
    }

    if (onPurchaseRoute) {
      hideIntercomLauncher();
    } else {
      showIntercomLauncher();
    }
  }, [pathname, ready, session, onPurchaseRoute]);

  return null;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const seenPath = useRef<string | null>(null);

  useEffect(() => {
    if (seenPath.current != null && seenPath.current !== pathname) {
      markInAppNavigation();
    }
    seenPath.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      // A painting BrandedLoader dismisses the splash itself, in the same
      // commit, so removing it here too would blink the loader. An older splash
      // marked itself as the platform loader, so exclude it by id or it would
      // match itself and never be removed.
      if (
        document.querySelector(
          "[data-bt-tenant-loader]:not(#bt-boot-loader),[data-bt-platform-loader]:not(#bt-boot-loader)",
        )
      ) {
        return;
      }
      document.getElementById("bt-boot-loader")?.remove();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <GrowthBookGate>
      <IntercomAndHotjar />
      <GlobalRouteTransitionLoader />
      {children}
    </GrowthBookGate>
  );
}
