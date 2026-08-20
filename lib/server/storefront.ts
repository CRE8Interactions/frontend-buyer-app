import {
  firstVenueWebsiteHref,
  venueWebsiteFromUpcomingEvents,
} from "@/lib/venueWebsite";

/** Server-side storefront fetch for org routes (SSR loader branding). */
export type StorefrontPayload = {
  organization?: {
    name?: string;
    slug?: string;
    image?: unknown;
    primaryColor?: string;
    accentColor?: string;
    branding?: {
      enabled?: boolean;
      primaryColor?: string;
      buttonColor?: string;
      logo?: unknown;
      darkLogo?: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  venues?: unknown[];
  events?: unknown[];
  packages?: unknown[];
  flexPacks?: unknown[];
  venueWebsite?: string | null;
};

type StorefrontVenue = {
  slug?: string;
  website?: string | null;
  url?: string | null;
};

function storefrontVenues(payload: StorefrontPayload) {
  const organization = payload.organization as
    | {
        homeVenue?: StorefrontVenue | null;
        venues?: StorefrontVenue[];
      }
    | null
    | undefined;
  return [
    organization?.homeVenue,
    ...(organization?.venues || []),
    ...((payload.venues || []) as StorefrontVenue[]),
  ];
}

export async function fetchOrganizationStorefront(
  slug: string,
): Promise<StorefrontPayload | null> {
  const base = process.env.NEXT_PUBLIC_API;
  if (!base || process.env.NEXT_PUBLIC_DEMO === "true") return null;

  try {
    // Short revalidate keeps repeat visits instant (branded first paint, no loader)
    // while still picking up on-sale changes quickly.
    const res = await fetch(`${base}/organizations/storefront/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as StorefrontPayload;
    const venues = storefrontVenues(payload);
    payload.venueWebsite = firstVenueWebsiteHref(venues);

    const venueSlug = venues.find((venue) => venue?.slug)?.slug;
    if (!payload.venueWebsite && venueSlug) {
      try {
        const upcoming = await fetch(
          `${base}/venues/${encodeURIComponent(venueSlug)}/upcoming-events`,
          { next: { revalidate: 60 } },
        );
        if (upcoming.ok) {
          payload.venueWebsite = venueWebsiteFromUpcomingEvents(
            await upcoming.json(),
          );
        }
      } catch {
        /* website is optional; the storefront data is still complete */
      }
    }
    return payload;
  } catch {
    return null;
  }
}
