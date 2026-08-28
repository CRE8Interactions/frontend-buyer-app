import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  browseEventsFixture,
  browseOrgsFixture,
  browseVenuesFixture,
} from "@/tests/fixtures/browse";
import { DEMO_EVENTS, demoVenueEvents } from "@/lib/demo/fixtures";
import {
  eventFromPriceLabel,
  monthEventCountLabel,
} from "@/lib/eventFromPrice";
import { eventTypeLabel, pickFeaturedEvents } from "@/lib/eventType";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/browse/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({
  getEvents: vi.fn(),
  getEventsByIds: vi.fn(),
  getOrganizationsOnSale: vi.fn(),
  getVenues: vi.fn(),
  getVenueUpcomingEvents: vi.fn(),
}));

import {
  getEvents,
  getEventsByIds,
  getOrganizationsOnSale,
  getVenueUpcomingEvents,
  getVenues,
} from "@/lib/api";
import BrowseHome, {
  __resetBrowseCacheForTests,
} from "@/components/organisms/BrowseHome";

const mockedGetEvents = vi.mocked(getEvents);
const mockedGetEventsByIds = vi.mocked(getEventsByIds);
const mockedGetOrgs = vi.mocked(getOrganizationsOnSale);
const mockedGetVenues = vi.mocked(getVenues);
const mockedGetUpcoming = vi.mocked(getVenueUpcomingEvents);

function mockBrowseApis(overrides?: {
  events?: unknown[];
  orgs?: unknown[];
  venues?: unknown[];
  fail?: boolean;
}) {
  if (overrides?.fail) {
    mockedGetEvents.mockRejectedValue(new Error("network"));
    mockedGetOrgs.mockRejectedValue(new Error("network"));
    mockedGetVenues.mockRejectedValue(new Error("network"));
    return;
  }
  mockedGetEvents.mockResolvedValue({
    data: overrides?.events ?? browseEventsFixture,
  } as never);
  mockedGetOrgs.mockResolvedValue({
    data: overrides?.orgs ?? browseOrgsFixture,
  } as never);
  mockedGetVenues.mockResolvedValue({
    data: overrides?.venues ?? browseVenuesFixture,
  } as never);
  mockedGetUpcoming.mockResolvedValue({ data: { allEvents: [] } } as never);
  mockedGetEventsByIds.mockResolvedValue({ data: [] } as never);
}

describe("Browse page", () => {
  beforeEach(() => {
    __resetBrowseCacheForTests();
    mockBrowseApis();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("holds the Blocktickets loader, then shows the main sections and event content from DEMO fixtures", async () => {
    render(<BrowseHome />);

    const loader = screen.getByRole("status", { name: /loading/i });
    expect(loader).toHaveAttribute("data-bt-platform-loader");
    expect(
      screen.queryByRole("heading", { name: /^events$/i }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: /teams & venues/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /loading/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^see all$/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^events$/i }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(DEMO_EVENTS[0].name).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/6 events/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/get tickets/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login/?from=%2Fbrowse%2F",
    );
    expect(
      screen.getByRole("link", { name: /blocktickets home/i }),
    ).toHaveAttribute("href", "/");
    expect(screen.getByText(/build bigger/i)).toBeInTheDocument();
    expect(screen.getByText(/block by block/i)).toBeInTheDocument();
  });

  it("does not show a from price on upcoming event cards", async () => {
    render(<BrowseHome />);

    await screen.findByRole("heading", { name: /^events$/i });
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    for (const event of DEMO_EVENTS) {
      expect(
        screen.queryByText(eventFromPriceLabel(event)!),
      ).not.toBeInTheDocument();
    }
    expect(screen.getAllByText(/^get tickets$/i).length).toBeGreaterThan(0);
  });

  it("does not show a price placeholder when an event has no sellable tickets", async () => {
    const { pricingLevels: _levels, ticketGroups: _groups, ...bare } =
      DEMO_EVENTS[0] as (typeof DEMO_EVENTS)[0] & { ticketGroups?: unknown };
    mockBrowseApis({ events: [bare] });

    render(<BrowseHome />);

    await screen.findByRole("heading", { name: /^events$/i });
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText(/see tickets/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^get tickets$/i).length).toBeGreaterThan(0);
  });

  it("renders featured hero with category badge and GA CTA from DEMO_EVENTS[0]", async () => {
    render(<BrowseHome />);

    const featured = DEMO_EVENTS[0];
    await screen.findByText(
      new RegExp(`featured · ${eventTypeLabel(featured)}`, "i"),
    );
    const heroCta = screen.getByRole("link", {
      name: /^get tickets$/i,
    });
    expect(heroCta).toHaveAttribute(
      "href",
      "/e/icedogs-vs-otters/ICEDOG1/",
    );
    expect(
      screen.queryByText(/prices shown at checkout/i),
    ).not.toBeInTheDocument();
  });

  it("keeps a plain get-tickets CTA when the featured event has no price", async () => {
    const { pricingLevels: _levels, ticketGroups: _groups, ...bare } =
      DEMO_EVENTS[0] as (typeof DEMO_EVENTS)[0] & { ticketGroups?: unknown };
    mockBrowseApis({ events: [bare] });

    render(<BrowseHome />);

    const heroCta = (
      await screen.findAllByRole("link", { name: /^get tickets$/i })
    )[0];
    expect(heroCta).toHaveAttribute(
      "href",
      "/e/icedogs-vs-otters/ICEDOG1/",
    );
    expect(
      screen.queryByRole("link", { name: /get tickets from/i }),
    ).not.toBeInTheDocument();
  });

  it("links team and venue rails to storefront and venue pages", async () => {
    render(<BrowseHome />);

    await screen.findByText("Ogden Raptors");

    const teamLink = screen
      .getAllByRole("link", { name: /ogden raptors/i })
      .find((el) => el.getAttribute("href") === "/ogden-raptors/");
    expect(teamLink).toBeTruthy();

    const venueLink = screen
      .getAllByRole("link", { name: /lindquist field/i })
      .find((el) => el.getAttribute("href") === "/venue/lindquist-field/");
    expect(venueLink).toBeTruthy();
  });

  it("shows the venue's full upcoming total, not the 3-event preview", async () => {
    const venue = browseVenuesFixture.find(
      (row) => row.slug === "lindquist-field",
    )!;
    mockBrowseApis({
      venues: [
        {
          ...venue,
          allEvents: demoVenueEvents(venue.slug).slice(0, 3),
          upcomingEventsCount: 12,
        },
      ],
    });

    render(<BrowseHome />);

    const venueLink = (
      await screen.findAllByRole("link", { name: /lindquist field/i })
    ).find((el) => el.getAttribute("href") === "/venue/lindquist-field/");
    expect(venueLink).toHaveTextContent(monthEventCountLabel(12));
    expect(venueLink).not.toHaveTextContent(monthEventCountLabel(3));
  });

  it("loads the venue schedule count when find-on-sale omits the total", async () => {
    const venue = browseVenuesFixture.find(
      (row) => row.slug === "lindquist-field",
    )!;
    const preview = demoVenueEvents(venue.slug);
    mockBrowseApis({
      venues: [
        {
          ...venue,
          upcomingEventsCount: undefined,
          allEvents: preview,
        },
      ],
    });
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: DEMO_EVENTS },
    } as never);

    render(<BrowseHome />);

    const venueLink = (
      await screen.findAllByRole("link", { name: /lindquist field/i })
    ).find((el) => el.getAttribute("href") === "/venue/lindquist-field/");
    expect(venueLink).toHaveTextContent(
      monthEventCountLabel(DEMO_EVENTS.length),
    );
    expect(venueLink).not.toHaveTextContent(
      monthEventCountLabel(preview.length),
    );
  });

  it("shows 0 events when the venue schedule is empty", async () => {
    const venue = browseVenuesFixture.find(
      (row) => row.slug === "lindquist-field",
    )!;
    mockBrowseApis({
      venues: [{ ...venue, upcomingEventsCount: undefined, allEvents: [] }],
    });
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: [] },
    } as never);

    render(<BrowseHome />);

    const venueLink = (
      await screen.findAllByRole("link", { name: /lindquist field/i })
    ).find((el) => el.getAttribute("href") === "/venue/lindquist-field/");
    expect(venueLink).toHaveTextContent(monthEventCountLabel(0));
  });

  it("filters the events grid by search while leaving featured events intact", async () => {
    const user = userEvent.setup();
    render(<BrowseHome />);

    await screen.findByText(DEMO_EVENTS[1].name);

    const search = screen.getByPlaceholderText(/search events, teams, venues/i);
    await user.clear(search);
    await user.type(search, "raptors");

    await waitFor(() => {
      expect(screen.getByText(/2 events/i)).toBeInTheDocument();
    });
    expect(
      screen.getAllByText(/raptors vs\./i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(DEMO_EVENTS[1].name)).not.toBeInTheDocument();

    // Featured carousel still uses the unfiltered first DEMO event.
    expect(screen.getByText(/featured · hockey/i)).toBeInTheDocument();
  });

  it("shows an empty search state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<BrowseHome />);

    expect(
      (await screen.findAllByText(DEMO_EVENTS[0].name)).length,
    ).toBeGreaterThan(0);

    await user.type(
      screen.getByPlaceholderText(/search events, teams, venues/i),
      "zzzz-no-match",
    );

    expect(await screen.findByText(/no events match/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/try a team, venue or city name/i).length,
    ).toBeGreaterThan(0);
  });

  it("switches the featured carousel when a dot is clicked", async () => {
    const user = userEvent.setup();
    const featured = pickFeaturedEvents(DEMO_EVENTS, browseOrgsFixture, 3);
    render(<BrowseHome />);

    await screen.findByText(
      new RegExp(`featured · ${eventTypeLabel(featured[0], browseOrgsFixture)}`, "i"),
    );

    await user.click(
      screen.getByRole("button", { name: /featured event 2/i }),
    );

    expect(
      await screen.findByText(
        new RegExp(
          `featured · ${eventTypeLabel(featured[1], browseOrgsFixture)}`,
          "i",
        ),
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(featured[1].name).length).toBeGreaterThan(0);
    expect(eventTypeLabel(featured[1], browseOrgsFixture)).not.toBe(
      eventTypeLabel(featured[0], browseOrgsFixture),
    );
  });

  it("keeps three unique featured types when the on-sale list is all basketball", async () => {
    const hoop = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
    const hockeyEvent = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG1")!;
    const baseballEvent = DEMO_EVENTS.find((event) => event.shortCode === "RAPT006")!;
    mockBrowseApis({
      events: [0, 1, 2].map((index) => ({
        ...hoop,
        id: Number(hoop.id) + index,
        uuid: `${hoop.uuid}-${index}`,
        name: `${hoop.name} ${index}`,
        category: { name: index === 1 ? "Women's Basketball" : "Basketball" },
      })),
      orgs: browseOrgsFixture.map((org) => {
        if (org.slug === hockeyEvent.organization.slug) {
          return { ...org, upcomingEvents: [hockeyEvent] };
        }
        if (org.slug === baseballEvent.organization.slug) {
          return { ...org, upcomingEvents: [baseballEvent] };
        }
        return org;
      }),
    });
    const user = userEvent.setup();
    render(<BrowseHome />);

    await screen.findByRole("button", { name: /featured event 3/i });
    const types: string[] = [];
    for (const index of [1, 2, 3]) {
      await user.click(
        screen.getByRole("button", { name: new RegExp(`featured event ${index}`, "i") }),
      );
      types.push((await screen.findByText(/featured · /i)).textContent || "");
    }
    const labels = types.map((type) =>
      type.replace(/featured ·\s*/i, "").trim().toLowerCase(),
    );
    expect(new Set(labels).size).toBe(3);
    expect(labels.filter((type) => type === "basketball")).toHaveLength(1);
  });

  it("does not add a second basketball slide when no other types are available", async () => {
    const hoop = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
    mockBrowseApis({
      events: [0, 1, 2].map((index) => ({
        ...hoop,
        id: Number(hoop.id) + index,
        uuid: `${hoop.uuid}-${index}`,
        name: `${hoop.name} ${index}`,
        category: { name: "Basketball" },
      })),
    });

    render(<BrowseHome />);

    expect(await screen.findByText(/featured · basketball/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /featured event 2/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a seated purchase path with /tickets for reserved events", async () => {
    render(<BrowseHome />);

    expect(
      (await screen.findAllByText(DEMO_EVENTS[0].name)).length,
    ).toBeGreaterThan(0);
    const seated = DEMO_EVENTS.find((e) => e.seatmap.ga_only === false)!;
    const href = `/e/${seated.slug}/${seated.shortCode}/tickets/`;
    const card = screen
      .getAllByRole("link")
      .find((el) => (el.getAttribute("href") || "") === href);
    expect(card).toBeTruthy();
  });

  it("surfaces an API failure in the hero and empty grid", async () => {
    mockBrowseApis({ fail: true });
    render(<BrowseHome />);

    expect(
      (await screen.findAllByText(/unable to load browse data/i)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/check back soon or browse a team storefront/i),
    ).toBeInTheDocument();
  });

  it("reuses the in-memory browse cache on remount instead of refetching", async () => {
    const { unmount } = render(<BrowseHome />);
    expect(
      (await screen.findAllByText(DEMO_EVENTS[0].name)).length,
    ).toBeGreaterThan(0);
    expect(mockedGetEvents).toHaveBeenCalledTimes(1);

    unmount();
    render(<BrowseHome />);

    expect(
      (await screen.findAllByText(DEMO_EVENTS[0].name)).length,
    ).toBeGreaterThan(0);
    expect(mockedGetEvents).toHaveBeenCalledTimes(1);
    expect(mockedGetOrgs).toHaveBeenCalledTimes(1);
    expect(mockedGetVenues).toHaveBeenCalledTimes(1);
  });

  it("derives venues from organizations when the venues API returns empty", async () => {
    mockBrowseApis({ venues: [] });
    render(<BrowseHome />);

    await screen.findByText("Ogden Raptors");
    expect(
      screen
        .getAllByRole("link", { name: /lindquist field/i })
        .some((el) => el.getAttribute("href") === "/venue/lindquist-field/"),
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: /meridian centre/i })
        .some((el) => el.getAttribute("href") === "/venue/meridian-centre/"),
    ).toBe(true);
  });

  it("shows On sale and Remind me status treatments in the event cards", async () => {
    render(<BrowseHome />);

    expect(
      (await screen.findAllByText(DEMO_EVENTS[0].name)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/remind me/i)).toBeInTheDocument();
    expect(screen.getAllByText(/on sale/i).length).toBeGreaterThan(0);
  });
});
