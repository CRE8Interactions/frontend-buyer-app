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

const MAX_VISIBLE_MS = 15000;

/**
 * How long a committed route gets to paint its own loader before this cover
 * drops. A committed route still needs a render — and, for session-cached
 * branding, a layout effect — before its loader is up, so uncovering on commit
 * alone flashes a bare page. Short enough to go unnoticed when the destination
 * has its content ready and paints no loader at all.
 */
const LOADER_HANDOFF_MS = 150;

const DESTINATION_LOADER_SELECTOR =
  "[data-bt-tenant-loader],[data-bt-platform-loader]";

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
 * commits the destination. Wallet hops skip this overlay so tickets,
 * transfers, and listings can show their in-page loader instead.
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
  const handoffRef = useRef<number | null>(null);
  /** The destination route has committed and may still be bare. */
  const committedRef = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      if (handoffRef.current != null) window.clearTimeout(handoffRef.current);
      if (routeCommittedRef.current) {
        window.removeEventListener(
          ROUTE_COMMITTED_EVENT,
          routeCommittedRef.current,
        );
        routeCommittedRef.current = null;
      }
      pollRef.current = null;
      timeoutRef.current = null;
      handoffRef.current = null;
    };

    const finish = () => {
      clearTimers();
      committedRef.current = false;
      setVisible(false);
    };

    /** A loader that belongs to the destination, not the cover we are showing. */
    const destinationLoaderPainting = () => {
      const own = overlayRef.current;
      return Array.from(
        document.querySelectorAll(DESTINATION_LOADER_SELECTOR),
      ).some((el) => !own?.contains(el));
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
      const dest = destinationKey(destination);

      // Wallet pages own their in-page spinner — do not cover them with the
      // Blocktickets watermark, including hops in from a team or checkout.
      if (isWalletAccountPath(toPath)) {
        return;
      }

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
      }

      clearTimers();
      committedRef.current = false;
      setBranding(destinationBranding);
      setFallback(nextFallback);
      setMessage(loaderMessageForPath(destination.pathname));
      setVisible(true);

      const tryFinish = () => {
        if (routePathKey(window.location.pathname) !== routePathKey(toPath)) {
          finish();
          return;
        }
        // Once the destination is showing its own loader, the two covers are
        // interchangeable and this one can drop away unnoticed.
        if (committedRef.current && destinationLoaderPainting()) finish();
      };

      const onRouteCommitted = (event: Event) => {
        const path = (event as CustomEvent<{ path?: string }>).detail?.path;
        if (!path || routePathKey(path) !== routePathKey(toPath)) return;
        committedRef.current = true;
        if (destinationLoaderPainting()) {
          finish();
          return;
        }
        // Nothing painting yet: give the destination a beat to render its own
        // loader, then uncover whatever it has rather than holding the page.
        handoffRef.current = window.setTimeout(finish, LOADER_HANDOFF_MS);
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
    <div ref={overlayRef}>
      <BrandedLoader
        branding={branding}
        fallback={fallback}
        message={message}
      />
    </div>
  );
}
