import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_GA_SECTION_ID,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_SECTION_FILL,
  demoSeatmapMapping,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import {
  createSeatLookupTables,
  createSectionLookupTable,
} from "@/lib/seatmapLookups";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import InteractiveSeatmap from "./InteractiveSeatmap";
import SeatmapSeat from "./SeatmapSeat";
import SeatmapSections from "./SeatmapSections";

const UNAVAILABLE_FILL = "#9DA2B3";
const EXCLUSIVE_FILL = "#9757D7";
const mapping = demoSeatmapMapping();

function renderSections(
  props: Partial<React.ComponentProps<typeof SeatmapSections>> = {},
) {
  const { container } = render(
    <svg>
      <SeatmapSections
        data={mapping}
        sectionCoversEnabled
        onTooltip={vi.fn()}
        {...props}
      />
    </svg>,
  );
  return (sectionId: string) =>
    container.querySelector(`[id="${sectionId}"]`) as SVGPathElement | null;
}

beforeAll(() => {
  // jsdom has no SVG layout, and the label pass measures every section.
  (
    SVGElement.prototype as unknown as { getBBox: () => DOMRect }
  ).getBBox = () =>
    ({ x: 0, y: 0, width: 240, height: 40 }) as DOMRect;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperties(HTMLElement.prototype, {
    clientWidth: { configurable: true, get: () => 1000 },
    clientHeight: { configurable: true, get: () => 800 },
  });
});

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: 1024,
  });
  useSeatmapStore.setState({
    data: mapping,
    background: null,
    selectedFromMap: [],
    totalCount: 0,
    totalPrice: 0,
    seatLookupTable: createSeatLookupTables(DEMO_SEATED_TICKET_GROUPS)
      .lookupTable,
    seatOffersLookupTable: {},
    sectionLookupTable: createSectionLookupTable(
      demoTicketGroups().ticketGroups,
    ),
  });
  useFiltersStore.setState({
    ticketGroups: DEMO_SEATED_TICKET_GROUPS,
    loadingTicketGroups: false,
    event: { venue: { slug: "lindquist-field" } },
  });
});

describe("SeatmapSections", () => {
  it("keeps the authored fill on seated sections that still have seats", () => {
    const section = renderSections();

    expect(section("sec-m")).toHaveAttribute("fill", DEMO_SECTION_FILL);
    expect(section("sec-m")).toHaveAttribute("opacity", "1");
  });

  it("greys out a sold-out seated section instead of using its authored fill", () => {
    const section = renderSections();

    expect(section("sec-b")).toHaveAttribute("fill", UNAVAILABLE_FILL);
    expect(section("sec-b")).toHaveAttribute("opacity", "0.45");
  });

  it("greys out every seated section when there is no inventory at all", () => {
    useSeatmapStore.setState({ seatLookupTable: {}, sectionLookupTable: {} });
    const section = renderSections();

    ["sec-m", "sec-a", "sec-n", "sec-b"].forEach((id) => {
      expect(section(id)).toHaveAttribute("fill", UNAVAILABLE_FILL);
    });
  });

  it("keeps a GA section available while it has GA groups", () => {
    const section = renderSections();

    expect(section(DEMO_GA_SECTION_ID)).toHaveAttribute(
      "fill",
      DEMO_SECTION_FILL,
    );
  });

  it("greys out and unlinks a GA section once its groups are gone", () => {
    useSeatmapStore.setState({ sectionLookupTable: {} });
    const section = renderSections();

    expect(section(DEMO_GA_SECTION_ID)).toHaveAttribute(
      "fill",
      UNAVAILABLE_FILL,
    );
    expect(section(DEMO_GA_SECTION_ID)).not.toHaveClass("cursor-pointer");
  });

  it("omits zoomable sections when the venue does not use section covers", () => {
    const section = renderSections({ sectionCoversEnabled: false });

    expect(section("sec-m")).toBeNull();
    expect(section(DEMO_GA_SECTION_ID)).not.toBeNull();
  });
});

describe("SeatmapSeat", () => {
  it("renders every exclusive seat purple instead of its offer color", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    const seat = mapping.seats?.s1;
    expect(group?.offer?.color).toBeTruthy();
    expect(group?.offer?.inventoryType).toBe("exclusive");
    expect(seat).toBeTruthy();

    useSeatmapStore.setState({
      seatLookupTable: group ? { s1: group } : {},
      seatOffersLookupTable: group ? { s1: [group] } : {},
    });
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={vi.fn()}
          isTooltipActive={false}
        />
      </svg>,
    );

    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      EXCLUSIVE_FILL,
    );
    expect(container.querySelector("rect")).not.toHaveAttribute(
      "fill",
      group?.offer?.color,
    );
  });

  it("does not mark a non-exclusive offer purple", () => {
    const fixtureGroup = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    const seat = mapping.seats?.s1;
    expect(fixtureGroup?.offer?.color).toBeTruthy();
    expect(seat).toBeTruthy();
    const standardGroup = {
      ...fixtureGroup!,
      offer: { ...fixtureGroup!.offer!, inventoryType: "open" },
    };

    useSeatmapStore.setState({
      seatLookupTable: { s1: standardGroup },
      seatOffersLookupTable: { s1: [standardGroup] },
    });
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={vi.fn()}
          isTooltipActive={false}
        />
      </svg>,
    );

    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      fixtureGroup?.offer?.color,
    );
    expect(container.querySelector("rect")).not.toHaveAttribute(
      "fill",
      EXCLUSIVE_FILL,
    );
  });

  it("selects a seat and opens the details panel on a mobile tap", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    const seat = mapping.seats?.s1;
    expect(group).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
    });
    const onTooltip = vi.fn();
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={onTooltip}
          isTooltipActive={false}
        />
      </svg>,
    );

    fireEvent.touchEnd(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seat", seatId: "s1", x: 80, y: 120 }),
    );
  });

  it("does not select or open a panel when a mobile tap hits an unavailable seat", () => {
    const seat = mapping.seats?.b1;
    expect(seat).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      seatLookupTable: {},
      seatOffersLookupTable: {},
    });
    const onTooltip = vi.fn();
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={onTooltip}
          isTooltipActive={false}
        />
      </svg>,
    );

    fireEvent.touchEnd(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    expect(onTooltip).not.toHaveBeenCalled();
  });

  it("uses the unavailable color when an API seat has no sellable group", () => {
    const seat = mapping.seats?.b1;
    expect(seat).toBeTruthy();
    useSeatmapStore.setState({
      seatLookupTable: {},
      seatOffersLookupTable: {},
    });
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={vi.fn()}
          isTooltipActive={false}
        />
      </svg>,
    );

    expect(container.querySelector("rect")).toHaveAttribute("fill", "#E6E8EC");
  });
});

describe("InteractiveSeatmap canvas", () => {
  it("shows a loading spinner in the Find on map canvas while inventory is loading", () => {
    useFiltersStore.setState({ loadingTicketGroups: true });
    render(<InteractiveSeatmap lookupsMode="external" />);

    expect(screen.getByLabelText(/loading seat map/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /interactive seat map/i })).toBeInTheDocument();
  });

  it("hides the loading spinner once the map is fitted and inventory is ready", async () => {
    useFiltersStore.setState({ loadingTicketGroups: false });
    render(<InteractiveSeatmap lookupsMode="external" />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/loading seat map/i)).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("img", { name: /interactive seat map/i }),
    ).toBeInTheDocument();
  });

  it("keeps the zoomed viewport when a seat is selected", async () => {
    const { container } = render(<InteractiveSeatmap />);
    const viewport = container.querySelector(
      'svg[aria-label="Interactive seat map"] > g',
    );
    expect(viewport).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    const zoomedTransform = viewport?.getAttribute("transform");
    expect(zoomedTransform).toBeTruthy();

    const seat = container.querySelector("#s1");
    expect(seat).toBeTruthy();
    fireEvent.click(seat!);

    await waitFor(() => {
      expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
      expect(viewport).toHaveAttribute("transform", zoomedTransform);
    });
  });

  it("does not reset pan or zoom when the canvas resizes after zooming", () => {
    let notifyResize: (() => void) | null = null;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notifyResize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const { container } = render(<InteractiveSeatmap />);
    const viewport = container.querySelector(
      'svg[aria-label="Interactive seat map"] > g',
    );
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    const zoomedTransform = viewport?.getAttribute("transform");
    expect(zoomedTransform).toBeTruthy();

    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { configurable: true, get: () => 390 },
      clientHeight: { configurable: true, get: () => 420 },
    });
    notifyResize?.();

    expect(viewport).toHaveAttribute("transform", zoomedTransform);

    Object.defineProperties(HTMLElement.prototype, {
      clientWidth: { configurable: true, get: () => 1000 },
      clientHeight: { configurable: true, get: () => 800 },
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
});
