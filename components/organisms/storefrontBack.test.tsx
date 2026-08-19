import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  demoBrowseVenues,
  demoFlexPack,
  demoSeasonPackage,
  demoVenueEvents,
} from "@/lib/demo/fixtures";
import { formatCurrency, imageUrl } from "@/lib/helpers";
import {
  eventFromPriceLabel,
  monthEventCountLabel,
} from "@/lib/eventFromPrice";
import { teamStorefrontDescription } from "@/lib/teamCopy";
import { googleMapsDirectionsUrl } from "@/lib/venueLocation";
import { eventTypeLabel } from "@/lib/eventType";
import {
  __resetInAppBackForTests,
  markInAppNavigation,
} from "@/lib/inAppBack";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

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
  notFound: vi.fn(),
  useParams: () => ({ slug: "aggie-memorial-stadium" }),
  usePathname: () => "/venue/aggie-memorial-stadium/",
  useRouter: () => routerMocks,
}));

vi.mock("@/lib/api", () => ({
  getVenue: vi.fn(),
  getVenues: vi.fn(),
  getVenueUpcomingEvents: vi.fn(),
  getEventsByIds: vi.fn(),
  getOrganizationStorefront: vi.fn(),
}));

import ClientProfile from "@/components/organisms/ClientProfile";
import VenueProfile from "@/components/organisms/VenueProfile";
import { notFound } from "next/navigation";
import {
  getEventsByIds,
  getOrganizationStorefront,
  getVenue,
  getVenues,
  getVenueUpcomingEvents,
} from "@/lib/api";

const mockedGetVenue = vi.mocked(getVenue);
const mockedGetVenues = vi.mocked(getVenues);
const mockedGetUpcoming = vi.mocked(getVenueUpcomingEvents);
const mockedGetEventsByIds = vi.mocked(getEventsByIds);
const mockedGetStorefront = vi.mocked(getOrganizationStorefront);
const mockedNotFound = vi.mocked(notFound);

const writeText = vi.fn();
const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
const nmStateEvents = DEMO_EVENTS.filter(
  (event) => event.organization?.slug === "nm-state",
);
const raptorsEvents = DEMO_EVENTS.filter(
  (event) => event.organization?.slug === "ogden-raptors",
);

function withoutSellablePrices(event: (typeof DEMO_EVENTS)[number]) {
  const { pricingLevels: _levels, ticketGroups: _groups, ...rest } = event as typeof event & {
    ticketGroups?: unknown;
  };
  return rest;
}

describe("team and venue back buttons", () => {
  beforeEach(() => {
    mockedGetVenue.mockReset();
    mockedGetVenues.mockReset();
    mockedGetUpcoming.mockReset();
    mockedGetEventsByIds.mockReset();
    mockedGetEventsByIds.mockResolvedValue({ data: [] } as never);
    mockedGetStorefront.mockReset();
    mockedGetStorefront.mockResolvedValue({ data: {} } as never);
    mockedNotFound.mockReset();
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
    __resetInAppBackForTests();
    writeText.mockReset();
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("sends the team page back button to browse", () => {
    render(
      <ClientProfile
        slug={nmState.slug}
        initialData={{
          organization: nmState,
          events: nmStateEvents,
          venues: nmState.venues,
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /back to browse/i })).toHaveAttribute(
      "href",
      "/browse/",
    );
    expect(screen.getByText(nmState.name)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /^get tickets$/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/see tickets/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(eventFromPriceLabel(nmStateEvents[0])!),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(monthEventCountLabel(nmStateEvents.length)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        teamStorefrontDescription(nmState.name, nmState.venues),
      ),
    ).toBeInTheDocument();
  });

  it("restores the previous page from the circular back control after in-app navigation", async () => {
    markInAppNavigation();
    render(
      <ClientProfile
        slug={nmState.slug}
        initialData={{
          organization: nmState,
          events: nmStateEvents,
          venues: nmState.venues,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("link", { name: /back to browse/i }));
    expect(routerMocks.back).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("falls back to browse when the circular back control has no in-app history", async () => {
    render(
      <ClientProfile
        slug={nmState.slug}
        initialData={{
          organization: nmState,
          events: nmStateEvents,
          venues: nmState.venues,
        }}
      />,
    );

    const back = screen.getByRole("link", { name: /back to browse/i });
    expect(back).toHaveAttribute("href", "/browse/");
    await userEvent.click(back);
    expect(routerMocks.push).toHaveBeenCalledWith("/browse/");
    expect(routerMocks.back).not.toHaveBeenCalled();
  });

  it("does not show a from price or placeholder on team event rows", () => {
    const unpriced = nmStateEvents.map(withoutSellablePrices);
    render(
      <ClientProfile
        slug={nmState.slug}
        initialData={{
          organization: nmState,
          events: unpriced,
          venues: nmState.venues,
        }}
      />,
    );

    expect(
      screen.getAllByRole("link", { name: /^get tickets$/i }).length,
    ).toBe(unpriced.length);
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/see tickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: /loading/i })).not.toBeInTheDocument();
  });

  it("sends the venue page back button to browse", async () => {
    const venue = demoBrowseVenues().find(
      (row) => row.slug === nmState.homeVenue.slug,
    )!;
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({ data: [venue] } as never);
    mockedGetUpcoming.mockResolvedValue({ data: [] } as never);

    render(<VenueProfile slug={venue.slug} />);

    expect(
      await screen.findByRole("link", { name: /back to browse/i }),
    ).toHaveAttribute("href", "/browse/");
    expect(screen.getByText(venue.name)).toBeInTheDocument();
  });

  it("does not offer a browse back link when the venue is missing", async () => {
    mockedGetVenue.mockResolvedValue({ data: [] } as never);
    mockedGetVenues.mockResolvedValue({ data: [] } as never);

    render(<VenueProfile slug="unknown-venue" />);

    await waitFor(() => {
      expect(mockedNotFound).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole("link", { name: /back to browse/i }),
    ).not.toBeInTheDocument();
  });
});

describe("venue page actions", () => {
  beforeEach(() => {
    mockedGetVenue.mockReset();
    mockedGetVenues.mockReset();
    mockedGetUpcoming.mockReset();
    mockedGetEventsByIds.mockReset();
    mockedGetEventsByIds.mockResolvedValue({ data: [] } as never);
    mockedGetStorefront.mockReset();
    mockedGetStorefront.mockResolvedValue({ data: {} } as never);
    writeText.mockReset();
    Object.assign(navigator, { clipboard: { writeText } });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("links to the team site and venue directions, and copies the page url", async () => {
    const venue = nmState.homeVenue;
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({ data: [venue] } as never);
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: nmStateEvents },
    } as never);

    render(<VenueProfile slug={venue.slug} />);

    expect(
      await screen.findByRole("link", { name: /follow venue/i }),
    ).toHaveAttribute("href", nmState.website);
    expect(screen.getByRole("link", { name: /directions/i })).toHaveAttribute(
      "href",
      googleMapsDirectionsUrl(nmState.homeVenue.address),
    );

    await userEvent.click(screen.getByRole("button", { name: /share/i }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("hides follow and directions when the team has no website and the venue has no address", async () => {
    const venue = {
      name: raptors.homeVenue.name,
      slug: raptors.homeVenue.slug,
    };
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({ data: [venue] } as never);

    render(<VenueProfile slug={venue.slug} />);

    await screen.findByText(venue.name);
    expect(
      screen.queryByRole("link", { name: /follow venue/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /directions/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });
});

describe("venue page events", () => {
  beforeEach(() => {
    mockedGetVenue.mockReset();
    mockedGetVenues.mockReset();
    mockedGetUpcoming.mockReset();
    mockedGetEventsByIds.mockReset();
    mockedGetEventsByIds.mockResolvedValue({ data: [] } as never);
    mockedGetStorefront.mockReset();
    mockedGetStorefront.mockResolvedValue({ data: {} } as never);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("lists every upcoming event for the venue, not the browse preview", async () => {
    const venue = raptors.homeVenue;
    const schedule = demoVenueEvents(venue.slug).map((event, index) => ({
      ...event,
      start: `2026-08-${String(20 + index).padStart(2, "0")}T01:35:00.000Z`,
    }));
    const preview = schedule.slice(0, 1);

    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({
      data: [{ ...venue, allEvents: preview }],
    } as never);
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: schedule },
    } as never);

    render(<VenueProfile slug={venue.slug} />);

    for (const event of schedule) {
      expect(await screen.findByText(event.name)).toBeInTheDocument();
    }
    expect(mockedGetUpcoming).toHaveBeenCalledWith(venue.slug);
    expect(screen.getAllByText(/^get tickets$/i)).toHaveLength(schedule.length);
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/see tickets/i)).not.toBeInTheDocument();
    for (const event of schedule) {
      const from = eventFromPriceLabel(event);
      if (from) {
        expect(screen.queryByText(from)).not.toBeInTheDocument();
      }
    }
    expect(
      screen.getByText(monthEventCountLabel(schedule.length)),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /see full schedule/i }),
    ).not.toBeInTheDocument();
  });

  it("does not show a from price or placeholder on venue event rows", async () => {
    const venue = raptors.homeVenue;
    const schedule = demoVenueEvents(venue.slug).map((event, index) => {
      const rest = withoutSellablePrices(event);
      return {
        ...rest,
        start: `2026-08-${String(20 + index).padStart(2, "0")}T01:35:00.000Z`,
      };
    });
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({ data: [venue] } as never);
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: schedule },
    } as never);

    render(<VenueProfile slug={venue.slug} />);

    expect(await screen.findAllByText(/^get tickets$/i)).toHaveLength(
      schedule.length,
    );
    expect(screen.queryByText(/^from$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/see tickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(
      screen.getByText(monthEventCountLabel(schedule.length)),
    ).toBeInTheDocument();
  });

  it("shows an empty schedule when the venue has no upcoming events", async () => {
    const venue = raptors.homeVenue;
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({
      data: [{ ...venue, allEvents: demoVenueEvents(venue.slug).slice(0, 1) }],
    } as never);
    mockedGetUpcoming.mockResolvedValue({ data: { allEvents: [] } } as never);

    render(<VenueProfile slug={venue.slug} />);

    expect(
      await screen.findByText(new RegExp(`No upcoming events for ${venue.name}`)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(demoVenueEvents(venue.slug)[0].name),
    ).not.toBeInTheDocument();
  });
});

describe("storefront categories", () => {
  beforeEach(() => {
    mockedGetVenue.mockReset();
    mockedGetVenues.mockReset();
    mockedGetUpcoming.mockReset();
    mockedGetEventsByIds.mockReset();
    mockedGetEventsByIds.mockResolvedValue({ data: [] } as never);
    mockedGetStorefront.mockReset();
    mockedGetStorefront.mockResolvedValue({ data: {} } as never);
    mockedNotFound.mockReset();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("shows a loader on a cold org visit and fetches the storefront", async () => {
    mockedGetStorefront.mockResolvedValue({
      data: {
        organization: raptors,
        events: raptorsEvents,
        venues: raptors.venues,
      },
    } as never);

    render(<ClientProfile slug={raptors.slug} />);

    expect(screen.queryByText(raptorsEvents[0].name)).not.toBeInTheDocument();
    expect(mockedGetStorefront).toHaveBeenCalled();
    expect(await screen.findByText(raptors.name)).toBeInTheDocument();
    expect(mockedGetStorefront).toHaveBeenCalledTimes(1);
  });

  it("labels org event rows and sport filters with the org category, not Events", () => {
    const category = eventTypeLabel(raptorsEvents[0], [raptors]);
    render(
      <ClientProfile
        slug={raptors.slug}
        initialData={{
          organization: raptors,
          events: raptorsEvents,
          venues: raptors.venues,
        }}
      />,
    );

    expect(category).toBe(raptors.category?.name);
    expect(screen.getAllByText(new RegExp(category)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Events$/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(category, "i") }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^events$/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps a generic Event label when the type cannot be inferred", () => {
    render(
      <ClientProfile
        slug={raptors.slug}
        initialData={{
          organization: { ...raptors, category: { name: "Events" } },
          events: [
            {
              id: 1,
              shortCode: "COMM1",
              name: "Community Night",
              start: "2026-08-20T01:35:00.000Z",
              venue: raptorsEvents[0].venue,
            },
          ],
          venues: raptors.venues,
        }}
      />,
    );

    expect(screen.getByText(/Event ·/)).toBeInTheDocument();
    expect(screen.queryByText(/Baseball ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hockey ·/)).not.toBeInTheDocument();
  });

  it("labels venue event rows with the fixture org category", async () => {
    const venue = raptors.homeVenue;
    const schedule = raptorsEvents.map((event, index) => ({
      ...event,
      start: `2026-08-${String(20 + index).padStart(2, "0")}T01:35:00.000Z`,
    }));
    const category = eventTypeLabel(schedule[0], [raptors]);
    mockedGetVenue.mockResolvedValue({ data: [venue] } as never);
    mockedGetVenues.mockResolvedValue({ data: [venue] } as never);
    mockedGetUpcoming.mockResolvedValue({
      data: { allEvents: schedule },
    } as never);

    render(<VenueProfile slug={venue.slug} />);

    expect(await screen.findByText(schedule[0].name)).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`${category} ·`)).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/^Events ·/)).not.toBeInTheDocument();
  });

  it("capitalizes a lowercase package category in the side panel", async () => {
    const pkg = demoSeasonPackage({
      category: { name: "sports" },
    });
    render(
      <ClientProfile
        slug={raptors.slug}
        initialData={{
          organization: raptors,
          events: raptorsEvents,
          venues: raptors.venues,
          packages: [pkg],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /season tickets/i }));

    expect(
      screen.getByRole("button", { name: /^sports\s*\d+$/i }),
    ).toHaveTextContent(/^Sports/);
    expect(screen.queryByText(/^sports$/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Sports").length).toBeGreaterThan(0);
  });

  it("shows the package category on season-ticket cards and in the side panel", async () => {
    const pkg = demoSeasonPackage({
      category: { name: "Hockey" },
    });
    render(
      <ClientProfile
        slug={raptors.slug}
        initialData={{
          organization: raptors,
          events: raptorsEvents,
          venues: raptors.venues,
          packages: [pkg],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /season tickets/i }));

    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    expect(screen.getAllByText("Hockey").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Season$/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Category$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hockey/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^baseball$/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps Season on a package with no category", async () => {
    const pkg = demoSeasonPackage({ category: undefined });
    render(
      <ClientProfile
        slug={raptors.slug}
        initialData={{
          organization: raptors,
          events: raptorsEvents,
          venues: raptors.venues,
          packages: [pkg],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /season tickets/i }));

    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    expect(screen.getByText(/^Season$/)).toBeInTheDocument();
    expect(screen.queryByText(/^Category$/)).not.toBeInTheDocument();
  });
});

describe("team page flex packs", () => {
  const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;
  const icedogsEvents = DEMO_EVENTS.filter(
    (event) => event.organization?.slug === "niagara-icedogs",
  );

  it("lists flex packs with image, price, and a detail href", async () => {
    const pack = demoFlexPack();
    render(
      <ClientProfile
        slug={icedogs.slug}
        initialData={{
          organization: icedogs,
          events: icedogsEvents,
          venues: icedogs.venues,
          flexPacks: [pack],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /flex packages/i }));

    expect(screen.getByText(pack.name)).toBeInTheDocument();
    expect(screen.getByText(`${pack.gameTickets} vouchers`)).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(pack.price))).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: pack.name }),
    ).toHaveAttribute("src", imageUrl(pack.image));
    expect(
      screen.getByRole("link", { name: new RegExp(pack.name, "i") }),
    ).toHaveAttribute("href", `/${icedogs.slug}/flex-pack/${pack.uuid}/`);
    expect(screen.queryByText(/taxes and fees included/i)).not.toBeInTheDocument();
  });

  it("shows an empty flex packages tab when the org has none", async () => {
    render(
      <ClientProfile
        slug={icedogs.slug}
        initialData={{
          organization: icedogs,
          events: icedogsEvents,
          venues: icedogs.venues,
          flexPacks: [],
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /flex packages/i }));

    expect(
      screen.getByText("No flex packages on sale right now."),
    ).toBeInTheDocument();
  });
});
