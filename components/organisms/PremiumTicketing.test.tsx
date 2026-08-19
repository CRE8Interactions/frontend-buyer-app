import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  lockedTicketingFixture,
  seatedTicketingFixture,
} from "@/tests/fixtures/tickets";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeatmapMapping,
} from "@/lib/demo/fixtures";
import { MIXED_MAP_SELECTION_ERROR } from "@/lib/mapSelection";
import type { TicketingData } from "@/components/organisms/PremiumTicketing";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import useFiltersStore from "@/stores/filtersStore";
import useSeatmapStore from "@/stores/seatmapStore";

const DEMO_SEATED_EVENT =
  DEMO_EVENTS.find((e) => e.shortcode === "RAPT006") || DEMO_EVENTS[0];

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => "/e/event/code/tickets/",
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/organisms/InteractiveSeatmap", async () => {
  const { default: useFiltersStore } = await import("@/stores/filtersStore");
  return {
    InteractiveSeatmap: () => {
      const loading = useFiltersStore.getState().loadingTicketGroups;
      return loading ? (
        <div role="status" aria-label="Loading seat map">
          Loading seat map
        </div>
      ) : (
        <div data-testid="interactive-seatmap">Interactive seat map</div>
      );
    },
    InteractiveSeatmapMemo: () => (
      <div data-testid="interactive-seatmap">Interactive seat map</div>
    ),
  };
});

vi.mock("@/components/organisms/StripePaymentPanel", () => ({
  default: () => <div data-testid="stripe-panel">Stripe panel</div>,
}));

vi.mock("@/components/molecules/SectionLocatorThumb", () => ({
  default: ({ sectionNumber }: { sectionNumber?: string | number }) => (
    <div data-testid="section-thumb">Thumb {String(sectionNumber || "")}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  placeTicketsIntoCart: vi.fn(),
  placeGATicketsIntoCart: vi.fn(),
  redeemPromoCode: vi.fn(),
  removePromoCode: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: false,
    ready: true,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  })),
}));

vi.mock("@/lib/cart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cart")>();
  return {
    ...actual,
    setStoredCart: vi.fn(),
  };
});

import PremiumTicketing from "@/components/organisms/PremiumTicketing";
import { placeTicketsIntoCart } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { checkoutHref } from "@/lib/cart";

const mockedPlaceTickets = vi.mocked(placeTicketsIntoCart);
const mockedUseAuth = vi.mocked(useAuth);

function authState(isAuthenticated: boolean) {
  return {
    isAuthenticated,
    ready: true,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
}

async function renderReady(
  data: TicketingData = seatedTicketingFixture,
  props: {
    onFiltersChange?: (filters: {
      quantity: number;
      accessible: boolean;
      sort: "price" | "-price";
    }) => void;
    refreshing?: boolean;
    waitForListing?: RegExp | string;
  } = {},
) {
  const user = userEvent.setup();
  render(
    <PremiumTicketing
      data={data}
      onFiltersChange={props.onFiltersChange}
      refreshing={props.refreshing}
    />,
  );
  const waitForListing = props.waitForListing ?? /sec m · row m3/i;
  await screen.findByText(waitForListing, {}, { timeout: 3000 });
  return user;
}

/** Put one seated demo seat in the map store, as picking it on the map would. */
function seedMapSelection() {
  const group = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
  if (!group) throw new Error("demo fixtures need a seated group holding seat s1");
  const selected = { ...group, seatId: "s1", seatNumber: 1, quantity: 1 };
  useSeatmapStore.setState({
    selectedFromMap: [selected],
    totalCount: 1,
    totalPrice: Number(group.price || 0),
  });
  return selected;
}

async function openLiveMap() {
  const user = await renderReady({
    ...seatedTicketingFixture,
    seatmapMapping: demoSeatmapMapping(),
  });
  await user.click(screen.getAllByText(/find on map/i)[0]);
  await screen.findByTestId("interactive-seatmap");
  return user;
}

describe("Select tickets page (PremiumTicketing)", () => {
  beforeEach(() => {
    routerMocks.push.mockReset();
    mockedUseAuth.mockReturnValue(authState(false));
    mockedPlaceTickets.mockResolvedValue({
      data: { cartId: "cart-1" },
    } as never);
    useFiltersStore.setState({ loadingTicketGroups: false });
    useSeatmapStore.setState({
      selectedFromMap: [],
      totalCount: 0,
      totalPrice: 0,
      data: null,
      background: null,
      seatedError: null,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders event header, filters, listings, and find-on-map", async () => {
    await renderReady();

    expect(screen.getByText(DEMO_SEATED_EVENT.name)).toBeInTheDocument();
    expect(screen.getByText(/event information/i)).toBeInTheDocument();
    expect(screen.getByText(/2 tickets/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /field club/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sort by price/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /accessible seating only/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/find on map/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/sec m · row m3/i)).toBeInTheDocument();
    expect(screen.getByText(/1 – 4 tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/\$33\.59 each/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile tickets/i)).toBeInTheDocument();
  });

  it("links the header to My tickets as My wallet when logged in", async () => {
    const auth = authState(true);
    mockedUseAuth.mockReturnValue(auth);
    const user = await renderReady();

    const wallet = screen.getByRole("link", { name: /^my wallet$/i });
    expect(wallet).toHaveAttribute("href", "/my-tickets/");
    expect(screen.queryByRole("link", { name: /^login$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^log out$/i }));
    expect(auth.logout).toHaveBeenCalled();
  });

  it("keeps the header Login link when logged out", async () => {
    await renderReady();

    const login = screen.getByRole("link", { name: /^login$/i });
    expect(login).toHaveAttribute("href", "/wallet?login=1");
    expect(
      screen.queryByRole("link", { name: /^my wallet$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^log out$/i }),
    ).not.toBeInTheDocument();
  });

  it("filters listings by offer chip and shows offer-empty messaging", async () => {
    const user = await renderReady({
      ...seatedTicketingFixture,
      offerNames: ["Field Club", "Club Level Empty"],
    });

    await user.click(screen.getByRole("button", { name: /club level empty/i }));

    expect(
      await within(screen.getByTestId("ticketing-offers")).findByText(
        /no tickets for club level empty/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/doesn't have any inventory on sale right now/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset to 1 ticket/i }),
    ).not.toBeInTheDocument();
  });

  it("supports multi-select offer chips and All clears them", async () => {
    const user = await renderReady();

    await user.click(screen.getByRole("button", { name: /field club/i }));
    expect(screen.getByText(/sec m · row m3/i)).toBeInTheDocument();
    expect(screen.queryByText(/sec n · row i/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /section m-n & ga/i }));
    expect(screen.getByText(/sec m · row m3/i)).toBeInTheDocument();
    expect(screen.getByText(/sec n · row i/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^all$/i }));
    expect(screen.getByText(/sec a · row 12/i)).toBeInTheDocument();
  });

  it("calls onFiltersChange when quantity, ADA, and sort change", async () => {
    const onFiltersChange = vi.fn();
    const user = await renderReady(seatedTicketingFixture, { onFiltersChange });

    await user.click(screen.getByRole("button", { name: /2 tickets/i }));
    await user.click(screen.getByRole("button", { name: /^4 tickets$/i }));
    expect(onFiltersChange).toHaveBeenCalledWith({
      quantity: 4,
      accessible: false,
      sort: "price",
    });

    await user.click(
      screen.getByRole("button", { name: /accessible seating only/i }),
    );
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ accessible: true }),
    );

    await user.click(
      screen.getByRole("button", { name: /sorted by lowest price/i }),
    );
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "-price" }),
    );
  });

  it("shows qty empty state with reset when no listing fits the group size", async () => {
    const user = await renderReady({
      ...seatedTicketingFixture,
      listings: [
        {
          zone: "Field Club",
          tier: "Field Club",
          sec: "M",
          row: "M3",
          min: 1,
          max: 2,
          price: "$33.59",
          cartGroup: { id: 1, price: 33.59 },
        },
      ],
    });

    await user.click(screen.getByRole("button", { name: /2 tickets/i }));
    await user.click(screen.getByRole("button", { name: /^4 tickets$/i }));

    expect(
      await screen.findByText(/no listings for 4 tickets/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset to 1 ticket/i }),
    ).toBeInTheDocument();
  });

  it("opens the ticket details drawer with location and seat-view slides", async () => {
    const user = await renderReady();

    await user.click(screen.getByText(/sec m · row m3/i));

    expect(await screen.findByText("Ticket details")).toBeInTheDocument();
    expect(screen.getByText(/seat location/i)).toBeInTheDocument();
    expect(screen.getByText(/1 – 4 tickets available/i)).toBeInTheDocument();
    expect(screen.getByText(/about this ticket/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^checkout$/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next view/i }));
    expect(screen.getByText(/seat view/i)).toBeInTheDocument();
  });

  it("adjusts drawer quantity and checkout subtotal", async () => {
    const user = await renderReady();
    await user.click(screen.getByText(/sec m · row m3/i));
    await screen.findByText("Ticket details");

    expect(screen.getByText(/\$67\.18/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /more tickets/i }));
    expect(screen.getAllByText(/3 tickets/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$100\.77/)).toBeInTheDocument();
  });

  it("caps the drawer quantity stepper at the listing max", async () => {
    const user = await renderReady();
    await user.click(screen.getByText(/sec m · row m3/i)); // max: 4
    await screen.findByText("Ticket details");

    const more = screen.getByRole("button", { name: /more tickets/i });
    await user.click(more);
    await user.click(more);
    expect(more).toBeDisabled();
    expect(screen.getAllByText(/4 tickets/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$134\.36/)).toBeInTheDocument(); // 4 × 33.59
  });

  it("keeps checkout loading until the cart is placed, then shows the org loader", async () => {
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    cacheOrgBranding(raptors);
    let finishHold!: (value: unknown) => void;
    mockedPlaceTickets.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishHold = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <PremiumTicketing data={seatedTicketingFixture} />
      </>,
    );
    await screen.findByText(/sec m · row m3/i, {}, { timeout: 3000 });
    await user.click(screen.getByText(/sec m · row m3/i));
    await screen.findByText("Ticket details");

    await user.click(screen.getByRole("button", { name: /^checkout$/i }));

    const holdingBtn = await screen.findByRole("button", {
      name: /holding seats/i,
    });
    expect(holdingBtn).toBeDisabled();
    expect(
      within(holdingBtn).getByRole("status", { name: /loading/i }),
    ).toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();

    finishHold({ data: { cartId: "cart-1" } });

    await waitFor(() => {
      expect(mockedPlaceTickets).toHaveBeenCalled();
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("cart-1"));
    });
    expect(screen.getByRole("button", { name: /holding seats/i })).toBeDisabled();
    const orgLoader = document.querySelector("[data-bt-tenant-loader]");
    expect(orgLoader).toBeTruthy();
    expect(
      within(orgLoader as HTMLElement).getByText(raptors.name),
    ).toBeInTheDocument();
    expect(
      within(orgLoader as HTMLElement).getByText(/getting payment ready/i),
    ).toBeInTheDocument();
    expect(orgLoader).not.toHaveAttribute("data-bt-platform-loader");
    expect(routerMocks.push.mock.calls[0][0]).not.toMatch(/\/wallet\/|\/tickets\//);
  });

  it("stays on tickets and shows an error when the cart cannot be created", async () => {
    mockedPlaceTickets.mockRejectedValue({
      response: { data: { error: { message: "Unable to hold tickets." } } },
    });
    const user = await renderReady();
    await user.click(screen.getByText(/sec m · row m3/i));
    await screen.findByText("Ticket details");

    await user.click(screen.getByRole("button", { name: /^checkout$/i }));

    expect(
      await screen.findByText(/unable to hold tickets/i),
    ).toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /^checkout$/i }),
    ).toBeEnabled();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();
  });

  it("places map seats and goes to checkout instead of wallet login", async () => {
    seedMapSelection();
    const user = await openLiveMap();

    await user.click(screen.getByRole("button", { name: /^checkout$/i }));

    await waitFor(() => {
      expect(mockedPlaceTickets).toHaveBeenCalled();
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("cart-1"));
    });
  });

  it("opens the seat map modal", async () => {
    const user = await renderReady();
    await user.click(screen.getAllByText(/find on map/i)[0]);

    expect(await screen.findByText(/select your seats/i)).toBeInTheDocument();
    expect(screen.getByText(/legend/i)).toBeInTheDocument();
  });

  it("shows a mobile map selection bar and opens the selected tickets panel", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    const selected = seedMapSelection();
    const user = await openLiveMap();

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("1 Ticket")).toBeInTheDocument();
    expect(screen.getByText(`$${Number(selected.price).toFixed(2)}`)).toBeInTheDocument();
    expect(screen.queryByText(/your selection/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /view selection/i }));

    expect(screen.getByText("Ticket details")).toBeInTheDocument();
    expect(screen.getByText(String(selected.sectionNumber))).toBeInTheDocument();
    expect(screen.getByText(String(selected.rowNumber))).toBeInTheDocument();
    expect(screen.getByText(String(selected.seatNumber))).toBeInTheDocument();
  });

  it("does not show the mobile map selection bar when nothing is selected", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    await openLiveMap();

    expect(screen.queryByRole("button", { name: /view selection/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
  });

  it("places map seats from the mobile selection bar", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    seedMapSelection();
    const user = await openLiveMap();

    await user.click(screen.getByRole("button", { name: /^checkout$/i }));

    await waitFor(() => {
      expect(mockedPlaceTickets).toHaveBeenCalled();
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("cart-1"));
    });
  });

  it("opens the live InteractiveSeatmap when mapping geometry is present", async () => {
    useFiltersStore.setState({ loadingTicketGroups: false });
    const user = await renderReady({
      ...seatedTicketingFixture,
      seatmapMapping: demoSeatmapMapping(),
      mapBackground: {
        url: "https://example.com/bg.svg",
        width: 1000,
        height: 800,
      },
    });

    await user.click(screen.getAllByText(/find on map/i)[0]);
    expect(
      await screen.findByRole("dialog", { name: /select your seats/i }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("interactive-seatmap")).toBeInTheDocument();
    expect(screen.queryByLabelText(/loading seat map/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your selection/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/i)).not.toBeInTheDocument();
  });

  it("shows the org loader in the Find on map popup while inventory is loading", async () => {
    useFiltersStore.setState({ loadingTicketGroups: true });
    const user = await renderReady({
      ...seatedTicketingFixture,
      seatmapMapping: demoSeatmapMapping(),
    });

    await user.click(screen.getAllByText(/find on map/i)[0]);
    const loader = await screen.findByRole("status", { name: /loading/i });
    expect(within(loader).getByText(/loading tickets/i)).toBeInTheDocument();
    expect(
      within(loader).getByText(seatedTicketingFixture.orgLabel),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/loading seat map/i)).not.toBeInTheDocument();
  });

  it("opens ticket details with the seat location and no quantity stepper", async () => {
    const selected = seedMapSelection();
    const user = await openLiveMap();

    await user.click(screen.getByRole("button", { name: /details/i }));

    expect(await screen.findByText("Ticket details")).toBeInTheDocument();
    expect(screen.getByText(/seat location/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        `Sec ${selected.sectionNumber} · Row ${selected.rowNumber} · Seat ${selected.seatNumber}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /more tickets/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /fewer tickets/i }),
    ).not.toBeInTheDocument();
  });

  it("lets the shopper add another seat in the same row on the map", async () => {
    seedMapSelection();
    await openLiveMap();
    const sameRow = DEMO_SEATED_TICKET_GROUPS.find((g) =>
      g.seatIds?.includes("s2"),
    );
    if (!sameRow) throw new Error("demo fixtures need seat s2 in the Field Club row");

    useSeatmapStore.getState().selectSpecificSeat("s2", sameRow);

    expect(screen.queryByRole("dialog", { name: /selected tickets not available/i })).not.toBeInTheDocument();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(2);
  });

  it("shows a branded one-row popup and does not add a seat from another row", async () => {
    seedMapSelection();
    const user = await openLiveMap();
    const otherRow = DEMO_SEATED_TICKET_GROUPS.find((g) =>
      g.seatIds?.includes("a1"),
    );
    if (!otherRow) throw new Error("demo fixtures need seat a1 in another row");

    useSeatmapStore.getState().selectSpecificSeat("a1", otherRow);

    expect(
      await screen.findByRole("dialog", {
        name: MIXED_MAP_SELECTION_ERROR.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(MIXED_MAP_SELECTION_ERROR.message),
    ).toBeInTheDocument();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);

    await user.click(
      screen.getByRole("button", {
        name: MIXED_MAP_SELECTION_ERROR.buttonText,
      }),
    );
    expect(screen.queryByText(/select your seats/i)).not.toBeInTheDocument();
  });

  it("goes back from ticket details to the map selection list", async () => {
    seedMapSelection();
    const user = await openLiveMap();
    await user.click(screen.getByRole("button", { name: /details/i }));
    await screen.findByText("Ticket details");

    await user.click(screen.getByRole("button", { name: /back to selection/i }));

    expect(screen.queryByText("Ticket details")).not.toBeInTheDocument();
    expect(screen.getByText(/your selection/i)).toBeInTheDocument();
  });

  it("asks before closing the seat map when tickets are selected", async () => {
    seedMapSelection();
    const user = await openLiveMap();

    await user.click(screen.getByRole("button", { name: /close seat map/i }));
    expect(
      await screen.findByRole("dialog", { name: /are you sure you want to exit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you will lose your selected tickets/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(
      screen.queryByRole("dialog", { name: /are you sure you want to exit/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("interactive-seatmap")).toBeInTheDocument();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(1);
  });

  it("exits the seat map and clears the selection after confirming", async () => {
    seedMapSelection();
    const user = await openLiveMap();
    const mapping = useSeatmapStore.getState().data;
    if (mapping?.seats?.s1) {
      useSeatmapStore.setState({
        data: {
          ...mapping,
          seats: { ...mapping.seats, s1: { ...mapping.seats.s1, selected: true } },
        },
      });
    }

    await user.click(screen.getByRole("button", { name: /close seat map/i }));
    await user.click(await screen.findByRole("button", { name: /exit anyway/i }));

    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useSeatmapStore.getState().selectedFromMap).toHaveLength(0);
    expect(useSeatmapStore.getState().data?.seats?.s1?.selected).not.toBe(true);
  });

  it("closes the seat map immediately when nothing is selected", async () => {
    const user = await openLiveMap();

    await user.click(screen.getByRole("button", { name: /close seat map/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("interactive-seatmap")).not.toBeInTheDocument();
  });

  it("unlocks a passcode-locked offer and filters to it", async () => {
    const user = await renderReady(lockedTicketingFixture, {
      waitForListing: /sec a · row 12/i,
    });

    expect(screen.queryByText(/sec m · row m3/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /field club/i }));

    expect(await screen.findByText(/field club is locked/i)).toBeInTheDocument();
    expect(
      screen.getByText(/enter your access code to unlock these seats/i),
    ).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/access code/i), "CLUB26");
    await user.click(screen.getByRole("button", { name: /unlock seats/i }));

    expect(await screen.findByText(/sec m · row m3/i)).toBeInTheDocument();
  });

  it("filters to accessible listings when ADA is toggled without a server callback", async () => {
    const user = await renderReady();

    await user.click(
      screen.getByRole("button", { name: /accessible seating only/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/sec a · row 12/i)).toBeInTheDocument();
      expect(screen.queryByText(/sec m · row m3/i)).not.toBeInTheDocument();
    });
  });

  it("sorts listings by price ascending then descending on the client", async () => {
    const user = await renderReady();

    const firstPrice = () =>
      screen.getAllByText(/\$[\d,]+\.\d{2} each/i)[0].textContent;

    expect(firstPrice()).toMatch(/\$11\.64/);

    await user.click(
      screen.getByRole("button", { name: /sorted by lowest price/i }),
    );
    await waitFor(() => {
      expect(firstPrice()).toMatch(/\$33\.59/);
    });
  });

  it("opens the event information modal", async () => {
    const user = await renderReady();
    await user.click(screen.getByText(/event information/i));

    const dialog = screen.getByRole("dialog", { name: /event information/i });
    expect(screen.getByText(/about this event/i)).toBeInTheDocument();
    expect(
      screen.getByText(/dummy event for ui\/ux review/i),
    ).toBeInTheDocument();
    expect(screen.getByText(seatedTicketingFixture.doorsLine)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open in maps/i }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /^done$/i }),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /close/i }));
    expect(
      screen.queryByRole("dialog", { name: /event information/i }),
    ).not.toBeInTheDocument();
  });
});
