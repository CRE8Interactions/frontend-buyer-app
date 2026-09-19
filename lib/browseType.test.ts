import { describe, expect, it } from "vitest";
import { SHOPPER_PAGE_CLASS } from "@/lib/branding";
import {
  BROWSE_DISPLAY,
  BROWSE_LEADING,
  BROWSE_SIZE,
  BROWSE_TRACK,
  browseLeading,
  browsePageTypeCss,
  browsePx,
  browseSize,
  browseToken,
} from "@/lib/browseType";

describe("browseType", () => {
  it("uses viewport clamps for display and fixed px for body", () => {
    expect(BROWSE_DISPLAY.hero).toBe("clamp(40px, 6.2vw, 76px)");
    expect(BROWSE_DISPLAY.statement).toBe("clamp(40px, 7vw, 96px)");
    expect(BROWSE_DISPLAY.cta).toBe("clamp(32px, 4.4vw, 54px)");
    expect(BROWSE_DISPLAY.h2).toBe("clamp(30px, 4vw, 48px)");
    expect(BROWSE_DISPLAY.h3lg).toBe("clamp(26px, 3vw, 40px)");
    expect(BROWSE_DISPLAY.lede).toBe("clamp(15px, 1.4vw, 18px)");
    expect(browseSize("cta")).toBe(BROWSE_DISPLAY.cta);
    expect(browsePx(14)).toBe("14px");
    expect(browseSize(15)).toBe("15px");
    expect(BROWSE_SIZE[12]).toBe(12);
    expect(browseToken(15)).toBe("15px");
    expect(browseToken(22)).toBe("26px");
    expect(browseToken(30)).toBe(BROWSE_DISPLAY.h2);
  });

  it("does not emit breakpoint font-size media queries", () => {
    const css = browsePageTypeCss();
    expect(css).not.toMatch(/@media[^{]*font-size/);
    expect(css).not.toContain("@media");
    expect(css).toContain(`--t-14: 14px;`);
    expect(css).toContain(`--t-32: ${BROWSE_DISPLAY.cta};`);
    expect(css).toContain(
      `.${SHOPPER_PAGE_CLASS} .text-\\[14px\\] { font-size: var(--t-14) !important; }`,
    );
    expect(BROWSE_TRACK.display).toBe("-0.025em");
    expect(BROWSE_TRACK.eyebrow).toBe("0.16em");
  });

  it("uses role-based unitless leading that does not change by breakpoint", () => {
    expect(BROWSE_LEADING.h2).toBe(1.05);
    expect(BROWSE_LEADING.hero).toBe(1.12);
    expect(BROWSE_LEADING.h3).toBe(1.25);
    expect(BROWSE_LEADING.body).toBe(1.6);
    expect(BROWSE_LEADING.relaxed).toBe(1.7);
    expect(browseLeading("hero")).toBe("var(--bt-leading-hero)");
    const css = browsePageTypeCss();
    expect(css).not.toContain("@media");
    expect(css).toContain("--bt-leading-h2: 1.05;");
    expect(css).toContain("--bt-leading-hero: 1.12;");
    expect(css).toContain("--bt-leading-h3: 1.25;");
    expect(css).toContain("--bt-leading-body: 1.6;");
    expect(css).toContain("--bt-leading-relaxed: 1.7;");
    expect(css).toContain("line-height: var(--bt-leading-body);");
    expect(css).toContain("line-height: var(--bt-leading-h2);");
    expect(css).toContain("line-height: var(--bt-leading-h3);");
  });
});
