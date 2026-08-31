/**
 * The wallet's top-level sections and the URL each one owns. Section ids match
 * SeasonTickets' screen names so the nav, the rendered screen, and the address
 * bar cannot drift apart.
 */
export type WalletSection = "events" | "listings" | "resale" | "giving" | "profile";

export const WALLET_NAV: {
  id: WalletSection;
  label: string;
  href: string;
}[] = [
  { id: "events", label: "Tickets", href: "/wallet/my-tickets/" },
  { id: "listings", label: "Transfers", href: "/wallet/my-transfers/" },
  { id: "resale", label: "Listings", href: "/wallet/my-listings/" },
  { id: "giving", label: "Giving", href: "/wallet/giving/" },
  { id: "profile", label: "Profile", href: "/wallet/my-profile/" },
];

export function walletSectionHref(id: WalletSection) {
  return (
    WALLET_NAV.find((section) => section.id === id)?.href ||
    "/wallet/my-tickets/"
  );
}

/** Section prefixes without the trailing slash, e.g. `/wallet/my-tickets`. */
export const WALLET_SECTION_PREFIXES = WALLET_NAV.map((section) =>
  section.href.replace(/\/+$/, ""),
);

/** Ticket list and its event / flex-pack / package detail routes. */
export const WALLET_TICKETS_PREFIXES = [
  "/wallet/my-tickets",
];

function pathOnly(pathname = "") {
  return (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
}

function pathMatchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Section a wallet URL belongs to. Ticket detail routes
 * (`/wallet/my-tickets/order/:orderId`, `/wallet/my-tickets/order/:orderId/package/:uuid`) stay on Tickets;
 * anything else falls back to Tickets so the wallet always has a section to render.
 */
export function walletSectionFromPath(pathname = ""): WalletSection {
  const path = pathOnly(pathname);
  if (WALLET_TICKETS_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix))) {
    return "events";
  }
  const match = WALLET_NAV.find((section) => {
    const prefix = section.href.replace(/\/+$/, "");
    return pathMatchesPrefix(path, prefix);
  });
  return match?.id || "events";
}

/** Any wallet section route, including ticket and package detail pages. */
export function isWalletSectionPath(pathname = "") {
  const path = pathOnly(pathname);
  if (WALLET_TICKETS_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix))) {
    return true;
  }
  return WALLET_SECTION_PREFIXES.some((prefix) => pathMatchesPrefix(path, prefix));
}
