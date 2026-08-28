/** Paths whose Blocktickets nav lockup should send shoppers to marketing home. */
const HOME_LOGO_PATHS = new Set([
  "/",
  "/browse",
  "/our-story",
  "/sell",
  "/show",
  "/purchase-policy",
  "/terms-conditions",
  "/privacy-policy",
  "/disclaimer",
  "/cookies-policy",
]);

export function normalizeNavPath(pathname?: string | null): string {
  const path = (pathname || "").split("?")[0].replace(/\/+$/, "");
  return path || "/";
}

/** Browse for app chrome; `/` on browse, home, our story, legal, sell, and show. */
export function blockticketsNavLogoHref(pathname?: string | null): string {
  return HOME_LOGO_PATHS.has(normalizeNavPath(pathname)) ? "/" : "/browse";
}
