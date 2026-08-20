import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  demoVenueUpcomingEvents,
} from "@/lib/demo/fixtures";
import { fetchOrganizationStorefront } from "@/lib/server/storefront";

const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;

function response(data: unknown, ok = true) {
  return {
    ok,
    json: vi.fn(async () => data),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchOrganizationStorefront", () => {
  it("loads the venue website before returning the team storefront", async () => {
    vi.stubEnv("NEXT_PUBLIC_API", "https://api.example.test");
    vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
    const venue = { ...nmState.homeVenue, website: undefined };
    const storefront = {
      organization: { ...nmState, homeVenue: venue, venues: [venue] },
      venues: [venue],
      events: DEMO_EVENTS,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(storefront))
      .mockResolvedValueOnce(
        response(demoVenueUpcomingEvents(nmState.homeVenue.slug)),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOrganizationStorefront(nmState.slug);

    expect(result?.venueWebsite).toBe(nmState.homeVenue.website);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        `/venues/${nmState.homeVenue.slug}/upcoming-events`,
      ),
      { next: { revalidate: 60 } },
    );
  });

  it("still returns the complete storefront when website lookup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API", "https://api.example.test");
    vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
    const venue = nmState.venues[1];
    const storefront = {
      organization: { ...nmState, homeVenue: venue, venues: [venue] },
      venues: [venue],
      events: DEMO_EVENTS,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(storefront))
        .mockResolvedValueOnce(response({}, false)),
    );

    const result = await fetchOrganizationStorefront(nmState.slug);

    expect(result?.organization?.slug).toBe(nmState.slug);
    expect(result?.events).toBe(DEMO_EVENTS);
    expect(result?.venueWebsite).toBeNull();
  });
});
