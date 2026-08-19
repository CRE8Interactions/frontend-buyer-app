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
    expect(screen.getByText(`${order.vouchers.length} of ${order.vouchers.length} vouchers left`)).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.queryByText("No flex packs yet")).not.toBeInTheDocument();

    await user.click(screen.getByText(pack.name));

    expect(screen.getByRole("heading", { name: pack.name })).toBeInTheDocument();
    expect(screen.getByText(order.vouchers[0].code)).toBeInTheDocument();
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
});
