import { describe, expect, it } from "vitest";
import { DEMO_EVENTS, DEMO_USER, demoFlexPack, demoSeasonPackage } from "@/lib/demo/fixtures";
import {
  attractionImageUrl,
  emailPatternMatch,
  eventAboutText,
  eventDoorsIso,
  eventWhenWithDoors,
  flexPackPurchasePath,
  formatDoorsTime,
  formatEventWhen,
  formatOnSaleWhen,
  imageUrl,
  isBlockedEmail,
  isRequestCanceled,
  normalizeApiImage,
  normalizeEmail,
  normalizeAttractions,
  packagePurchasePath,
  resolveEventMatchup,
} from "@/lib/helpers";

const seated = DEMO_EVENTS.find((e) => e.shortcode === "RAPT006")!;

describe("eventDoorsIso", () => {
  it("prefers realDoorsOpen and falls back to doorsOpen", () => {
    expect(
      eventDoorsIso({
        doorsOpen: seated.doorsOpen,
        realDoorsOpen: "2026-08-16T00:00:00.000Z",
      }),
    ).toBe("2026-08-16T00:00:00.000Z");
    expect(eventDoorsIso({ doorsOpen: seated.doorsOpen })).toBe(seated.doorsOpen);
    expect(eventDoorsIso({})).toBeUndefined();
  });
});

describe("eventWhenWithDoors", () => {
  it("appends doors time when the venue timezone is an API object", () => {
    const tz = { iana: seated.venue.timezone };
    const when = formatEventWhen(seated.start, tz);
    const doors = formatDoorsTime(seated.doorsOpen, tz);
    expect(eventWhenWithDoors(seated.start, seated.doorsOpen, tz)).toBe(
      `${when} · Doors ${doors}`,
    );
  });

  it("omits the doors suffix when doors time is missing", () => {
    expect(
      eventWhenWithDoors(seated.start, undefined, seated.venue.timezone),
    ).toBe(formatEventWhen(seated.start, seated.venue.timezone));
  });
});

describe("formatOnSaleWhen", () => {
  it("matches blocktickets Countdown copy in the venue timezone", () => {
    expect(
      formatOnSaleWhen("2026-08-28T16:00:00.000Z", "America/Denver"),
    ).toBe("Fri, Aug 28 at 10:00 AM MDT");
    expect(
      formatOnSaleWhen("2026-09-04T09:15:00.000Z", "America/New_York"),
    ).toBe("Fri, Sep 4 at 5:15 AM EDT");
  });

  it("returns empty when the timestamp is missing", () => {
    expect(formatOnSaleWhen(undefined, seated.venue.timezone)).toBe("");
  });
});

describe("isRequestCanceled", () => {
  it("recognizes aborted axios and fetch errors", () => {
    expect(isRequestCanceled({ code: "ERR_CANCELED" })).toBe(true);
    expect(isRequestCanceled({ name: "AbortError" })).toBe(true);
    expect(isRequestCanceled(new Error("network"))).toBe(false);
  });
});

describe("packagePurchasePath", () => {
  it("builds the org season package page from the fixture", () => {
    const pkg = demoSeasonPackage();
    expect(packagePurchasePath(pkg)).toBe(
      `/${pkg.organization.slug}/package/${pkg.uuid}/`,
    );
  });

  it("returns null when the package has no org or venue slug", () => {
    expect(packagePurchasePath({ uuid: "pkg-1" })).toBeNull();
    expect(packagePurchasePath(null)).toBeNull();
  });
});

describe("flexPackPurchasePath", () => {
  it("builds the org flex pack page from the fixture", () => {
    const pack = demoFlexPack();
    expect(flexPackPurchasePath(pack)).toBe(
      `/${pack.organization.slug}/flex-pack/${pack.uuid}/`,
    );
  });

  it("builds the venue flex pack page when there is no org slug", () => {
    const pack = demoFlexPack();
    expect(
      flexPackPurchasePath({
        uuid: pack.uuid,
        venue: { slug: pack.venue.slug },
      }),
    ).toBe(`/venue/${pack.venue.slug}/flex-pack/${pack.uuid}/`);
  });

  it("returns null when the flex pack has no org or venue slug", () => {
    expect(flexPackPurchasePath({ uuid: "flex-1" })).toBeNull();
    expect(flexPackPurchasePath(null)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases the address", () => {
    expect(normalizeEmail("  Fan@Blocktickets.XYZ  ")).toBe(
      "fan@blocktickets.xyz",
    );
  });
});

describe("emailPatternMatch", () => {
  it("accepts a well-formed address and rejects malformed ones", () => {
    expect(emailPatternMatch(DEMO_USER.email)).toBe(true);
    expect(emailPatternMatch("not-an-email")).toBe(false);
    expect(emailPatternMatch("")).toBe(true);
  });
});

describe("isBlockedEmail", () => {
  it("blocks disposable and reference domains without throwing on malformed input", () => {
    expect(isBlockedEmail("user@mailinator.com")).toBe(true);
    expect(isBlockedEmail("user@protonbox.pro")).toBe(true);
    expect(isBlockedEmail("user@team.ru")).toBe(true);
    expect(isBlockedEmail("user@team.ua")).toBe(true);
    expect(isBlockedEmail(DEMO_USER.email)).toBe(false);
    expect(isBlockedEmail("not-an-email")).toBe(false);
    expect(isBlockedEmail("user@")).toBe(false);
  });
});

describe("eventAboutText", () => {
  it("prefers summary over description", () => {
    expect(
      eventAboutText({
        summary: "  Event summary  ",
        description: "Event description",
      }),
    ).toBe("Event summary");
  });

  it("falls back to description when summary is missing", () => {
    expect(
      eventAboutText({ description: "<p>Long description.</p>" }),
    ).toBe("Long description.");
  });

  it("returns empty when neither field is set", () => {
    expect(eventAboutText({})).toBe("");
  });
});

describe("normalizeApiImage", () => {
  it("unwraps Strapi data.attributes media", () => {
    expect(
      normalizeApiImage({
        data: {
          attributes: {
            url: "https://cdn.example.com/logo.png",
          },
        },
      }),
    ).toEqual({ url: "https://cdn.example.com/logo.png" });
  });

  it("returns the first resolvable item from an artwork array", () => {
    expect(
      normalizeApiImage([
        { url: "/home.png" },
        { url: "/away.png" },
      ]),
    ).toEqual({ url: "/home.png" });
  });
});

describe("imageUrl", () => {
  it("resolves nested Strapi media and format fallbacks", () => {
    expect(
      imageUrl({
        data: {
          attributes: {
            formats: {
              thumbnail: { url: "/thumb.png" },
            },
          },
        },
      }),
    ).toBe("/thumb.png");
  });

  it("resolves venue images stored as a media array", () => {
    expect(
      imageUrl([
        { url: "https://cdn.example.com/nmsu-soccer-field.png" },
      ]),
    ).toBe("https://cdn.example.com/nmsu-soccer-field.png");
  });
});

describe("attractionImageUrl", () => {
  it("prefers artwork over images", () => {
    expect(
      attractionImageUrl({
        artwork: { url: "/artwork.png" },
        images: [{ url: "/images.png" }],
      }),
    ).toBe("/artwork.png");
  });

  it("falls back to the images array when artwork is missing", () => {
    expect(
      attractionImageUrl({
        images: [{ url: "/from-images.png" }],
      }),
    ).toBe("/from-images.png");
  });

  it("resolves artwork stored as a Strapi media array", () => {
    expect(
      attractionImageUrl({
        artwork: [{ url: "/utep.png" }],
      }),
    ).toBe("/utep.png");
  });

  it("falls back to logo when artwork is missing", () => {
    expect(
      attractionImageUrl({
        logo: { url: "/logo.png" },
      }),
    ).toBe("/logo.png");
  });
});

describe("normalizeAttractions", () => {
  it("unwraps Strapi relation entries with nested attributes", () => {
    expect(
      normalizeAttractions({
        data: [
          {
            id: 1,
            attributes: {
              name: "Niagara IceDogs",
              primary: true,
              order: 1,
              artwork: {
                data: {
                  attributes: {
                    url: "/clients/icedogs.svg",
                  },
                },
              },
            },
          },
          {
            id: 2,
            attributes: {
              name: "Erie Otters",
              primary: false,
              order: 2,
              images: [{ url: "/clients/pjhl.png" }],
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        name: "Niagara IceDogs",
        primary: true,
      }),
      expect.objectContaining({
        name: "Erie Otters",
        primary: false,
      }),
    ]);
  });
});

describe("resolveEventMatchup", () => {
  it("resolves home and away labels and artwork from normalized attractions", () => {
    expect(
      resolveEventMatchup(
        [
          {
            name: "Ogden Raptors",
            primary: true,
            order: 1,
            artwork: { url: "/clients/raptors.svg" },
          },
          {
            name: "Idaho Falls Chukars",
            primary: false,
            order: 2,
            artwork: { url: "/clients/houston-bulls.png" },
          },
        ],
        { orgName: "Ogden Raptors" },
      ),
    ).toEqual({
      home: expect.objectContaining({ name: "Ogden Raptors" }),
      away: expect.objectContaining({ name: "Idaho Falls Chukars" }),
      homeLabel: "Ogden Raptors",
      awayLabel: "Idaho Falls Chukars",
      homeLogoSrc: "/clients/raptors.svg",
      awayLogoSrc: "/clients/houston-bulls.png",
      awayShort: "IDA",
      showMatchupSection: true,
      showAwayTeam: true,
    });
  });

  it("shows a visitor placeholder for a single-attraction sporting event", () => {
    expect(
      resolveEventMatchup(
        [
          {
            name: "Niagara IceDogs",
            primary: true,
            artwork: { url: "/clients/icedogs.svg" },
          },
        ],
        { orgName: "Niagara IceDogs", sportingEvent: true },
      ),
    ).toEqual({
      home: expect.objectContaining({ name: "Niagara IceDogs" }),
      away: null,
      homeLabel: "Niagara IceDogs",
      awayLabel: "Visitor",
      homeLogoSrc: "/clients/icedogs.svg",
      awayLogoSrc: undefined,
      awayShort: "AWA",
      showMatchupSection: true,
      showAwayTeam: true,
    });
  });

  it("omits the visitor placeholder for a single-attraction non-sporting event", () => {
    expect(
      resolveEventMatchup(
        [
          {
            name: "Headliner Act",
            primary: true,
            artwork: { url: "/clients/concert.png" },
          },
        ],
        { orgName: "Live Nation", sportingEvent: false },
      ),
    ).toEqual({
      home: expect.objectContaining({ name: "Headliner Act" }),
      away: null,
      homeLabel: "Headliner Act",
      awayLabel: "",
      homeLogoSrc: "/clients/concert.png",
      awayLogoSrc: undefined,
      awayShort: "",
      showMatchupSection: true,
      showAwayTeam: false,
    });
  });
});
