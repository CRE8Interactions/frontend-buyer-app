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
  routePathKey,
} from "@/lib/routeTransition";
import { beginWalletNavigation } from "@/lib/walletTransition";

const MAX_VISIBLE_MS = 15000;

/** Destination loader polls before the cover hands off (~3 × 40 ms). */
const LOADER_HANDOFF_STABLE_POLLS = 3;

/** Full-screen loader owned by the route that is loading — not this cover. */
const DESTINATION_LOADER_SELECTOR = "[data-bt-destination-loader]";

function isPlatformLinkOrigin(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/our-story";
}

function setTransitionCover(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) document.body.dataset.btRouteTransition = "";
  else delete document.body.dataset.btRouteTransition;
}

/**
 * Immediate feedback for internal link transitions. Next.js owns the URL and
 * route swap; this cover stays up until the destination route paints its own
 * full-screen loader. Wallet hops skip this overlay so tickets, transfers,
 * and listings can show their in-page loader instead.
 */
export default function GlobalRouteTransitionLoader() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);
  const [fallback, setFallback] = useState<"none" | "blocktickets">("none");
  const [message, setMessage] = useState(loaderMessageForPath());
  const [visible, setVisible] = useState(false);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const routeCommittedRef = useRef<((event: Event) => void) | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  /** The destination route has committed and may still be bare. */
  const committedRef = useRef(false);
  const destinationLoaderPollsRef = useRef(0);

  useEffect(() => {
    const clearTimers = () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
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
      committedRef.current = false;
      destinationLoaderPollsRef.current = 0;
      setTransitionCover(false);
      setVisible(false);
    };

    /** A loader that belongs to the destination route, not the cover we are showing. */
    const destinationLoaderPainting = () => {
      const own = overlayRef.current;
      return Array.from(
        document.querySelectorAll(DESTINATION_LOADER_SELECTOR),
      ).some((el) => !own?.contains(el));
    };

    const destinationLoaderReady = () => {
      if (!destinationLoaderPainting()) {
        destinationLoaderPollsRef.current = 0;
        return false;
      }
      destinationLoaderPollsRef.current += 1;
      return destinationLoaderPollsRef.current >= LOADER_HANDOFF_STABLE_POLLS;
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

      const toPath = destination.pathname;

      // In-wallet hops use immediate blocks feedback. Entering wallet from
      // checkout, a team page, or anywhere else keeps the Blocktickets cover.
      if (
        isWalletAccountPath(toPath) &&
        isWalletAccountPath(window.location.pathname)
      ) {
        beginWalletNavigation(href);
        return;
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
      }

      clearTimers();
      committedRef.current = false;
      destinationLoaderPollsRef.current = 0;
      setBranding(destinationBranding);
      setFallback(nextFallback);
      setMessage(loaderMessageForPath(destination.pathname));
      setTransitionCover(true);
      setVisible(true);

      const tryFinish = () => {
        const current = routePathKey(window.location.pathname);
        const dest = routePathKey(toPath);

        // The shopper navigated somewhere other than the link they clicked.
        if (committedRef.current && current !== dest) {
          finish();
          return;
        }
        if (!committedRef.current) return;
        if (destinationLoaderReady()) finish();
      };

      const onRouteCommitted = (event: Event) => {
        const path = (event as CustomEvent<{ path?: string }>).detail?.path;
        if (!path || routePathKey(path) !== routePathKey(toPath)) return;
        committedRef.current = true;
        if (destinationLoaderReady()) finish();
      };

      routeCommittedRef.current = onRouteCommitted;
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
      if (!detail?.href) return;
      const destination = new URL(detail.href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        isWalletAccountPath(destination.pathname) &&
        isWalletAccountPath(window.location.pathname)
      ) {
        beginWalletNavigation(detail.href);
        return;
      }
      startTransition(detail.href, { replace: detail.replace });
    };

    const onPopState = () => {
      clearTimers();
      committedRef.current = false;
      destinationLoaderPollsRef.current = 0;
      setTransitionCover(false);
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
      setTransitionCover(false);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      data-bt-route-transition=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: "all",
      }}
    >
      <BrandedLoader
        branding={branding}
        fallback={fallback}
        message={message}
      />
    </div>
  );
}
