import { describe, expect, it } from "vitest";
import { SHOPPER_PAGE_CLASS } from "@/lib/branding";
import { BROWSE_DISPLAY } from "@/lib/browseType";
import {
  fluidSize,
  shopperPageTypeCss,
} from "@/lib/shopperFluidType";

describe("shopperFluidType", () => {
  it("exposes css var references", () => {
    expect(fluidSize(15)).toBe("var(--t-15)");
  });

  it("shows full dialog titles without ellipsis", () => {
    const css = shopperPageTypeCss();
    expect(css).not.toContain("text-overflow: ellipsis");
    expect(css).not.toContain("white-space: nowrap");
    expect(css).toContain("font-size: var(--t-24) !important");
  });

  it("uses browse type tokens on shopper and wallet shells", () => {
    const css = shopperPageTypeCss();
    expect(css).not.toContain("@media");
    expect(css).toContain("--t-15: 15px;");
    expect(css).toContain(`--t-30: ${BROWSE_DISPLAY.h2};`);
    expect(css).toContain(`--t-32: ${BROWSE_DISPLAY.cta};`);
    expect(css).toContain("--bt-field-focus: var(--acc, var(--accent));");
    expect(css).toContain(
      `.${SHOPPER_PAGE_CLASS} .text-\\[15px\\] { font-size: var(--t-15) !important; }`,
    );
    expect(css).toContain(
      `.${SHOPPER_PAGE_CLASS} .text-\\[16px\\] { font-size: var(--t-16) !important; }`,
    );
    expect(css).toContain(
      `.${SHOPPER_PAGE_CLASS} .text-\\[34px\\] { font-size: var(--t-34) !important; }`,
    );
    expect(css).toContain("button.rounded-full");
    expect(css).toContain("--bt-leading-body: 1.6;");
    expect(css).toContain("line-height: var(--bt-leading-h3)");
  });
});
