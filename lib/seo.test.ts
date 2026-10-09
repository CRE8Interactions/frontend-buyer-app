import { describe, expect, it } from "vitest";
import { formatEventWhen } from "@/lib/helpers";
import {
  DEMO_EVENTS,
  demoEventDetail,
  demoFlexPack,
  demoSeasonPackage,
  demoVenueBySlug,
} from "@/lib/demo/fixtures";
import {
  DEFAULT_OG_IMAGE,
  eventOpenGraph,
  flexPackOpenGraph,
  packageOpenGraph,
  venueOpenGraph,
} from "@/lib/seo";

function demoEvent() {
  const detail = demoEventDetail(DEMO_EVENTS[0].shortcode);
  if (!("event" in detail)) throw new Error("demo event missing");
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
