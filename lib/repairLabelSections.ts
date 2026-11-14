import type { SeatmapSection } from "@/lib/seatmapLookups";

/**
 * Soccer Field (seatmap 98) saved Endline Suite's letter outlines as the
 * section path. The rectangle fans see is only in the background image, so
 * the blue fill and the click target are the letters, and a white fill hides
 * the name. The rectangle below is that background shape. The original path
 * becomes the name, in the same grey Endline Lounge uses when it is not for sale.
 */
const ENDLINE_SUITE_SECTION_ID = "a8fd0b88-ac38-4110-ad8e-cd674d17f4af";

const AVAILABLE_SECTION_FILL = "#2563EB";
const SECTION_NAME_GREY = "#E6E8EC";
const SOLD_OUT_NAME = "#353945";

const ENDLINE_SUITE_RECT =
  "M324.935 1374.52C324.935 1370 328.598 1366.34 333.116 1366.34H399.584C404.102 1366.34 407.765 1370 407.765 1374.52V1637.32C407.765 1641.84 404.102 1645.5 399.584 1645.5H333.116C328.598 1645.5 324.935 1641.84 324.935 1637.32V1374.52Z";

const LABEL_SECTION_SHAPES: Record<
  string,
  {
    path: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    nameFill: string;
    soldOutNameFill: string;
  }
> = {
  [ENDLINE_SUITE_SECTION_ID]: {
    path: ENDLINE_SUITE_RECT,
    fill: AVAILABLE_SECTION_FILL,
    stroke: "#fff",
    strokeWidth: 4.199,
    nameFill: SECTION_NAME_GREY,
    soldOutNameFill: SOLD_OUT_NAME,
  },
};

export function repairLabelSection(section: SeatmapSection): SeatmapSection {
  if (!section || section.identifier?.path) return section;
  const shape = LABEL_SECTION_SHAPES[String(section.sectionId)];
  if (!shape || !section.path) return section;

  return {
    ...section,
    path: shape.path,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    identifier: {
      ...(section.identifier || {}),
      path: section.path,
      fill: shape.nameFill,
      soldOutFill: shape.soldOutNameFill,
    },
  };
}

export function repairLabelSections(
  sections: Record<string, SeatmapSection> | SeatmapSection[] | null | undefined,
): SeatmapSection[] {
  if (!sections) return [];
  const values = Array.isArray(sections) ? sections : Object.values(sections);
  return values.map(repairLabelSection);
}
