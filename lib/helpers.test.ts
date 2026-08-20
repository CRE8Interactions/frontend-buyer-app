import { describe, expect, it } from "vitest";
import { DEMO_EVENTS, demoFlexPack, demoSeasonPackage } from "@/lib/demo/fixtures";
import {
  eventDoorsIso,
  eventWhenWithDoors,
  flexPackPurchasePath,
  formatDoorsTime,
  formatEventWhen,
  isRequestCanceled,
  packagePurchasePath,
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
