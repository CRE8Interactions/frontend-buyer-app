import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetInAppBackForTests,
  canGoBackInApp,
  goBack,
  handleInAppBackClick,
  inAppBackAnchorProps,
  isInAppBackAnchor,
  markInAppNavigation,
} from "./inAppBack";

describe("inAppBack", () => {
  afterEach(() => {
    __resetInAppBackForTests();
    vi.unstubAllGlobals();
  });

  it("uses history back after an in-app navigation", () => {
    const router = { back: vi.fn(), push: vi.fn() };
    markInAppNavigation();
    expect(canGoBackInApp()).toBe(true);
    goBack("/browse/", router);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("falls back to the href when this session has no in-app history", () => {
    const router = { back: vi.fn(), push: vi.fn() };
    Object.defineProperty(window, "history", {
      configurable: true,
      value: { ...window.history, state: { idx: 0 } },
    });
    expect(canGoBackInApp()).toBe(false);
    const event = { preventDefault: vi.fn() };
    handleInAppBackClick(event, "/browse/", router);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/browse/");
    expect(router.back).not.toHaveBeenCalled();
  });

  it("sends Back to browse instead of the marketing home", () => {
    const router = { back: vi.fn(), push: vi.fn() };
    Object.defineProperty(window, "history", {
      configurable: true,
      value: { ...window.history, state: { idx: 0 } },
    });

    goBack("/", router);
    expect(router.push).toHaveBeenCalledWith("/browse/");

    expect(inAppBackAnchorProps("/", router).href).toBe("/browse/");
    expect(inAppBackAnchorProps("/nm-state/", router).href).toBe("/nm-state/");
  });

  it("marks in-app back anchors so the route loader can skip them", () => {
    const anchor = document.createElement("a");
    anchor.setAttribute("data-in-app-back", "true");
    expect(isInAppBackAnchor(anchor)).toBe(true);
    expect(isInAppBackAnchor(document.createElement("a"))).toBe(false);
  });
});
