const IN_APP_BACK_ATTR = "data-in-app-back";

let inAppNavigations = 0;

type AppRouterLike = {
  back: () => void;
  push: (href: string) => void;
};

/** Next App Router stores an increasing `idx` on history.state after client nav. */
function historyIdx() {
  if (typeof window === "undefined") return 0;
  const idx = window.history.state?.idx;
  return typeof idx === "number" ? idx : 0;
}

export function canGoBackInApp() {
  if (typeof window === "undefined") return false;
  return historyIdx() > 0 || inAppNavigations > 0;
}

/** Call after an in-app route change so Back can use history instead of a new Link. */
export function markInAppNavigation() {
  inAppNavigations += 1;
}

export function goBack(fallbackHref: string, router?: AppRouterLike) {
  if (canGoBackInApp()) {
    if (router) router.back();
    else window.history.back();
    return;
  }
  if (router) {
    router.push(fallbackHref);
    return;
  }
  window.location.assign(fallbackHref);
}

export function handleInAppBackClick(
  event: { preventDefault: () => void },
  fallbackHref: string,
  router: AppRouterLike,
) {
  event.preventDefault();
  goBack(fallbackHref, router);
}

export function inAppBackAnchorProps(
  href: string,
  router: AppRouterLike,
  onClick?: (event: { preventDefault: () => void }) => void,
) {
  return {
    href,
    [IN_APP_BACK_ATTR]: "true",
    onClick: (event: { preventDefault: () => void }) => {
      onClick?.(event);
      handleInAppBackClick(event, href, router);
    },
  };
}

export function isInAppBackAnchor(anchor: HTMLAnchorElement) {
  return anchor.getAttribute(IN_APP_BACK_ATTR) === "true";
}

/** Clears session back-tracking so unit tests start from a cold history. */
export function __resetInAppBackForTests() {
  inAppNavigations = 0;
}
