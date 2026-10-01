import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SectionLocatorThumb, {
  CANDIDATE_RETRY_DELAY_MS,
  retryCandidateSrc,
} from "@/components/molecules/SectionLocatorThumb";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import { getSeatViewImageCandidates } from "@/lib/seatView";

const SECTION = "101";
const venueSlug = DEMO_EVENTS[0].venue.slug;
const candidates = getSeatViewImageCandidates(venueSlug, SECTION, SECTION, [
  "highlights",
  "thumbnail",
]);
const thumbAlt = `Location of section ${SECTION}`;

function renderThumb() {
  return render(
    <SectionLocatorThumb
      sectionNumber={SECTION}
      section={SECTION}
      thumbnailCandidates={candidates}
    />,
  );
}

describe("SectionLocatorThumb CDN retry", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-requests a failed thumbnail once before moving to the next candidate", () => {
    vi.useFakeTimers();
    renderThumb();

    const first = screen.getByAltText(thumbAlt);
    expect(first).toHaveAttribute("src", candidates[0]);

    fireEvent.error(first);

    // Holding period: no image is requested until the burst drains.
    expect(screen.queryByAltText(thumbAlt)).not.toBeInTheDocument();
    expect(screen.getByLabelText(thumbAlt)).toHaveAttribute("aria-busy", "true");

    act(() => {
      vi.advanceTimersByTime(CANDIDATE_RETRY_DELAY_MS);
    });

    expect(screen.getByAltText(thumbAlt)).toHaveAttribute(
      "src",
      retryCandidateSrc(candidates[0], 1),
    );
  });

  it("falls back to the generic thumb only after every candidate fails twice", () => {
    vi.useFakeTimers();
    renderThumb();

    for (const candidate of candidates) {
      const img = screen.getByAltText(thumbAlt);
      expect(img).toHaveAttribute("src", candidate);
      fireEvent.error(img);
      act(() => {
        vi.advanceTimersByTime(CANDIDATE_RETRY_DELAY_MS);
      });
      fireEvent.error(screen.getByAltText(thumbAlt));
    }

    expect(screen.queryByAltText(thumbAlt)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(thumbAlt)).not.toBeInTheDocument();
  });
});
