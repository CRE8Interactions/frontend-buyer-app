import { describe, expect, it } from "vitest";
import { repairLabelSection, repairLabelSections } from "./repairLabelSections";
import type { SeatmapSection } from "./seatmapLookups";

const ENDLINE_ID = "a8fd0b88-ac38-4110-ad8e-cd674d17f4af";
const letterPath = "M355.223 1401.17h20.823v13.54h-3.162z";

describe("repairLabelSection", () => {
  it("uses the Endline Suite rectangle as the clickable section and keeps the letters as a grey name", () => {
    const repaired = repairLabelSection({
      sectionId: ENDLINE_ID,
      sectionNumber: "ENDLINE_SUITE",
      path: letterPath,
      fill: "#fff",
      identifier: {},
      spots: ["spot-1"],
    } as SeatmapSection);

    expect(repaired.path?.startsWith("M324.935")).toBe(true);
    expect(repaired.fill).toBe("#2563EB");
    expect(repaired.stroke).toBe("#fff");
    expect(repaired.identifier?.path).toBe(letterPath);
    expect(repaired.identifier?.fill).toBe("#E6E8EC");
    expect(repaired.identifier?.soldOutFill).toBe("#353945");
    expect(repaired.spots).toEqual(["spot-1"]);
  });

  it("leaves a section that already has a name path alone", () => {
    const section = {
      sectionId: ENDLINE_ID,
      path: "M0 0h10v10z",
      identifier: { path: letterPath, fill: "#fff" },
    } as SeatmapSection;

    expect(repairLabelSection(section)).toBe(section);
  });

  it("leaves other sections alone", () => {
    const section = {
      sectionId: "107566d4-59f7-426a-9740-77ca351ff18d",
      path: "M1881.52 260.102z",
      fill: "#2563EB",
      identifier: { path: "M1 1z", fill: "#fff" },
    } as SeatmapSection;

    expect(repairLabelSection(section)).toBe(section);
  });
});

describe("repairLabelSections", () => {
  it("returns an empty list when a map has no sections", () => {
    expect(repairLabelSections(undefined)).toEqual([]);
    expect(repairLabelSections(null)).toEqual([]);
  });
});
