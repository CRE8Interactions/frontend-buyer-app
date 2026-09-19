/** Marks a painted shopper page that scrolls with the document. */
export const PAGE_SCROLL_READY_ATTR = "data-bt-scroll-page";

export const PAGE_SCROLL_READY_SELECTOR = `[${PAGE_SCROLL_READY_ATTR}]`;

let lockCount = 0;

function clearInlineScrollLock(el: HTMLElement) {
  // iOS Safari can keep the document non-scrollable after overflow:hidden is
  // removed. Nudge it back to auto, force a layout, then drop the inline style
  // so the stylesheet (overflow-x: hidden on html) owns scrolling again.
  el.style.overflow = "auto";
  el.style.overflowY = "auto";
  el.style.touchAction = "auto";
  el.style.overscrollBehavior = "auto";
  void el.offsetHeight;
  el.style.removeProperty("overflow");
  el.style.removeProperty("overflow-y");
  el.style.removeProperty("touch-action");
  el.style.removeProperty("overscroll-behavior");
}

function applyPageScroll() {
  if (typeof document === "undefined") return;
  delete document.body.dataset.btRouteTransition;
  clearInlineScrollLock(document.documentElement);
  clearInlineScrollLock(document.body);
}

/** Lock document scroll (overlays, route cover). Nested locks are counted. */
export function lockPageScroll() {
  if (typeof document === "undefined") return;
  lockCount += 1;
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

/** Release one lock. Restores document scroll when none remain. */
export function unlockPageScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) applyPageScroll();
}

/**
 * Drop every leftover lock and restore document scrolling.
 * Call on route changes so tickets / wallet overlays cannot pin browse,
 * team, or venue after Back.
 */
export function restorePageScroll() {
  lockCount = 0;
  applyPageScroll();
}

export function pageScrollLockCount() {
  return lockCount;
}

/** Clears session lock tracking so unit tests start unlocked. */
export function __resetPageScrollForTests() {
  lockCount = 0;
  if (typeof document === "undefined") return;
  delete document.body.dataset.btRouteTransition;
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
}
