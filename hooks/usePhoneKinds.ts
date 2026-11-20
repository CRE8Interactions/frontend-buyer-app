"use client";

import { useMemo, useSyncExternalStore } from "react";

export type PhoneKind = "apple" | "google";

/** iPad width and below: a touch-sized screen, and what Chrome's device mode shows. */
const NARROW = "(max-width: 1024px)";

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** 1 narrow, 0 wide on the client; -1 on the server and the first paint, so the page hydrates cleanly. */
const snapshot = () => (window.matchMedia(NARROW).matches ? 1 : 0);
const serverSnapshot = () => -1;

/**
 * Which phone wallets this device can use. A device counts as a phone when its user agent says iPhone, iPad
 * or Android, or when the screen is iPad width or narrower (so a resized window or a device-mode emulation with a
 * desktop user agent still shows the wallet buttons). Empty until the device is known.
 */
export function usePhoneKinds(): { kinds: PhoneKind[]; phone: boolean } {
  const narrow = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => {
    if (narrow < 0) return { kinds: [], phone: false };
    const ua = navigator.userAgent;
    // iPadOS asks for the desktop site by default and calls itself a Mac, so a Mac with a touch screen is an iPad.
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const phone = ios || android || narrow === 1;
    return { kinds: ios ? ["apple"] : android ? ["google"] : ["apple", "google"], phone };
  }, [narrow]);
}

const noop = () => () => {};
/** True on an iPhone, iPad or iPod (an iPad asking for the desktop site calls itself a Mac, so a Mac with a touch screen counts). Strictly the device, not the screen width. False on the server and for the first paint. */
export function useIsIos(): boolean {
  return useSyncExternalStore(
    noop,
    () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1),
    () => false,
  );
}

/** True on a phone or tablet by its user agent (iOS, iPadOS, Android): the device has a touch screen and no mouse to point with. False on the server and for the first paint. */
export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(
    noop,
    () => /iPhone|iPad|iPod|Android/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1),
    () => false,
  );
}
