import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeatmapMapping,
  demoSeasonPackage,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import { selectionOfferName } from "@/lib/ticketSummary";
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

  it("shows one Your selection card per GA ticket instead of a quantity multiplier", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    useSeatmapStore.setState({
      selectedFromMap: [{ ...ga, quantity: 2 }],
      totalCount: 2,
      totalPrice: Number(ga.price || 0) * 2,
    });
    renderOverlay({
      mapMapping: demoSeatmapMapping(),
      mapBackground: BACKGROUND,
    });
    fireEvent.load(backgroundPreload()!);

    expect(screen.getAllByRole("button", { name: /remove ticket/i })).toHaveLength(
      2,
    );
    expect(screen.queryByText(/× 2/)).not.toBeInTheDocument();
    expect(screen.getAllByText(`$${Number(ga.price).toFixed(2)}`)).toHaveLength(2);
    expect(screen.getAllByText(selectionOfferName(ga)).length).toBeGreaterThan(0);
  });

  it("shows one Your selection card per package ticket", () => {
    const pkg = demoSeasonPackage();
    const group = DEMO_SEATED_TICKET_GROUPS[0];
    useSeatmapStore.setState({
      selectedFromMap: [
        {
          ...group,
          GA: false,
          quantity: 2,
          package: { name: pkg.name, maxQuantity: pkg.maxQuantity },
        },
      ],
      totalCount: 2,
      totalPrice: Number(group.price || 0) * 2,
    });
    renderOverlay({
      mapMapping: demoSeatmapMapping(),
      mapBackground: BACKGROUND,
    });
    fireEvent.load(backgroundPreload()!);

    expect(screen.getAllByRole("button", { name: /remove ticket/i })).toHaveLength(
      2,
    );
    expect(screen.queryByText(/× 2/)).not.toBeInTheDocument();
    expect(
      screen.getAllByText(`$${Number(group.price).toFixed(2)}`),
    ).toHaveLength(2);
  });

  it("removes one GA card without dropping the rest of the quantity", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    useSeatmapStore.setState({
      selectedFromMap: [{ ...ga, quantity: 2 }],
      totalCount: 2,
      totalPrice: Number(ga.price || 0) * 2,
    });
    renderOverlay({
      mapMapping: demoSeatmapMapping(),
      mapBackground: BACKGROUND,
    });
    fireEvent.load(backgroundPreload()!);

    fireEvent.click(screen.getAllByRole("button", { name: /remove ticket/i })[0]);

    expect(screen.getAllByRole("button", { name: /remove ticket/i })).toHaveLength(
      1,
    );
    expect(useSeatmapStore.getState().selectedFromMap[0]?.quantity).toBe(1);
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
