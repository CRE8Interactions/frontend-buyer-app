import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ORGS, demoSeatmapMapping } from "@/lib/demo/fixtures";
import type { SeatmapBackground } from "@/lib/seatmapLookups";
import { resetSeatmapBackgroundCache } from "@/tests/seatmap";
import useSeatmapStore from "@/stores/seatmapStore";

const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;

vi.mock("next/navigation", () => ({
  usePathname: () => `/${icedogs.slug}/`,
  useParams: () => ({ slug: icedogs.slug }),
}));

vi.mock("@/components/organisms/InteractiveSeatmap", () => ({
  InteractiveSeatmap: () => (
    <div data-testid="interactive-seatmap">Interactive seat map</div>
  ),
  InteractiveSeatmapMemo: () => (
    <div data-testid="interactive-seatmap">Interactive seat map</div>
  ),
}));

vi.mock("@/components/molecules/SectionLocatorThumb", () => ({
  default: () => <div data-testid="section-thumb">Thumb</div>,
}));

import SeatMapSelectionOverlay from "@/components/organisms/SeatMapSelectionOverlay";

const BACKGROUND: SeatmapBackground = {
  url: "https://example.com/seatmap.svg",
  width: 1000,
  height: 800,
};

type MapProps = {
  mapMapping?: ReturnType<typeof demoSeatmapMapping> | null;
  mapBackground?: SeatmapBackground | null;
  preparing?: boolean;
};

function overlay(props: MapProps) {
  return (
    <SeatMapSelectionOverlay
      title="IceDogs vs Raptors"
      accent={icedogs.branding.primaryColor}
      accentSoft="#fbe9ec"
      buttonColor={icedogs.branding.buttonColor}
      buttonTextColor="#ffffff"
      mobile={false}
      onClose={() => {}}
      onCheckout={() => {}}
      orgName={icedogs.name}
      logoSrc={icedogs.branding.logo.url}
      venueSlug={icedogs.venue.slug}
      {...props}
    />
  );
}

function renderOverlay(props: MapProps = {}) {
  return render(overlay(props));
}

function loaderShowing() {
  return Boolean(document.querySelector("[data-bt-tenant-loader]"));
}

function backgroundPreload() {
  return document.querySelector("[data-seatmap-background-preload]");
}

describe("SeatMapSelectionOverlay map readiness", () => {
  beforeEach(() => {
    resetSeatmapBackgroundCache();
    useSeatmapStore.setState({
      data: null,
      background: null,
      selectedFromMap: [],
      totalCount: 0,
      totalPrice: 0,
      seatedError: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds the org loader until both the geometry and the background are in", () => {
    const { rerender } = renderOverlay({
      mapMapping: demoSeatmapMapping(),
      mapBackground: null,
    });

    // Painting the map with only half its data reads as a flash.
    expect(loaderShowing()).toBe(true);
    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();

    rerender(
      overlay({
        mapMapping: demoSeatmapMapping(),
        mapBackground: BACKGROUND,
      }),
    );

    // The URL alone is not the artwork: the seatmap draws its seats at full
    // opacity while the image downloads, so seats would appear on a blank stage.
    expect(loaderShowing()).toBe(true);
    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();

    fireEvent.load(backgroundPreload()!);

    expect(screen.getByTestId("interactive-seatmap")).toBeInTheDocument();
    expect(loaderShowing()).toBe(false);
  });

  it("paints the map when the background image fails so a bad URL cannot trap the shopper", () => {
    renderOverlay({
      mapMapping: demoSeatmapMapping(),
      mapBackground: BACKGROUND,
    });

    expect(loaderShowing()).toBe(true);

    fireEvent.error(backgroundPreload()!);

    expect(screen.getByTestId("interactive-seatmap")).toBeInTheDocument();
    expect(loaderShowing()).toBe(false);
  });

  it("stops waiting on a background that never arrives so the loader cannot stick", () => {
    vi.useFakeTimers();
    renderOverlay({ mapMapping: demoSeatmapMapping(), mapBackground: null });

    expect(loaderShowing()).toBe(true);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // A seatmap may ship without a background; the geometry still draws.
    expect(screen.getByTestId("interactive-seatmap")).toBeInTheDocument();
    expect(loaderShowing()).toBe(false);
  });

  it("keeps the org loader up when the geometry never arrives", () => {
    vi.useFakeTimers();
    renderOverlay({ mapMapping: null, mapBackground: BACKGROUND });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Without seats there is nothing to draw, so the loader is never waived.
    expect(loaderShowing()).toBe(true);
    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();
  });
});
