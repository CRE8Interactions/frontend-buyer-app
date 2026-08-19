"use client";

import { useEffect, useState } from "react";
import { SEAT_VIEW_PLACEHOLDER } from "@/lib/seatView";

/** Image that walks a candidate URL list, then optional placeholder. */
export default function SeatViewImage({
  candidates,
  alt,
  className = "",
  fallbackToPlaceholder = true,
}: {
  candidates: string[];
  alt: string;
  className?: string;
  fallbackToPlaceholder?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const candidatesKey = candidates.join("|");

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [candidatesKey]);

  if (failed || candidates.length === 0) {
    if (!fallbackToPlaceholder) {
      return (
        <div
          role="img"
          aria-label="Image not available"
          className={`flex items-center justify-center bg-[#051B35] text-[12px] text-[#9DA2B3] ${className}`}
        >
          Not available
        </div>
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={SEAT_VIEW_PLACEHOLDER}
        alt={alt}
        className={className}
      />
    );
  }

  const src = candidates[Math.min(index, candidates.length - 1)];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        const next = index + 1;
        if (next < candidates.length) {
          setIndex(next);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
