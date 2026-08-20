import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SESSION,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: () => sessionMocks.getSession(),
}));

vi.mock("@/lib/api", () => ({
  getMyEvents: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/my-tickets/",
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import SeasonTickets from "@/components/organisms/SeasonTickets";
import { getMyEvents } from "@/lib/api";

const mockedGetMyEvents = vi.mocked(getMyEvents);
const icedogs = DEMO_EVENTS.find((event) => event.shortCode === "ICEDOG5")!;
const pkg = demoSeasonPackage();

describe("SeasonTickets package tab", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
  });

  it("shows package orders on the Season tickets tab, not Upcoming", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedTicketOrder({ event: icedogs }),
        demoCompletedPackageOrder(),
      ],
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Season tickets/i })).toBeInTheDocument();
    });

    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(icedogs.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/my-tickets/event/${icedogs.uuid}`),
    );
    expect(screen.queryByText(pkg.name)).not.toBeInTheDocument();
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Season tickets/i }));

    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();

    await user.click(screen.getByText(pkg.name));

    expect(screen.getByRole("heading", { name: pkg.name })).toBeInTheDocument();
    expect(screen.getByText(pkg.events[1].name)).toBeInTheDocument();
  });

  it("does not link a wallet event that has no UUID", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: { ...icedogs, uuid: "" } })],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: new RegExp(icedogs.name) }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty Season tickets tab when the wallet has no package orders", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Season tickets/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Season tickets/i }));

    expect(screen.getByText("No season tickets yet")).toBeInTheDocument();
    expect(screen.queryByText(pkg.name)).not.toBeInTheDocument();
  });
});

describe("SeasonTickets routed event screen", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
  });

  it("opens the wallet event detail for the routed event UUID", async () => {
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    expect(await screen.findByRole("heading", { name: icedogs.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All tickets/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/my-tickets\/?$/),
    );
  });

  it("explains when the routed event is not in the wallet", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);

    render(<SeasonTickets initialScreen="event" eventUUID="missing-event-uuid" />);

    expect(await screen.findByText(/couldn't find those tickets/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: icedogs.name })).not.toBeInTheDocument();
  });

  it("does not refetch wallet orders when going back to the list", async () => {
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    const { rerender } = render(<SeasonTickets eventUUID={icedogs.uuid} />);

    expect(await screen.findByRole("heading", { name: icedogs.name })).toBeInTheDocument();
    expect(mockedGetMyEvents).toHaveBeenCalledTimes(1);

    rerender(<SeasonTickets />);

    expect(await screen.findByRole("link", { name: new RegExp(icedogs.name) })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: icedogs.name })).not.toBeInTheDocument();
    expect(mockedGetMyEvents).toHaveBeenCalledTimes(1);
  });
});

describe("SeasonTickets flex packs tab", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
  });

  it("shows purchased flex packs on the Flex packs tab, not Upcoming", async () => {
    const user = userEvent.setup();
    const order = demoCompletedFlexPackOrder();
    const pack = demoFlexPack();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs }), order],
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Flex packs/i })).toBeInTheDocument();
    });

    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(screen.queryByText(pack.name)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Flex packs/i }));

    expect(screen.getByText(pack.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(pack.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/my-tickets/flex-pack/${pack.uuid}`),
    );
    expect(screen.getByText(`${order.vouchers.length} of ${order.vouchers.length} vouchers left`)).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.queryByText("No flex packs yet")).not.toBeInTheDocument();
  });

  it("shows an empty Flex packs tab when the wallet has no flex pack orders", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Flex packs/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Flex packs/i }));

    expect(screen.getByText("No flex packs yet")).toBeInTheDocument();
    expect(screen.queryByText(demoFlexPack().name)).not.toBeInTheDocument();
  });

  it("does not link a wallet flex pack that has no UUID", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedFlexPackOrder({
          flex_pack: null,
          vouchers: [
            { code: "868364", status: "active" },
            { code: "146459", status: "active" },
          ],
        }),
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /Flex packs/i }));

    expect(screen.getByRole("button", { name: /2 of 2 vouchers left/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Flex pack/i }),
    ).not.toBeInTheDocument();
  });
});

describe("SeasonTickets routed flex pack screen", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
  });

  it("opens the wallet flex pack for the routed flex pack UUID", async () => {
    const order = demoCompletedFlexPackOrder();
    const pack = demoFlexPack();
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="package" flexPackUUID={pack.uuid} />);

    expect(await screen.findByRole("heading", { name: pack.name })).toBeInTheDocument();
    expect(screen.getByText(order.vouchers[0].code)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All tickets/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/my-tickets\/?$/),
    );
  });

  it("explains when the routed flex pack is not in the wallet", async () => {
    const pack = demoFlexPack();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedFlexPackOrder()],
    } as never);

    render(<SeasonTickets initialScreen="package" flexPackUUID="missing-flex-pack-uuid" />);

    expect(await screen.findByText(/couldn't find that flex pack/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: pack.name })).not.toBeInTheDocument();
  });
});
