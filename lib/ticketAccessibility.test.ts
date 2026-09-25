import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import {
  ACCESSIBLE_LABEL_DA,
  ACCESSIBLE_LABEL_DB,
  ACCESSIBLE_LABEL_GENERIC,
  accessibleTypeOf,
  getAccessibleLabel,
  getWalletAccessibleLabel,
  isAccessibleSource,
  seatmapAccessibilityLegendRows,
  WALLET_ACCESSIBLE_LABEL_DA,
  WALLET_ACCESSIBLE_LABEL_DB,
} from "@/lib/ticketAccessibility";

const accessibleGroup = DEMO_SEATED_TICKET_GROUPS.find(
  (group) => group.accessible,
)!;

describe("ticket accessibility", () => {
  it("reads every field spelling and returns DA / DB / fallback copy", () => {
    expect(getAccessibleLabel({ accessibleType: "DA" })).toBe(ACCESSIBLE_LABEL_DA);
    expect(getAccessibleLabel({ accessiblityType: "DB" })).toBe(
      ACCESSIBLE_LABEL_DB,
    );
    expect(getAccessibleLabel({ accessibilityType: "DA" })).toBe(
      ACCESSIBLE_LABEL_DA,
    );
    expect(getAccessibleLabel({ accessible: true })).toBe(ACCESSIBLE_LABEL_GENERIC);
    expect(getAccessibleLabel({ raw: { accessible: true, accessibleType: "DB" } })).toBe(
      ACCESSIBLE_LABEL_DB,
    );
    expect(accessibleTypeOf(accessibleGroup)).toBe("DA");
    expect(isAccessibleSource(accessibleGroup)).toBe(true);
  });

  it("returns empty copy when the ticket is not accessible", () => {
    expect(getAccessibleLabel({ accessible: false })).toBe("");
    expect(getAccessibleLabel({})).toBe("");
    expect(isAccessibleSource(DEMO_SEATED_TICKET_GROUPS[0])).toBe(false);
  });

  it("uses shorter wallet pass strings", () => {
    expect(getWalletAccessibleLabel({ accessibleType: "DA" })).toBe(
      WALLET_ACCESSIBLE_LABEL_DA,
    );
    expect(getWalletAccessibleLabel({ accessibleType: "DB" })).toBe(
      WALLET_ACCESSIBLE_LABEL_DB,
    );
    expect(getWalletAccessibleLabel({ accessible: true })).toBe(
      ACCESSIBLE_LABEL_GENERIC,
    );
    expect(getWalletAccessibleLabel({})).toBe("");
  });

  it("shows DA and DB legend rows when those types exist, otherwise Accessibility", () => {
    expect(seatmapAccessibilityLegendRows([{ accessibleType: "DA" }])).toEqual([
      { label: "DA", color: "#2DEDB4" },
    ]);
    expect(
      seatmapAccessibilityLegendRows([
        { accessibleType: "DA" },
        { accessibleType: "DB" },
      ]),
    ).toEqual([
      { label: "DA", color: "#2DEDB4" },
      { label: "DB", color: "#F4BC16" },
    ]);
    expect(seatmapAccessibilityLegendRows([{ accessible: true }])).toEqual([
      { label: "Accessibility", color: "#F4BC16" },
    ]);
  });
});
