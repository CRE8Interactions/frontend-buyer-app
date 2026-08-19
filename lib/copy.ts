/**
 * Copy a URL the way the original Blocktickets frontend does
 * (`copy` in admin helpers / VenueCard.handleCopy).
 */
export function copy(
  text: string,
  setter?: (copied: boolean) => void,
  params?: string,
) {
  const url = params ? `${text}${params}` : text;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(url);
    setter?.(true);
    return;
  }
  if (typeof document === "undefined") return;
  const el = document.createElement("textarea");
  el.value = url;
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
    setter?.(true);
  } finally {
    document.body.removeChild(el);
  }
}

/** Copy the current page URL for venue/team share buttons. */
export function copyPageUrl(setter?: (copied: boolean) => void) {
  if (typeof window === "undefined") return;
  copy(window.location.href, setter);
}
