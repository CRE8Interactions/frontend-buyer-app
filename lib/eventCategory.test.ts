import { describe, expect, it } from "vitest";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  isSportingEvent,
  isSportingEventCategory,
  resolveTicketCategoryKey,
} from "@/lib/eventCategory";

const nmState = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;

describe("resolveTicketCategoryKey", () => {
  it.each([
    ["Sporting", "sports"],
    ["Motorsport", "sports"],
    ["Football", "default"],
    ["Hockey", "default"],
    ["Concert", "concert"],
    ["Theater", "theater"],
    ["Family Show", "family"],
    ["Access Pass", "access"],
  ] as const)("maps category %s to %s", (category, key) => {
    expect(resolveTicketCategoryKey(category)).toBe(key);
  });
});

describe("isSportingEventCategory", () => {
  it("treats sport-themed badge categories as sporting", () => {
    expect(isSportingEventCategory("Sporting")).toBe(true);
    expect(isSportingEventCategory("Motorsport")).toBe(true);
    expect(isSportingEventCategory("Sports")).toBe(true);
  });

  it("treats named team sports as sporting", () => {
    expect(isSportingEventCategory("Football")).toBe(true);
    expect(isSportingEventCategory("Hockey")).toBe(true);
    expect(isSportingEventCategory("Soccer")).toBe(true);
    expect(isSportingEventCategory("Baseball")).toBe(true);
  });

  it("does not treat concerts or theater as sporting", () => {
    expect(isSportingEventCategory("Concert")).toBe(false);
    expect(isSportingEventCategory("Theater")).toBe(false);
  });
});

describe("isSportingEvent", () => {
  it("reads the event or organization category", () => {
    expect(
      isSportingEvent({
        ...nmState,
        category: { name: "Sports" },
      }),
    ).toBe(true);
    expect(
      isSportingEvent({
        ...nmState,
        organization: { ...nmState.organization, category: { name: "Football" } },
      }),
    ).toBe(true);
    expect(
      isSportingEvent({
        ...nmState,
        category: { name: "Concert" },
      }),
    ).toBe(false);
  });
});
