"use client";

import { useEffect, type ReactNode } from "react";
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

const HOTJAR_ID = 3697606;

function injectHotjar() {
  if (typeof window === "undefined") return;
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

  useEffect(() => {
    injectHotjar();
    bootIntercom();
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (session?.user) {
      updateIntercom({
        name: displayName(session.user),
        email: session.user.email,
        user_id: String(session.user.id),
      });
    }

    if (PURCHASE_ROUTE.test(pathname)) {
      hideIntercomLauncher();
    } else {
      showIntercomLauncher();
    }
  }, [pathname, ready, session]);

  return null;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GrowthBookGate>
      <IntercomAndHotjar />
      {children}
    </GrowthBookGate>
  );
}
