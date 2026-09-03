/** Category keys shared by printed tickets and event-page matchup treatment. */

export const CATEGORY_THEMES = {
  sports: { badgeLabel: "SPORTING EVENT", badgeColor: "#E53E3E", bodyTint: "#EBF8FF" },
  theater: { badgeLabel: "THEATER EVENT", badgeColor: "#D69E2E", bodyTint: "#FFFFF0" },
  concert: { badgeLabel: "CONCERT EVENT", badgeColor: "#ED64A6", bodyTint: "#FAF5FF" },
  family: { badgeLabel: "FAMILY EVENT", badgeColor: "#38A169", bodyTint: "#F0FFF4" },
  access: { badgeLabel: "ACCESS PASS", badgeColor: "#9757D7", bodyTint: "#F8F0FF" },
  default: { badgeLabel: "EVENT TICKET", badgeColor: "#3182CE", bodyTint: "#F7FAFC" },
} as const;

export type TicketCategoryKey = keyof typeof CATEGORY_THEMES;

const NAMED_SPORT_CATEGORY =
  /\b(hockey|football|soccer|baseball|basketball|volleyball|softball|lacrosse|rugby|wrestling)\b/i;

export type EventCategorySource = {
  category?: { name?: string | null } | null;
  categoryName?: string | null;
  organization?: { category?: { name?: string | null } | null } | null;
};

export function resolveTicketCategoryKey(categoryName?: string | null): TicketCategoryKey {
  const name = String(categoryName || "").trim().toLowerCase();
  if (!name) return "default";
  if (name.includes("sport")) return "sports";
  if (name.includes("concert") || name.includes("music")) return "concert";
  if (
    name.includes("theater") ||
    name.includes("theatre") ||
    name.includes("arts") ||
    name.includes("comedy")
  ) {
    return "theater";
  }
  if (name.includes("family")) return "family";
  if (name.includes("access")) return "access";
  return "default";
}

export function resolveEventCategoryName(source?: EventCategorySource | null) {
  return (
    source?.category?.name ||
    source?.categoryName ||
    source?.organization?.category?.name ||
    ""
  );
}

/** True when the category would get a sporting badge on a printed ticket. */
export function isSportingEventCategory(categoryName?: string | null) {
  const name = String(categoryName || "").trim();
  if (!name) return false;
  if (resolveTicketCategoryKey(name) === "sports") return true;
  return NAMED_SPORT_CATEGORY.test(name);
}

export function isSportingEvent(source?: EventCategorySource | null) {
  return isSportingEventCategory(resolveEventCategoryName(source));
}
