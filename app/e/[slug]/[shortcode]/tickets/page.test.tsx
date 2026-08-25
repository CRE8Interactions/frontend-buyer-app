import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoEventDetail } from "@/lib/demo/fixtures";

const EVENT =
  DEMO_EVENTS.find((event) => !event.seatmap?.ga_only) || DEMO_EVENTS[0];
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: EVENT.seoUrl, shortcode: EVENT.shortCode }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => `/e/${EVENT.seoUrl}/${EVENT.shortCode}/tickets/`,
  useRouter: () => router,
}));

vi.mock("@/components/molecules/RouteLoader", () => ({
  default: () => <div role="status">Loading tickets...</div>,
}));

vi.mock("@/components/organisms/PremiumTicketing", () => ({
  default: ({ data }: { data: { soldOut?: boolean; scheduled?: boolean; scheduledAt?: string; offerNames?: string[] } }) => (
    <div>
      {data.soldOut
        ? "Event sold out"
        : data.scheduled
          ? `Scheduled · ${data.scheduledAt}`
          : "Ticket listings"}
      {(data.offerNames || []).map((offer) => <span key={offer}>{offer}</span>)}
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

describe("seated tickets route", () => {
  beforeEach(() => {
    sessionStorage.clear();
    router.replace.mockReset();
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
      expect(router.replace).toHaveBeenCalledWith(
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
});
