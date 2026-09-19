import { browsePageTypeCss } from "@/lib/browseType";
import { SHOPPER_PAGE_CLASS } from "@/lib/branding";

export { SHOPPER_PAGE_CLASS };

/** Reference a browse type token (`--t-N` on `.shopper-page`). */
export function fluidSize(desktopPx: number): string {
  return `var(--t-${desktopPx})`;
}

/** Dialog typography rules scoped to shopper page shells. */
function shopperDialogFluidCss(): string {
  return `
.${SHOPPER_PAGE_CLASS} [role="dialog"] > div:first-child {
  min-width: 0;
  align-items: flex-start;
}
.${SHOPPER_PAGE_CLASS} [role="dialog"] h2 {
  flex: 1 1 0%;
  min-width: 0;
  font-size: var(--t-24) !important;
  letter-spacing: -0.01em;
  line-height: var(--bt-leading-h3);
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
  return `${browsePageTypeCss()}
${shopperDialogFluidCss()}`;
}
