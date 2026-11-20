import type { Metadata } from "next";
import type { ApiImage } from "@/lib/helpers";
import { formatEventWhen, imageUrl } from "@/lib/helpers";

export const SITE_NAME = "Blocktickets";
export const DEFAULT_TITLE = "Blocktickets — Sports-first ticketing";
export const DEFAULT_DESCRIPTION =
  "The ticketing platform built for leagues, teams, and venues. Sell more tickets. Keep more revenue. Run it all from one platform.";
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
  /** Secondary line on the OG image (e.g. city · date). */
  subtitle?: string;
  /** CTA button label on the OG image. */
  cta?: string;
  keywords?: string | string[];
  type?: "website" | "article";
  noIndex?: boolean;
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

function capitalize(value?: string | null): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripHtml(value?: string | null): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
  subtitle,
  cta = "Learn More",
  keywords,
  type = "website",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const shortTitle = truncate(title, TITLE_MAX);
  const desc = truncate(stripHtml(description) || DEFAULT_DESCRIPTION, 160);
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
      title: shortTitle,
      description: desc,
      url,
      images: [imageMeta],
    },
    twitter: {
      card: "summary_large_image",
      title: shortTitle,
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

type EventSeo = {
  name?: string;
  start?: string;
  summary?: string;
  image?: ApiImage;
  venue?: {
    name?: string;
    timezone?: string;
    address?: Array<{ city?: string; state?: string }> | { city?: string; state?: string };
  };
};

type OrgSeo = {
  organization?: { name?: string; image?: ApiImage };
};

type VenueSeo = {
  name?: string;
  description?: string;
  image?: ApiImage | ApiImage[];
};

type FlexPackSeo = {
  name?: string;
  description?: string;
  image?: ApiImage;
  venue?: { name?: string; image?: ApiImage | ApiImage[] };
  organization?: { name?: string };
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

function venueAddress(venue?: EventSeo["venue"]) {
  const addr = Array.isArray(venue?.address) ? venue?.address[0] : venue?.address;
  return {
    city: capitalize(addr?.city),
    state: capitalize(addr?.state),
  };
}

export async function eventPageMetadata(
  slug: string,
  shortcode: string,
  path: string,
  code = "0",
): Promise<Metadata> {
  const data = await apiGet<{ event?: EventSeo }>(
    `/events/${encodeURIComponent(slug)}/${encodeURIComponent(shortcode)}?code=${encodeURIComponent(code)}`,
  );
  const event = data?.event;
  if (!event?.name) {
    return pageMetadata({
      title: `Event Tickets | ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      path,
      cta: "Buy Tickets",
    });
  }

  const name = event.name.trim();
  const { city, state } = venueAddress(event.venue);
  const seoDate = formatEventWhen(
    event.start,
    event.venue?.timezone,
    "MMM D, YYYY",
  );
  const venueName = event.venue?.name?.trim() || "";
  const title = fitTitle(name, " Tickets");
  const description =
    stripHtml(event.summary) ||
    [
      `Buy tickets to ${name}`,
      city ? `in ${city}` : "",
      seoDate ? `on ${seoDate}` : "",
      venueName ? `at ${venueName}` : "",
      city && state ? `(${city}, ${state})` : "",
    ]
      .filter(Boolean)
      .join(" ");
  const keywords = [
    `${name} Tickets`,
    seoDate,
    venueName && city && state ? `${venueName} - ${city}, ${state}` : venueName,
  ].filter(Boolean);
  const subtitle = [city, seoDate].filter(Boolean).join(" · ");

  return pageMetadata({
    title,
    description,
    path,
    image: absoluteImageUrl(event.image),
    ogHeadline: name,
    subtitle,
    cta: "Buy Tickets",
    keywords,
  });
}

export async function organizationPageMetadata(
  slug: string,
): Promise<Metadata> {
  const path = `/${slug}/`;
  const data = await apiGet<OrgSeo>(
    `/organizations/storefront/${encodeURIComponent(slug)}`,
  );
  const org = data?.organization;
  if (!org?.name) {
    return pageMetadata({
      title: `Tickets & Passes | ${SITE_NAME}`,
      description: "Browse and buy tickets, season passes, and flex packs.",
      path,
      cta: "Browse Tickets",
    });
  }

  return pageMetadata({
    title: fitTitle(org.name, " Tickets"),
    description: `Browse and buy tickets, season passes, and flex packs for ${org.name}.`,
    path,
    image: absoluteImageUrl(org.image),
    ogHeadline: org.name,
    subtitle: "Tickets, passes & flex packs",
    cta: "Browse Tickets",
    keywords: `Buy tickets, season passes, and flex packs for ${org.name}`,
  });
}

export async function venuePageMetadata(slug: string): Promise<Metadata> {
  const path = `/venue/${slug}/`;
  const data = await apiGet<{ data?: VenueSeo[] } | VenueSeo[]>(
    `/venues?filters[slug][$eq]=${encodeURIComponent(slug)}`,
  );
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  const venue = list[0];
  if (!venue?.name) {
    return pageMetadata({
      title: `Venue | ${SITE_NAME}`,
      description: "Find upcoming events and buy tickets.",
      path,
      cta: "View Events",
    });
  }

  return pageMetadata({
    title: fitTitle(venue.name, " Events"),
    description:
      stripHtml(venue.description) ||
      `Buy tickets and find upcoming events at ${venue.name}.`,
    path,
    image: absoluteImageUrl(venue.image),
    ogHeadline: venue.name,
    subtitle: "Upcoming events & tickets",
    cta: "View Events",
    keywords: `Buy tickets and find event information for upcoming events by ${venue.name}`,
  });
}

export async function packagePageMetadata(
  uuid: string,
  path: string,
): Promise<Metadata> {
  // Do NOT call get-package-fe here — for large venues it returns 30MB+
  // (full seatmap + every package ticket) and blocks the page / Next.js cache.
  void uuid;
  return pageMetadata({
    title: `Season Package | ${SITE_NAME}`,
    description: "Browse season ticket packages and passes.",
    path,
    cta: "View Package",
  });
}

export async function flexPackPageMetadata(
  uuid: string,
  path: string,
): Promise<Metadata> {
  const data = await apiGet<FlexPackSeo>(
    `/flex-pack/get-flex-pack?uuid=${encodeURIComponent(uuid)}`,
  );
  const flex =
    data && typeof data === "object" && "name" in data
      ? data
      : ((data as { flexPack?: FlexPackSeo } | null)?.flexPack ?? null);

  if (!flex?.name) {
    return pageMetadata({
      title: `Flex Pack | ${SITE_NAME}`,
      description: "Browse flex pack ticket offers.",
      path,
      cta: "View Flex Pack",
    });
  }

  const context = flex.organization?.name || flex.venue?.name;
  return pageMetadata({
    title: fitTitle(flex.name, context ? ` | ${truncate(context, 20)}` : ""),
    description:
      stripHtml(flex.description) ||
      `Buy the ${flex.name} flex pack${context ? ` from ${context}` : ""}.`,
    path,
    image: absoluteImageUrl(flex.image || flex.venue?.image),
    ogHeadline: flex.name,
    subtitle: context || "Flex pack",
    cta: "View Flex Pack",
  });
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
  path: string,
): Promise<Metadata> {
  const data = await apiGet<AccessPassSeo[] | AccessPassSeo>(
    `/access-pass-templates/get-access-pass?uuid=${encodeURIComponent(uuid)}`,
  );
  const pass = Array.isArray(data)
    ? data[0]
    : data && typeof data === "object" && "name" in data
      ? data
      : null;

  if (!pass?.name) {
    return pageMetadata({
      title: `Access Pass | ${SITE_NAME}`,
      description: "Browse access pass offers.",
      path,
      cta: "View Access Pass",
    });
  }

  const context = pass.organization?.name || pass.venue?.name;
  return pageMetadata({
    title: fitTitle(pass.name, context ? ` | ${truncate(context, 20)}` : ""),
    description:
      stripHtml(pass.description) ||
      `Buy the ${pass.name} access pass${context ? ` from ${context}` : ""}.`,
    path,
    image: absoluteImageUrl(pass.artwork || pass.venue?.image),
    ogHeadline: pass.name,
    subtitle: context || "Access pass",
    cta: "View Access Pass",
  });
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
  const campaign = data?.campaign;
  if (!campaign?.title) {
    return pageMetadata({
      title: `Fundraiser | ${SITE_NAME}`,
      description: "Support this fundraising campaign.",
      path,
      cta: "Donate",
    });
  }

  return pageMetadata({
    title: fitTitle(campaign.title, " Fundraiser"),
    description:
      stripHtml(campaign.description) || "Support this fundraising campaign.",
    path,
    image: absoluteImageUrl(campaign.heroImage),
    ogHeadline: campaign.title,
    subtitle: "Support this campaign",
    cta: "Donate",
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
