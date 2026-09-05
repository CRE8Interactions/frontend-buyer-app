import { describe, expect, it } from "vitest";
import { SHOPPER_PAGE_CLASS } from "@/lib/branding";
import {
  SHOPPER_FLUID_MAX_PX,
  SHOPPER_FLUID_MIN_PX,
  shopperFluidClamp,
  shopperFluidMin,
  fluidSize,
  shopperFluidDesktopPinVars,
  shopperPageTypeCss,
  SHOPPER_TAILWIND_FLUID_SIZES,
} from "@/lib/shopperFluidType";

describe("shopperFluidType", () => {
  it("defines the shopper fluid viewport band", () => {
    expect(SHOPPER_FLUID_MIN_PX).toBe(390);
    expect(SHOPPER_FLUID_MAX_PX).toBe(900);
    expect(SHOPPER_PAGE_CLASS).toBe("shopper-page");
  });

  it("maps desktop steps to readable mobile minimums", () => {
    expect(shopperFluidMin(42)).toBe(30);
    expect(shopperFluidMin(16)).toBe(14);
    expect(shopperFluidMin(20)).toBe(14);
    expect(shopperFluidMin(34)).toBe(28);
  });

  it("builds clamp() strings that hit min and max at the band edges", () => {
    expect(shopperFluidClamp(15)).toBe(
      "clamp(13px, calc(13px + 2 * ((100vw - 390px) / 510)), 15px)",
    );
    expect(shopperFluidClamp(42)).toContain("clamp(30px");
    expect(shopperFluidClamp(42)).toContain("42px)");
  });

  it("exposes css var references", () => {
    expect(fluidSize(15)).toBe("var(--t-15)");
  });

  it("pins fluid tokens to desktop px for scoped overrides", () => {
    const vars = shopperFluidDesktopPinVars([12, 15, 24]);
    expect(vars).toContain("--t-12: 12px;");
    expect(vars).toContain("--t-15: 15px;");
    expect(vars).toContain("--t-24: 24px;");
  });

  it("shows full dialog titles without ellipsis", () => {
    const css = shopperPageTypeCss();
    expect(css).not.toContain("text-overflow: ellipsis");
    expect(css).not.toContain("white-space: nowrap");
    expect(css).toContain("font-size: var(--t-24) !important");
  });

  it("maps shopper Tailwind text sizes to fluid clamp tokens", () => {
    const css = shopperPageTypeCss();
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
    expect(SHOPPER_TAILWIND_FLUID_SIZES).toContain(34);
    expect(css).toContain("button.rounded-full");
  });
});
