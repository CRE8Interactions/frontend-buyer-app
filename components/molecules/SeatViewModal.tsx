"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/molecules/Modal";
import SeatViewImage from "@/components/molecules/SeatViewImage";
import {
  getSeatViewSlides,
  SEAT_VIEW_PLACEHOLDER,
  type SeatViewImageType,
} from "@/lib/seatView";
import useSeatmapStore from "@/stores/seatmapStore";

export type SeatViewTarget = {
  sectionNumber?: string | number | null;
  sectionName?: string | number | null;
  venueSlug?: string | null;
};

export default function SeatViewModal({
  target,
  onClose,
}: {
  target: SeatViewTarget | null;
  onClose: () => void;
}) {
  const bucket = useSeatmapStore((s) => s.bucket);
  const [slide, setSlide] = useState(0);

  const slides = target
    ? getSeatViewSlides(
        target.venueSlug,
        target.sectionNumber,
        target.sectionName,
        bucket,
      )
    : [];

  useEffect(() => {
    setSlide(0);
  }, [target?.sectionNumber, target?.sectionName, target?.venueSlug]);

  if (!target) return null;

  const current = slides[slide];
  const label =
    current?.type === "highlights"
      ? "Section location"
      : current?.type === "seat-view"
        ? "View from seats"
        : "Your view";

  return (
    <Modal title="Your view" onClose={onClose}>
      <div className="mt-5">
        <p className="mb-3 text-[13px] text-[#9DA2B3]">{label}</p>
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#051B35]">
          <div className="aspect-[16/10] w-full">
            {current ? (
              <SeatViewImage
                key={`${current.type}-${current.urls[0]}`}
                candidates={current.urls}
                alt={current.alt}
                className="h-full w-full object-contain"
                fallbackToPlaceholder={current.type === "seat-view"}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={SEAT_VIEW_PLACEHOLDER}
                alt="Seat view placeholder"
                className="h-full w-full object-contain"
              />
            )}
          </div>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                disabled={slide === 0}
                onClick={() => setSlide((s) => Math.max(0, s - 1))}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a2747]/90 text-white transition-colors hover:bg-[#0a2747] disabled:opacity-30"
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                disabled={slide >= slides.length - 1}
                onClick={() =>
                  setSlide((s) => Math.min(slides.length - 1, s + 1))
                }
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a2747]/90 text-white transition-colors hover:bg-[#0a2747] disabled:opacity-30"
              >
                <Chevron direction="right" />
              </button>
            </>
          ) : null}
        </div>

        {slides.length > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.type}
                type="button"
                aria-label={slideLabel(s.type)}
                aria-current={i === slide}
                onClick={() => setSlide(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === slide ? "bg-[#a6e773]" : "bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function slideLabel(type: SeatViewImageType) {
  return type === "highlights" ? "Section location" : "View from seats";
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={direction === "right" ? "rotate-180" : undefined}
    >
      <path d="M15 6 9 12l6 6" />
    </svg>
  );
}
