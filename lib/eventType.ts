export type EventTypeSource = {
  id?: string | number;
  uuid?: string | null;
  start?: string | null;
  name?: string | null;
  title?: string | null;
  sport?: string | null;
  category?: { name?: string | null } | null;
  organization?: {
    slug?: string | null;
    name?: string | null;
    category?: { name?: string | null } | null;
  } | null;
};

export type EventTypeOrg = {
  slug?: string | null;
  name?: string | null;
  category?: { name?: string | null } | null;
};

/** Display form for a category/sport name from the API (`sports` → `Sports`). */
export function categoryLabel(raw?: string | null): string {
  const value = (raw || "").trim();
  if (!value) return "";
  return value.replace(/\S+/g, (word) => {
    if (/[A-Z]/.test(word.slice(1))) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function usableType(raw?: string | null) {
  const value = (raw || "").trim();
  if (!value || /^events?$/i.test(value) || /^sports?$/i.test(value)) {
    return "";
  }
  return categoryLabel(value);
}

/** Collapse "Women's Basketball" / "NCAA Hockey" to the sport the hero groups by. */
export function canonicalEventType(raw?: string | null) {
  const text = (raw || "").toLowerCase();
  if (!text) return "";
  if (/\bhockey\b/.test(text)) return "Hockey";
  if (/\bfootball\b/.test(text)) return "Football";
  if (/\bsoccer\b/.test(text)) return "Soccer";
  if (/\bbasketball\b|\bmbb\b|\bwbb\b/.test(text)) return "Basketball";
  if (/\bvolleyball\b/.test(text)) return "Volleyball";
  if (/\bbaseball\b/.test(text)) return "Baseball";
  if (/\bconcert\b|\bfest\b/.test(text)) return "Concert";
  return "";
}

function inferTypeFromName(event?: EventTypeSource | null) {
  const text = [
    event?.sport,
    event?.category?.name,
    event?.name,
    event?.title,
    event?.organization?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const fromSport = canonicalEventType(text);
  if (fromSport) return fromSport;
  if (/\bicedogs\b|\botters\b|\bspitfires\b/.test(text)) return "Hockey";
  if (/\baggies\b/.test(text)) return "Football";
  if (/\braptors\b|\bvoyagers\b|\bchukars\b|\bfreebirds\b/.test(text)) {
    return "Baseball";
  }
  return "";
}

/** Sport or event type for featured badges — never a generic "Event" when inferable. */
export function eventTypeLabel(
  event?: EventTypeSource | null,
  orgs: EventTypeOrg[] = [],
): string {
  const direct = usableType(
    event?.sport || event?.category?.name || event?.organization?.category?.name,
  );
  const owner = orgs.find(
    (org) =>
      (event?.organization?.slug && org.slug === event.organization.slug) ||
      (event?.organization?.name && org.name === event.organization.name),
  );
  const fromOrg = usableType(owner?.category?.name);
  const resolved = direct || fromOrg || inferTypeFromName(event) || "Event";
  return canonicalEventType(resolved) || resolved;
}

/** Collapse "Men's Basketball" / "Basketball" into the same hero type. */
export function featuredTypeKey(
  event?: EventTypeSource | null,
  orgs: EventTypeOrg[] = [],
): string {
  const label = eventTypeLabel(event, orgs);
  return (canonicalEventType(label) || label).toLowerCase();
}

export type FeaturedPoolOrg<T extends EventTypeSource = EventTypeSource> =
  EventTypeOrg & {
    upcomingEvents?: T[] | null;
  };

function eventPoolKey(event: EventTypeSource) {
  return String(event.uuid || event.id || event.name || "").toLowerCase();
}

function withOrgCategory<T extends EventTypeSource>(
  event: T,
  org?: EventTypeOrg,
): T {
  if (!org) return event;
  return {
    ...event,
    organization: {
      ...org,
      ...event.organization,
      category: event.organization?.category || org.category,
    },
  };
}

/** On-sale rows plus org/venue upcoming so the hero can find three types. */
export function featuredEventPool<T extends EventTypeSource>(
  events: T[],
  orgs: FeaturedPoolOrg<T>[] = [],
  extras: T[] = [],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  const add = (event: T | undefined | null, org?: EventTypeOrg) => {
    if (!event) return;
    const key = eventPoolKey(event);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(withOrgCategory(event, org));
  };
  events.forEach((event) => add(event));
  extras.forEach((event) => add(event));
  orgs.forEach((org) => {
    (org.upcomingEvents || []).forEach((event) => add(event, org));
  });
  return out;
}

/** Upcoming hero slides — at most one event per type, never a second basketball. */
export function pickFeaturedEvents<T extends EventTypeSource>(
  events: T[],
  orgs: EventTypeOrg[] = [],
  count = 3,
): T[] {
  if (count <= 0 || !events.length) return [];
  const picked: T[] = [];
  const seenTypes = new Set<string>();

  for (const event of events) {
    const type = featuredTypeKey(event, orgs);
    if (seenTypes.has(type)) continue;
    seenTypes.add(type);
    picked.push(event);
    if (picked.length >= count) return picked;
  }

  return picked;
}
