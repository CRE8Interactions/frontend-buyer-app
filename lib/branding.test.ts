import { describe, expect, it } from "vitest";
import {
  fieldFocusVars,
  resolvePrimaryAttractionImage,
  shopperShellVars,
} from "@/lib/branding";
import { DEMO_ORGS } from "@/lib/demo/fixtures";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("resolvePrimaryAttractionImage", () => {
  const bulls = {
    name: "North Iowa Bulls",
    primary: true,
    order: 0,
    artwork: { url: "https://cdn.example/bulls.jpg" },
  };
  const lumberjacks = {
    name: "Granite City Lumberjacks",
    primary: false,
    order: 1,
    artwork: { url: "https://cdn.example/lumberjacks.jpg" },
  };

  it("uses the attraction marked primary", () => {
    expect(
      resolvePrimaryAttractionImage({
        attractions: [lumberjacks, bulls],
      }),
    ).toEqual({
      url: "https://cdn.example/bulls.jpg",
      name: "North Iowa Bulls",
    });
  });

  it("falls back to the lowest-order attraction with artwork", () => {
    expect(
      resolvePrimaryAttractionImage({
        attractions: [
          { ...lumberjacks, primary: false, order: 2 },
          { ...bulls, primary: false, order: 1 },
        ],
      }),
    ).toEqual({
      url: "https://cdn.example/bulls.jpg",
      name: "North Iowa Bulls",
    });
  });

  it("skips a primary attraction that has no artwork", () => {
    expect(
      resolvePrimaryAttractionImage({
        attractions: [{ ...bulls, artwork: null }, lumberjacks],
      }),
    ).toEqual({
      url: "https://cdn.example/lumberjacks.jpg",
      name: "Granite City Lumberjacks",
    });
  });

  it("returns null when no attraction has artwork", () => {
    expect(
      resolvePrimaryAttractionImage({
        attractions: [{ name: "Bulls", primary: true, artwork: null }],
      }),
    ).toBeNull();
  });
});

describe("fieldFocusVars", () => {
  it("hands an org-branded surface its own focus colour", () => {
    expect(fieldFocusVars(raptors.branding.primaryColor)).toEqual({
      "--bt-field-focus": raptors.branding.primaryColor,
    });
  });

  it("leaves unbranded surfaces on the Blocktickets default", () => {
    expect(fieldFocusVars(null)).toEqual({});
    expect(fieldFocusVars(undefined)).toEqual({});
    expect(fieldFocusVars("")).toEqual({});
  });
});

describe("shopperShellVars", () => {
  it("sets accent and focus tokens for branded shopper shells", () => {
    expect(shopperShellVars(raptors.branding.primaryColor)).toEqual({
      "--acc": raptors.branding.primaryColor,
      "--bt-field-focus": raptors.branding.primaryColor,
    });
  });

  it("leaves unbranded shells on the global default", () => {
    expect(shopperShellVars(null)).toEqual({});
  });
});
