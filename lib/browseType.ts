import { SHOPPER_PAGE_CLASS } from "@/lib/branding";

/**
 * Browse / storefront type — no breakpoint font-size queries.
 * Display ramps with viewport clamps; body steps stay fixed.
 */

export const BROWSE_DISPLAY = {
  hero: "clamp(40px, 6.2vw, 76px)",
  statement: "clamp(40px, 7vw, 96px)",
  cta: "clamp(32px, 4.4vw, 54px)",
  h2: "clamp(30px, 4vw, 48px)",
  h3lg: "clamp(26px, 3vw, 40px)",
  lede: "clamp(15px, 1.4vw, 18px)",
} as const;

export const BROWSE_SIZE = {
  10: 10,
  11: 11,
  12: 12,
  13: 13,
  13.5: 13.5,
  14: 14,
  15: 15,
  16: 16,
  19: 19,
  26: 26,
  36: 36,
} as const;

export type BrowseSize = keyof typeof BROWSE_SIZE;

export const BROWSE_TRACK = {
  statement: "-0.03em",
  display: "-0.025em",
  card: "-0.01em",
  eyebrow: "0.16em",
  ctaEyebrow: "0.2em",
  label: "0.12em",
} as const;

/**
 * Unitless leading by role, not viewport. Bigger type uses a tighter ratio.
 * Dense UI (meta, prices, chips, date numerals) stays 1–1.4 or a control height.
 */
export const BROWSE_LEADING = {
  h2: 1.05,
  hero: 1.12,
  h3: 1.25,
  body: 1.6,
  relaxed: 1.7,
} as const;

export type BrowseLeading = keyof typeof BROWSE_LEADING;

export function browseLeading(role: BrowseLeading): string {
  return `var(--bt-leading-${role})`;
}

export function browsePx(step: BrowseSize): string {
  return `${BROWSE_SIZE[step]}px`;
}

/** Token used as `fontSize: browseSize(14)` or a named display ramp. */
export function browseSize(
  step: BrowseSize | keyof typeof BROWSE_DISPLAY,
): string {
  if (step in BROWSE_DISPLAY) {
    return BROWSE_DISPLAY[step as keyof typeof BROWSE_DISPLAY];
  }
  return browsePx(step as BrowseSize);
}

const FIXED_TOKEN_ALIASES: Record<number, string> = {
  10: browsePx(10),
  11: browsePx(11),
  12: browsePx(12),
  13: browsePx(13),
  13.5: browsePx(13.5),
  14: browsePx(14),
  15: browsePx(15),
  16: browsePx(16),
  17: browsePx(16),
  18: browsePx(16),
  19: browsePx(19),
  20: browsePx(19),
  21: BROWSE_DISPLAY.h3lg,
  22: browsePx(26),
  24: browsePx(26),
  25: browsePx(26),
  26: browsePx(26),
  28: browsePx(26),
  30: BROWSE_DISPLAY.h2,
  32: BROWSE_DISPLAY.cta,
  34: BROWSE_DISPLAY.cta,
  36: browsePx(36),
  40: BROWSE_DISPLAY.h3lg,
  42: BROWSE_DISPLAY.h3lg,
  56: BROWSE_DISPLAY.hero,
};

export function browseToken(desktopPx: number): string {
  return FIXED_TOKEN_ALIASES[desktopPx] ?? `${desktopPx}px`;
}

/** Scoped CSS vars for `.shopper-page` browse shells. */
export function browsePageTypeCss(): string {
  const vars = Object.entries(FIXED_TOKEN_ALIASES)
    .map(([size, value]) => `  --t-${size}: ${value};`)
    .join("\n");
  const tailwind = Object.keys(FIXED_TOKEN_ALIASES)
    .map(
      (size) =>
        `.${SHOPPER_PAGE_CLASS} .text-\\[${size}px\\] { font-size: var(--t-${size}) !important; }`,
    )
    .join("\n");

  return `.${SHOPPER_PAGE_CLASS} {
${vars}
  --bt-field-focus: var(--acc, var(--accent));
  --bt-leading-h2: ${BROWSE_LEADING.h2};
  --bt-leading-hero: ${BROWSE_LEADING.hero};
  --bt-leading-h3: ${BROWSE_LEADING.h3};
  --bt-leading-body: ${BROWSE_LEADING.body};
  --bt-leading-relaxed: ${BROWSE_LEADING.relaxed};
  line-height: var(--bt-leading-body);
}
.${SHOPPER_PAGE_CLASS} h1 {
  line-height: var(--bt-leading-h2);
}
.${SHOPPER_PAGE_CLASS} h2 {
  line-height: var(--bt-leading-h2);
}
.${SHOPPER_PAGE_CLASS} h3 {
  line-height: var(--bt-leading-h3);
}
.${SHOPPER_PAGE_CLASS} p {
  line-height: var(--bt-leading-body);
}
.${SHOPPER_PAGE_CLASS} .leading-tight {
  line-height: var(--bt-leading-h3) !important;
}
.${SHOPPER_PAGE_CLASS} .leading-snug {
  line-height: var(--bt-leading-h3) !important;
}
.${SHOPPER_PAGE_CLASS} .leading-relaxed {
  line-height: var(--bt-leading-body) !important;
}
.${SHOPPER_PAGE_CLASS} .leading-\\[1\\.05\\] {
  line-height: var(--bt-leading-h2) !important;
}
.${SHOPPER_PAGE_CLASS} .leading-\\[1\\.12\\] {
  line-height: var(--bt-leading-hero) !important;
}
${tailwind}`;
}
