import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";

vi.mock("@/lib/api", () => ({ searchEvents: vi.fn() }));

import {
  asSearchEvents,
  eventSearchName,
  fetchSearchEvents,
  filterEventsBySearchQuery,
  searchEventHref,
  searchResultsHref,
} from "@/lib/searchEvents";
import { searchEvents } from "@/lib/api";
import {
  cacheOrgBranding,
  getCachedOrgBranding,
  getLoaderBranding,
  LOADER_BRANDING_COOKIE,
} from "@/lib/orgBrandingCache";
import { eventPurchasePath } from "@/lib/helpers";

afterEach(() => {
  sessionStorage.clear();
  document.cookie = `${LOADER_BRANDING_COOKIE}=; Max-Age=0; Path=/`;
  vi.mocked(searchEvents).mockReset();
});

describe("searchEvents helpers", () => {
  it("builds the results page href from a trimmed query", () => {
    expect(searchResultsHref("  raptors ")).toBe("/search/?query=raptors");
  });

  it("reads event arrays from either a list or a data envelope", () => {
    expect(asSearchEvents(DEMO_EVENTS)).toHaveLength(DEMO_EVENTS.length);
    expect(asSearchEvents({ data: DEMO_EVENTS.slice(0, 2) })).toHaveLength(2);
    expect(asSearchEvents(null)).toEqual([]);
  });

  it("filters events by name and keeps seated purchase paths", () => {
    const hits = filterEventsBySearchQuery(DEMO_EVENTS, "raptors");
    expect(hits.map(eventSearchName)).toEqual(
      DEMO_EVENTS.filter((event) => /raptors/i.test(event.name)).map(
        (event) => event.name,
      ),
    );
    const seated = DEMO_EVENTS.find((event) => event.shortCode === "RAPT006")!;
    expect(searchEventHref(seated)).toBe(eventPurchasePath(seated));
    expect(searchEventHref(seated)).toContain("/tickets/");
    expect(hits).toHaveLength(2);
    expect(hits.length).toBeLessThan(DEMO_EVENTS.length);
  });

  it("seeds each hit's team so opening a result paints that org's loader", async () => {
    const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    const hits = DEMO_EVENTS.filter(
      (event) => event.organization.slug === icedogs.slug,
    );
    cacheOrgBranding(raptors);
    vi.mocked(searchEvents).mockResolvedValue({ data: hits } as never);

    const events = await fetchSearchEvents("icedogs");

    expect(events.length).toBeGreaterThan(0);
    events.forEach((event) => {
      expect(getLoaderBranding(eventPurchasePath(event))).toMatchObject({
        slug: icedogs.slug,
        primaryColor: icedogs.branding.primaryColor,
      });
    });
    // Searching is not picking a team — the last one stays the shopper's.
    expect(getCachedOrgBranding()?.slug).toBe(raptors.slug);
  });

  it("seeds a slugless search hit so the tickets loader still finds that team", async () => {
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;
    const source = DEMO_EVENTS.find(
      (event) => event.organization.slug === icedogs.slug,
    )!;
    const hits = [
      {
        ...source,
        shortCode: undefined,
        shortcode: source.shortcode,
        organization: {
          name: icedogs.name,
          branding: icedogs.branding,
        },
      },
    ];
    cacheOrgBranding(raptors);
    vi.mocked(searchEvents).mockResolvedValue({ data: hits } as never);

    await fetchSearchEvents("icedogs");

    expect(getLoaderBranding(eventPurchasePath(source))).toMatchObject({
      name: icedogs.name,
      primaryColor: icedogs.branding.primaryColor,
    });
    expect(getCachedOrgBranding()?.slug).toBe(raptors.slug);
  });

  it("skips the API and seeds nothing for an empty query", async () => {
    expect(await fetchSearchEvents("   ")).toEqual([]);
    expect(searchEvents).not.toHaveBeenCalled();
  });
});
