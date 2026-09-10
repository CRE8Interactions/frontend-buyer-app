export type TeamCopyVenue = {
  name?: string | null;
  slug?: string | null;
};

/** Shopper-facing team page blurb — matches blocktickets OrganizationLanding. */
export function teamStorefrontDescription(
  orgName: string,
  venues: Array<TeamCopyVenue | null | undefined> = [],
): string {
  const team = orgName.trim() || "this team";
  const unique = new Map<string, string>();
  for (const venue of venues) {
    const name = venue?.name?.trim();
    if (!name) continue;
    unique.set((venue?.slug || name).toLowerCase(), name);
  }
  const names = [...unique.values()];

  if (names.length === 0) {
    return `Browse and buy tickets, season passes, and flex packs for ${team}.`;
  }

  const listed = names.slice(0, 4).join(", ");
  const suffix = names.length > 4 ? ", and more" : "";
  return `Tickets for ${team} — ${listed}${suffix}.`;
}
