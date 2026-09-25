import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SEATED_TICKET_GROUPS,
  demoEventDetail,
} from "@/lib/demo/fixtures";
import type { TicketingFilters } from "@/components/organisms/PremiumTicketing";

const EVENT =
  DEMO_EVENTS.find((event) => !event.seatmap?.ga_only) || DEMO_EVENTS[0];
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: EVENT.seoUrl, shortcode: EVENT.shortCode }),
  useSearchParams: () => nav.search,
  usePathname: () => `/e/${EVENT.seoUrl}/${EVENT.shortCode}/tickets/`,
  useRouter: () => nav,
}));

vi.mock("@/components/molecules/RouteLoader", () => ({
  default: () => <div role="status">Loading tickets...</div>,
  BrandedLoader: () => <div role="status">Loading tickets...</div>,
}));

vi.mock("@/components/organisms/PremiumTicketing", () => ({
  default: ({
    data,
    onFiltersChange,
    initialFilters,
  }: {
    data: {
      soldOut?: boolean;
      scheduled?: boolean;
      scheduledAt?: string;
      offerNames?: string[];
    };
    onFiltersChange?: (filters: TicketingFilters) => void;
    initialFilters?: Partial<TicketingFilters>;
  }) => (
    <div>
      {data.soldOut
        ? "Event sold out"
        : data.scheduled
          ? `Scheduled · ${data.scheduledAt}`
          : "Ticket listings"}
      {initialFilters?.accessible ? "ADA on" : null}
      {(data.offerNames || []).map((offer) => (
        <span key={offer}>{offer}</span>
      ))}
      <button
        type="button"
        onClick={() =>
          onFiltersChange?.({
            quantity: 4,
            accessible: true,
            sort: "-price",
            offerIds: [11],
            accessCodes: ["SECRET"],
            accessCodeTokens: ["12:SECRET"],
          })
        }
      >
        Apply filters
      </button>
    </div>
  ),
}));

vi.mock("@/lib/api", () => ({
  getEventByShortCode: vi.fn(),
  getOffers: vi.fn(),
  getSeatmapByShortCode: vi.fn(),
  getTicketGroups: vi.fn(),
  heartbeatWaitingRoom: vi.fn(),
  joinWaitingRoom: vi.fn(),
  beaconLeaveWaitingRoom: vi.fn(),
}));

import SeatedTicketsRoute from "@/app/e/[slug]/[shortcode]/tickets/page";
import {
  getEventByShortCode,
  getSeatmapByShortCode,
  getTicketGroups,
} from "@/lib/api";

const mockedGetEvent = vi.mocked(getEventByShortCode);
const mockedGetSeatmap = vi.mocked(getSeatmapByShortCode);
const mockedGetTicketGroups = vi.mocked(getTicketGroups);

function inventoryPayload(groups = DEMO_SEATED_TICKET_GROUPS) {
  return {
    data: {
      soldout: false,
      ticketGroups: groups,
      offers: [{ id: 11, name: "Section A-B" }],
    },
  } as never;
}

describe("seated tickets route", () => {
  beforeEach(() => {
    sessionStorage.clear();
    nav.replace.mockReset();
    nav.search = new URLSearchParams();
    mockedGetEvent.mockReset();
    mockedGetSeatmap.mockReset();
    mockedGetTicketGroups.mockReset();
    mockedGetSeatmap.mockResolvedValue({ data: {} } as never);
  });

  it("redirects before loading seat inventory when admission is required", async () => {
    const detail = demoEventDetail(EVENT.shortCode);
    mockedGetEvent.mockResolvedValue({
      data: {
        ...detail,
        event: { ...detail.event, waitingRoomEnabled: true },
      },
    } as never);

    render(<SeatedTicketsRoute />);

    await waitFor(() => {
      expect(nav.replace).toHaveBeenCalledWith(
        `/e/${EVENT.seoUrl}/${EVENT.shortCode}/waiting-room/`,
      );
    });
    expect(mockedGetTicketGroups).not.toHaveBeenCalled();
    expect(screen.queryByText("Ticket listings")).not.toBeInTheDocument();
  });

  it("renders the sold-out ticket panel when seated inventory is sold out", async () => {
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups.mockResolvedValue({
      data: { soldout: true, ticketGroups: [] },
    } as never);

    render(<SeatedTicketsRoute />);

    expect(
      await screen.findByText(/event sold out/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no tickets on sale/i)).not.toBeInTheDocument();
  });

  it("uses only active inventory offers and shows the seated event schedule", async () => {
    const scheduledTime = "2026-08-28T16:00:00.000Z";
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups.mockResolvedValue({
      data: {
        soldout: false,
        isScheduled: true,
        scheduledTime,
        ticketGroups: [],
        offers: [],
      },
    } as never);

    render(<SeatedTicketsRoute />);

    expect(
      await screen.findByText(/scheduled ·/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no tickets on sale/i)).not.toBeInTheDocument();
  });

  it("loads unfiltered inventory first, then listing filters and access codes", async () => {
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups.mockResolvedValue(inventoryPayload());

    const user = userEvent.setup();
    render(<SeatedTicketsRoute />);

    expect(
      await screen.findByText(/ticket listings/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(mockedGetTicketGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 0,
        accessible: false,
        offerIds: [],
        accessCodes: [],
      }),
    );
    expect(mockedGetSeatmap).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetTicketGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 4,
          accessible: true,
          sort: "-price",
          offerIds: [11],
          // The endpoint pairs each code with its offer id.
          accessCodes: ["12:SECRET"],
        }),
      );
    });
    expect(mockedGetSeatmap).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalled();
    const href = String(nav.replace.mock.calls.at(-1)?.[0]);
    expect(href).not.toMatch(/(?:^|[?&])code=/);
    expect(href).toContain("quantity=4");
    expect(href).toContain("accessible=true");
    expect(href).toContain("offers=11");
    expect(href).toContain("access_code=");
  });

  it("hydrates listing filters from the URL and refetches listings only", async () => {
    nav.search = new URLSearchParams(
      "quantity=4&sort=-price&accessible=true&offers=11&access_code=12:SECRET",
    );
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups.mockResolvedValue(inventoryPayload());

    render(<SeatedTicketsRoute />);

    expect(
      await screen.findByText(/ada on/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedGetTicketGroups.mock.calls.length).toBeGreaterThan(1);
    });
    expect(mockedGetTicketGroups).toHaveBeenLastCalledWith(
      expect.objectContaining({
        quantity: 4,
        accessible: true,
        sort: "-price",
        offerIds: ["11"],
        accessCodes: ["12:SECRET"],
      }),
    );
    expect(mockedGetSeatmap).toHaveBeenCalledTimes(1);
  });

  it("keeps baseline listings when a filtered fetch is empty", async () => {
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups
      .mockResolvedValueOnce(inventoryPayload())
      .mockResolvedValueOnce({
        data: { soldout: false, ticketGroups: [], offers: [] },
      } as never);

    const user = userEvent.setup();
    render(<SeatedTicketsRoute />);
    expect(
      await screen.findByText(/ticket listings/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(mockedGetTicketGroups.mock.calls.length).toBeGreaterThan(1);
    });
    expect(screen.getByText(/ticket listings/i)).toBeInTheDocument();
  });

  it("persists a numeric tracking-link code from the seated event URL", async () => {
    nav.search = new URLSearchParams("code=9876543210");
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(EVENT.shortCode),
    } as never);
    mockedGetTicketGroups.mockResolvedValue(inventoryPayload());

    render(<SeatedTicketsRoute />);

    expect(
      await screen.findByText(/ticket listings/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(`trackingLink:${EVENT.uuid}`)).toBe(
      "9876543210",
    );
  });
});
