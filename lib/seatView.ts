import { SEAT_VIEW_PLACEHOLDER } from "@/stores/seatmapStore";

export { SEAT_VIEW_PLACEHOLDER };

export type SeatViewImageType = "thumbnail" | "highlights" | "seat-view";

const DEFAULT_BUCKET =
  "https://blocktickets.nyc3.cdn.digitaloceanspaces.com";

/** Normalize section labels into CDN filename candidates. */
export function sectionImageIdentifiers(
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
): string[] {
  const raw = [sectionNumber, sectionName]
    .filter((value) => value != null && String(value).trim() !== "")
    .map((value) => String(value).trim().toLowerCase());

  return [
    ...new Set(
      raw.flatMap((value) => [
        value,
        value.replace(/^sec(?:tion)?\s*/i, ""),
        value.replace(/\s+/g, ""),
        value.replace(/[^a-z0-9]/g, ""),
      ]),
    ),
  ].filter(Boolean);
}

export function getSeatViewImageUrl(
  venueSlug: string,
  sectionIdentifier: string,
  type: SeatViewImageType = "highlights",
  bucket = DEFAULT_BUCKET,
) {
  return `${bucket}/venues/${venueSlug}/${type}/${sectionIdentifier}.png`;
}

/** Ordered fallback URLs for listing thumbs / checkout images. */
export function getSeatViewImageCandidates(
  venueSlug: string | null | undefined,
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
  types: SeatViewImageType[] = ["thumbnail", "seat-view", "highlights"],
  bucket = DEFAULT_BUCKET,
): string[] {
  if (!venueSlug) return [];
  const identifiers = sectionImageIdentifiers(sectionNumber, sectionName);
  return identifiers.flatMap((id) =>
    types.map((type) => getSeatViewImageUrl(venueSlug, id, type, bucket)),
  );
}

/** Highlights + seat-view slides for the "Your view" modal. */
export function getSeatViewSlides(
  venueSlug: string | null | undefined,
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
  bucket = DEFAULT_BUCKET,
): Array<{ type: SeatViewImageType; urls: string[]; alt: string }> {
  if (!venueSlug) return [];
  const identifiers = sectionImageIdentifiers(sectionNumber, sectionName);
  if (identifiers.length === 0) return [];

  return [
    {
      type: "highlights",
      urls: identifiers.map((id) =>
        getSeatViewImageUrl(venueSlug, id, "highlights", bucket),
      ),
      alt: "Seat position for this section",
    },
    {
      type: "seat-view",
      urls: [
        ...identifiers.map((id) =>
          getSeatViewImageUrl(venueSlug, id, "seat-view", bucket),
        ),
        SEAT_VIEW_PLACEHOLDER,
      ],
      alt: "Seat view for this ticket",
    },
  ];
}
