import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SESSION,
  demoAccessPass,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoPackageAccessPass,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { seatLabel } from "@/lib/wallet";

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: () => sessionMocks.getSession(),
}));

vi.mock("@/lib/api", () => ({
  createTicketTransfer: vi.fn(),
  downloadApplePass: vi.fn(),
  downloadGooglePass: vi.fn(),
  getEventByUuid: vi.fn(),
  getEventByShortCode: vi.fn(),
  getOrganizationStorefront: vi.fn(),
  getAccessPassesByOrder: vi.fn(),
  getMyAccessPass: vi.fn(),
  getMyAccessPasses: vi.fn(),
  getMyEvents: vi.fn(),
  getOrder: vi.fn(),
}));

const pdfMocks = vi.hoisted(() => ({
  printTicketsPdf: vi.fn(),
}));

vi.mock("@/lib/ticketPdf", () => ({
  printTicketsPdf: pdfMocks.printTicketsPdf,
}));

const navigationMocks = vi.hoisted(() => ({
  pathname: "/wallet/my-tickets/",
  search: "",
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import SeasonTickets from "@/components/organisms/SeasonTickets";
import {
  createTicketTransfer,
  downloadApplePass,
  downloadGooglePass,
  getAccessPassesByOrder,
  getMyAccessPass,
  getMyAccessPasses,
  getMyEvents,
  getOrder,
} from "@/lib/api";

const mockedDownloadApplePass = vi.mocked(downloadApplePass);
const mockedDownloadGooglePass = vi.mocked(downloadGooglePass);
const mockedCreateTicketTransfer = vi.mocked(createTicketTransfer);
const mockedGetAccessPassesByOrder = vi.mocked(getAccessPassesByOrder);
const mockedGetMyAccessPass = vi.mocked(getMyAccessPass);
const mockedGetMyAccessPasses = vi.mocked(getMyAccessPasses);
const mockedGetMyEvents = vi.mocked(getMyEvents);
const mockedGetOrder = vi.mocked(getOrder);
const printableEvent = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
const icedogs = printableEvent;
const pkg = demoSeasonPackage();
const ticketOrderId = String(demoCompletedTicketOrder().orderId);
const packageOrderId = String(demoCompletedPackageOrder().orderId);
const flexOrderId = String(demoCompletedFlexPackOrder().orderId);

beforeEach(() => {
  navigationMocks.pathname = "/wallet/my-tickets/";
  navigationMocks.search = "";
  mockedCreateTicketTransfer.mockReset();
  mockedCreateTicketTransfer.mockResolvedValue({
    data: { id: "transfer-1", status: "pending" },
  } as never);
  mockedGetMyAccessPasses.mockReset();
  mockedGetMyAccessPasses.mockResolvedValue({ data: { data: [] } } as never);
  mockedGetMyAccessPass.mockReset();
  mockedGetMyAccessPass.mockResolvedValue({ data: { data: null } } as never);
  mockedGetAccessPassesByOrder.mockReset();
  mockedGetAccessPassesByOrder.mockResolvedValue({
    data: { data: [] },
  } as never);
  mockedGetOrder.mockReset();
  mockedGetOrder.mockResolvedValue({ data: null } as never);
  pdfMocks.printTicketsPdf.mockReset();
  pdfMocks.printTicketsPdf.mockResolvedValue(undefined);
});

describe("SeasonTickets empty wallet", () => {
  it("finishes loading and shows No tickets yet when there are no tickets, transfers, or listings", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({ data: { data: [] } } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    expect(
      screen.getByText(/purchased tickets will show up here after checkout/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
  });
});

describe("SeasonTickets package tab", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
  });

  it("shows package orders on the Packages tab, not Upcoming", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedTicketOrder({ event: icedogs }),
        demoCompletedPackageOrder(),
      ],
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Packages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(icedogs.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/wallet/my-tickets/order/${ticketOrderId}`),
    );
    expect(screen.queryByText(pkg.name)).not.toBeInTheDocument();
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Packages/i }));

    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(pkg.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}`),
    );
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pkg.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(pkg.events[1].name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(pkg.events[1].name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(
        `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${pkg.events[1].uuid}`,
      ),
    );

    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${pkg.events[1].uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pkg.events[1].name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All tickets/i })).toHaveAttribute(
      "href",
      expect.stringMatching(`/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}`),
    );
  });

  it("shows an associated season pass before the package game tickets", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("img", {
        name: `QR code for ${pass.name}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Season pass" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(
        `^/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/?$`,
      ),
    );
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();
    expect(mockedGetAccessPassesByOrder).toHaveBeenCalledWith(order.orderId);

    await user.click(
      screen.getByRole("button", { name: `Show QR code for ${pass.name}` }),
    );

    const seatLine = seatLabel({
      sectionNumber: String(pass.sectionNumber),
      rowNumber: String(pass.rowNumber),
      seatNumber: String(pass.seatNumber),
    });
    expect(
      screen.getByRole("dialog", { name: `${pass.name} · ${seatLine}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `Enlarged QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Show this code at entry for any included event."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close QR code" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Game tickets/i }));

    expect(screen.getByText(pkg.events[1].name)).toBeInTheDocument();
  });

  it("does not link past or fully transferred package events", async () => {
    const order = demoCompletedPackageOrder();
    const [pastEvent, activeEvent, transferredEvent] = pkg.events;
    const events = [
      { ...pastEvent, start: "2020-08-15T23:00:00.000Z", status: "complete" },
      { ...activeEvent, start: "2099-09-12T23:00:00.000Z" },
      { ...transferredEvent, start: "2099-09-19T23:00:00.000Z" },
    ];
    const tickets = events.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
        ...(event.uuid === transferredEvent.uuid
          ? { transferStatus: "transferred" }
          : {}),
      })),
    );
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...order.package, events },
          tickets,
        }),
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(pastEvent.name)).toBeInTheDocument();
    expect(screen.getByText(activeEvent.name)).toBeInTheDocument();
    expect(screen.getByText(transferredEvent.name)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${pastEvent.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${activeEvent.name}` }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/package/${pkg.uuid}/event/${activeEvent.uuid}`),
    );
    expect(
      screen.queryByRole("link", { name: `View ${transferredEvent.name}` }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Past")).toBeInTheDocument();
    expect(screen.getByText("Transferred")).toBeInTheDocument();
  });

  it("transfers the season pass associated with a package", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveFocus();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("recipient@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Season pass transfer pending"),
    ).toBeInTheDocument();
    expect(mockedCreateTicketTransfer).toHaveBeenCalledWith({
      accessPassId: pass.uuid,
      email: "recipient@example.com",
    });
    expect(screen.getByRole("link", { name: "My transfers" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/my-transfers\/?$/),
    );
  });

  it("does not transfer a season pass back to its owner", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      DEMO_SESSION.user.email,
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This season pass is already assigned to your email.",
    );
    expect(mockedCreateTicketTransfer).not.toHaveBeenCalled();
  });

  it("shows website, box office, and ticket-assignment event orders", async () => {
    const orders = ["website", "box_office", "ticket_assignment"].map(
      (source, index) =>
        demoCompletedTicketOrder({
          id: 5000 + index,
          orderId: `wallet-source-${index}`,
          source,
          event: {
            ...DEMO_EVENTS[index],
            start: `2099-09-0${index + 1}T23:00:00.000Z`,
          },
        }),
    );
    mockedGetMyEvents.mockResolvedValue({ data: orders } as never);

    render(<SeasonTickets />);

    for (const event of DEMO_EVENTS.slice(0, 3)) {
      expect(await screen.findByText(event.name)).toBeInTheDocument();
    }
  });

  it("loads active access passes into their own tab", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass({ events: [printableEvent] });
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: /Access passes.*1/i }),
    );
    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(pass.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(
        `^/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/?$`,
      ),
    );
    expect(screen.getByText(`Pass #${pass.checkInCode}`)).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(pass.events.at(-1)!.name).length,
    ).toBeGreaterThan(0);

    navigationMocks.pathname = `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Next up")).toBeInTheDocument();
    expect(screen.getByText("All events")).toBeInTheDocument();
    expect(screen.getByText("Valid through")).toBeInTheDocument();
    expect(
      screen.getAllByText(pass.events.at(-1)!.name).length,
    ).toBeGreaterThan(0);
    expect(mockedGetMyAccessPass).toHaveBeenCalledWith(pass.uuid);

    await user.click(
      screen.getByRole("button", {
        name: `Show QR code for ${pass.name}`,
      }),
    );

    const qrDialog = screen.getByRole("dialog", { name: pass.name });
    expect(qrDialog).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: `Enlarged QR code for ${pass.name}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Show this code at entry for any included event."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add to (Apple|Google) Wallet/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: pass.name })).not.toBeInTheDocument();
  });

  it("only links eligible events from a season-pass detail", async () => {
    const order = demoCompletedPackageOrder();
    const [pastEvent, activeEvent, transferredEvent] = pkg.events;
    const events = [
      { ...pastEvent, start: "2020-08-15T23:00:00.000Z", status: "complete" },
      { ...activeEvent, start: "2099-09-12T23:00:00.000Z" },
      { ...transferredEvent, start: "2099-09-19T23:00:00.000Z" },
    ];
    const tickets = events.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
        ...(event.uuid === transferredEvent.uuid
          ? { transferStatus: "transferred" }
          : {}),
      })),
    );
    const packageOrder = demoCompletedPackageOrder({
      package: { ...order.package, events },
      tickets,
    });
    const pass = demoPackageAccessPass({ events });
    navigationMocks.pathname = `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [packageOrder] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${pastEvent.name}` }),
    ).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link", {
      name: `View ${activeEvent.name}`,
    })) {
      expect(link).toHaveAttribute(
        "href",
        expect.stringMatching(
          `/wallet/my-tickets/order/${packageOrder.orderId}/package/${pkg.uuid}/event/${activeEvent.uuid}`,
        ),
      );
    }
    expect(
      screen.queryByRole("link", { name: `View ${transferredEvent.name}` }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Transferred")).toBeInTheDocument();
  });

  it("explains when an access-pass URL is not in the wallet", async () => {
    navigationMocks.pathname =
      "/wallet/my-tickets/order/missing-order/access-pass/missing-access-pass/";
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [demoAccessPass()] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText(/couldn't find that access pass/i),
    ).toBeInTheDocument();
  });

  it("loads an access-pass detail URL directly", async () => {
    const pass = demoPackageAccessPass();
    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    expect(mockedGetMyAccessPass).toHaveBeenCalledWith(pass.uuid);
    expect(screen.getByText("All events")).toBeInTheDocument();
  });

  it("transfers an access pass from its wallet detail", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer access pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Access pass transfer pending"),
    ).toBeInTheDocument();
    expect(mockedCreateTicketTransfer).toHaveBeenCalledWith({
      accessPassId: pass.uuid,
      email: "recipient@example.com",
    });
  });

  it("shows an error when an access pass cannot be transferred", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);
    mockedCreateTicketTransfer.mockRejectedValue(new Error("offline"));

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer access pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to transfer this access pass. Please try again.",
    );
    expect(
      screen.queryByText("Access pass transfer pending"),
    ).not.toBeInTheDocument();
  });

  it("still shows ticket orders when access passes cannot be loaded", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);
    mockedGetMyAccessPasses.mockRejectedValue(new Error("access passes unavailable"));

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Access passes.*0/i })).toBeInTheDocument();
  });

  it("still links a single-event purchase when the event has no UUID", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: { ...icedogs, uuid: "" } })],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(icedogs.name) }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`/wallet/my-tickets/order/${ticketOrderId}`),
    );
  });

  it("does not link a wallet package that has no UUID", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...pkg, uuid: "" },
        }),
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /Packages/i }));

    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: new RegExp(pkg.name) }),
    ).not.toBeInTheDocument();
  });

  it("explains when the routed package is not in the wallet", async () => {
    navigationMocks.pathname = "/wallet/my-tickets/order/missing-order/package/missing-package-uuid/";
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedPackageOrder()],
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText(/couldn't find that package/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: pkg.name })).not.toBeInTheDocument();
  });

  it("shows an empty Packages tab when the wallet has no package orders", async () => {
    const user = userEvent.setup();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Packages/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Packages/i }));

    expect(screen.getByText("No packages yet")).toBeInTheDocument();
    expect(screen.queryByText(pkg.name)).not.toBeInTheDocument();
  });

  it("uses Blocktickets chrome and gives each wallet section its own URL", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /blocktickets home/i }),
    ).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: /^tickets$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /^tickets$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/my-tickets\/?$/),
    );
    expect(screen.getByRole("link", { name: /^transfers$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/my-transfers\/?$/),
    );
    expect(screen.getByRole("link", { name: /^listings$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/my-listings\/?$/),
    );
    expect(screen.getByRole("link", { name: /^giving$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/giving\/?$/),
    );
    expect(screen.getByRole("link", { name: /^profile$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/wallet\/my-profile\/?$/),
    );
  });
});

describe("SeasonTickets section routes", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);
  });

  it.each([
    ["/wallet/my-transfers/", "Transfers"],
    ["/wallet/my-listings/", "Listings"],
    ["/wallet/giving/", "Giving"],
    ["/wallet/my-profile/", "Profile"],
  ])("opens %s on the %s section", async (pathname, heading) => {
    navigationMocks.pathname = pathname;

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: heading, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: heading })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("focuses the email field on the wallet sign-in screen", async () => {
    navigationMocks.search = "login=1";

    render(<SeasonTickets />);

    expect(screen.getByPlaceholderText("you@email.com")).toHaveFocus();
  });

  it("does not steal focus into a field on the wallet ticket list", async () => {
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it("filters listings by Active, Sold, and Expired", async () => {
    navigationMocks.pathname = "/wallet/my-listings/";
    const user = userEvent.setup();

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: "Listings", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("No active listings")).toBeInTheDocument();
    expect(
      screen.getByText(/when you list tickets for resale/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^sold$/i }));
    expect(screen.getByText("Nothing sold yet")).toBeInTheDocument();
    expect(screen.queryByText("No active listings")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /^expired$/i }));
    expect(screen.getByText("No expired listings")).toBeInTheDocument();
    expect(screen.queryByText("Nothing sold yet")).not.toBeInTheDocument();
  });

  it("sends Sign out to /sign-out", async () => {
    navigationMocks.pathname = "/wallet/my-profile/";

    render(<SeasonTickets />);

    expect(await screen.findByRole("link", { name: /^sign out$/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/sign-out\/?$/),
    );
  });

  it("follows the URL when the shopper moves to another section", async () => {
    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/giving/";
    rerender(<SeasonTickets />);

    expect(
      screen.getByRole("heading", { name: "Giving", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(mockedGetMyEvents).toHaveBeenCalledTimes(1);
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
      expect.stringMatching(/^\/wallet\/my-tickets\/?$/),
    );
  });

  it("shows live ticket and order data in ticket details", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({
      event: printableEvent,
      orderId: "live-order-2048",
      createdAt: "2026-09-01T16:00:00.000Z",
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    const detailsButtons = await screen.findAllByRole("button", {
      name: "Details",
    });
    await user.click(detailsButtons[0]);

    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    expect(modal).not.toBeNull();
    const details = within(modal!);
    expect(details.getByText(order.tickets[0].checkInCode)).toBeInTheDocument();
    expect(details.getByText(order.orderId)).toBeInTheDocument();
    expect(details.getByText(/Tue, Sep 1 · 10:00 AM/)).toBeInTheDocument();
    expect(details.getByText("Mobile entry")).toBeInTheDocument();
  });

  it("holds the event page until the order total is ready", async () => {
    let releaseOrder: (value: { data: unknown }) => void = () => {};
    const listed = demoCompletedTicketOrder({
      event: printableEvent,
      orderId: "1474-968546-6022",
      total: 0,
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockReturnValue(
      new Promise((resolve) => {
        releaseOrder = resolve;
      }) as never,
    );

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    expect(await screen.findByText("Loading your tickets…")).toBeInTheDocument();
    expect(screen.queryByText("Total paid")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();

    releaseOrder({
      data: { ...listed, total: "452.2", firstName: "jaime", lastName: "convery" },
    });

    expect(await screen.findByText("$452.20")).toBeInTheDocument();
    expect(screen.getByText("Total paid")).toBeInTheDocument();
    expect(screen.queryByText("Loading your tickets…")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("fills the amount paid and buyer name from the single-order fetch", async () => {
    const user = userEvent.setup();
    const listed = demoCompletedTicketOrder({
      event: printableEvent,
      orderId: "1474-023249-8851",
      total: undefined,
      firstName: undefined,
      lastName: undefined,
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({
      data: { ...listed, total: "452.2", firstName: "jaime", lastName: "convery" },
    } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    const detailsButtons = await screen.findAllByRole("button", {
      name: "Details",
    });
    await user.click(detailsButtons[0]);

    expect(mockedGetOrder).toHaveBeenCalledWith("1474-023249-8851");
    expect(await screen.findByText("$452.20")).toBeInTheDocument();
    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    expect(within(modal!).getByText("Jaime Convery")).toBeInTheDocument();
  });

  it("keeps the listed order details when the order fetch fails", async () => {
    const user = userEvent.setup();
    const listed = demoCompletedTicketOrder({
      event: printableEvent,
      orderId: "1474-023249-8851",
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockRejectedValue(new Error("offline"));

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    const detailsButtons = await screen.findAllByRole("button", {
      name: "Details",
    });
    await user.click(detailsButtons[0]);

    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    const details = within(modal!);
    expect(details.getByText("1474-023249-8851")).toBeInTheDocument();
  });

  it("prints with category and org branding from the single-order fetch", async () => {
    const user = userEvent.setup();
    const listed = demoCompletedTicketOrder({
      event: {
        uuid: printableEvent.uuid,
        name: printableEvent.name,
        venue: printableEvent.venue,
      },
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({
      data: {
        ...listed,
        event: {
          ...printableEvent,
          category: { name: "sports" },
        },
      },
    } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    await waitFor(() => {
      expect(mockedGetOrder).toHaveBeenCalledWith(listed.orderId);
    });

    await user.click(
      (await screen.findAllByRole("button", { name: "Print PDF" }))[0],
    );

    expect(pdfMocks.printTicketsPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          category: { name: "sports" },
          organization: expect.objectContaining({
            branding: expect.objectContaining({
              primaryColor: printableEvent.organization.branding?.primaryColor,
            }),
          }),
        }),
      }),
    );
  });

  it("prints one ticket in a new PDF and downloads all tickets together", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: printableEvent });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    const oneTicketButtons = await screen.findAllByRole("button", {
      name: "Print PDF",
    });
    await user.click(oneTicketButtons[0]);

    expect(pdfMocks.printTicketsPdf).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: order.event,
        mode: "open",
        tickets: [
          expect.objectContaining({
            id: order.tickets[0].id,
            checkInCode: order.tickets[0].checkInCode,
          }),
        ],
      }),
    );

    await user.click(screen.getByRole("button", { name: "Print all" }));

    expect(pdfMocks.printTicketsPdf).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: order.event,
        mode: "download",
        tickets: expect.arrayContaining(
          order.tickets.map((ticket) =>
            expect.objectContaining({
              id: ticket.id,
              checkInCode: ticket.checkInCode,
            }),
          ),
        ),
      }),
    );
  });

  it("shows an error when a ticket PDF cannot be prepared", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: printableEvent });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    pdfMocks.printTicketsPdf.mockRejectedValueOnce(new Error("PDF failed"));

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Print PDF" }))[0],
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t prepare your ticket PDF. Please try again.",
    );
  });

  it("transfers the selected single ticket with the legacy API payload", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${ticket.seatNumber}` }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(
      screen.getAllByRole("button", { name: "Transfer" }).at(-1)!,
    );

    expect(
      await screen.findByText("Your ticket has been transferred"),
    ).toBeInTheDocument();
    expect(mockedCreateTicketTransfer).toHaveBeenCalledWith({
      email: "recipient@example.com",
      orderId: order.id,
      event: order.event,
      ticketIds: [ticket.id],
      eventUUID: icedogs.uuid,
    });
  });

  it("does not transfer a single ticket back to its owner", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${ticket.seatNumber}` }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      DEMO_SESSION.user.email,
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("You cannot transfer tickets to yourself.");
    expect(mockedCreateTicketTransfer).not.toHaveBeenCalled();
  });

  it("does not show or retain an email error when entering the recipient step", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${ticket.seatNumber}` }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.queryByText("Email address is required."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "invalid@",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Email is invalid. Please try again.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.queryByText("Email is invalid. Please try again."),
    ).not.toBeInTheDocument();
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
      expect.stringMatching(`/wallet/my-tickets/order/${flexOrderId}/flex-pack/${pack.uuid}`),
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
      expect.stringMatching(/^\/wallet\/my-tickets\/?$/),
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

describe("SeasonTickets pass wallet", () => {
  const pass = demoAccessPass();

  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({ data: { data: pass } } as never);
    mockedDownloadApplePass.mockReset();
    navigationMocks.pathname = `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:pass"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "userAgent");
  });

  async function openQrPopup() {
    const user = userEvent.setup();
    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: `Show QR code for ${pass.name}` }),
    );
    return user;
  }

  it("adds the pass to the phone wallet from the QR popup", async () => {
    mockedDownloadApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);

    const user = await openQrPopup();
    await user.click(screen.getByRole("button", { name: "Add to Apple Wallet" }));

    expect(mockedDownloadApplePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: pass.events[0].uuid }),
      obj: expect.objectContaining({
        checkInCode: pass.checkInCode,
        accessPass: true,
      }),
    });
  });

  it("explains when the pass cannot be added to the phone wallet", async () => {
    mockedDownloadApplePass.mockRejectedValue(new Error("500"));

    const user = await openQrPopup();
    await user.click(screen.getByRole("button", { name: "Add to Apple Wallet" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Apple Wallet/i,
    );
  });
});

describe("SeasonTickets ticket screen responsive layout", () => {
  function setWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
  }

  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({
      data: [demoCompletedTicketOrder({ event: icedogs })],
    } as never);
    navigationMocks.pathname = `/wallet/my-tickets/order/${ticketOrderId}/`;
    setWidth(390);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    setWidth(1440);
  });

  it("keeps the desktop ticket screen in a narrow desktop window", async () => {
    render(<SeasonTickets />);

    expect(
      await screen.findByRole("link", { name: /All tickets/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View QR-Code" }),
    ).not.toBeInTheDocument();
  });

  it("shows the swipeable ticket cards on a phone", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });

    render(<SeasonTickets />);

    expect(
      (await screen.findAllByRole("button", { name: "View QR-Code" })).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", { name: /All tickets/i }),
    ).not.toBeInTheDocument();
  });
});

describe("SeasonTickets mobile ticket actions", () => {
  const order = demoCompletedTicketOrder({ event: icedogs });
  const ticket = order.tickets[0];

  function stubPhone(userAgent: string) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: userAgent,
    });
  }

  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedDownloadApplePass.mockReset();
    mockedDownloadGooglePass.mockReset();
    mockedDownloadApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);
    mockedDownloadGooglePass.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/ticket-1" },
    } as never);
    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    stubPhone("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:pass"),
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    Reflect.deleteProperty(navigator, "userAgent");
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  it("shows the entry gate on the mobile ticket card", async () => {
    render(<SeasonTickets />);

    expect(
      (
        await screen.findAllByText(
          `Enter at ${icedogs.entryGate} · ${icedogs.venue.name}`,
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it("hides the entry line when the event has no gate", async () => {
    const event = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const orderWithoutGate = demoCompletedTicketOrder({ event });
    mockedGetMyEvents.mockResolvedValue({ data: [orderWithoutGate] } as never);
    navigationMocks.pathname = `/wallet/my-tickets/order/${orderWithoutGate.orderId}/`;

    render(<SeasonTickets />);

    expect(
      (await screen.findAllByRole("button", { name: "View QR-Code" })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/Enter at/i)).not.toBeInTheDocument();
  });

  it("opens a QR-only sheet from View QR-Code", async () => {
    const user = userEvent.setup();
    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "View QR-Code" }))[0],
    );

    expect(
      screen.getByRole("heading", { name: "Scan at entrance" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ticket details" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Holder")).not.toBeInTheDocument();
  });

  it("opens details without a QR from Ticket details", async () => {
    const user = userEvent.setup();
    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Ticket details" }))[0],
    );

    expect(
      screen.getByRole("heading", { name: "Ticket details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Holder")).toBeInTheDocument();
    expect(screen.getByText(ticket.checkInCode)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Scan at entrance" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();
  });

  it("adds the ticket to Apple Wallet on iPhone", async () => {
    const user = userEvent.setup();
    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Add to Apple Wallet" }))[0],
    );

    expect(mockedDownloadApplePass).toHaveBeenCalledWith({
      event: expect.objectContaining({ uuid: icedogs.uuid }),
      obj: expect.objectContaining({ checkInCode: ticket.checkInCode }),
    });
  });

  it("offers Google Wallet on Android", async () => {
    stubPhone("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    const user = userEvent.setup();
    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Add to Google Wallet" }))[0],
    );

    await waitFor(() => {
      expect(mockedDownloadGooglePass).toHaveBeenCalledWith(
        expect.objectContaining({
          event: icedogs.uuid,
          ticket: expect.objectContaining({ checkInCode: ticket.checkInCode }),
          obj: expect.objectContaining({ checkInCode: ticket.checkInCode }),
        }),
      );
    });
  });
});
