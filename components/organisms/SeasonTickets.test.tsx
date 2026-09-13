import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SESSION,
  DEMO_USER,
  demoAccessPass,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCheckoutCart,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoPackageAccessPass,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { googleMapsDirectionsUrl } from "@/lib/venueLocation";
import { formatEventWhen } from "@/lib/helpers";
import { seatLabel } from "@/lib/wallet";
import {
  transferCancelReturnCopy,
  transferRecipientDescriptor,
  transferRecipientNotifyCopy,
  transferRecipientReceivedCopy,
  transferWalletRemovalCopy,
} from "@/lib/transferModalCopy";

const sessionMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: () => sessionMocks.getSession(),
}));

vi.mock("@/lib/api", () => ({
  acceptIncomingTransfers: vi.fn(),
  cancelMyTransfers: vi.fn(),
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
  getMySentTransfers: vi.fn(),
  getIncomingTransfers: vi.fn(),
  getMyReceivedTransfers: vi.fn(),
  getOrder: vi.fn(),
  validateEmail: vi.fn(async () => ({ data: { verdict: "Valid" } })),
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

import SeasonTickets, {
  clearJerseyPanelFillCacheForTests,
} from "@/components/organisms/SeasonTickets";
import { FIELD_COPY } from "@/lib/fieldValidation";
import { CANCEL_TRANSFER_API_ERROR_MESSAGES } from "@/lib/cancelTransferErrors";
import {
  TICKET_TRANSFER_API_ERROR_MESSAGES,
  ticketTransferAssignedCopy,
  ticketTransferScannedCopy,
} from "@/lib/ticketTransferErrors";
import {
  acceptIncomingTransfers,
  cancelMyTransfers,
  createTicketTransfer,
  downloadApplePass,
  downloadGooglePass,
  getAccessPassesByOrder,
  getMyAccessPass,
  getMyAccessPasses,
  getMyEvents,
  getMySentTransfers,
  getIncomingTransfers,
  getMyReceivedTransfers,
  getOrder,
  validateEmail,
} from "@/lib/api";
import {
  beginWalletNavigation,
  clearWalletNavigation,
} from "@/lib/walletTransition";

const mockedAcceptIncomingTransfers = vi.mocked(acceptIncomingTransfers);
const mockedCancelMyTransfers = vi.mocked(cancelMyTransfers);
const mockedDownloadApplePass = vi.mocked(downloadApplePass);
const mockedDownloadGooglePass = vi.mocked(downloadGooglePass);
const mockedCreateTicketTransfer = vi.mocked(createTicketTransfer);
const mockedGetAccessPassesByOrder = vi.mocked(getAccessPassesByOrder);
const mockedGetMyAccessPass = vi.mocked(getMyAccessPass);
const mockedGetMyAccessPasses = vi.mocked(getMyAccessPasses);
const mockedGetMyEvents = vi.mocked(getMyEvents);
const mockedGetMySentTransfers = vi.mocked(getMySentTransfers);
const mockedGetIncomingTransfers = vi.mocked(getIncomingTransfers);
const mockedGetMyReceivedTransfers = vi.mocked(getMyReceivedTransfers);
const mockedGetOrder = vi.mocked(getOrder);
const mockedValidateEmail = vi.mocked(validateEmail);
const printableEvent = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
const icedogs = printableEvent;
const pkg = demoSeasonPackage();
const ticketOrderId = String(demoCompletedTicketOrder().orderId);
const packageOrderId = String(demoCompletedPackageOrder().orderId);
const flexOrderId = String(demoCompletedFlexPackOrder().orderId);

beforeEach(() => {
  navigationMocks.pathname = "/wallet/my-tickets/";
  navigationMocks.search = "";
  clearJerseyPanelFillCacheForTests();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new Error("fetch unavailable in test")),
  );
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
  mockedAcceptIncomingTransfers.mockReset();
  mockedAcceptIncomingTransfers.mockResolvedValue({ data: { status: "claimed" } } as never);
  mockedCancelMyTransfers.mockReset();
  mockedCancelMyTransfers.mockResolvedValue({ data: { status: "cancelled" } } as never);
  mockedGetMySentTransfers.mockReset();
  mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
  mockedGetIncomingTransfers.mockReset();
  mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
  mockedGetMyReceivedTransfers.mockReset();
  mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
  mockedGetOrder.mockReset();
  mockedGetOrder.mockResolvedValue({ data: null } as never);
  pdfMocks.printTicketsPdf.mockReset();
  pdfMocks.printTicketsPdf.mockResolvedValue(undefined);
});

afterEach(() => {
  clearWalletNavigation();
  vi.unstubAllGlobals();
});

describe("SeasonTickets empty wallet", () => {
  it("shows pending received transfers in upcoming events", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(screen.getByText(seatLabel(ticket))).toBeInTheDocument();
    expect(screen.queryByText(/1 ticket from/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No upcoming tickets yet")).not.toBeInTheDocument();
  });

  it("hides cancelled incoming transfers from upcoming events", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-cancelled",
          status: "cancelled",
          fromUserEmail: "jaimeconvery@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText("No upcoming tickets yet")).toBeInTheDocument();
    expect(screen.queryByText("Accept transfer")).not.toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
  });

  it("shows pending package event transfers in upcoming events", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-package-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: activeEvent,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(activeEvent.name)).toBeInTheDocument();
    expect(
      screen.getByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No upcoming tickets yet")).not.toBeInTheDocument();
  });

  it("does not show seat lines on upcoming cards with pending sent transfers", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [transferredTicket, remainingTicket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({
      data: [{ ...order, tickets: [remainingTicket] }],
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-1",
          status: "pending",
          orderId: order.orderId,
          event: order.event,
          tickets: [transferredTicket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(screen.queryByText(/Sec .+ · Row .+ · Seat/i)).not.toBeInTheDocument();
  });

  it("uses a compact pending-transfer layout on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
  });

  it("does not open pending incoming transfers from upcoming events", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByText(icedogs.name));

    expect(screen.getByText("My tickets")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "All tickets" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
  });

  it("accepts a pending incoming transfer from upcoming events", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-1",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-1",
      });
    });
  });

  it("finishes loading and shows No upcoming tickets yet when there are no tickets, transfers, or listings", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({ data: { data: [] } } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText("No upcoming tickets yet")).toBeInTheDocument();
    expect(
      screen.getByText(/tickets you buy or receive will show up here/i),
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

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
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
      await screen.findByRole("tab", { name: "Season pass" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByText(`${DEMO_USER.firstName} ${DEMO_USER.lastName.charAt(0)}.`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Show the QR code straight from your phone to scan at entry for any included event, or add the pass to your Apple/Google wallet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Show QR code for ${pass.name}` }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${pass.name}` }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(pkg.events[1].name)).not.toBeInTheDocument();
    expect(mockedGetAccessPassesByOrder).toHaveBeenCalledWith(order.orderId);

    await user.click(screen.getByRole("tab", { name: /Game tickets/i }));

    expect(screen.getByText(pkg.events[1].name)).toBeInTheDocument();
  });

  it("names the season pass from the fetched order the wallet list leaves out", async () => {
    const listed = demoCompletedPackageOrder({ firstName: "", lastName: "" });
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({
      data: [demoCompletedPackageOrder()],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [demoPackageAccessPass()] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText(
        `${DEMO_USER.firstName} ${DEMO_USER.lastName.charAt(0)}.`,
      ),
    ).toBeInTheDocument();
    expect(mockedGetOrder).toHaveBeenCalledWith(packageOrderId);
    expect(
      screen.queryByText(DEMO_USER.email.split("@")[0]),
    ).not.toBeInTheDocument();
  });

  it("names the season pass from the pass holder when the order has no name", async () => {
    const order = demoCompletedPackageOrder({ firstName: "", lastName: "" });
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [demoPackageAccessPass()] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText(DEMO_USER.email.split("@")[0]),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        `${DEMO_USER.firstName} ${DEMO_USER.lastName.charAt(0)}.`,
      ),
    ).not.toBeInTheDocument();
  });

  it("leaves the holder line off when neither the order nor the pass has a name", async () => {
    const order = demoCompletedPackageOrder({ firstName: "", lastName: "" });
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [demoPackageAccessPass({ email: "" })] },
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText("Games included")).toBeInTheDocument();
    expect(
      screen.queryByText(DEMO_USER.email.split("@")[0]),
    ).not.toBeInTheDocument();
  });

  it("shows the season-pass QR and wallet add on a phone", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
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
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      writable: true,
      value: 5,
    });
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedDownloadApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("img", { name: `QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tap the QR code to scan at entry for any included event or add this pass to your Apple/Google wallet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Show the QR code straight from your phone/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${pass.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Apple Wallet" }),
    ).not.toBeInTheDocument();

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

    await user.click(
      screen.getByRole("button", { name: "Add to Apple Wallet" }),
    );
    expect(mockedDownloadApplePass).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ uuid: pkg.events[0].uuid }),
        obj: expect.objectContaining({
          checkInCode: pass.checkInCode,
          accessPass: true,
        }),
      }),
    );

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
    Reflect.deleteProperty(navigator, "userAgent");
    Reflect.deleteProperty(navigator, "maxTouchPoints");
    Reflect.deleteProperty(window, "matchMedia");
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

    expect(
      await screen.findByText(activeEvent.name),
    ).toBeInTheDocument();
    expect(screen.getByText(pastEvent.name)).toBeInTheDocument();
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

  it("lists a package event the order has no tickets for", async () => {
    const order = demoCompletedPackageOrder();
    const [, ticketedEvent, ticketlessEvent] = pkg.events;
    const events = [
      { ...ticketedEvent, start: "2099-09-12T23:00:00.000Z" },
      { ...ticketlessEvent, start: "2099-09-19T23:00:00.000Z" },
    ];
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...order.package, events },
          tickets: order.tickets.map((ticket) => ({
            ...ticket,
            eventUUID: ticketedEvent.uuid,
          })),
        }),
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(ticketlessEvent.name)).toBeInTheDocument();
    expect(screen.getByText("Transferred")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${ticketlessEvent.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${ticketedEvent.name}` }),
    ).toBeInTheDocument();
  });

  it("leaves played games out of the game ticket count", async () => {
    const order = demoCompletedPackageOrder();
    const events = [
      { ...pkg.events[0], start: "2020-08-15T23:00:00.000Z", status: "complete" },
      { ...pkg.events[1], start: "2099-09-12T23:00:00.000Z" },
      { ...pkg.events[2], start: "2099-09-19T23:00:00.000Z" },
    ];
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...order.package, events },
          tickets: events.flatMap((event) =>
            order.tickets.map((ticket) => ({
              ...ticket,
              id: `${ticket.id}-${event.uuid}`,
              eventUUID: event.uuid,
            })),
          ),
        }),
      ],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [demoPackageAccessPass()] },
    } as never);

    render(<SeasonTickets />);

    // Six tickets across three games, two of them on the game already played.
    expect(
      await screen.findByRole("tab", { name: "Game tickets (4)" }),
    ).toBeInTheDocument();
  });

  it("looks up package passes with the routed order id", async () => {
    const { orderId, ...orderWithoutOrderId } = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${orderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [orderWithoutOrderId],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("tab", { name: "Season pass" }),
    ).toBeInTheDocument();
    expect(mockedGetAccessPassesByOrder).toHaveBeenCalledWith(orderId);
  });

  it("keeps package passes that resolve after the sent transfer lookup", async () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMySentTransfers.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ data: { data: [] } }), 50);
        }) as never,
    );

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("tab", { name: "Season pass" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`${DEMO_USER.firstName} ${DEMO_USER.lastName.charAt(0)}.`),
    ).toBeInTheDocument();
  });

  it("retries the package pass lookup after a failed request", async () => {
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ data: { data: [pass] } } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(pkg.events[1].name)).toBeInTheDocument();
    expect(
      await screen.findByRole("tab", { name: "Season pass" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(mockedGetAccessPassesByOrder).toHaveBeenCalledTimes(2);
  });

  it("shows a revoked season pass with its status and no transfer button", async () => {
    const order = demoCompletedPackageOrder();
    const pass = { ...demoPackageAccessPass(), status: "revoked" };
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("tab", { name: "Season pass" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Revoked")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Transfer season pass/i }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByText("Enter the recipient's email address"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        transferRecipientDescriptor("season pass", {
          passName: pass.name,
          passSeat: seatLabel(pass),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientNotifyCopy("season pass")),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.queryByText(transferRecipientNotifyCopy("season pass")),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(transferWalletRemovalCopy("season pass")),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Season pass transfer pending"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientReceivedCopy("season pass"), {
        exact: false,
      }),
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
      "This pass is already assigned to this email address.",
    );
    expect(mockedCreateTicketTransfer).not.toHaveBeenCalled();
  });

  it("shows a season pass transfer error when included tickets were already transferred", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedCreateTicketTransfer.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            message:
              "This season pass cannot be transferred because one or more included game tickets are unavailable",
          },
        },
      },
    });

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This season pass can't be transferred because one or more included game tickets have already been transferred.",
    );
    expect(
      screen.queryByText("Season pass transfer pending"),
    ).not.toBeInTheDocument();
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

  it("shows Transferred instead of Purchased on transfer-received order detail", async () => {
    const order = demoCompletedTicketOrder({
      source: "transfer",
      orderId: "1475-191968-1399",
      event: icedogs,
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetOrder.mockResolvedValue({ data: order } as never);
    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;

    render(<SeasonTickets />);

    expect(await screen.findByText("Transferred")).toBeInTheDocument();
    expect(screen.queryByText("Purchased")).not.toBeInTheDocument();
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
    expect(
      screen.getByText(
        transferRecipientDescriptor("access pass", {
          passName: pass.name,
          passSeat: seatLabel(pass),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientNotifyCopy("access pass")),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText(transferWalletRemovalCopy("access pass")),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Access pass transfer pending"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientReceivedCopy("access pass"), {
        exact: false,
      }),
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
    mockedCreateTicketTransfer.mockRejectedValue({
      response: {
        status: 404,
        data: { error: { message: "Access pass not found" } },
      },
    });

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

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

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

describe("SeasonTickets package transfers tab", () => {
  beforeEach(() => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
  });

  it("shows season pass and access pass transfers on sent and received tabs", async () => {
    const user = userEvent.setup();
    const seasonPass = demoPackageAccessPass();
    const accessPass = demoAccessPass();
    const seasonTransfer = {
      id: "season-pass-transfer-1",
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: seasonPass.orderId,
      access_pass: { name: seasonPass.name, type: "package" },
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const accessTransfer = {
      id: "access-pass-transfer-1",
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: accessPass.orderId,
      access_pass: { name: accessPass.name, type: "organizer" },
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [seasonTransfer, accessTransfer],
    } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [seasonTransfer, accessTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    expect(await screen.findByText(seasonPass.name)).toBeInTheDocument();
    expect(screen.getByText(accessPass.name)).toBeInTheDocument();
    expect(screen.getAllByText("1 Season pass")).toHaveLength(1);
    expect(screen.getAllByText("1 Access pass")).toHaveLength(1);

    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("season pass"),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[1]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("access pass"),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    await user.click(screen.getByRole("button", { name: /received/i }));

    expect(await screen.findByText(seasonPass.name)).toBeInTheDocument();
    expect(screen.getByText(accessPass.name)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Accept transfer" }),
    ).toHaveLength(2);
  });

  it("shows single-event and package transfers on sent and received tabs", async () => {
    const user = userEvent.setup();
    const ticketOrder = demoCompletedTicketOrder({ event: icedogs });
    const packageOrder = demoCompletedPackageOrder();
    const packageEvent = pkg.events[1];
    const [singleTicket] = ticketOrder.tickets;
    const [packageTicket] = packageOrder.tickets.map((row) => ({
      ...row,
      eventUUID: packageEvent.uuid,
    }));
    const singleTransfer = {
      id: "single-transfer-1",
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: ticketOrder.orderId,
      event: ticketOrder.event,
      tickets: [singleTicket],
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const packageTransfer = {
      id: "package-transfer-1",
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: packageOrder.orderId,
      event: packageEvent,
      tickets: [packageTicket],
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    mockedGetMyEvents.mockResolvedValue({
      data: [ticketOrder, packageOrder],
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [singleTransfer, packageTransfer],
    } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [singleTransfer, packageTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(packageEvent.name)).toBeInTheDocument();
    expect(screen.getAllByText(/pending · awaiting claim/i)).toHaveLength(2);

    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("ticket", 1),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    await user.click(screen.getByRole("button", { name: /received/i }));

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(packageEvent.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        `From ${DEMO_SESSION.user.email} · received on ${formatEventWhen(
          singleTransfer.createdAt,
          ticketOrder.event?.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `From ${DEMO_SESSION.user.email} · received on ${formatEventWhen(
          packageTransfer.createdAt,
          packageEvent.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Accept transfer" }),
    ).toHaveLength(2);
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

  it("disables cancel popup buttons while cancel is in flight", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-1",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);

    let resolveCancel!: (value: unknown) => void;
    mockedCancelMyTransfers.mockReturnValue(
      new Promise((resolve) => {
        resolveCancel = resolve;
      }) as never,
    );

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("ticket", 1),
      ),
    ).toBeInTheDocument();
    const confirmCancelButton = screen
      .getAllByRole("button", { name: "Cancel transfer" })
      .at(-1)!;
    await user.click(confirmCancelButton);

    const keepButton = screen.getByRole("button", { name: "Keep it" });
    expect(keepButton).toBeDisabled();
    expect(confirmCancelButton).toBeDisabled();
    expect(confirmCancelButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Cancelling…")).toBeInTheDocument();

    await act(async () => {
      resolveCancel({ data: { status: "cancelled" } });
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Cancel this transfer?" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("says these tickets in the cancel modal when more than one ticket was sent", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const tickets = order.tickets.slice(0, 2);
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-2",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets,
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("ticket", 2),
      ),
    ).toBeInTheDocument();
  });

  it("shows Transfer has been claimed in the cancel popup when the transfer was already claimed", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-1",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);
    mockedCancelMyTransfers.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            message: CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed,
          },
        },
      },
    });

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    expect(
      screen.getByRole("heading", { name: "Cancel this transfer?" }),
    ).toBeInTheDocument();
    const confirmCancelButton = screen
      .getAllByRole("button", { name: "Cancel transfer" })
      .at(-1)!;
    await user.click(confirmCancelButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed,
    );
    expect(
      screen.getByRole("heading", { name: "Cancel this transfer?" }),
    ).toBeInTheDocument();
  });

  it("shows Transfer has been claimed when cancel returns 226", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-1",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);
    mockedCancelMyTransfers.mockResolvedValue({
      status: 226,
      data: {
        error: { message: CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed },
      },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      CANCEL_TRANSFER_API_ERROR_MESSAGES.transferClaimed,
    );
    expect(
      screen.getByRole("heading", { name: "Cancel this transfer?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Transfer cancelled")).not.toBeInTheDocument();
  });

  it("shows the network error in the cancel popup when cancel fails with a server error", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-1",
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);
    mockedCancelMyTransfers.mockRejectedValue({
      response: {
        status: 500,
        data: { error: { message: "Internal Server Error" } },
      },
    });

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      FIELD_COPY.network,
    );
  });

  it("hides cancelled received transfers on the received tab", async () => {
    const user = userEvent.setup();
    navigationMocks.pathname = "/wallet/my-transfers/";
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-cancelled",
          status: "cancelled",
          fromUserEmail: "jaimeconvery@example.com",
          event: order.event,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(await screen.findByText("Nothing received yet")).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
    expect(screen.queryByText("Accept transfer")).not.toBeInTheDocument();
  });

  it("shows claimed dates from transferedOn on sent and received tabs", async () => {
    const user = userEvent.setup();
    navigationMocks.pathname = "/wallet/my-transfers/";
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    const createdAt = "2026-09-12T19:20:19.451Z";
    const transferedOn = "2026-09-13T19:21:48.735Z";
    const claimedCopy = `Claimed · ${formatEventWhen(
      transferedOn,
      order.event?.venue?.timezone,
      "MMM D, YYYY",
    )}`;
    const sentOnCopy = formatEventWhen(
      createdAt,
      order.event?.venue?.timezone,
      "MMM D, YYYY",
    );
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "sent-claimed",
          status: "claimed",
          emailAddressToUser: "recipient@example.com",
          event: order.event,
          tickets: [ticket],
          createdAt,
          transferedOn,
        },
      ],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-claimed",
          status: "claimed",
          fromUserEmail: "jaimeconvery@hotmail.com",
          event: order.event,
          tickets: [ticket],
          createdAt,
          transferedOn,
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(claimedCopy)).toBeInTheDocument();
    expect(
      screen.getByText(`To recipient@example.com · sent ${sentOnCopy}`),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /received/i }));

    expect(await screen.findByText(claimedCopy)).toBeInTheDocument();
    expect(
      screen.getByText(
        `From jaimeconvery@hotmail.com · received on ${sentOnCopy}`,
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ["/wallet/my-tickets/", "My tickets", /upcoming/i, /tickets you buy or receive will show up here/i],
    ["/wallet/my-transfers/", "Transfers", /sent/i, /no transfers sent/i],
    ["/wallet/my-listings/", "Listings", /^active$/i, /no active listings/i],
  ])("opens %s immediately and loads the list in place", async (pathname, heading, chrome, readyCopy) => {
    navigationMocks.pathname = pathname;
    mockedGetMyEvents.mockReset();
    mockedGetMyEvents.mockReturnValue(new Promise(() => {}) as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: heading, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(chrome)).toBeInTheDocument();
    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(screen.queryByText("Loading your tickets…")).not.toBeInTheDocument();
    expect(screen.queryByText(readyCopy)).not.toBeInTheDocument();

    const listPills: Record<string, { role: "button" | "tab"; labels: string[] }> = {
      "/wallet/my-tickets/": {
        role: "button",
        labels: ["Upcoming", "Packages", "Flex packs", "Access passes"],
      },
      "/wallet/my-transfers/": {
        role: "button",
        labels: ["Sent", "Received"],
      },
      "/wallet/my-listings/": {
        role: "tab",
        labels: ["Active", "Sold", "Expired"],
      },
    };
    const pills = listPills[pathname];
    for (const label of pills.labels) {
      expect(screen.getByRole(pills.role, { name: label })).toHaveAccessibleName(label);
    }
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
    expect(screen.getByText(DEMO_SESSION.user.email)).toBeInTheDocument();
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

  it("shows the blocks loader immediately while an in-wallet route is committing", async () => {
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    act(() => {
      beginWalletNavigation(`/wallet/my-tickets/order/${ticketOrderId}/`);
    });

    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
  });

  it("filters listings by Active, Sold, and Expired", async () => {
    navigationMocks.pathname = "/wallet/my-listings/";
    const user = userEvent.setup();

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: "Listings", level: 1 }),
    ).toBeInTheDocument();
    expect(await screen.findByText("No active listings")).toBeInTheDocument();
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
    expect(mockedGetMyEvents.mock.calls.length).toBeLessThanOrEqual(2);
  });
});

describe("SeasonTickets routed event screen", { timeout: 20_000 }, () => {
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

  it("shows GA chips without a Seat label in the transfer picker", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [
        {
          id: 9101,
          uuid: "ticket-ga-1",
          checkInCode: "GA-1",
          eventUUID: icedogs.uuid,
          generalAdmission: true,
          sectionName: "General Admission",
          sectionNumber: "Club",
          offerName: "General admission",
        },
        {
          id: 9102,
          uuid: "ticket-ga-2",
          checkInCode: "GA-2",
          eventUUID: icedogs.uuid,
          generalAdmission: true,
          sectionName: "General Admission",
          sectionNumber: "Club",
          offerName: "General admission",
        },
      ],
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    expect(await screen.findAllByText("Sec Club")).toHaveLength(2);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));

    expect(screen.getAllByText("Sec Club").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "GA" })).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: /Seat general admission/i }),
    ).not.toBeInTheDocument();
  });

  it("shows GA in the transfer chip when the ticket has no seat", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [
        {
          id: 9202,
          uuid: "ticket-ga-transfer",
          checkInCode: "GA-TRANSFER",
          eventUUID: icedogs.uuid,
          sectionName: "General Admission",
          sectionNumber: "ga",
          offerName: "General admission",
        },
      ],
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));

    expect(screen.getByText("Select tickets to transfer")).toBeInTheDocument();
    expect(
      within(screen.getByText("Select tickets to transfer").parentElement!).getByText("Sec ga"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GA" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "GA" })).getByText("GA"),
    ).toBeInTheDocument();
  });

  it("lists seats in ascending order when the API returns them reversed", async () => {
    const user = userEvent.setup();
    const [first, second] = demoCheckoutCart({ ticketCount: 2 }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [second, first],
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    const seatLines = await screen.findAllByText(/Sec .+ · Row .+ · Seat /);
    expect(seatLines[0]).toHaveTextContent(
      `Sec ${first.sectionNumber} · Row ${first.rowNumber} · Seat ${first.seatNumber}`,
    );
    expect(seatLines[1]).toHaveTextContent(
      `Sec ${second.sectionNumber} · Row ${second.rowNumber} · Seat ${second.seatNumber}`,
    );

    await user.click(screen.getByRole("button", { name: "Transfer" }));
    const seatButtons = screen.getAllByRole("button", { name: /^Seat / });
    expect(seatButtons[0]).toHaveAccessibleName(`Seat ${first.seatNumber}`);
    expect(seatButtons[1]).toHaveAccessibleName(`Seat ${second.seatNumber}`);
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

  it("holds the event page until panel fills are sampled for split heroes", async () => {
    const releasePanels: Array<() => void> = [];
    const splitHeroEvent =
      DEMO_EVENTS.find((event) => event.shortCode === "BUCS002")!;
    const order = demoCompletedTicketOrder({ event: splitHeroEvent });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (!url.includes("/api/dominant-color/")) {
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }
      return new Promise((resolve) => {
        releasePanels.push(() =>
          resolve({
            ok: true,
            json: async () => ({ color: "#bf0c26" }),
          } as Response),
        );
      });
    });

    render(
      <SeasonTickets
        initialScreen="event"
        eventUUID={splitHeroEvent.uuid}
      />,
    );

    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /All tickets/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: splitHeroEvent.name }),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(releasePanels.length).toBeGreaterThanOrEqual(2));
    releasePanels.forEach((release) => release());

    expect(
      await screen.findByRole("heading", { name: splitHeroEvent.name }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /All tickets/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
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

    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /All tickets/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Total paid")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();

    releaseOrder({
      data: { ...listed, total: "452.2", firstName: "jaime", lastName: "convery" },
    });

    expect(await screen.findByText("$452.20")).toBeInTheDocument();
    expect(screen.getByText("Total paid")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /All tickets/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
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

    expect(
      await screen.findByText(
        /Show the QR code straight from your phone to scan at entry, or add each ticket to your Apple\/Google wallet ahead of time/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Add each seat to Apple\/Google Wallet on game day/),
    ).not.toBeInTheDocument();

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

  it("links Get directions to Google Maps for the event venue", async () => {
    const order = demoCompletedTicketOrder({ event: printableEvent });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    expect(
      await screen.findByRole("link", { name: "Get directions" }),
    ).toHaveAttribute(
      "href",
      googleMapsDirectionsUrl(printableEvent.venue.address),
    );
  });

  it("hides Get directions when the event has no venue to map", async () => {
    const order = demoCompletedTicketOrder({
      event: {
        uuid: printableEvent.uuid,
        name: printableEvent.name,
        venue: {},
      },
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    expect(await screen.findByText("Getting there")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Get directions" }),
    ).not.toBeInTheDocument();
  });

  it("shows a spinner and Preparing… on Print PDF while the PDF is in flight", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: printableEvent });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    let finishPrint: (() => void) | undefined;
    pdfMocks.printTicketsPdf.mockReturnValue(
      new Promise<void>((resolve) => {
        finishPrint = resolve;
      }),
    );

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Print PDF" }))[0],
    );

    const printing = await screen.findByRole("button", { name: /Preparing/ });
    expect(printing).toBeDisabled();
    expect(printing).toHaveAttribute("aria-busy", "true");
    expect(
      within(printing).getByRole("status", { name: "Loading" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print all" })).toBeDisabled();

    finishPrint?.();

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Print PDF" })[0]).toBeEnabled();
    });
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
    expect(
      screen.getByText(/person receiving this ticket/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientNotifyCopy("ticket", 1)),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText(transferWalletRemovalCopy("ticket", 1)),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Transfer" }).at(-1)!,
    );

    expect(
      await screen.findByText("Transfer sent"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientReceivedCopy("ticket", 1), {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pending until the recipient claims it/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("recipient@example.com")).not.toBeInTheDocument();
    expect(mockedCreateTicketTransfer).toHaveBeenCalledWith({
      email: "recipient@example.com",
      orderId: order.id,
      event: order.event,
      ticketIds: [ticket.id],
      eventUUID: icedogs.uuid,
    });
  });

  it("names multiple selected tickets as these tickets without listing seats", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    for (const ticket of order.tickets) {
      await user.click(
        screen.getByRole("button", { name: `Seat ${ticket.seatNumber}` }),
      );
    }
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByText(/person receiving these tickets/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        transferRecipientNotifyCopy("ticket", order.tickets.length),
      ),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText(
        transferWalletRemovalCopy("ticket", order.tickets.length),
      ),
    ).toBeInTheDocument();
  });

  it("uses the shared ticket transfer copy for a package game ticket", async () => {
    const user = userEvent.setup();
    const event = { ...pkg.events[1], enableTransfers: true };
    const order = demoCompletedPackageOrder({
      package: {
        ...demoSeasonPackage(),
        events: pkg.events.map((row) =>
          row.uuid === event.uuid ? event : row,
        ),
      },
    });
    const ticket = order.tickets[0];
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${event.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${ticket.seatNumber}` }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByText(/person receiving this ticket/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferRecipientNotifyCopy("ticket", 1)),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(
      screen.getByText(transferWalletRemovalCopy("ticket", 1)),
    ).toBeInTheDocument();
  });

  it("drops a transferred ticket from the event page after the wallet refresh removes it", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValueOnce({ data: [order] } as never);

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    const seatButtons = await screen.findAllByRole("button", {
      name: /^Seat \d+$/,
    });
    const seatButton = seatButtons[0]!;
    const seatNo = String(seatButton.getAttribute("aria-label") || "").replace(
      /^Seat\s*/,
      "",
    );
    const ticket =
      order.tickets.find((row) => String(row.seatNumber) === seatNo) ??
      order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({
      data: [
        {
          ...order,
          tickets: order.tickets.filter((row) => row.id !== ticket.id),
        },
      ],
    } as never);
    await user.click(seatButton);
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
      await screen.findByText("Transfer sent"),
    ).toBeInTheDocument();
    expect(screen.queryByText(seatLabel(ticket))).not.toBeInTheDocument();
  });

  it("does not show transfer success when the API fails", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockRejectedValue(new Error("transfer failed"));

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
      await screen.findByRole("alert"),
    ).toHaveTextContent(FIELD_COPY.network);
    expect(
      screen.queryByText("Transfer sent"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("You are about to transfer 1 ticket"),
    ).toBeInTheDocument();
  });

  it("shows scanned copy when ticket transfer is rejected because tickets were scanned", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockRejectedValue({
      response: {
        status: 402,
        data: {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyScanned,
          },
        },
      },
    });

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

    expect(await screen.findByRole("alert")).toHaveTextContent(
      ticketTransferScannedCopy(1),
    );
    expect(screen.queryByText("Transfer sent")).not.toBeInTheDocument();
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
    ).toHaveTextContent(ticketTransferAssignedCopy(1));
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(mockedCreateTicketTransfer).not.toHaveBeenCalled();
  });

  it("does not submit the email step when returning to ticket selection and clicking Next again", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedValidateEmail.mockClear();

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
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByText("Enter the recipient's email address"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("You are about to transfer 1 ticket"),
    ).not.toBeInTheDocument();
    expect(mockedValidateEmail).not.toHaveBeenCalled();
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

    expect(await screen.findByText("Order not found")).toBeInTheDocument();
    expect(
      screen.getByText("This event isn't in your wallet. Go back to see all of your tickets."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: icedogs.name })).not.toBeInTheDocument();
  });

  it("does not refetch wallet orders when going back to the list", async () => {
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    const { rerender } = render(<SeasonTickets eventUUID={icedogs.uuid} />);

    expect(await screen.findByRole("heading", { name: icedogs.name })).toBeInTheDocument();
    const callsAfterLoad = mockedGetMyEvents.mock.calls.length;

    rerender(<SeasonTickets />);

    expect(await screen.findByRole("link", { name: new RegExp(icedogs.name) })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: icedogs.name })).not.toBeInTheDocument();
    expect(mockedGetMyEvents.mock.calls.length).toBe(callsAfterLoad);
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

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
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

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

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

  it("pins Transfer in a mobile sticky footer on phone", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(<SeasonTickets />);

    const footer = await screen.findByTestId("wallet-event-actions-footer");
    expect(
      within(footer).getByRole("button", { name: "Transfer" }),
    ).toBeInTheDocument();

    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("hides Transfer and shows Sell based on event wallet flags", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedTicketOrder({
          event: {
            ...icedogs,
            enableTransfers: false,
            enableResale: true,
          },
        }),
      ],
    } as never);

    render(<SeasonTickets />);

    const footer = await screen.findByTestId("wallet-event-actions-footer");
    expect(
      within(footer).queryByRole("button", { name: "Transfer" }),
    ).not.toBeInTheDocument();
    expect(
      within(footer).getByRole("link", { name: "Sell" }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/wallet\/my-listings\/?$/));

    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("shows the swipeable ticket cards on a phone", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(<SeasonTickets />);

    expect(
      (await screen.findAllByRole("button", { name: "View QR-Code" })).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", { name: /All tickets/i }),
    ).not.toBeInTheDocument();

    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("shows GA section values without a duplicate Sec prefix on phone", async () => {
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedTicketOrder({
          event: icedogs,
          tickets: [
            {
              id: 9201,
              uuid: "ticket-ga-mobile",
              checkInCode: "GA-MOBILE",
              eventUUID: icedogs.uuid,
              generalAdmission: true,
              sectionName: "General Admission",
              sectionNumber: "ga",
              offerName: "General admission",
            },
          ],
        }),
      ],
    } as never);

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(<SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />);

    expect(await screen.findByText("ga")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("Sec ga")).not.toBeInTheDocument();

    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("keeps the stacked ticket screen on a tablet", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
    });

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("link", { name: /All tickets/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View QR-Code" }),
    ).not.toBeInTheDocument();

    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("keeps the stacked ticket screen at iPad Air width even with a phone UA", async () => {
    setWidth(820);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) =>
        ({ matches: query === "(pointer: coarse)" }) as MediaQueryList,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      writable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("link", { name: /All tickets/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View QR-Code" }),
    ).not.toBeInTheDocument();

    Reflect.deleteProperty(navigator, "userAgent");
  });
});

describe("SeasonTickets mobile ticket actions", () => {
  const order = demoCompletedTicketOrder({ event: icedogs });
  const ticket = order.tickets[0];

  const ANDROID_PHONE_UA =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";

  function stubPhone(userAgent: string, maxTouchPoints = 0) {
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
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      writable: true,
      value: maxTouchPoints,
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
    Reflect.deleteProperty(navigator, "maxTouchPoints");
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
    stubPhone(ANDROID_PHONE_UA);
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

  it("does not offer Apple or Google Wallet on iPad", async () => {
    stubPhone("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    render(<SeasonTickets />);

    expect(
      await screen.findByRole("link", { name: /All tickets/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add to (Apple|Google) Wallet/ }),
    ).not.toBeInTheDocument();
  });
});
