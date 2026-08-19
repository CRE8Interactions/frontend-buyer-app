export type TeamCopyVenue = {
  name?: string | null;
  slug?: string | null;
};

/** Shopper-facing team page blurb: tickets + packages, and all venues when there are several. */
export function teamStorefrontDescription(
  orgName: string,
  venues: Array<TeamCopyVenue | null | undefined> = [],
): string {
  const unique = new Map<string, string>();
  for (const venue of venues) {
    const name = venue?.name?.trim();
    if (!name) continue;
    unique.set((venue?.slug || name).toLowerCase(), name);
  }
  const names = [...unique.values()];
  const products = "All tickets, season packages and flex packages";
  if (names.length > 1) return `${products} for all venues.`;
  if (names.length === 1) return `${products} for ${names[0]}.`;
  const team = orgName.trim() || "this team";
  return `${products} for ${team}.`;
}
