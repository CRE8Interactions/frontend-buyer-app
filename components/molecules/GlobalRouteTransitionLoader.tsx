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
  ROUTE_COMMITTED_EVENT,
  ROUTE_TRANSITION_EVENT,
  WALLET_SHELL_READY_EVENT,
  isWalletShellReady,
  markWalletShellPending,
  routePathKey,
} from "@/lib/routeTransition";

const MAX_VISIBLE_MS = 15000;

function isPlatformLinkOrigin(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/our-story";
}

function locationKey() {
  return `${window.location.pathname}${window.location.search}`;
}

function destinationKey(destination: URL) {
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

/**
 * Immediate feedback for internal link transitions. The address bar updates
 * first, then the branded loader covers the outgoing page until Next.js
 * commits the destination (wallet hops also wait for ticket data).
 */
export default function GlobalRouteTransitionLoader() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);
  const [fallback, setFallback] = useState<"none" | "blocktickets">("none");
  const [message, setMessage] = useState(loaderMessageForPath());
  const [visible, setVisible] = useState(false);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const walletReadyRef = useRef<(() => void) | null>(null);
  const routeCommittedRef = useRef<((event: Event) => void) | null>(null);

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
      if (routeCommittedRef.current) {
        window.removeEventListener(
          ROUTE_COMMITTED_EVENT,
          routeCommittedRef.current,
        );
        routeCommittedRef.current = null;
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
      options: { preservePlatformBrand?: boolean; replace?: boolean } = {},
    ) => {
      const destination = new URL(href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      const fromPath = window.location.pathname;
      const toPath = destination.pathname;
      const dest = destinationKey(destination);
      const waitingWallet =
        isWalletAccountPath(toPath) && !isWalletAccountPath(fromPath);

      if (isWalletAccountPath(fromPath) && isWalletAccountPath(toPath)) {
        return;
      }

      if (waitingWallet) markWalletShellPending();

      if (locationKey() !== dest) {
        if (options.replace) window.history.replaceState({}, "", dest);
        else window.history.pushState({}, "", dest);
      }

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

      const tryFinish = () => {
        // A logged-out shopper is bounced to login, so the wallet shell never
        // reports ready — stop waiting once the URL leaves the wallet.
        if (waitingWallet) {
          if (
            isWalletAccountPath(window.location.pathname) &&
            !isWalletShellReady()
          ) {
            return;
          }
          finish();
          return;
        }
        if (routePathKey(window.location.pathname) !== routePathKey(toPath)) {
          finish();
        }
      };

      const onRouteCommitted = (event: Event) => {
        if (waitingWallet) return;
        const path = (event as CustomEvent<{ path?: string }>).detail?.path;
        if (path && routePathKey(path) === routePathKey(toPath)) {
          finish();
        }
      };

      walletReadyRef.current = tryFinish;
      routeCommittedRef.current = onRouteCommitted;
      window.addEventListener(WALLET_SHELL_READY_EVENT, tryFinish);
      window.addEventListener(ROUTE_COMMITTED_EVENT, onRouteCommitted);
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
      const detail = (event as CustomEvent<{ href?: string; replace?: boolean }>)
        .detail;
      if (detail?.href) {
        startTransition(detail.href, { replace: detail.replace });
      }
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
