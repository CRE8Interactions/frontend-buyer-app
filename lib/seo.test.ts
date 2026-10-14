import { afterEach, describe, expect, it, vi } from "vitest";
import { formatEventWhen } from "@/lib/helpers";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  demoAccessPassTemplate,
  demoEventDetail,
  demoFlexPack,
  demoFundraisingCampaign,
  demoSeasonPackage,
  demoVenueBySlug,
} from "@/lib/demo/fixtures";
import {
  accessPassTabTitle,
  BROWSE_PAGE_DESCRIPTION,
  BROWSE_PAGE_OG_TITLE,
  BROWSE_PAGE_TITLE,
  DEFAULT_OG_IMAGE,
  eventOpenGraph,
  flexPackOpenGraph,
  fundraiserShareCopy,
  HOME_PAGE_DESCRIPTION,
  HOME_PAGE_TITLE,
  menuTabTitle,
  organizationShareCopy,
  packageOpenGraph,
  packagePageMetadata,
  pageMetadata,
  venueOpenGraph,
  waitingRoomTabTitle,
} from "@/lib/seo";

function demoEvent() {
  const detail = demoEventDetail(DEMO_EVENTS[0].shortcode);
  if (!("event" in detail) || !detail.event) {
    throw new Error("demo event missing");
  }
  return detail.event;
}

function scheduleLabel(
  event: { start: string; venue: { timezone?: string } },
  withTime = true,
) {
  const zone = event.venue.timezone;
  const date = formatEventWhen(event.start, zone, "MMM D");
  if (!withTime) return date;
  return `${date} · ${formatEventWhen(event.start, zone, "h:mm A")}`;
}

describe("event open graph", () => {
  const event = demoEvent();
  const city = event.venue.address[0].city;
  const when = scheduleLabel(event);

  it("uses the event summary and flyer", () => {
    const meta = eventOpenGraph(event);

    expect(meta.title).toBe(`Buy Ticket to ${event.name} in ${city} on ${when}`);
    expect(meta.description).toBe(event.summary);
    expect(meta.image).toBe(event.image.url);
  });

  it("describes the schedule and uses the logo when the event has no summary or image", () => {
    const meta = eventOpenGraph({
      ...event,
      summary: "",
      image: null,
      organization: { name: event.organization.name },
      venue: {
        name: event.venue.name,
        timezone: event.venue.timezone,
        address: [{ city: "st. catharines", state: "on" }],
      },
    });

    expect(meta.title).toBe(
      `Buy Ticket to ${event.name} in St. Catharines on ${when}`,
    );
    expect(meta.description).toBe(
      `${event.name} Tickets, ${when}, ${event.venue.name} - St. Catharines, ON`,
    );
    expect(meta.image).toBe(DEFAULT_OG_IMAGE);
  });

  it("uses the organization logo before a venue image", () => {
    const meta = eventOpenGraph({
      ...event,
      image: null,
      venue: { ...event.venue, image: DEMO_EVENTS[2].image },
    });

    expect(meta.image).toBe(event.organization.branding.logo.url);
  });

  it("says the date is TBD when the event date is not set", () => {
    const meta = eventOpenGraph({ ...event, date_tbd: true });

    expect(meta.title).toBe(
      `Buy Ticket to ${event.name} in ${city} on Date & Time TBD`,
    );
  });

  it("leaves the time off when the event hides its start time", () => {
    const meta = eventOpenGraph({ ...event, display_start_time: false });

    expect(meta.title).toBe(
      `Buy Ticket to ${event.name} in ${city} on ${scheduleLabel(event, false)}`,
    );
  });
});

describe("venue open graph", () => {
  const venue = demoVenueBySlug("meridian-centre");
  if (!venue) throw new Error("demo venue missing");

  it("uses the calendar title and the venue fallback description", () => {
    const meta = venueOpenGraph(venue);

    expect(meta.title).toBe(`${venue.name} | Event Calendar`);
    expect(meta.description).toBe(
      `Calendar | Buy tickets and find event information for upcoming events by ${venue.name}`,
    );
  });

  it("uses the venue description when one is set", () => {
    const meta = venueOpenGraph({
      ...venue,
      description: `<p>${venue.name}</p>`,
    });

    expect(meta.description).toBe(venue.name);
  });
});

describe("flex pack open graph", () => {
  const pack = demoFlexPack();

  it("uses the pack name and description", () => {
    const meta = flexPackOpenGraph(pack);

    expect(meta.title).toBe(`${pack.name} | Blocktickets`);
    expect(meta.description).toBe(pack.description);
  });

  it("names the organization when the flex pack has no description", () => {
    const meta = flexPackOpenGraph(demoFlexPack({ description: "" }));

    expect(meta.description).toBe(
      `Buy a flex pack from ${pack.organization.name}.`,
    );
  });
});

describe("package open graph", () => {
  it("uses the season-ticket title when a package name is already known", () => {
    const pkg = demoSeasonPackage();
    const meta = packageOpenGraph(pkg);

    expect(meta.title).toBe(`${pkg.name} | Season Tickets`);
    expect(meta.description).toBe(`Buy season tickets for ${pkg.name}.`);
  });
});

describe("missing open graph records", () => {
  it("uses the legacy fallback title and description", () => {
    expect(eventOpenGraph(null)).toMatchObject({
      title: "Event Tickets | Blocktickets",
      description: "Buy event tickets on Blocktickets.",
    });
    expect(venueOpenGraph(null)).toMatchObject({
      title: "Event Calendar | Blocktickets",
      description: "Buy tickets and find event information for upcoming events.",
    });
    expect(flexPackOpenGraph(null)).toMatchObject({
      title: "Flex Pack | Blocktickets",
      description: "Buy a flex pack from Blocktickets.",
    });
    expect(packageOpenGraph(null)).toMatchObject({
      title: "Season Tickets | Blocktickets",
      description: "Buy season tickets on Blocktickets.",
    });
  });
});

describe("legacy shopper tab copy", () => {
  const previousApi = process.env.NEXT_PUBLIC_API;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API = previousApi;
    vi.unstubAllGlobals();
  });

  it("keeps the homepage and browse titles past the 60-character cut", () => {
    const home = pageMetadata({
      title: HOME_PAGE_TITLE,
      description: HOME_PAGE_DESCRIPTION,
      exactCopy: true,
    });
    expect(home.title).toBe(HOME_PAGE_TITLE);
    expect(home.description).toBe(HOME_PAGE_DESCRIPTION);

    const browse = pageMetadata({
      title: BROWSE_PAGE_TITLE,
      ogTitle: BROWSE_PAGE_OG_TITLE,
      description: BROWSE_PAGE_DESCRIPTION,
      exactCopy: true,
    });
    expect(browse.title).toBe(BROWSE_PAGE_TITLE);
    expect(browse.openGraph && "title" in browse.openGraph
      ? browse.openGraph.title
      : undefined).toBe(BROWSE_PAGE_OG_TITLE);
    expect(browse.description).toBe(BROWSE_PAGE_DESCRIPTION);
  });

  it("uses the organization name in the tickets-and-passes title", () => {
    const org = DEMO_ORGS.find((item) => item.slug === "niagara-icedogs");
    if (!org) throw new Error("demo org missing");

    expect(organizationShareCopy(org)).toEqual({
      title: `${org.name} | Tickets & Passes`,
      description: `Browse and buy tickets, season passes, and flex packs for ${org.name}.`,
      keywords: `Buy tickets, season passes, and flex packs for ${org.name}`,
    });
    expect(organizationShareCopy(null)).toMatchObject({
      title: "Tickets & Passes",
      description:
        "Browse and buy tickets, season passes, and flex packs for this organization.",
    });
  });

  it("names the venue on an access pass and the campaign on a fundraiser", () => {
    const pass = demoAccessPassTemplate();
    expect(accessPassTabTitle(pass)).toBe(`${pass.venue.name} | Access Pass`);
    expect(accessPassTabTitle(null)).toBe("Venue | Access Pass");

    const campaign = demoFundraisingCampaign();
    expect(fundraiserShareCopy(campaign)).toEqual({
      title: `${campaign.title} | Fundraiser`,
      description: campaign.description,
    });
    expect(fundraiserShareCopy(null)).toEqual({
      title: "Fundraiser",
      description: "Support this fundraising campaign.",
    });
  });

  it("uses the event name in the waiting room and the org name on a menu", () => {
    const event = demoEvent();
    expect(waitingRoomTabTitle(event.name)).toBe(`Waiting Room — ${event.name}`);
    expect(waitingRoomTabTitle("")).toBe("");

    const org = DEMO_ORGS.find((item) => item.slug === "niagara-icedogs");
    if (!org) throw new Error("demo org missing");
    expect(menuTabTitle(org.name, false)).toBe(`${org.name} | Suite Menu`);
    expect(menuTabTitle(org.name, true)).toBe(`${org.name} | Menu`);
    expect(menuTabTitle("", false)).toBe("In-Suite Dining | Suite Menu");
  });

  it("uses the legacy open-graph title for a season package", async () => {
    process.env.NEXT_PUBLIC_API = "https://api.example.test";
    const pkg = demoSeasonPackage();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          title: `${pkg.name} | Season Tickets`,
          description: `Buy season tickets for ${pkg.name}.`,
          image: "https://cdn.example/package.png",
        }),
      })),
    );

    const meta = await packagePageMetadata(pkg.uuid, `/nm-state/package/${pkg.uuid}/`);

    expect(meta.title).toBe(`${pkg.name} | Season Tickets`);
    expect(meta.description).toBe(`Buy season tickets for ${pkg.name}.`);
  });

  it("keeps the season-ticket fallback when open graph cannot be loaded", async () => {
    process.env.NEXT_PUBLIC_API = "https://api.example.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );

    const meta = await packagePageMetadata("missing", "/nm-state/package/missing/");

    expect(meta.title).toBe("Season Tickets | Blocktickets");
    expect(meta.description).toBe("Buy season tickets on Blocktickets.");
  });
});
