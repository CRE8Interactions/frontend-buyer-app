type VenueLike =
  | { slug?: string | null; website?: string | null; url?: string | null }
  | null
  | undefined;

/** Venue records name the site `website` or `url`; blanks don't count. */
export function venueWebsiteHref(venue: VenueLike): string | null {
  const href = String(venue?.website || venue?.url || "").trim();
  return href || null;
}

export function firstVenueWebsiteHref(
  venues: Array<VenueLike> | null | undefined,
): string | null {
  for (const venue of venues || []) {
    const href = venueWebsiteHref(venue);
    if (href) return href;
  }
  return null;
}

/** The venue to ask for a website when none of the records carry one. */
export function venueWebsiteLookupSlug(
  venues: Array<VenueLike> | null | undefined,
): string | null {
  for (const venue of venues || []) {
    const slug = String(venue?.slug || "").trim();
    if (slug) return slug;
  }
  return null;
}

function venueRecords(payload: unknown, depth = 0): unknown[] {
  if (!payload || typeof payload !== "object" || depth > 3) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((row) => venueRecords(row, depth + 1));
  }
  const row = payload as { data?: unknown; attributes?: unknown };
  return [
    payload,
    ...venueRecords(row.attributes, depth + 1),
    ...venueRecords(row.data, depth + 1),
  ];
}

/**
 * `/venues/:slug/upcoming-events` answers with the venue record wrapped around
 * its events, so it carries the website even when storefront payloads omit it.
 */
export function venueWebsiteFromUpcomingEvents(payload: unknown): string | null {
  for (const record of venueRecords(payload)) {
    const href = venueWebsiteHref(record as VenueLike);
    if (href) return href;
  }
  return null;
}
