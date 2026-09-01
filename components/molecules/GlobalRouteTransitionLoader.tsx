"use client";

import { useEffect, useRef, useState } from "react";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { isInAppBackAnchor } from "@/lib/inAppBack";
import {
  getLoaderBranding,
  isPlatformLoaderPath,
  isWalletAccountPath,
  type CachedBranding,
} from "@/lib/orgBrandingCache";
import { loaderMessageForPath } from "@/lib/loaderMessages";
import {
  ROUTE_TRANSITION_EVENT,
  WALLET_SHELL_READY_EVENT,
  isWalletShellReady,
  markWalletShellPending,
} from "@/lib/routeTransition";

const MAX_VISIBLE_MS = 15000;

function isPlatformLinkOrigin(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/our-story";
}

function locationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Immediate feedback for internal link transitions. Destination branding wins;
 * home / browse / Our Story / legal pages use the Blocktickets spinner.
 * Wallet hops hold that spinner until ticket data is ready, so the wallet
 * chrome never paints empty.
 */
export default function GlobalRouteTransitionLoader() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);
  const [fallback, setFallback] = useState<"none" | "blocktickets">("none");
  const [message, setMessage] = useState(loaderMessageForPath());
  const [visible, setVisible] = useState(false);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const walletReadyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      if (walletReadyRef.current) {
        window.removeEventListener(
          WALLET_SHELL_READY_EVENT,
          walletReadyRef.current,
        );
        walletReadyRef.current = null;
      }
      pollRef.current = null;
      timeoutRef.current = null;
    };

    const finish = () => {
      clearTimers();
      setVisible(false);
    };

    const startTransition = (
      href: string,
      options: { preservePlatformBrand?: boolean } = {},
    ) => {
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      const startingUrl = locationKey();
      const fromPath = window.location.pathname;
      const toPath = destination.pathname;
      const waitingWallet =
        isWalletAccountPath(toPath) && !isWalletAccountPath(fromPath);

      if (isWalletAccountPath(fromPath) && isWalletAccountPath(toPath)) {
        return;
      }

      if (waitingWallet) markWalletShellPending();

      let destinationBranding = getLoaderBranding(toPath);
      let nextFallback: "none" | "blocktickets" = isPlatformLoaderPath(
        toPath,
        destination.search,
      )
        ? "blocktickets"
        : "none";

      if (options.preservePlatformBrand) {
        destinationBranding = null;
        nextFallback = "blocktickets";
      } else if (waitingWallet) {
        destinationBranding = null;
        nextFallback = "blocktickets";
      }

      clearTimers();
      setBranding(destinationBranding);
      setFallback(nextFallback);
      setMessage(loaderMessageForPath(destination.pathname));
      setVisible(true);

      if (waitingWallet) {
        const dest = `${destination.pathname}${destination.search}${destination.hash}`;
        if (locationKey() !== dest) {
          window.history.pushState({}, "", dest);
        }
      }

      const tryFinish = () => {
        if (locationKey() === startingUrl) return;
        // A logged-out shopper is bounced to login, so the wallet shell never
        // reports ready — stop waiting once the URL leaves the wallet.
        if (
          waitingWallet &&
          isWalletAccountPath(window.location.pathname) &&
          !isWalletShellReady()
        ) {
          return;
        }
        finish();
      };

      walletReadyRef.current = tryFinish;
      window.addEventListener(WALLET_SHELL_READY_EVENT, tryFinish);
      pollRef.current = window.setInterval(tryFinish, 40);
      timeoutRef.current = window.setTimeout(finish, MAX_VISIBLE_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        isInAppBackAnchor(anchor)
      ) {
        return;
      }

      startTransition(anchor.href, {
        preservePlatformBrand:
          isPlatformLinkOrigin(window.location.pathname) &&
          !anchor.closest("footer"),
      });
    };

    const onProgrammaticNav = (event: Event) => {
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      if (href) startTransition(href);
    };

    const onPopState = () => {
      clearTimers();
      setVisible(false);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(ROUTE_TRANSITION_EVENT, onProgrammaticNav);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(ROUTE_TRANSITION_EVENT, onProgrammaticNav);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <BrandedLoader
      branding={branding}
      fallback={fallback}
      message={message}
    />
  );
}
