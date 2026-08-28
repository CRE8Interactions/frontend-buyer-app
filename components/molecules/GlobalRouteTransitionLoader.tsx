"use client";

import { useEffect, useRef, useState } from "react";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { isInAppBackAnchor } from "@/lib/inAppBack";
import {
  consumeWalletEntryFromTenant,
  getLoaderBranding,
  isPlatformLoaderPath,
  isTenantOriginPath,
  isWalletAccountPath,
  markWalletEntryFromTenant,
  walletLoaderFromOrigin,
  type CachedBranding,
} from "@/lib/orgBrandingCache";
import { loaderMessageForPath } from "@/lib/loaderMessages";
import { ROUTE_TRANSITION_EVENT } from "@/lib/routeTransition";

const MIN_VISIBLE_MS = 450;
const MAX_VISIBLE_MS = 15000;

function isPlatformLinkOrigin(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" || path === "/our-story";
}

/**
 * Immediate feedback for internal link transitions. Destination branding wins;
 * home / browse / Our Story / legal pages use the Blocktickets spinner.
 */
export default function GlobalRouteTransitionLoader() {
  const [branding, setBranding] = useState<CachedBranding | null>(null);
  const [fallback, setFallback] = useState<"none" | "blocktickets">("none");
  const [message, setMessage] = useState(loaderMessageForPath());
  const [visible, setVisible] = useState(false);
  const pollRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      pollRef.current = null;
      timeoutRef.current = null;
    };

    const finish = (startedAt: number) => {
      clearTimers();
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
      timeoutRef.current = window.setTimeout(() => setVisible(false), remaining);
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

      const startedAt = Date.now();
      const startingUrl = `${window.location.pathname}${window.location.search}`;
      const fromPath = window.location.pathname;
      const toPath = destination.pathname;

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
      } else if (isWalletAccountPath(toPath)) {
        if (isTenantOriginPath(fromPath)) {
          markWalletEntryFromTenant();
          const origin = walletLoaderFromOrigin(fromPath, toPath);
          destinationBranding = origin.branding;
          nextFallback = origin.fallback;
        } else {
          consumeWalletEntryFromTenant();
          destinationBranding = null;
          nextFallback = "blocktickets";
        }
      } else if (isWalletAccountPath(fromPath)) {
        consumeWalletEntryFromTenant();
      }

      clearTimers();
      setBranding(destinationBranding);
      setFallback(nextFallback);
      setMessage(loaderMessageForPath(destination.pathname));
      setVisible(true);

      // The App Router commits the URL when the destination is ready.
      pollRef.current = window.setInterval(() => {
        const currentUrl = `${window.location.pathname}${window.location.search}`;
        if (currentUrl !== startingUrl) finish(startedAt);
      }, 40);
      timeoutRef.current = window.setTimeout(
        () => finish(startedAt),
        MAX_VISIBLE_MS,
      );
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
      // App hand-offs such as checkout keep their destination's branding; only
      // links a shopper clicks on a platform page hold the Blocktickets mark.
      const href = (event as CustomEvent<{ href?: string }>).detail?.href;
      if (href) startTransition(href);
    };

    // Back/forward restores a cached page, so never cover it with a loader.
    const onPopState = () => {
      clearTimers();
      setVisible(false);
    };

    // Capture before Next <Link> prevents the native event during its own
    // client-side navigation handling.
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
