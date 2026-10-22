import { categoryLabel, eventTypeLabel, type EventTypeOrg, type EventTypeSource } from "@/lib/eventType";

export const BASKETBALL = categoryLabel("basketball");
export const MENS_BASKETBALL = categoryLabel("men's basketball");
export const WOMENS_BASKETBALL = categoryLabel("women's basketball");

const MENS_KEY = "men's basketball";
const WOMENS_KEY = "women's basketball";
const GENDERED_BASKETBALL = [MENS_BASKETBALL, WOMENS_BASKETBALL];

const SPORT_QUERY_ALIASES: Record<string, string> = {
  mbb: MENS_BASKETBALL,
  wbb: WOMENS_BASKETBALL,
};

export type SportEvent = EventTypeSource & {
  title?: string | null;
  sub_categories?: Array<{ name?: string | null }> | null;
  attractions?: Array<{ name?: string | null }> | null;
};

export type SportPackage = {
  name?: string | null;
  category?: { name?: string | null } | null;
  sub_categories?: Array<{ name?: string | null }> | null;
  attractions?: Array<{ name?: string | null }> | null;
};

export function normalizeFilterValue(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function sportMatchesQuery(label: string, query?: string | null) {
  if (!query) return false;
  const normalizedLabel = normalizeFilterValue(label);
  const normalizedQuery = normalizeFilterValue(query);
  if (!normalizedLabel || !normalizedQuery) return false;
  if (normalizedLabel === normalizedQuery) return true;
  const slugLabel = normalizedLabel.replace(/\s+/g, "-");
  const slugQuery = normalizedQuery.replace(/\s+/g, "-");
  return slugLabel === slugQuery;
}

function isExactBasketball(label?: string | null) {
  return normalizeFilterValue(label) === "basketball";
}

function isBasketballFamily(label?: string | null) {
  const value = normalizeFilterValue(label);
  return (
    value === "basketball" ||
    value === "mens basketball" ||
    value === "womens basketball" ||
    value === "mbb" ||
    value === "wbb"
  );
}

function isGenericSport(label?: string | null) {
  const value = (label || "").trim();
  return !value || /^(events?|sports?)$/i.test(value);
}

// NMSU tags every hoops game as "basketball". Men's and women's show up as
// MBB/WBB, or as mens/womens in the event name. Apostrophes are ignored, so
// "men's" and "women's" count too. "womens" is checked as its own word so it
// is not read as "mens".
function basketballGenderFromText(
  text?: string | null,
  { includeGenderWords = false }: { includeGenderWords?: boolean } = {},
) {
  const value = normalizeFilterValue(text);
  if (!value) return null;

  const hits: { label: string; index: number }[] = [];
  const add = (label: string, pattern: RegExp) => {
    const match = pattern.exec(value);
    if (match) hits.push({ label, index: match.index });
  };
  add(WOMENS_KEY, /\bwbb\b/);
  add(MENS_KEY, /\bmbb\b/);
  add(WOMENS_KEY, /\bwomens basketball\b/);
  add(MENS_KEY, /\bmens basketball\b/);
  if (includeGenderWords) {
    add(WOMENS_KEY, /\bwomens\b/);
    add(MENS_KEY, /\bmens\b/);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a.index - b.index);
  return hits[0].label;
}

function attractionText(event?: SportEvent | SportPackage | null) {
  return (event?.attractions || [])
    .map((attraction) => attraction?.name)
    .filter(Boolean)
    .join(" ");
}

export function eventSport(event?: SportEvent | null) {
  const base =
    event?.sub_categories?.[0]?.name ||
    event?.category?.name ||
    event?.attractions?.[0]?.name ||
    "Events";

  if (!isExactBasketball(base)) {
    return categoryLabel(basketballGenderFromText(base) || base);
  }

  return categoryLabel(
    basketballGenderFromText(event?.name || event?.title, {
      includeGenderWords: true,
    }) ||
      basketballGenderFromText(attractionText(event)) ||
      "basketball",
  );
}

export function packageSport(pkg?: SportPackage | null) {
  const base = pkg?.category?.name || pkg?.sub_categories?.[0]?.name || null;
  if (!base || !String(base).trim()) return null;
  return eventSport({
    name: pkg?.name,
    category: { name: base },
    attractions: pkg?.attractions,
  });
}

/** Row label for team and venue pages. Non-basketball types stay on eventTypeLabel. */
export function storefrontSportLabel(
  event?: SportEvent | null,
  orgs: EventTypeOrg[] = [],
) {
  const labeled = eventTypeLabel(event, orgs);
  const raw = (
    event?.sub_categories?.[0]?.name ||
    event?.category?.name ||
    event?.sport ||
    ""
  ).trim();
  const basketballTagged = isBasketballFamily(raw) || labeled === BASKETBALL;
  if (!basketballTagged) return labeled;
  if (!isGenericSport(raw) && !isBasketballFamily(raw)) return labeled;

  const fromRaw = basketballGenderFromText(raw);
  if (fromRaw) return categoryLabel(fromRaw);

  return eventSport({
    name: event?.name || event?.title,
    category: { name: "basketball" },
    attractions: event?.attractions,
  });
}

// Uncategorized items stay visible under every filter.
// "Basketball" includes both men's and women's games.
export function matchesSport(rowSport: string | null | undefined, selected: string) {
  if (normalizeFilterValue(selected) === "all" || selected === "All sports") {
    return true;
  }
  if (!rowSport) return true;
  if (rowSport === selected) return true;
  return selected === BASKETBALL && GENDERED_BASKETBALL.includes(rowSport);
}

export function orderedSportLabels(rows: Array<{ sport?: string | null }>) {
  const labels: string[] = [];
  for (const row of rows || []) {
    if (row?.sport && !labels.includes(row.sport)) labels.push(row.sport);
  }

  const hasGender = GENDERED_BASKETBALL.some((label) => labels.includes(label));
  const group: string[] = [];
  if (hasGender || labels.includes(BASKETBALL)) group.push(BASKETBALL);
  for (const label of GENDERED_BASKETBALL) {
    if (labels.includes(label)) group.push(label);
  }

  const ordered: string[] = [];
  let placed = false;
  for (const label of labels) {
    if (label === BASKETBALL || GENDERED_BASKETBALL.includes(label)) {
      if (!placed) {
        ordered.push(...group);
        placed = true;
      }
      continue;
    }
    ordered.push(label);
  }
  return ordered;
}

export function resolveSportSelection(labels: string[], query?: string | null) {
  if (!query) return null;
  const alias =
    SPORT_QUERY_ALIASES[normalizeFilterValue(query).replace(/\s+/g, "-")];
  if (alias && labels.includes(alias)) return alias;
  return labels.find((label) => sportMatchesQuery(label, query)) || null;
}
