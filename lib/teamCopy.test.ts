import { describe, expect, it } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import { teamStorefrontDescription } from "@/lib/teamCopy";

const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("teamStorefrontDescription", () => {
  it("mentions all venues when the team has more than one", () => {
    expect(teamStorefrontDescription(nmState.name, nmState.venues)).toBe(
      "All tickets, season packages and flex packages for all venues.",
    );
  });

  it("names the single venue when the team has only one", () => {
    expect(teamStorefrontDescription(raptors.name, raptors.venues)).toBe(
      `All tickets, season packages and flex packages for ${raptors.homeVenue.name}.`,
    );
  });
});
