"use client";

import SeatViewImage from "@/components/molecules/SeatViewImage";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import useSeatmapStore from "@/stores/seatmapStore";

export default function SeatViewThumb({
  venueSlug,
  sectionNumber,
  sectionName,
  onOpen,
  className = "",
}: {
  venueSlug?: string | null;
  sectionNumber?: string | number | null;
  sectionName?: string | number | null;
  onOpen: () => void;
  className?: string;
}) {
  const bucket = useSeatmapStore((s) => s.bucket);
  const candidates = getSeatViewImageCandidates(
    venueSlug,
    sectionNumber,
    sectionName,
    ["thumbnail", "seat-view", "highlights"],
    bucket,
  );

  if (!venueSlug || candidates.length === 0) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label="View from seats"
      title="View from seats"
      className={`group relative h-[52px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#051B35] transition-colors hover:border-[#a6e773]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a6e773] ${className}`}
    >
      <SeatViewImage
        candidates={candidates}
        alt="Seat view for this ticket"
        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
      />
    </button>
  );
}
