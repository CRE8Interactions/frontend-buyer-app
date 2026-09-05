import { describe, expect, it } from "vitest";
import { fieldFocusVars, shopperShellVars } from "@/lib/branding";
import { DEMO_ORGS } from "@/lib/demo/fixtures";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

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
