import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import {
  seatmapLookupsFromTicketGroups,
  unlockOfferInTicketGroups,
} from "@/lib/offerUnlock";
import { selectionOfferName, selectionTicketCards } from "@/lib/ticketSummary";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";
import InteractiveSeatmap from "./InteractiveSeatmap";
import SeatmapSeat, { TOOLTIP_DISMISS_DELAY_MS } from "./SeatmapSeat";
import SeatmapSections from "./SeatmapSections";
import SeatmapTooltip from "./SeatmapTooltip";

const UNAVAILABLE_FILL = "#9DA2B3";
const EXCLUSIVE_FILL = "#9757D7";
const LOCKED_FILL = "#353945";
const AVAILABLE_FILL = "var(--seatmap-accent, #3E8BF7)";
const mapping = demoSeatmapMapping();

function mockSeatRectCenter(
  element: Element | null,
  center: { x: number; y: number },
  size = 32,
) {
  expect(element).toBeTruthy();
  const left = center.x - size / 2;
  const top = center.y - size / 2;
  element!.getBoundingClientRect = () =>
    ({
      left,
      top,
      width: size,
      height: size,
      right: left + size,
      bottom: top + size,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** jsdom has no layout, so the map area needs a rect for popup fit checks. */
function mockMapCanvasRect(width = 1000, height = 800) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
}

function stageTranslate(stage: Element) {
  const match = /translate\(([-\d.e+]+) ([-\d.e+]+)\)/.exec(
    stage.getAttribute("transform") ?? "",
  );
  expect(match).toBeTruthy();
  return { x: Number(match![1]), y: Number(match![2]) };
}

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
  const seatedLookups = createSeatLookupTables(DEMO_SEATED_TICKET_GROUPS);
  useSeatmapStore.setState({
    data: mapping,
    background: null,
    selectedFromMap: [],
    totalCount: 0,
    totalPrice: 0,
    seatLookupTable: seatedLookups.lookupTable,
    seatOffersLookupTable: seatedLookups.offersLookupTable,
    sectionLookupTable: createSectionLookupTable(
      demoTicketGroups().ticketGroups,
    ),
  });
  useFiltersStore.setState({
    ticketGroups: DEMO_SEATED_TICKET_GROUPS,
    loadingTicketGroups: false,
    eventTicketLimit: null,
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

  it("keeps a seat available when a locked offer shares it with a standard offer", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const standard = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(standard).toBeTruthy();
    expect(seat).toBeTruthy();
    const lockedOffer = {
      ...coded!,
      seatIds: ["s1"],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };
    const standardOffer = {
      ...standard!,
      GA: false as const,
      offer: {
        ...standard!.offer!,
        name: "Standard Admission",
        accessCode: undefined,
        inventoryType: "open",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { s1: lockedOffer },
      seatOffersLookupTable: { s1: [lockedOffer, standardOffer] },
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

    expect(container.querySelector("rect")).not.toHaveAttribute("fill", LOCKED_FILL);
    expect(container.querySelector('use[href="#icon-locked"]')).toBeNull();
  });

  it("locks a seat whose only offer requires an access code", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    const lockedOffer = {
      ...coded!,
      seatIds: ["s1"],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };

    useSeatmapStore.setState({
      seatLookupTable: { s1: lockedOffer },
      seatOffersLookupTable: { s1: [lockedOffer] },
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

    expect(container.querySelector("rect")).toHaveAttribute("fill", LOCKED_FILL);
    expect(container.querySelector('use[href="#icon-locked"]')).toBeTruthy();
  });

  it("renders an unlocked open coded seat as available without an unlocked icon", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    const lockedOffer = {
      ...coded!,
      seatIds: ["s1"],
      GA: false as const,
      offer: {
        ...coded!.offer!,
        inventoryType: "open",
        maxQuantity: 1,
      },
    };
    const unlocked = unlockOfferInTicketGroups(
      [lockedOffer] as never,
      coded!.offer!.name!,
    );

    useSeatmapStore.setState(seatmapLookupsFromTicketGroups(unlocked));
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={vi.fn()}
          isTooltipActive={false}
        />
      </svg>,
    );

    expect(container.querySelector("rect")).toHaveAttribute("fill", AVAILABLE_FILL);
    expect(container.querySelector('use[href="#icon-unlocked"]')).toBeNull();
    expect(container.querySelector('use[href="#icon-locked"]')).toBeNull();
  });

  it("keeps an unlocked exclusive seat purple with the unlocked icon", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded?.offer?.inventoryType).toBe("exclusive");
    expect(seat).toBeTruthy();
    const lockedOffer = {
      ...coded!,
      seatIds: ["s1"],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };
    const unlocked = unlockOfferInTicketGroups(
      [lockedOffer] as never,
      coded!.offer!.name!,
    );

    useSeatmapStore.setState(seatmapLookupsFromTicketGroups(unlocked));
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={vi.fn()}
          isTooltipActive={false}
        />
      </svg>,
    );

    expect(container.querySelector("rect")).toHaveAttribute("fill", EXCLUSIVE_FILL);
    expect(container.querySelector('use[href="#icon-unlocked"]')).toBeTruthy();
  });

  it("opens the mobile single-offer seat popup without selecting until Add now", () => {
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
      selectedFromMap: [],
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

    mockSeatRectCenter(container.querySelector("rect"), { x: 80, y: 120 });
    fireEvent.touchEnd(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seat", seatId: "s1", x: 80, y: 120 }),
    );
  });

  it("uses tap-to-open instead of hover on widths that still show the mobile footer", async () => {
    vi.useFakeTimers();
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    const seat = mapping.seats?.s1;
    expect(group).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 820;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
      selectedFromMap: [],
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

    mockSeatRectCenter(container.querySelector("rect"), { x: 80, y: 120 });
    fireEvent.mouseEnter(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(onTooltip).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
    });

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seat", seatId: "s1", pinned: true }),
    );
    vi.useRealTimers();
  });

  it("shows the Add now popup on widths that still show the mobile footer", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    expect(group).toBeTruthy();
    window.innerWidth = 820;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
      selectedFromMap: [],
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 80, y: 120, pinned: true }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /add now/i })).toBeInTheDocument();
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

    mockSeatRectCenter(container.querySelector("rect"), { x: 80, y: 120 });
    fireEvent.touchEnd(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    expect(onTooltip).not.toHaveBeenCalled();
  });

  it("shows the mobile single-offer popup with seat details and Add now", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    expect(group).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
      selectedFromMap: [],
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 80, y: 120 }}
        onClose={() => {}}
        accent="#e00020"
        buttonColor="#3fa9f5"
        buttonTextColor="#ffffff"
      />,
    );

    expect(screen.getByText("Field Club")).toBeInTheDocument();
    expect(screen.getByText("$33.59")).toBeInTheDocument();
    expect(screen.getByText("Section")).toBeInTheDocument();
    expect(screen.getByText("Row")).toBeInTheDocument();
    expect(screen.getByText("Seat")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add now/i })).toBeInTheDocument();
    expect(screen.getByTestId("seat-popup-caret")).toBeInTheDocument();
  });

  it("adds the seat when Add now is pressed on the mobile single-offer popup", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    expect(group).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
    });
    useFiltersStore.setState({ eventTicketLimit: null });
    const onClose = vi.fn();

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 80, y: 120 }}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add now/i }));

    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
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

  it("treats seats with only limit-blocked offers as unavailable", async () => {
    vi.useFakeTimers();
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    const seat = mapping.seats?.a1;
    expect(parent).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 1024;
    const blockedOffer = {
      ...parent!,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        limit: 3,
      },
    };
    useSeatmapStore.setState({
      seatLookupTable: { a1: blockedOffer },
      seatOffersLookupTable: { a1: [blockedOffer] },
      selectedFromMap: [],
      data: mapping,
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

    expect(container.querySelector("rect")).toHaveAttribute("fill", "#E6E8EC");
    expect(container.querySelector("rect")).not.toHaveClass("cursor-pointer");

    fireEvent.mouseEnter(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(onTooltip).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    expect(onTooltip).not.toHaveBeenCalled();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    vi.useRealTimers();
  });

  it("shows limit-blocked locked seats on the map with hover-only preview", async () => {
    vi.useFakeTimers();
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: coded! },
      seatOffersLookupTable: { s1: [coded!] },
      selectedFromMap: [],
      data: mapping,
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

    expect(container.querySelector("rect")).toHaveAttribute("fill", "#353945");
    expect(container.querySelector("rect")).not.toHaveClass("cursor-pointer");
    expect(container.querySelector('use[href="#icon-locked"]')).toBeTruthy();

    mockSeatRectCenter(container.querySelector("rect"), { x: 40, y: 60 });
    fireEvent.mouseEnter(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    await vi.advanceTimersByTimeAsync(500);
    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seat", seatId: "s1", x: 40, y: 60, pinned: false }),
    );

    fireEvent.click(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    expect(onTooltip).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("opens a mobile popup without Add now for limit-blocked locked seats", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      seatLookupTable: { s1: coded! },
      seatOffersLookupTable: { s1: [coded!] },
      selectedFromMap: [],
      data: mapping,
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

    mockSeatRectCenter(container.querySelector("rect"), { x: 80, y: 120 });
    fireEvent.touchEnd(container.querySelector("rect")!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "seat",
        seatId: "s1",
        x: 80,
        y: 120,
        pinned: true,
      }),
    );
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
  });

  it("shows unavailable copy on mobile for limit-blocked locked seats without Add now", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(coded).toBeTruthy();
    window.innerWidth = 390;
    useSeatmapStore.setState({
      seatLookupTable: { s1: coded! },
      seatOffersLookupTable: { s1: [coded!] },
      data: mapping,
    });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 80, y: 120, pinned: true }}
        onClose={() => {}}
      />,
    );

    expect(
      screen.getByText(/no ticket offers are available for this seat on the map/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add now/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /unlock offer/i }),
    ).not.toBeInTheDocument();
    const caret = screen.getByTestId("seat-popup-caret");
    expect(caret).toBeInTheDocument();
    expect(caret).toHaveStyle({ left: "54px" });
  });

  it("shows unavailable copy on hover for limit-blocked locked seats", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(coded).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: coded! },
      seatOffersLookupTable: { s1: [coded!] },
    });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 20, y: 20, pinned: false }}
        onClose={() => {}}
      />,
    );

    expect(
      screen.getByText(/no ticket offers are available for this seat on the map/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/requires an access code/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /unlock offer/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("seat-popup-caret")).toBeInTheDocument();
  });

  it("shows locked-seat copy and an unlock button in the tooltip", async () => {
    vi.useFakeTimers();
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: coded! },
      seatOffersLookupTable: {
        s1: [
          {
            ...coded!,
            offer: { ...coded!.offer!, maxQuantity: 1 },
          },
        ],
      },
    });
    const onClose = vi.fn();
    const onUnlockOffer = vi.fn();
    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 20, y: 20, pinned: true }}
        onClose={onClose}
        onUnlockOffer={onUnlockOffer}
      />,
    );

    expect(screen.getByText(/requires an access code/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /unlock offer/i }));
    expect(onUnlockOffer).toHaveBeenCalledWith(coded!.offer!.name);
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("does not close the tooltip when unlock offer is clicked on a mixed row", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(parent).toBeTruthy();
    expect(coded).toBeTruthy();
    const seatId = "a1";
    const lockedOffer = {
      ...coded!,
      seatIds: [seatId],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };
    const standardOffer = {
      ...parent!,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };
    const onClose = vi.fn();
    const onUnlockOffer = vi.fn();

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: lockedOffer },
      seatOffersLookupTable: {
        [seatId]: [lockedOffer, standardOffer],
      },
      selectedFromMap: [],
      data: mapping,
    });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={onClose}
        onUnlockOffer={onUnlockOffer}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /unlock offer/i }));
    expect(onUnlockOffer).toHaveBeenCalledWith("VIP Coded");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a locked offer and a selectable standard offer on the same seat", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(parent).toBeTruthy();
    expect(coded).toBeTruthy();
    const seatId = "a1";
    const lockedOffer = {
      ...coded!,
      seatIds: [seatId],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };
    const standardOffer = {
      ...parent!,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: lockedOffer },
      seatOffersLookupTable: {
        [seatId]: [lockedOffer, standardOffer],
      },
      selectedFromMap: [],
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });
    const onUnlockOffer = vi.fn();

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
        onUnlockOffer={onUnlockOffer}
      />,
    );

    expect(screen.getByText("VIP Coded")).toBeInTheDocument();
    expect(screen.getByText("Standard Admission")).toBeInTheDocument();
    expect(screen.getByText(/requires access code/i)).toBeInTheDocument();
    expect(screen.queryByText("$99.00")).not.toBeInTheDocument();
    expect(screen.getByText(/31\.68/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock offer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("0");

    fireEvent.click(
      screen.getAllByRole("button", { name: /increase quantity/i })[0],
    );
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("1");

    fireEvent.click(
      screen.getAllByRole("button", { name: /decrease quantity/i })[0],
    );
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("0");

    fireEvent.click(
      screen.getAllByRole("button", { name: /increase quantity/i })[0],
    );
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: /unlock offer/i }));
    expect(onUnlockOffer).toHaveBeenCalledWith("VIP Coded");
  });

  it("selects an unlocked seat instead of reopening the locked tooltip", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(coded).toBeTruthy();
    const seatId = "s1";
    const seat = { ...mapping.seats!.s1, seatId };
    expect(seat).toBeTruthy();

    const lockedGroup = {
      ...coded!,
      seatIds: [seatId],
      GA: false as const,
      offer: { ...coded!.offer!, maxQuantity: 1 },
    };
    useSeatmapStore.setState({
      ...seatmapLookupsFromTicketGroups([lockedGroup] as never),
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
    });

    const onTooltip = vi.fn();
    const { container, rerender } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={onTooltip}
          isTooltipActive={false}
        />
      </svg>,
    );

    fireEvent.click(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    expect(onTooltip).toHaveBeenCalled();

    const unlocked = unlockOfferInTicketGroups(
      [lockedGroup] as never,
      coded!.offer!.name!,
    );
    useSeatmapStore.setState(seatmapLookupsFromTicketGroups(unlocked));
    onTooltip.mockClear();

    rerender(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={onTooltip}
          isTooltipActive={false}
        />
      </svg>,
    );
    fireEvent.click(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });

    expect(onTooltip).not.toHaveBeenCalled();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
  });

  it("shows the seat-number tooltip on desktop hover for a locked seat", async () => {
    vi.useFakeTimers();
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: {
        s1: { ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } },
      },
      seatOffersLookupTable: {
        s1: [{ ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } }],
      },
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

    mockSeatRectCenter(container.querySelector("rect"), { x: 40, y: 60 });
    fireEvent.mouseEnter(container.querySelector("rect")!, {
      clientX: 40,
      clientY: 60,
    });
    await vi.advanceTimersByTimeAsync(500);

    expect(onTooltip).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "seat", seatId: "s1", x: 40, y: 60, pinned: false }),
    );
    vi.useRealTimers();
  });

  it("shows Unlock offer on a desktop hover preview for a locked seat", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    expect(coded).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: {
        s1: { ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } },
      },
      seatOffersLookupTable: {
        s1: [{ ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } }],
      },
    });

    const onUnlockOffer = vi.fn();
    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 20, y: 20, pinned: false }}
        onClose={() => {}}
        onUnlockOffer={onUnlockOffer}
      />,
    );

    expect(screen.getByText(/requires an access code/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /unlock offer/i }));
    expect(onUnlockOffer).toHaveBeenCalledWith(coded!.offer!.name);
    expect(screen.getByTestId("seat-popup-caret")).toBeInTheDocument();
  });

  it("does not show Add seats on a desktop hover preview", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((item) =>
      item.seatIds?.includes("s1"),
    );
    expect(group).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      data: mapping,
      seatLookupTable: { s1: group! },
      seatOffersLookupTable: { s1: [group!] },
      selectedFromMap: [],
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId: "s1", x: 20, y: 20, pinned: false }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText(/Field Club/i)).toBeInTheDocument();
    expect(screen.getByText(/\$33\.59/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add seats/i })).not.toBeInTheDocument();
  });

  it("defers closing the tooltip when the pointer leaves the seat", () => {
    const coded = DEMO_SEATED_TICKET_GROUPS.find((item) => item.offer?.accessCode);
    const seat = mapping.seats?.s1;
    expect(coded).toBeTruthy();
    expect(seat).toBeTruthy();
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: {
        s1: { ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } },
      },
      seatOffersLookupTable: {
        s1: [{ ...coded!, offer: { ...coded!.offer!, maxQuantity: 1 } }],
      },
    });
    const onTooltip = vi.fn();
    const onTooltipLeave = vi.fn();
    const { container } = render(
      <svg>
        <SeatmapSeat
          seat={seat!}
          onTooltip={onTooltip}
          onTooltipLeave={onTooltipLeave}
          isTooltipActive={false}
        />
      </svg>,
    );

    fireEvent.mouseLeave(container.querySelector("rect")!);

    expect(onTooltip).not.toHaveBeenCalledWith(null);
    expect(onTooltipLeave).toHaveBeenCalledTimes(1);
  });
});

describe("InteractiveSeatmap canvas", () => {
  it("lists locked seats in the legend", async () => {
    useFiltersStore.setState({ loadingTicketGroups: false });
    render(<InteractiveSeatmap lookupsMode="external" />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/loading seat map/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

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
    const resize: { notify: (() => void) | null } = { notify: null };
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize.notify = callback;
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
    resize.notify?.();

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

  it("pins the multi-offer seat card on click and keeps it open when the pointer leaves", async () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat s1");
    const firstOffer = {
      ...parent,
      offer: { id: "off-a", name: "Offer A", maxQuantity: 1 },
    };
    const secondOffer = {
      ...parent,
      price: 31.68,
      offer: { id: "off-b", name: "Offer B", maxQuantity: 1 },
    };
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: firstOffer },
      seatOffersLookupTable: { s1: [firstOffer, secondOffer] },
    });

    const { container } = render(<InteractiveSeatmap lookupsMode="external" />);
    const seat = container.querySelector("#s1");
    expect(seat).toBeTruthy();

    fireEvent.click(seat!, { clientX: 80, clientY: 120 });

    expect(
      await screen.findByRole("button", { name: /add seats/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(/ticket quantity/i)).toHaveLength(2);

    fireEvent.mouseMove(seat!, { clientX: 84, clientY: 124 });
    fireEvent.mouseLeave(seat!);
    await act(async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, TOOLTIP_DISMISS_DELAY_MS + 50),
      );
    });

    expect(screen.getByRole("button", { name: /add seats/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/ticket quantity/i)).toHaveLength(2);
  });

  it("pans the map when a seat card would be cut off by the map edge", async () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat s1");
    const firstOffer = {
      ...parent,
      offer: { id: "off-a", name: "Offer A", maxQuantity: 1 },
    };
    const secondOffer = {
      ...parent,
      offer: { id: "off-b", name: "Offer B", maxQuantity: 1 },
    };
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: firstOffer },
      seatOffersLookupTable: { s1: [firstOffer, secondOffer] },
    });

    const restoreRect = mockMapCanvasRect();
    const { container } = render(<InteractiveSeatmap lookupsMode="external" />);
    const stage = container.querySelector("svg > g")!;
    const before = stageTranslate(stage);

    const seat = container.querySelector("#s1");
    mockSeatRectCenter(seat, { x: 400, y: 30 });
    fireEvent.click(seat!, { clientX: 400, clientY: 30 });
    expect(
      await screen.findByRole("button", { name: /add seats/i }),
    ).toBeInTheDocument();

    // Card is 140 tall and sits above the seat, so the map slides down enough
    // to clear the top margin instead of clipping the card.
    const after = stageTranslate(stage);
    expect(after.y - before.y).toBe(132);
    expect(after.x).toBe(before.x);
    restoreRect();
  });

  it("hands the pinned multi-offer seat card over to the next hovered seat", async () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat s1");
    const firstOffer = {
      ...parent,
      offer: { id: "off-a", name: "Offer A", maxQuantity: 1 },
    };
    const secondOffer = {
      ...parent,
      price: 31.68,
      offer: { id: "off-b", name: "Offer B", maxQuantity: 1 },
    };
    const neighborOffer = {
      ...parent,
      offer: { id: "off-c", name: "Offer C", maxQuantity: 1 },
    };
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: firstOffer, a1: neighborOffer },
      seatOffersLookupTable: {
        s1: [firstOffer, secondOffer],
        a1: [neighborOffer],
      },
    });

    const { container } = render(<InteractiveSeatmap lookupsMode="external" />);
    fireEvent.click(container.querySelector("#s1")!, { clientX: 80, clientY: 120 });
    expect(
      await screen.findByRole("button", { name: /add seats/i }),
    ).toBeInTheDocument();

    const neighbor = container.querySelector("#a1");
    expect(neighbor).toBeTruthy();
    fireEvent.mouseEnter(neighbor!, { clientX: 200, clientY: 220 });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });

    expect(await screen.findByText(/Offer C/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add seats/i }),
    ).not.toBeInTheDocument();
  });

  it("closes the pinned multi-offer seat card from its close button", async () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat s1");
    const firstOffer = {
      ...parent,
      offer: { id: "off-a", name: "Offer A", maxQuantity: 1 },
    };
    const secondOffer = {
      ...parent,
      price: 31.68,
      offer: { id: "off-b", name: "Offer B", maxQuantity: 1 },
    };
    window.innerWidth = 1024;
    useSeatmapStore.setState({
      seatLookupTable: { s1: firstOffer },
      seatOffersLookupTable: { s1: [firstOffer, secondOffer] },
    });

    const { container } = render(<InteractiveSeatmap lookupsMode="external" />);
    const seat = container.querySelector("#s1");
    fireEvent.click(seat!, { clientX: 80, clientY: 120 });
    expect(
      await screen.findByRole("button", { name: /add seats/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(
      screen.queryByRole("button", { name: /add seats/i }),
    ).not.toBeInTheDocument();
  });

  it("clears the seat tooltip when dismissTooltipKey changes", async () => {
    window.innerWidth = 390;
    const { container, rerender } = render(
      <InteractiveSeatmap lookupsMode="external" dismissTooltipKey={0} />,
    );
    const seat = container.querySelector("#s1");
    expect(seat).toBeTruthy();
    fireEvent.touchEnd(seat!, {
      clientX: 80,
      clientY: 120,
      changedTouches: [{ clientX: 80, clientY: 120 }],
    });

    expect(await screen.findByRole("button", { name: /add now/i })).toBeInTheDocument();

    rerender(<InteractiveSeatmap lookupsMode="external" dismissTooltipKey={1} />);
    expect(screen.queryByRole("button", { name: /add now/i })).not.toBeInTheDocument();
  });
});

describe("SeatmapTooltip GA stepper", () => {
  const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
  if (!ga) throw new Error("demo fixtures need a GA ticket group");

  function renderGaTooltip(
    source: {
      minQuantity?: number;
      maxQuantity?: number;
      multipleOf?: number;
      incrementsOf?: number;
      limit?: number;
    },
    kind: "offer" | "package",
    eventLimit: number | null = null,
  ) {
    const group = {
      ...ga,
      availableCount: 20,
      offer:
        kind === "offer"
          ? { ...ga.offer, ...source, connected_offers: [] }
          : undefined,
      package: kind === "package" ? source : undefined,
    };
    useSeatmapStore.setState({
      sectionLookupTable: { [DEMO_GA_SECTION_ID]: [group] },
    });
    useFiltersStore.setState({ eventTicketLimit: eventLimit });
    render(
      <SeatmapTooltip
        target={{ kind: "section", sectionId: DEMO_GA_SECTION_ID, x: 20, y: 20 }}
        onClose={() => {}}
      />,
    );
  }

  it("steps an offer by min, max, and multipleOf and disables +/- at the bounds", () => {
    renderGaTooltip({ minQuantity: 2, maxQuantity: 6, multipleOf: 2 }, "offer");
    const decrease = screen.getByRole("button", { name: /decrease quantity/i });
    const increase = screen.getByRole("button", { name: /increase quantity/i });

    expect(decrease).toBeDisabled();
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("2");

    fireEvent.click(increase);
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("4");
    expect(screen.queryByText("3")).not.toBeInTheDocument();
    fireEvent.click(increase);
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("6");
    expect(increase).toBeDisabled();

    fireEvent.click(decrease);
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("4");
    fireEvent.click(decrease);
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("2");
    expect(decrease).toBeDisabled();
    expect(screen.getByText("Ticket limit: 2–6 per order · Increments of 2")).toBeInTheDocument();
  });

  it("steps a package GA section by min, max, and incrementsOf", () => {
    renderGaTooltip({ minQuantity: 2, maxQuantity: 6, incrementsOf: 2 }, "package");
    const increase = screen.getByRole("button", { name: /increase quantity/i });

    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("2");
    fireEvent.click(increase);
    fireEvent.click(increase);
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("6");
    expect(increase).toBeDisabled();
    expect(screen.getByText("Ticket limit: 2–6 per order · Increments of 2")).toBeInTheDocument();
  });

  it("locks the GA stepper to the exact offer limit", () => {
    renderGaTooltip({ limit: 4 }, "offer");
    const decrease = screen.getByRole("button", { name: /decrease quantity/i });
    const increase = screen.getByRole("button", { name: /increase quantity/i });

    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("4");
    expect(increase).toBeDisabled();
    expect(decrease).toBeDisabled();
    expect(screen.getByText("Ticket limit: 4 per order")).toBeInTheDocument();
  });

  it("shows the event global limit when the GA offer has no max or limit", () => {
    renderGaTooltip({}, "offer", 3);
    expect(screen.getByText("Ticket limit: 1–3 per order")).toBeInTheDocument();
  });

  it("shows the GA default ticket limit when the event and offer have none", () => {
    renderGaTooltip({}, "offer");
    expect(screen.getByText("Ticket limit: 1–20 per order")).toBeInTheDocument();
    expect(screen.getByLabelText(/ticket quantity/i)).toHaveTextContent("1");
  });

  it("shows configured exact limits on multi-offer GA rows when inventory is tight", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const groups = [
      {
        ...ga,
        id: "grp-scheduled",
        price: 37.34,
        availableCount: 2,
        offer: {
          id: "off-scheduled",
          name: "scheduled",
          limit: 3,
          connected_offers: [],
        },
      },
      {
        ...ga,
        id: "grp-standard",
        price: 38.37,
        availableCount: 20,
        offer: {
          id: "off-standard",
          name: "Standard Admission",
          maxQuantity: 1,
          connected_offers: [],
        },
      },
    ];
    useSeatmapStore.setState({
      sectionLookupTable: createSectionLookupTable(groups),
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "section", sectionId: DEMO_GA_SECTION_ID, x: 20, y: 20 }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByText("Standard Admission")).toBeInTheDocument();
    expect(screen.getByText("Ticket limit: 3 per order")).toBeInTheDocument();
    expect(screen.getByText("Ticket limit: 1 per order")).toBeInTheDocument();
  });

  it("lets shoppers opt out of a multi-offer seated row by setting its quantity to 0", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const firstOffer = {
      ...parent,
      offer: {
        id: "off-a",
        name: "Offer A",
        maxQuantity: 1,
      },
    };
    const secondOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-b",
        name: "Offer B",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: firstOffer },
      seatOffersLookupTable: {
        [seatId]: [firstOffer, secondOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
      />,
    );

    const quantities = screen.getAllByLabelText(/ticket quantity/i);
    expect(quantities[0]).toHaveTextContent("0");
    expect(quantities[1]).toHaveTextContent("0");

    fireEvent.click(
      screen.getAllByRole("button", { name: /increase quantity/i })[0],
    );
    expect(quantities[0]).toHaveTextContent("1");

    fireEvent.click(
      screen.getAllByRole("button", { name: /decrease quantity/i })[0],
    );
    expect(quantities[0]).toHaveTextContent("0");

    fireEvent.click(
      screen.getAllByRole("button", { name: /increase quantity/i })[1],
    );
    expect(quantities[1]).toHaveTextContent("1");
    expect(quantities[0]).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: /add seats/i }));

    const selected = useSeatmapStore.getState().selectedFromMap;
    expect(selected).toHaveLength(1);
    expect(selectionOfferName(selected[0])).toBe("Offer B");
  });

  it("disables Add seats while every seated offer quantity is 0", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const firstOffer = {
      ...parent,
      offer: { id: "off-a", name: "Offer A", maxQuantity: 1 },
    };
    const secondOffer = {
      ...parent,
      price: 31.68,
      offer: { id: "off-b", name: "Offer B", maxQuantity: 1 },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: firstOffer },
      seatOffersLookupTable: { [seatId]: [firstOffer, secondOffer] },
      selectedFromMap: [],
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
      />,
    );

    const addSeats = screen.getByRole("button", { name: /add seats/i });
    expect(addSeats).toBeDisabled();

    fireEvent.click(
      screen.getAllByRole("button", { name: /increase quantity/i })[1],
    );
    expect(addSeats).toBeEnabled();

    fireEvent.click(
      screen.getAllByRole("button", { name: /decrease quantity/i })[1],
    );
    expect(addSeats).toBeDisabled();
  });

  it("shows locked scheduled offers when only multipleOf is 1", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const scheduledOffer = {
      ...parent,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        accessCode: "NPA26",
        multipleOf: 1,
      },
    };
    const standardOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: scheduledOffer },
      seatOffersLookupTable: {
        [seatId]: [scheduledOffer, standardOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
        onUnlockOffer={vi.fn()}
      />,
    );

    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock offer/i })).toBeInTheDocument();
  });

  it("shows seated offers when min, max, and multipleOf are each 1 or unset", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const scheduledOffer = {
      ...parent,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        accessCode: "NPA26",
        minQuantity: 1,
        maxQuantity: 1,
        multipleOf: 1,
      },
    };
    const standardOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: scheduledOffer },
      seatOffersLookupTable: {
        [seatId]: [scheduledOffer, standardOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
        onUnlockOffer={vi.fn()}
      />,
    );

    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock offer/i })).toBeInTheDocument();
    expect(screen.getByText(/Standard Admission/i)).toBeInTheDocument();
    expect(screen.getByText(/31\.68/)).toBeInTheDocument();
  });

  it("hides seated offers with a custom max above 1 from the multi-offer tooltip", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const scheduledOffer = {
      ...parent,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        accessCode: "NPA26",
        maxQuantity: 2,
      },
    };
    const standardOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: scheduledOffer },
      seatOffersLookupTable: {
        [seatId]: [scheduledOffer, standardOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText("scheduled")).not.toBeInTheDocument();
    expect(screen.getByText(/Standard Admission/i)).toBeInTheDocument();
  });

  it("hides seated exact-limit offers from the multi-offer tooltip", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const scheduledOffer = {
      ...parent,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        limit: 3,
      },
    };
    const standardOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
        maxQuantity: 1,
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: scheduledOffer },
      seatOffersLookupTable: {
        [seatId]: [scheduledOffer, standardOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText("scheduled")).not.toBeInTheDocument();
    expect(screen.getByText(/Standard Admission/i)).toBeInTheDocument();
    expect(screen.getByText(/31\.68/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add seats/i })).toBeInTheDocument();
  });

  it("labels selectable seated offers as one per order even without a maxQuantity cap", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    if (!parent) throw new Error("demo fixtures need a seated group on seat a1");
    const seatId = "a1";
    const scheduledOffer = {
      ...parent,
      offer: {
        id: "off-scheduled",
        name: "scheduled",
        limit: 3,
      },
    };
    const standardOffer = {
      ...parent,
      price: 31.68,
      offer: {
        id: "off-standard",
        name: "Standard Admission",
      },
    };

    useSeatmapStore.setState({
      seatLookupTable: { [seatId]: scheduledOffer },
      seatOffersLookupTable: {
        [seatId]: [scheduledOffer, standardOffer],
      },
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
      data: mapping,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "seat", seatId, x: 20, y: 20, pinned: true }}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByText("scheduled")).not.toBeInTheDocument();
    expect(screen.getByText(/Standard Admission/i)).toBeInTheDocument();
    expect(screen.getByText(/31\.68/)).toBeInTheDocument();
    expect(screen.queryByText(/1–19 per order/i)).not.toBeInTheDocument();
  });

  it("lets shoppers opt out of a multi-offer GA row by setting its quantity to 0", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const groups = [
      {
        ...ga,
        id: "grp-scheduled",
        price: 37.34,
        availableCount: 20,
        offer: {
          id: "off-scheduled",
          name: "scheduled",
          limit: 3,
          connected_offers: [],
        },
      },
      {
        ...ga,
        id: "grp-standard",
        price: 38.37,
        availableCount: 20,
        offer: {
          id: "off-standard",
          name: "Standard Admission",
          maxQuantity: 1,
          connected_offers: [],
        },
      },
    ];
    useSeatmapStore.setState({
      sectionLookupTable: createSectionLookupTable(groups),
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "section", sectionId: DEMO_GA_SECTION_ID, x: 20, y: 20 }}
        onClose={() => {}}
      />,
    );

    const quantities = screen.getAllByLabelText(/ticket quantity/i);
    expect(quantities[0]).toHaveTextContent("3");
    expect(quantities[1]).toHaveTextContent("1");

    fireEvent.click(
      screen.getAllByRole("button", { name: /decrease quantity/i })[0],
    );
    expect(quantities[0]).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: /add to selection/i }));

    const selected = useSeatmapStore.getState().selectedFromMap;
    expect(selected).toHaveLength(1);
    expect(selectionOfferName(selected[0])).toBe("Standard Admission");
  });

  it("adds each multi-offer GA row as a separate selection ticket", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const group = {
      ...ga,
      availableCount: 20,
      offer: {
        ...ga.offer,
        id: "off-day",
        name: "Military Daypass",
        connected_offers: [
          {
            id: "off-pre",
            name: "Military Prelims",
            isConnectedOffer: true,
            am_pricing_objects: [{ name: ga.PLName, totalDue: 39.4 }],
          },
        ],
      },
    };
    useSeatmapStore.setState({
      sectionLookupTable: createSectionLookupTable([group]),
      selectedFromMap: [],
      seatedError: null,
      totalCount: 0,
      totalPrice: 0,
    });
    useFiltersStore.setState({ eventTicketLimit: null });

    render(
      <SeatmapTooltip
        target={{ kind: "section", sectionId: DEMO_GA_SECTION_ID, x: 20, y: 20 }}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Military Daypass")).toBeInTheDocument();
    expect(screen.getByText("Military Prelims")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add to selection/i }));

    const selected = useSeatmapStore.getState().selectedFromMap;
    expect(selected).toHaveLength(2);
    expect(selected.map((entry) => selectionOfferName(entry))).toEqual([
      "Military Daypass",
      "Military Prelims",
    ]);
    expect(selectionTicketCards(selected)).toHaveLength(2);
  });
});
