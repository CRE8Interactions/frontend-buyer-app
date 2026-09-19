import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPageScrollForTests,
  lockPageScroll,
  pageScrollLockCount,
  restorePageScroll,
  unlockPageScroll,
} from "./pageScroll";

afterEach(() => {
  __resetPageScrollForTests();
});

describe("page scroll lock", () => {
  it("locks the document and restores it when the last lock is released", () => {
    lockPageScroll();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unlockPageScroll();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(pageScrollLockCount()).toBe(0);
  });

  it("keeps the document locked while two overlays are stacked", () => {
    lockPageScroll();
    lockPageScroll();
    unlockPageScroll();
    expect(document.body.style.overflow).toBe("hidden");
    expect(pageScrollLockCount()).toBe(1);

    unlockPageScroll();
    expect(document.body.style.overflow).toBe("");
  });

  it("clears leftover locks so a new page can scroll", () => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.dataset.btRouteTransition = "";
    lockPageScroll();

    restorePageScroll();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    expect(document.body.dataset.btRouteTransition).toBeUndefined();
    expect(pageScrollLockCount()).toBe(0);
  });
});
