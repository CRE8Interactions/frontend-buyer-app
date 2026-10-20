import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SectionLocatorThumb, {
  CANDIDATE_RETRY_DELAY_MS,
  retryCandidateSrc,
} from "@/components/molecules/SectionLocatorThumb";
import { DEMO_EVENTS, demoSeatmapMapping } from "@/lib/demo/fixtures";
import { getSeatViewImageCandidates, SEAT_VIEW_PLACEHOLDER } from "@/lib/seatView";

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
    expect(screen.getByRole("img", { name: /seat view placeholder/i })).toHaveAttribute(
      "src",
      SEAT_VIEW_PLACEHOLDER,
    );
  });

  it("keeps the placeholder when the section is not on the venue map", () => {
    const rink = "https://example.com/rink.svg";
    render(
      <SectionLocatorThumb
        sectionNumber="GA"
        section="GA"
        background={{ url: rink, width: 1000, height: 800 }}
        mapping={demoSeatmapMapping()}
      />,
    );

    expect(screen.getByRole("img", { name: /seat view placeholder/i })).toHaveAttribute(
      "src",
      SEAT_VIEW_PLACEHOLDER,
    );
    expect(document.querySelector(`img[src="${rink}"]`)).not.toBeInTheDocument();
  });

  it("shows the venue map with the section highlighted when the seat location has no photo", () => {
    const rink = "https://example.com/rink.svg";
    const mapping = demoSeatmapMapping();
    const path = mapping.sections?.["sec-m"]?.path || "";
    render(
      <SectionLocatorThumb
        sectionId="sec-m"
        sectionNumber="M"
        background={{ url: rink, width: 1000, height: 800 }}
        mapping={mapping}
      />,
    );

    expect(screen.getByRole("img", { name: /location of section m/i })).toBeInTheDocument();
    expect(document.querySelector(`image[href="${rink}"]`)).toBeInTheDocument();
    expect(document.querySelector(`path[d="${path}"]`)).toBeInTheDocument();
    expect(document.querySelector("[data-seat-pin]")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /seat view placeholder/i })).not.toBeInTheDocument();
  });

  it("highlights a seatmap section when the ticket name uses spaces instead of underscores", () => {
    const rink = "https://example.com/rink.svg";
    const mapping = demoSeatmapMapping();
    const section = mapping.sections?.["sec-m"];
    if (section) section.sectionNumber = "NORTH_ADA";
    render(
      <SectionLocatorThumb
        sectionNumber="NORTH ADA"
        background={{ url: rink, width: 1000, height: 800 }}
        mapping={mapping}
      />,
    );

    expect(
      screen.getByRole("img", { name: /location of section north ada/i }),
    ).toBeInTheDocument();
    expect(document.querySelector(`path[d="${section?.path || ""}"]`)).toBeInTheDocument();
  });

  it("shows a spinner until the seat image has loaded", () => {
    renderThumb();

    expect(screen.getByRole("status", { name: /loading seat image/i })).toBeInTheDocument();
    fireEvent.load(screen.getByAltText(thumbAlt));
    expect(screen.queryByRole("status", { name: /loading seat image/i })).not.toBeInTheDocument();
    expect(screen.getByAltText(thumbAlt)).toBeInTheDocument();
  });

  it("keeps a loaded seat image when the venue map arrives", () => {
    const { rerender } = renderThumb();
    fireEvent.load(screen.getByAltText(thumbAlt));
    expect(screen.queryByRole("status", { name: /loading seat image/i })).not.toBeInTheDocument();

    rerender(
      <SectionLocatorThumb
        sectionNumber={SECTION}
        section={SECTION}
        thumbnailCandidates={candidates}
        background={{ url: "https://example.com/rink.svg", width: 1000, height: 800 }}
        mapping={demoSeatmapMapping()}
      />,
    );

    expect(screen.queryByRole("status", { name: /loading seat image/i })).not.toBeInTheDocument();
    expect(screen.getByAltText(thumbAlt)).toHaveAttribute("src", candidates[0]);
  });

  it("shows a cached seat image without waiting for another load", () => {
    const imageProto = HTMLImageElement.prototype;
    const complete = Object.getOwnPropertyDescriptor(imageProto, "complete");
    const naturalWidth = Object.getOwnPropertyDescriptor(imageProto, "naturalWidth");
    Object.defineProperty(imageProto, "complete", { configurable: true, get: () => true });
    Object.defineProperty(imageProto, "naturalWidth", { configurable: true, get: () => 1440 });

    try {
      renderThumb();
      expect(screen.queryByRole("status", { name: /loading seat image/i })).not.toBeInTheDocument();
      expect(screen.getByAltText(thumbAlt)).toHaveAttribute("src", candidates[0]);
    } finally {
      if (complete) Object.defineProperty(imageProto, "complete", complete);
      if (naturalWidth) Object.defineProperty(imageProto, "naturalWidth", naturalWidth);
    }
  });

  it("keeps the same spinner while a throttled image retries and moves on", () => {
    vi.useFakeTimers();
    renderThumb();
    const spinner = screen.getByRole("status", { name: /loading seat image/i });

    fireEvent.error(screen.getByAltText(thumbAlt));
    expect(screen.getByRole("status", { name: /loading seat image/i })).toBe(spinner);

    act(() => {
      vi.advanceTimersByTime(CANDIDATE_RETRY_DELAY_MS);
    });
    fireEvent.error(screen.getByAltText(thumbAlt));
    expect(screen.getByAltText(thumbAlt)).toHaveAttribute("src", candidates[1]);
    expect(screen.getByRole("status", { name: /loading seat image/i })).toBe(spinner);
  });
});
