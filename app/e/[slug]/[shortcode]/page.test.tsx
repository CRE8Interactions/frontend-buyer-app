import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_EVENTS, demoEventDetail, demoTicketGroups } from "@/lib/demo/fixtures";
import type { GATier, TicketingData } from "@/components/organisms/PremiumTicketing";

const GA_EVENT = DEMO_EVENTS.find((e) => e.seatmap?.ga_only) || DEMO_EVENTS[0];
const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ slug: GA_EVENT.seoUrl, shortcode: GA_EVENT.shortcode }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => `/e/${GA_EVENT.seoUrl}/${GA_EVENT.shortcode}/`,
  useRouter: () => router,
}));

vi.mock("@/lib/api", () => ({
  getEventByShortCode: vi.fn(),
  getTicketGroups: vi.fn(),
}));

// The cards themselves are covered by the PremiumTicketing tests; here only the
// tier each offer maps to matters.
vi.mock("@/components/organisms/PremiumTicketing", () => ({
  default: ({ data }: { data: TicketingData }) => (
    <>
      {data.soldOut ? <p>event sold out</p> : null}
      {data.scheduled ? <p>{`scheduled · ${data.scheduledAt}`}</p> : null}
      <ul>
        {(data.gaTiers || []).map((t: GATier) => (
          <li key={t.name}>{`${t.name} · ${t.state} · ${t.price} · ${t.note}`}</li>
        ))}
      </ul>
    </>
  ),
}));

import GAEventRoute from "@/app/e/[slug]/[shortcode]/page";
import { getEventByShortCode, getTicketGroups } from "@/lib/api";

const mockedGetEvent = vi.mocked(getEventByShortCode);
const mockedGetTicketGroups = vi.mocked(getTicketGroups);

function inventory(body: Record<string, unknown>) {
  mockedGetTicketGroups.mockResolvedValue({ data: body } as never);
}

describe("GA event page tiers", () => {
  beforeEach(() => {
    sessionStorage.clear();
    router.replace.mockReset();
    mockedGetEvent.mockReset();
    mockedGetTicketGroups.mockReset();
    mockedGetEvent.mockResolvedValue({
      data: demoEventDetail(GA_EVENT.shortcode),
    } as never);
  });

  it("cards an offer whose inventory ran out as sold out and keeps the rest live", async () => {
    const { ticketGroups, offers } = demoTicketGroups();
    inventory({ soldout: false, ticketGroups, offers });

    render(<GAEventRoute />);

    expect(
      await screen.findByText(/student rush · soldout/i, undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/vip club · live/i)).toBeInTheDocument();
    // Locked offers stay behind their code rather than posing as sold out.
    expect(screen.queryByText(/sth presale/i)).not.toBeInTheDocument();
  });

  it("leaves an offer with no ticket groups off the page", async () => {
    const { ticketGroups, offers } = demoTicketGroups();
    inventory({
      soldout: false,
      ticketGroups,
      offers: [...offers, { id: "off-scheduled", name: "Test Offer" }],
    });

    render(<GAEventRoute />);

    await screen.findByText(/vip club · live/i, undefined, { timeout: 4000 });
    // Its groups were filtered out, not sold out — inventing a card would lie.
    expect(screen.queryByText(/test offer/i)).not.toBeInTheDocument();
  });

  it("keeps selling when the event is flagged sold out but inventory came back", async () => {
    const { ticketGroups, offers } = demoTicketGroups();
    inventory({ soldout: true, ticketGroups, offers });

    render(<GAEventRoute />);

    expect(
      await screen.findByText(/vip club · live/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it("hands a sold-out event to the waitlist instead of the empty notice", async () => {
    inventory({ soldout: true, ticketGroups: [], offers: [] });

    render(<GAEventRoute />);

    expect(
      await screen.findByText(/event sold out/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no tickets on sale/i)).not.toBeInTheDocument();
  });

  it("shows the event schedule without inventing a GA offer card", async () => {
    const { offers } = demoTicketGroups();
    const scheduledTime = "2026-08-28T16:00:00.000Z";
    inventory({
      soldout: false,
      isScheduled: true,
      scheduledTime,
      ticketGroups: [],
      offers: [offers[0]],
    });

    render(<GAEventRoute />);

    expect(
      await screen.findByText(/scheduled ·/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(offers[0].name, "i"))).not.toBeInTheDocument();
    expect(screen.queryByText(/no tickets on sale/i)).not.toBeInTheDocument();
  });

  it("falls back to the empty notice when nothing is on sale", async () => {
    inventory({ soldout: false, ticketGroups: [], offers: [] });

    render(<GAEventRoute />);

    expect(
      await screen.findByText(/no tickets on sale/i, undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
  });

  it("sends a GA shopper without admission to the waiting room before loading inventory", async () => {
    const detail = demoEventDetail(GA_EVENT.shortcode);
    mockedGetEvent.mockResolvedValue({
      data: {
        ...detail,
        event: { ...detail.event, waitingRoomEnabled: true },
      },
    } as never);

    render(<GAEventRoute />);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        `/e/${GA_EVENT.seoUrl}/${GA_EVENT.shortcode}/waiting-room/`,
      );
    });
    expect(mockedGetTicketGroups).not.toHaveBeenCalled();
    expect(screen.queryByText(/no tickets on sale/i)).not.toBeInTheDocument();
  });
});
