import { describe, expect, it } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { teamStorefrontDescription } from "@/lib/teamCopy";

const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("teamStorefrontDescription", () => {
  it("lists venue names for teams with venues", () => {
    expect(teamStorefrontDescription(nmState.name, nmState.venues)).toBe(
      "Tickets for NM State Athletics — Aggie Memorial Stadium, Pan American Center.",
    );
  });

  it("names the single venue when the team has only one", () => {
    expect(teamStorefrontDescription(raptors.name, raptors.venues)).toBe(
      "Tickets for Ogden Raptors — Lindquist Field.",
    );
  });

  it("falls back when the team has no venues", () => {
    expect(teamStorefrontDescription("Example Team", [])).toBe(
      "Browse and buy tickets, season passes, and flex packs for Example Team.",
    );
  });

  it("truncates long venue lists with and more", () => {
    const venues = [
      { name: "Venue A", slug: "a" },
      { name: "Venue B", slug: "b" },
      { name: "Venue C", slug: "c" },
      { name: "Venue D", slug: "d" },
      { name: "Venue E", slug: "e" },
    ];
    expect(teamStorefrontDescription("Big Program", venues)).toBe(
      "Tickets for Big Program — Venue A, Venue B, Venue C, Venue D, and more.",
    );
  });
});
