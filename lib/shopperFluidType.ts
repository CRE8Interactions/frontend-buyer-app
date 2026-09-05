import { SHOPPER_PAGE_CLASS } from "@/lib/branding";

/** Fluid type ramps between these viewports on shopper routes. */
export const SHOPPER_FLUID_MIN_PX = 390;
export const SHOPPER_FLUID_MAX_PX = 900;

export { SHOPPER_PAGE_CLASS };

const FLUID_RANGE = SHOPPER_FLUID_MAX_PX - SHOPPER_FLUID_MIN_PX;

/** Desktop px → minimum px at the narrow end of the ramp. */
const FLUID_MIN: Record<number, number> = {
  56: 40,
  42: 30,
  40: 30,
  36: 30,
  34: 28,
  32: 26,
  30: 26,
  28: 22,
  26: 22,
  25: 22,
  24: 20,
  22: 18,
  21: 18,
  20: 14,
  19: 16,
  18: 14,
  17: 15,
  16: 14,
  15: 13,
  14: 13,
  13: 12,
  12: 11,
  11: 10,
  10: 10,
};

export const SHOPPER_FLUID_DESKTOP_SIZES = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32,
  34, 36, 40, 42, 56,
] as const;

/** Tailwind arbitrary `text-[Npx]` steps mapped inside `.shopper-page`. */
export const SHOPPER_TAILWIND_FLUID_SIZES = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 28, 30, 32,
  34, 36, 42,
] as const;

export function shopperFluidMin(desktopPx: number): number {
  return FLUID_MIN[desktopPx] ?? Math.max(10, desktopPx - 2);
}

export function shopperFluidClamp(desktopPx: number): string {
  const min = shopperFluidMin(desktopPx);
  const delta = desktopPx - min;
  return `clamp(${min}px, calc(${min}px + ${delta} * ((100vw - ${SHOPPER_FLUID_MIN_PX}px) / ${FLUID_RANGE})), ${desktopPx}px)`;
}

/** Reference a desktop step token (fluid between 390px and 900px). */
export function fluidSize(desktopPx: number): string {
  return `var(--t-${desktopPx})`;
}

/** Pin fluid tokens to desktop px inside a scoped selector (no narrow-viewport shrink). */
export function shopperFluidDesktopPinVars(
  sizes: readonly number[],
): string {
  return sizes.map((size) => `--t-${size}: ${size}px;`).join("\n          ");
}

/** Map Tailwind arbitrary text sizes within shopper page shells to fluid tokens. */
function shopperPageTailwindFluidCss(): string {
  return SHOPPER_TAILWIND_FLUID_SIZES.map(
    (size) =>
      `.${SHOPPER_PAGE_CLASS} .text-\\[${size}px\\] { font-size: var(--t-${size}) !important; }`,
  ).join("\n");
}

/** Dialog typography rules scoped to shopper page shells. */
function shopperDialogFluidCss(): string {
  return `${shopperPageTailwindFluidCss()}
.${SHOPPER_PAGE_CLASS} [role="dialog"] > div:first-child {
  min-width: 0;
  align-items: flex-start;
}
.${SHOPPER_PAGE_CLASS} [role="dialog"] h2 {
  flex: 1 1 0%;
  min-width: 0;
  font-size: var(--t-24) !important;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.${SHOPPER_PAGE_CLASS} [role="dialog"] > div:first-child > button {
  flex-shrink: 0;
  margin-top: 2px;
}
.${SHOPPER_PAGE_CLASS} [role="dialog"] p:not([class*="text-"]) {
  font-size: var(--t-15);
}
.${SHOPPER_PAGE_CLASS} [role="dialog"] button.rounded-full {
  font-size: var(--t-16) !important;
}`;
}

/** Scoped CSS for shopper shells (select tickets, checkout, login, wallet, …). */
export function shopperPageTypeCss(): string {
  const vars = SHOPPER_FLUID_DESKTOP_SIZES.map(
    (size) => `  --t-${size}: ${shopperFluidClamp(size)};`,
  ).join("\n");

  return `.${SHOPPER_PAGE_CLASS} {
${vars}
  --bt-field-focus: var(--acc, var(--accent));
}
${shopperDialogFluidCss()}`;
}
