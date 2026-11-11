import type { Metadata } from "next";
import type { ApiImage } from "@/lib/helpers";
import {
  formatEventWhen,
  imageUrl,
  toIanaTimezone,
  type TimezoneLike,
} from "@/lib/helpers";

export const SITE_NAME = "Blocktickets";
export const DEFAULT_TITLE = "Blocktickets — Sports-first ticketing";
export const DEFAULT_DESCRIPTION =
  "The ticketing platform built for leagues, teams, and venues. Sell more tickets. Keep more revenue. Run it all from one platform.";

/** Legacy consumer homepage (`HomePage`). */
export const HOME_PAGE_TITLE =
  "Event experiences that go beyond tickets. | Blocktickets";
export const HOME_PAGE_DESCRIPTION =
  "We combine digital collectibles with tickets to control secondary market revenue, eliminate ticket fraud, and build community between event organizers, artists, and fans like never before.";

/** Legacy browse page. The tab title is longer than the social title. */
export const BROWSE_PAGE_TITLE =
  "Find tickets to interesting events in your area | Blocktickets";
export const BROWSE_PAGE_OG_TITLE =
  "Find tickets to events in your area | Blocktickets";
export const BROWSE_PAGE_DESCRIPTION =
  "Looking for something exciting?  Search here for to find events in your area on Blocktickets.";
export const DEFAULT_OG_IMAGE =
  "https://blocktickets.nyc3.cdn.digitaloceanspaces.com/logo.png";

/** Platforms truncate around 60; keep a little headroom. */
export const TITLE_MAX = 60;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

type PageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  /** Direct media URL for og:image (event flyer, org logo, etc.). */
  image?: string | null;
  /** Optional longer headline baked into the OG image. Defaults to title. */
  ogHeadline?: string;
  /** When set, og:title and twitter:title use this instead of `title`. */
  ogTitle?: string;
  /** Secondary line on the OG image (e.g. city · date). */
  subtitle?: string;
  /** CTA button label on the OG image. */
  cta?: string;
  keywords?: string | string[];
  type?: "website" | "article";
  noIndex?: boolean;
  /**
   * Keep the legacy buyer-app strings. Shopper titles are not cut at 60
   * characters, and descriptions follow the legacy 200-character plain text.
   */
  exactCopy?: boolean;
};

function normalizeSiteUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Canonical site origin for metadataBase, og:url, and absolute image paths. */
export function getSiteUrl(): string {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeSiteUrl(process.env.VERCEL_URL) ||
    "https://www.blocktickets.xyz"
  );
}

export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  if (!path || path === "/") return `${base}/`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function absoluteImageUrl(
  img?: ApiImage | ApiImage[] | string | null,
  fallback = DEFAULT_OG_IMAGE,
): string {
  const raw = Array.isArray(img) ? img[0] : img;
  const resolved = imageUrl(raw, fallback);
  if (!resolved) return fallback;
  if (/^https?:\/\//i.test(resolved)) return resolved;
  if (resolved.startsWith("/")) return absoluteUrl(resolved);
  return resolved;
}

function stripHtml(value?: string | null): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Legacy `plainText`: strip markup, decode entities, cap at 200 characters. */
export function plainText(value?: unknown, maxLength = 200): string {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function truncate(value: string, max = TITLE_MAX): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Prefer keeping a suffix (e.g. " Tickets") when truncating long names. */
export function fitTitle(base: string, suffix = "", max = TITLE_MAX): string {
  const cleanBase = base.trim().replace(/\s+/g, " ");
  const cleanSuffix = suffix;
  if (!cleanSuffix) return truncate(cleanBase, max);
  if (`${cleanBase}${cleanSuffix}`.length <= max) {
    return `${cleanBase}${cleanSuffix}`;
  }
  const room = Math.max(8, max - cleanSuffix.length);
  return `${truncate(cleanBase, room)}${cleanSuffix}`;
}

/**
 * Case-study / marketing titles often include the brand already.
 * Keep them under the 60-char search/social limit.
 */
export function fitBrandedTitle(title: string, max = TITLE_MAX): string {
  return truncate(title.replace(/\s+/g, " ").trim(), max);
}

export function buildOgImageUrl({
  title,
  subtitle,
  image,
  cta = "Buy Tickets",
}: {
  title: string;
  subtitle?: string;
  image?: string | null;
  cta?: string;
}): string {
  const params = new URLSearchParams();
  params.set("title", title.slice(0, 90));
  if (subtitle) params.set("subtitle", subtitle.slice(0, 60));
  if (image) params.set("image", image);
  params.set("cta", cta.slice(0, 24));
  // Use trailing slash — next.config trailingSlash:true 308s /api/og?... → /api/og/?...
  // and most social scrapers do not follow redirects for og:image.
  return `/api/og/?${params.toString()}`;
}

/** Build a complete Next.js Metadata object with Open Graph + Twitter tags. */
export function pageMetadata({
  title,
  description,
  path = "/",
  image,
  ogHeadline,
  ogTitle,
  subtitle,
  cta = "Learn More",
  keywords,
  type = "website",
  noIndex = false,
  exactCopy = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const shortTitle = exactCopy ? title.trim() : truncate(title, TITLE_MAX);
  const socialTitle = exactCopy ? (ogTitle || shortTitle).trim() : shortTitle;
  const desc = exactCopy
    ? description.trim()
    : truncate(stripHtml(description) || DEFAULT_DESCRIPTION, 160);
  // Prefer the real media URL (event flyer, org logo, etc.). Social scrapers
  // are unreliable with generated /api/og cards and redirects.
  const ogImage = image
    ? absoluteImageUrl(image)
    : absoluteUrl(
        buildOgImageUrl({
          title: ogHeadline || shortTitle,
          subtitle,
          cta,
        }),
      );

  const imageMeta = {
    url: ogImage,
    ...(image
      ? {}
      : { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }),
    alt: shortTitle,
  };

  return {
    title: shortTitle,
    description: desc,
    keywords,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      siteName: SITE_NAME,
      title: socialTitle,
      description: desc,
      url,
      images: [imageMeta],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: desc,
      images: [ogImage],
    },
  };
}

// ─── Server-safe public API fetches (avoid client auth module) ───────────────

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
}

async function apiGet<T = unknown>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type SeoImage = ApiImage | ApiImage[] | null;

type SeoAddress = { city?: string | null; state?: string | null };

type SeoOrganization = {
  name?: string | null;
  image?: SeoImage;
  branding?: { logo?: SeoImage } | null;
};

type EventSeo = {
  name?: string | null;
  start?: string | null;
  summary?: string | null;
  date_tbd?: boolean | null;
  start_tbd?: boolean | null;
  time_tbd?: boolean | null;
  display_start_time?: boolean | null;
  doorsOpen?: string | null;
  realDoorsOpen?: string | null;
  image?: SeoImage;
  venue?: {
    name?: string | null;
    timezone?: TimezoneLike;
    image?: SeoImage;
    address?: SeoAddress | SeoAddress[] | null;
  } | null;
  organization?: SeoOrganization | null;
};

type OrgSeo = {
  organization?: { name?: string; image?: ApiImage };
};

type VenueSeo = {
  name?: string | null;
  description?: string | null;
  image?: SeoImage;
  banner?: SeoImage;
};

type FlexPackSeo = {
  name?: string | null;
  description?: string | null;
  image?: SeoImage;
  organization?: SeoOrganization | null;
};

type PackageSeo = {
  name?: string | null;
  description?: string | null;
  image?: SeoImage;
  venue?: {
    name?: string | null;
    image?: SeoImage;
  } | null;
  organization?: SeoOrganization | null;
};

type OpenGraphCopy = {
  title: string;
  description: string;
  image: string;
};

type CampaignSeo = {
  campaign?: {
    title?: string;
    description?: string;
    heroImage?: ApiImage;
  };
};

type GroupInviteSeo = {
  data?: Array<{
    attributes?: {
      event?: {
        data?: {
          attributes?: {
            name?: string;
            start?: string;
            image?: ApiImage;
            venue?: {
              data?: {
                attributes?: {
                  name?: string;
                  timezone?: string;
                };
              };
            };
          };
        };
      };
    };
  }>;
};

const OPEN_GRAPH_FALLBACK = {
  event: {
    title: `Event Tickets | ${SITE_NAME}`,
    description: "Buy event tickets on Blocktickets.",
  },
  venue: {
    title: `Event Calendar | ${SITE_NAME}`,
    description: "Buy tickets and find event information for upcoming events.",
  },
  package: {
    title: `Season Tickets | ${SITE_NAME}`,
    description: "Buy season tickets on Blocktickets.",
  },
  flexPack: {
    title: `Flex Pack | ${SITE_NAME}`,
    description: "Buy a flex pack from Blocktickets.",
  },
} as const;

function clean(value?: string | null): string {
  return String(value || "").trim();
}

function titleCase(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function stateLabel(value?: string | null): string {
  const raw = String(value || "").trim();
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();
  return titleCase(raw);
}

function scheduleZone(timezone?: TimezoneLike): string {
  const normalized = typeof timezone === "string" ? timezone.trim() : timezone;
  const iana = toIanaTimezone(normalized || undefined);
  if (iana?.includes("/")) return iana;
  return "America/New_York";
}

function schedulePart(start: string, zone: string, format: string): string {
  const label = formatEventWhen(start, zone, format);
  if (!label || label === "Invalid date") return "";
  return label;
}

function formatOpenGraphSchedule(event: EventSeo, timezone?: TimezoneLike): string {
  if (event.date_tbd || event.start_tbd) return "Date & Time TBD";
  const start = clean(event.start);
  if (!start) return "";
  const zone = scheduleZone(timezone);
  const dateLabel = schedulePart(start, zone, "MMM D");
  if (!dateLabel) return "";
  if (event.time_tbd || event.display_start_time === false) return dateLabel;
  const timeLabel = schedulePart(start, zone, "h:mm A");
  return timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;
}

/** Wallet ticket tab: `{event} | Blocktickets`. */
function eventDetailTabTitle(event?: EventSeo | null): string {
  const name = clean(event?.name);
  return name ? `${name} | ${SITE_NAME}` : "";
}

function usableImageUrl(image: unknown): string {
  const url = imageUrl(image, "").trim();
  if (!url || url === "undefined" || url === "null") return "";
  return url;
}

function pickImage(...images: unknown[]): string {
  for (const image of images) {
    const url = usableImageUrl(image);
    if (url) return url;
  }
  return DEFAULT_OG_IMAGE;
}

function withOpenGraphImage(copy: OpenGraphCopy, path: string, cta: string): Metadata {
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path,
    image: copy.image,
    cta,
    keywords: copy.description,
    exactCopy: true,
  });
}

/** Event share title, description, and image. Image falls through to the logo. */
export function eventOpenGraph(event?: EventSeo | null): OpenGraphCopy {
  const name = clean(event?.name);
  if (!name) {
    return { ...OPEN_GRAPH_FALLBACK.event, image: DEFAULT_OG_IMAGE };
  }

  const address = Array.isArray(event?.venue?.address)
    ? event?.venue?.address[0]
    : event?.venue?.address;
  const city = titleCase(address?.city);
  const state = stateLabel(address?.state);
  const schedule = formatOpenGraphSchedule(event || {}, event?.venue?.timezone);
  const venueName = clean(event?.venue?.name);
  const place = [venueName, [city, state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" - ");
  let title = `Buy Ticket to ${name}`;
  if (city) title += ` in ${city}`;
  if (schedule) title += ` on ${schedule}`;

  return {
    title,
    description:
      plainText(event?.summary) ||
      [`${name} Tickets`, schedule, place].filter(Boolean).join(", "),
    image: pickImage(
      event?.image,
      event?.organization?.branding?.logo,
      event?.organization?.image,
      event?.venue?.image,
    ),
  };
}

/** Venue calendar share title, description, and image. */
export function venueOpenGraph(venue?: VenueSeo | null): OpenGraphCopy {
  const name = clean(venue?.name);
  if (!name && !venue) {
    return { ...OPEN_GRAPH_FALLBACK.venue, image: DEFAULT_OG_IMAGE };
  }

  return {
    title: name ? `${name} | Event Calendar` : OPEN_GRAPH_FALLBACK.venue.title,
    description:
      plainText(venue?.description) ||
      (name
        ? `Calendar | Buy tickets and find event information for upcoming events by ${name}`
        : OPEN_GRAPH_FALLBACK.venue.description),
    image: pickImage(venue?.image, venue?.banner),
  };
}

/** Season-ticket share copy. Same wording as legacy `buildPackageOpenGraph`. */
export function packageOpenGraph(eventPackage?: PackageSeo | null): OpenGraphCopy {
  const name = clean(eventPackage?.name);
  if (!name && !eventPackage) {
    return { ...OPEN_GRAPH_FALLBACK.package, image: DEFAULT_OG_IMAGE };
  }

  return {
    title: name ? `${name} | Season Tickets` : OPEN_GRAPH_FALLBACK.package.title,
    description:
      plainText(eventPackage?.description) ||
      `Buy season tickets for ${name || "this package"}.`,
    image: pickImage(
      eventPackage?.image,
      eventPackage?.venue?.image,
      eventPackage?.organization?.branding?.logo,
      eventPackage?.organization?.image,
    ),
  };
}

/** Flex-pack share title, description, and image. */
export function flexPackOpenGraph(flexPack?: FlexPackSeo | null): OpenGraphCopy {
  const name = clean(flexPack?.name);
  const organization = clean(flexPack?.organization?.name);
  if (!name && !flexPack) {
    return { ...OPEN_GRAPH_FALLBACK.flexPack, image: DEFAULT_OG_IMAGE };
  }

  return {
    title: name ? `${name} | ${SITE_NAME}` : OPEN_GRAPH_FALLBACK.flexPack.title,
    description:
      plainText(flexPack?.description) ||
      `Buy a flex pack from ${organization || SITE_NAME}.`,
    image: pickImage(
      flexPack?.image,
      flexPack?.organization?.branding?.logo,
      flexPack?.organization?.image,
    ),
  };
}

/** Browser tab for a season package: `{name} | Season Tickets`. */
export function packageTabTitle(name?: string | null): string {
  const value = clean(name);
  return value ? `${value} | Season Tickets` : "";
}

/** Browser tab for a flex pack: `{name} | Blocktickets`. */
export function flexPackTabTitle(name?: string | null): string {
  const value = clean(name);
  return value ? `${value} | ${SITE_NAME}` : "";
}

/** Browser tab for an access pass: `{name} | Blocktickets`. */
export function accessPassNameTabTitle(name?: string | null): string {
  const value = clean(name);
  return value ? `${value} | ${SITE_NAME}` : "";
}

/**
 * Tab title for checkout and confirmation. An event keeps its purchase
 * title. A package, flex pack, or access pass is "Buy {name} | …".
 */
export function purchaseTabTitle(source?: {
  event?: EventSeo | null;
  package?: PackageSeo | null;
  flex_pack?: FlexPackSeo | null;
  access_pass_template?: {
    name?: string | null;
    venue?: { name?: string | null } | null;
  } | null;
} | null): string {
  if (!source) return "";
  const packageName = clean(source.package?.name);
  if (packageName) return `Buy ${packageName} | Season Tickets`;
  const flexName = clean(source.flex_pack?.name);
  if (flexName) return `Buy ${flexName} | ${SITE_NAME}`;
  const passName = clean(source.access_pass_template?.name);
  if (passName) return `Buy ${passName} | ${SITE_NAME}`;
  if (clean(source.access_pass_template?.venue?.name)) {
    return accessPassTabTitle(source.access_pass_template);
  }
  if (clean(source.event?.name)) return eventOpenGraph(source.event).title;
  return "";
}

/**
 * Keep a purchase tab in place. The site title is applied again after the
 * confirmation page renders, which would otherwise replace this one.
 */
export function holdDocumentTitle(title: string): () => void {
  if (!title || typeof document === "undefined") return () => undefined;
  const apply = () => {
    if (document.title !== title) document.title = title;
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  return () => observer.disconnect();
}

export type WalletSectionId =
  | "events"
  | "listings"
  | "resale"
  | "giving"
  | "profile";

/** Legacy wallet headings. List pages do not set a Helmet title of their own. */
export function walletSectionTabTitle(section: WalletSectionId = "events"): string {
  switch (section) {
    case "listings":
      return `My transfers | ${SITE_NAME}`;
    case "resale":
      return `My listings | ${SITE_NAME}`;
    case "giving":
      return `Giving | ${SITE_NAME}`;
    case "profile":
      return `Profile | ${SITE_NAME}`;
    default:
      return `My tickets | ${SITE_NAME}`;
  }
}

/** Wallet detail tab: `{name} | Blocktickets`. */
function walletProductTabTitle(name?: string | null): string {
  const value = clean(name);
  return value ? `${value} | ${SITE_NAME}` : "";
}

/**
 * Tab title for the wallet screen that is open. An event, flex pack, or
 * access pass is its name and Blocktickets. A package is its name and
 * Season Tickets.
 */
export function walletViewTabTitle(view: {
  section?: WalletSectionId;
  event?: EventSeo | null;
  seasonPackage?: { name?: string | null } | null;
  flexPack?: { name?: string | null } | null;
  accessPass?: { name?: string | null } | null;
}): string {
  if (view.accessPass) {
    return walletProductTabTitle(view.accessPass.name) || `Access Pass | ${SITE_NAME}`;
  }
  if (view.seasonPackage) {
    return packageTabTitle(view.seasonPackage.name) || walletSectionTabTitle("events");
  }
  if (view.flexPack) {
    return walletProductTabTitle(view.flexPack.name) || walletSectionTabTitle("events");
  }
  if (clean(view.event?.name)) return eventDetailTabTitle(view.event);
  return walletSectionTabTitle(view.section);
}

type LegacyOpenGraphMeta = {
  title: string;
  description: string;
  image?: string;
};

/**
 * Legacy `/open-graph/meta` returns the same title, description, and image
 * the buyer app puts in the tab, without the full package or seatmap payload.
 */
async function fetchLegacyOpenGraph(
  path: string,
): Promise<LegacyOpenGraphMeta | null> {
  const data = await apiGet<{
    title?: string;
    description?: string;
    image?: string;
  }>(`/open-graph/meta?path=${encodeURIComponent(path)}`);
  const title = clean(data?.title);
  const description = clean(data?.description);
  if (!title || !description) return null;
  return { title, description, image: clean(data?.image) || undefined };
}

function shopperMetadata(
  meta: { title: string; description: string; image?: string },
  path: string,
  cta: string,
): Metadata {
  return pageMetadata({
    title: meta.title,
    description: meta.description,
    path,
    image: meta.image,
    cta,
    keywords: meta.description,
    exactCopy: true,
  });
}

async function legacyOrLocal(
  path: string,
  fallbackTitle: string,
  loadLocal: () => Promise<OpenGraphCopy>,
  cta: string,
): Promise<Metadata> {
  const remote = await fetchLegacyOpenGraph(path);
  if (remote && remote.title !== fallbackTitle) {
    return shopperMetadata(remote, path, cta);
  }
  return withOpenGraphImage(await loadLocal(), path, cta);
}

/** Legacy organization tab: `{name} | Tickets & Passes`. */
export function organizationShareCopy(org?: { name?: string | null } | null) {
  const name = clean(org?.name);
  return {
    title: name ? `${name} | Tickets & Passes` : "Tickets & Passes",
    description: `Browse and buy tickets, season passes, and flex packs for ${name || "this organization"}.`,
    keywords: `Buy tickets, season passes, and flex packs for ${name || "events"}`,
  };
}

/** Legacy public access-pass tab: `{venue} | Access Pass`. */
export function accessPassTabTitle(pass?: {
  venue?: { name?: string | null } | null;
} | null) {
  return `${clean(pass?.venue?.name) || "Venue"} | Access Pass`;
}

/** Legacy fundraiser tab: `{title} | Fundraiser`. */
export function fundraiserShareCopy(campaign?: {
  title?: string | null;
  description?: string | null;
} | null) {
  const title = clean(campaign?.title);
  return {
    title: title ? `${title} | Fundraiser` : "Fundraiser",
    description:
      plainText(campaign?.description) || "Support this fundraising campaign.",
  };
}

/** Legacy waiting-room tab. Empty when the event name is not known yet. */
export function waitingRoomTabTitle(eventName?: string | null) {
  const name = clean(eventName);
  return name ? `Waiting Room — ${name}` : "";
}

/** Legacy in-venue menu tab. */
export function menuTabTitle(orgName?: string | null, pickup = false) {
  return `${clean(orgName) || "In-Suite Dining"} | ${pickup ? "Menu" : "Suite Menu"}`;
}

export async function eventPageMetadata(
  slug: string,
  shortcode: string,
  path: string,
  code = "0",
): Promise<Metadata> {
  return legacyOrLocal(
    path,
    OPEN_GRAPH_FALLBACK.event.title,
    async () => {
      const data = await apiGet<{ event?: EventSeo }>(
        `/events/${encodeURIComponent(slug)}/${encodeURIComponent(shortcode)}?code=${encodeURIComponent(code)}`,
      );
      return eventOpenGraph(data?.event);
    },
    "Buy Tickets",
  );
}

export async function organizationPageMetadata(
  slug: string,
): Promise<Metadata> {
  const path = `/${slug}/`;
  const data = await apiGet<OrgSeo>(
    `/organizations/storefront/${encodeURIComponent(slug)}`,
  );
  const copy = organizationShareCopy(data?.organization);
  return pageMetadata({
    ...copy,
    path,
    image: data?.organization?.name
      ? absoluteImageUrl(data.organization.image)
      : undefined,
    cta: "Browse Tickets",
    exactCopy: true,
  });
}

export async function venuePageMetadata(slug: string): Promise<Metadata> {
  const path = `/venue/${slug}/`;
  return legacyOrLocal(
    path,
    OPEN_GRAPH_FALLBACK.venue.title,
    async () => {
      const data = await apiGet<{ data?: VenueSeo[] } | VenueSeo[]>(
        `/venues?filters[slug][$eq]=${encodeURIComponent(slug)}`,
      );
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      return venueOpenGraph(list[0]);
    },
    "View Events",
  );
}

export async function packagePageMetadata(
  uuid: string,
  path: string,
): Promise<Metadata> {
  // get-package-fe is 30MB+ for large venues. Legacy tab copy comes from
  // /open-graph/meta, which loads only the name, description, and images.
  void uuid;
  const remote = await fetchLegacyOpenGraph(path);
  if (remote) return shopperMetadata(remote, path, "View Package");
  return withOpenGraphImage(packageOpenGraph(null), path, "View Package");
}

export async function flexPackPageMetadata(
  uuid: string,
  path: string,
): Promise<Metadata> {
  return legacyOrLocal(
    path,
    OPEN_GRAPH_FALLBACK.flexPack.title,
    async () => {
      const data = await apiGet<FlexPackSeo>(
        `/flex-pack/get-flex-pack?uuid=${encodeURIComponent(uuid)}`,
      );
      const flex =
        data && typeof data === "object" && "name" in data
          ? data
          : ((data as { flexPack?: FlexPackSeo } | null)?.flexPack ?? null);
      return flexPackOpenGraph(flex);
    },
    "View Flex Pack",
  );
}

export async function waitingRoomPageMetadata(
  slug: string,
  shortcode: string,
  code = "0",
): Promise<Metadata> {
  const data = await apiGet<{ event?: EventSeo }>(
    `/events/${encodeURIComponent(slug)}/${encodeURIComponent(shortcode)}?code=${encodeURIComponent(code)}`,
  );
  const title = waitingRoomTabTitle(data?.event?.name);
  return title ? { title } : {};
}

type AccessPassSeo = {
  name?: string;
  description?: string;
  artwork?: ApiImage;
  organization?: { name?: string };
  venue?: { name?: string; image?: ApiImage };
};

export async function accessPassPageMetadata(
  uuid: string,
  _path: string,
): Promise<Metadata> {
  const data = await apiGet<AccessPassSeo[] | AccessPassSeo>(
    `/access-pass-templates/get-access-pass?uuid=${encodeURIComponent(uuid)}`,
  );
  const pass = Array.isArray(data)
    ? data[0]
    : data && typeof data === "object" && "name" in data
      ? data
      : null;

  return { title: accessPassNameTabTitle(pass?.name) || accessPassTabTitle(pass) };
}

export async function fundraiserPageMetadata(
  campaignSlug: string,
  path: string,
  opts: { organizationUUID?: string; organizationSlug?: string } = {},
): Promise<Metadata> {
  const params = new URLSearchParams();
  if (opts.organizationUUID) params.set("organizationUUID", opts.organizationUUID);
  if (opts.organizationSlug) params.set("organizationSlug", opts.organizationSlug);
  const qs = params.toString();
  const data = await apiGet<CampaignSeo>(
    `/fundraising-campaigns/public/${encodeURIComponent(campaignSlug)}${qs ? `?${qs}` : ""}`,
  );
  const copy = fundraiserShareCopy(data?.campaign);
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path,
    image: data?.campaign?.heroImage
      ? absoluteImageUrl(data.campaign.heroImage)
      : undefined,
    cta: "Donate",
    exactCopy: true,
  });
}

export async function groupInvitePageMetadata(
  groupCode: string,
): Promise<Metadata> {
  const path = `/group/${groupCode}/`;
  const data = await apiGet<GroupInviteSeo>(
    `/group-purchase-invitations?populate=*&filters[groupCode][$eq]=${encodeURIComponent(groupCode)}`,
  );
  const event = data?.data?.[0]?.attributes?.event?.data?.attributes;
  if (!event?.name) {
    return pageMetadata({
      title: `Group Invite | ${SITE_NAME}`,
      description: "Join a group ticket purchase.",
      path,
      cta: "Join Group",
    });
  }

  const venueName = event.venue?.data?.attributes?.name || "";
  const when = formatEventWhen(
    event.start,
    event.venue?.data?.attributes?.timezone,
    "MMM D, YYYY",
  );

  return pageMetadata({
    title: fitTitle(event.name, " Group Tickets"),
    description: [
      `You're invited to join a group purchase for ${event.name}`,
      when,
      venueName,
    ]
      .filter(Boolean)
      .join(" · "),
    path,
    image: absoluteImageUrl(event.image),
    ogHeadline: event.name,
    subtitle: [when, venueName].filter(Boolean).join(" · "),
    cta: "Join Group",
  });
}
