import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SEATED_TICKET_GROUPS,
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
import moment from "moment-timezone";
import { googleMapsDirectionsUrl } from "@/lib/venueLocation";
import { formatEventWhen } from "@/lib/helpers";
import { buildAccessPassSummaries, eventWhenLabel, seatLabel } from "@/lib/wallet";
import { ACCEPT_TRANSFER_API_ERROR_MESSAGES } from "@/lib/acceptTransferErrors";
import {
  transferAcceptConfirmCopy,
  transferCancelReturnCopy,
  transferRecipientDescriptor,
  transferRecipientNotifyCopy,
  transferRecipientReceivedCopy,
  transferSuccessTitle,
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
  invalidateMyEventsCache: vi.fn(),
  getMySentTransfers: vi.fn(),
  getIncomingTransfers: vi.fn(),
  getMyReceivedTransfers: vi.fn(),
  getMyListings: vi.fn(),
  getOrder: vi.fn(),
  searchEvents: vi.fn(async () => ({ data: [] })),
  validateEmail: vi.fn(async () => ({ data: { verdict: "Valid" } })),
}));

const pdfMocks = vi.hoisted(() => ({
  printTicketsPdf: vi.fn(),
}));

vi.mock("@/lib/ticketPdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ticketPdf")>();
  return {
    ...actual,
    printTicketsPdf: pdfMocks.printTicketsPdf,
  };
});

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
  resetWalletApiHydrationForTests,
} from "@/components/organisms/SeasonTickets";
import {
  clearLocallyResolvedIncomingTransfersForTests,
  formatAccessPassRemainingLine,
} from "@/lib/ticketTransfers";
import { FIELD_COPY } from "@/lib/fieldValidation";
import { CANCEL_TRANSFER_API_ERROR_MESSAGES } from "@/lib/cancelTransferErrors";
import {
  PASS_TRANSFER_API_ERROR_MESSAGES,
  PASS_TRANSFER_DISPLAY_COPY,
} from "@/lib/passTransferErrors";
import {
  TICKET_TRANSFER_API_ERROR_MESSAGES,
  TICKET_TRANSFER_DISPLAY_COPY,
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
  getMyListings,
  getOrder,
  validateEmail,
} from "@/lib/api";
import {
  beginWalletNavigation,
  clearWalletNavigation,
} from "@/lib/walletTransition";
import { clearPersistedCancelRestoresForTests } from "@/lib/walletCancelPersistence";

const mockedAcceptIncomingTransfers = vi.mocked(acceptIncomingTransfers);
const mockedCancelMyTransfers = vi.mocked(cancelMyTransfers);
const mockedDownloadApplePass = vi.mocked(downloadApplePass);
const mockedDownloadGooglePass = vi.mocked(downloadGooglePass);
function looseApiMock<T>(fn: T) {
  return fn as unknown as Mock<(...args: never[]) => Promise<{ data: unknown }>>;
}

const mockedCreateTicketTransfer = looseApiMock(vi.mocked(createTicketTransfer));
const mockedGetAccessPassesByOrder = vi.mocked(getAccessPassesByOrder);
const mockedGetMyAccessPass = looseApiMock(vi.mocked(getMyAccessPass));
const mockedGetMyAccessPasses = looseApiMock(vi.mocked(getMyAccessPasses));
const mockedGetMyEvents = looseApiMock(vi.mocked(getMyEvents));
const mockedGetMySentTransfers = looseApiMock(vi.mocked(getMySentTransfers));
const mockedGetIncomingTransfers = looseApiMock(vi.mocked(getIncomingTransfers));
const mockedGetMyReceivedTransfers = looseApiMock(vi.mocked(getMyReceivedTransfers));
const mockedGetMyListings = vi.mocked(getMyListings);
const mockedGetOrder = vi.mocked(getOrder);
const mockedValidateEmail = vi.mocked(validateEmail);
const printableEvent = DEMO_EVENTS.find((event) => event.shortCode === "NMST004")!;
const icedogs = printableEvent;
const pkg = demoSeasonPackage();
const ticketOrderId = String(demoCompletedTicketOrder().orderId);
const packageOrderId = String(demoCompletedPackageOrder().orderId);
const flexOrderId = String(demoCompletedFlexPackOrder().orderId);

type SentTransferStub = {
  id: string | number;
  status: string;
  fromUserEmail?: string;
  emailAddressToUser: string;
  orderId: string | number;
  event?: unknown;
  tickets: unknown[];
  createdAt: string;
};

function pendingSentTransferStub(input: {
  id: string | number;
  order: ReturnType<typeof demoCompletedTicketOrder>;
  ticket?: unknown;
  tickets?: unknown[];
  email?: string;
  createdAt?: string;
}): SentTransferStub {
  const tickets =
    input.tickets ??
    (input.ticket ? [input.ticket] : input.order.tickets.slice(0, 1));
  return {
    id: input.id,
    status: "pending",
    fromUserEmail: DEMO_SESSION.user.email,
    emailAddressToUser: input.email ?? "recipient@example.com",
    orderId: input.order.orderId,
    event: input.order.event,
    tickets,
    createdAt: input.createdAt ?? "2026-09-13T12:00:00.000Z",
  };
}

function mockMutableSentTransferList(initial: SentTransferStub[] = []) {
  const list = [...initial];
  mockedGetMySentTransfers.mockImplementation(async () => ({
    data: [...list],
  }));
  return {
    prepend(transfer: SentTransferStub) {
      list.unshift(transfer);
    },
    clear() {
      list.length = 0;
    },
  };
}

async function confirmAcceptTransferInPopup(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getAllByRole("button", { name: "Accept transfer" }).at(-1)!,
  );
}

  beforeEach(() => {
  navigationMocks.pathname = "/wallet/my-tickets/";
  navigationMocks.search = "";
  resetWalletApiHydrationForTests();
  clearPersistedCancelRestoresForTests();
  clearJerseyPanelFillCacheForTests();
  clearLocallyResolvedIncomingTransfersForTests();
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
  mockedGetMyListings.mockReset();
  mockedGetMyListings.mockResolvedValue({ data: [] } as never);
  mockedGetMyEvents.mockReset();
  mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
  mockedGetOrder.mockReset();
  mockedGetOrder.mockResolvedValue({ data: null } as never);
  pdfMocks.printTicketsPdf.mockReset();
  pdfMocks.printTicketsPdf.mockResolvedValue(undefined);
});

afterEach(() => {
  clearPersistedCancelRestoresForTests();
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

    expect(
      await screen.findByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(screen.getByText(seatLabel(ticket))).toBeInTheDocument();
    expect(screen.queryByText(/1 ticket from/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No upcoming tickets yet")).not.toBeInTheDocument();
  });

  it("shows GA section plus a count on the incoming transfer banner", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-ga-multi",
          status: "pending",
          fromUserEmail: "m.rivera@example.com",
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
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sec Club x 2")).toBeInTheDocument();
    expect(screen.getByText("2 tickets")).toBeInTheDocument();
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

  it("accepts pending package event transfer without refetching sent transfers or access passes", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets.map((row) => ({
      ...row,
      eventUUID: activeEvent.uuid,
    }));
    const recipientOrder = demoCompletedPackageOrder({
      orderId: "1474-package-event-accepted",
      source: "transfer",
      tickets: [ticket],
    });
    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [recipientOrder]
          : [],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [
              {
                id: "incoming-package-1",
                status: "pending",
                fromUserEmail: "m.rivera@example.com",
                event: activeEvent,
                tickets: [ticket],
              },
            ],
    }));
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted" },
    } as never);

    render(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
    const sentCallsBeforeAccept = mockedGetMySentTransfers.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-package-1",
      });
    });
    await waitFor(() => {
      expect(mockedGetMyEvents).toHaveBeenCalledWith(
        expect.objectContaining({ fresh: true }),
      );
    });
    expect(mockedGetMySentTransfers.mock.calls.length).toBe(
      sentCallsBeforeAccept,
    );
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeAccept,
    );
    expect(
      screen.queryByText("Pending transfer from m.rivera@example.com"),
    ).not.toBeInTheDocument();
  });

  it("shows pending incoming season pass transfers on the Packages tab", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const activeEvent = pkg.events[1];
    const [ticket] = order.tickets;
    const passName = "Section 101 · Row A · Seat 12";
    const packageName = "NMS Football Season Seats - Pricing Level C";
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-pass-1",
          status: "pending",
          fromUserEmail: "jaimeconvery@hotmail.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: passName,
            type: "package",
            events: pkg.events.slice(1),
            sectionNumber: pass.sectionNumber,
            rowNumber: pass.rowNumber,
            seatNumber: pass.seatNumber,
          },
          orderId: order.orderId,
          order: {
            orderId: order.orderId,
            package: { ...order.package, name: packageName },
          },
          event: activeEvent,
          tickets: [ticket],
        },
      ],
    } as never);

    render(<SeasonTickets />);

    expect(screen.queryByText("Pending transfer from jaimeconvery@hotmail.com")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /packages/i }));

    expect(
      await screen.findByText("Pending transfer from jaimeconvery@hotmail.com"),
    ).toBeInTheDocument();
    expect(screen.getByText(passName)).toBeInTheDocument();
    expect(screen.queryByText(packageName)).not.toBeInTheDocument();
    expect(screen.queryByText(activeEvent.name)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        `${pkg.events.slice(1).length} ${pkg.events.slice(1).length === 1 ? "game" : "games"}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Season tickets")).toBeInTheDocument();
    expect(screen.queryByText("1 ticket")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        `${pkg.events.length} ${pkg.events.length === 1 ? "game" : "games"}`,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText(seatLabel(ticket))).toBeInTheDocument();
  });

  it("opens an accepted season pass package with the recipient order id", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoPackageAccessPass();
    const order = demoCompletedPackageOrder();
    const recipientOrderId = "1474-incoming-pass-1-accepted";
    const pendingPassTransfer = {
      id: "incoming-pass-1",
      status: "pending",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      fromUserEmail: "sender@example.com",
      access_pass: {
        uuid: pass.uuid,
        name: pass.name,
        type: "package",
        events: pkg.events,
        sectionNumber: pass.sectionNumber,
        rowNumber: pass.rowNumber,
        seatNumber: pass.seatNumber,
      },
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        package: order.package,
      },
    };

    const recipientPackageOrder = demoCompletedPackageOrder({
      orderId: recipientOrderId,
      source: "transfer",
    });
    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [recipientPackageOrder]
          : [],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [pendingPassTransfer],
    }));
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: {
        uuid: pass.uuid,
        type: "package",
        orderId: recipientOrderId,
        order: { orderId: recipientOrderId },
        name: pass.name,
        events: pkg.events,
        sectionNumber: pass.sectionNumber,
        rowNumber: pass.rowNumber,
        seatNumber: pass.seatNumber,
        status: "active",
      },
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [{ ...pass, orderId: recipientOrderId }] },
    } as never);

    const { rerender } = render(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
    const sentCallsBeforeAccept = mockedGetMySentTransfers.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /packages/i }));
    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-pass-1",
      });
    });
    await waitFor(() => {
      expect(mockedGetMyEvents).toHaveBeenCalledWith(
        expect.objectContaining({ fresh: true }),
      );
    });
    expect(mockedGetMySentTransfers.mock.calls.length).toBe(
      sentCallsBeforeAccept,
    );
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeAccept,
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Pending transfer from sender@example.com"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(pkg.name)).toBeInTheDocument();
    const packageLink = screen.getByRole("link", { name: new RegExp(pkg.name) });
    expect(packageLink).toHaveAttribute(
      "href",
      expect.stringContaining(`/wallet/my-tickets/order/${recipientOrderId}/package/`),
    );

    await user.click(packageLink);
    navigationMocks.pathname = `/wallet/my-tickets/order/${recipientOrderId}/package/${pkg.uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    ).toBeInTheDocument();
    expect(mockedGetAccessPassesByOrder).toHaveBeenCalledWith(
      recipientOrderId,
    );
    expect(mockedGetAccessPassesByOrder).not.toHaveBeenCalledWith(
      order.orderId,
    );
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
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    const { rerender } = render(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

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

    expect(
      await screen.findByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
    await user.click(screen.getByText(icedogs.name));

    expect(screen.getByText("My tickets")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "All tickets" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Pending transfer from m.rivera@example.com"),
    ).toBeInTheDocument();
  });

  it("accepts only one ga incoming transfer when two share the same event", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const gaTicket = (id: number) => ({
      id,
      uuid: `ticket-ga-${id}`,
      checkInCode: `GA-${id}`,
      eventUUID: icedogs.uuid,
      generalAdmission: true,
      sectionName: "General Admission",
      sectionNumber: "Club",
      offerName: "General admission",
    });
    const order1 = demoCompletedTicketOrder({
      id: 1477,
      orderId: "1477-643535-0700",
      event: icedogs,
      tickets: [gaTicket(9101)],
    });
    const order2 = demoCompletedTicketOrder({
      id: 1478,
      orderId: "1478-643535-0700",
      event: icedogs,
      tickets: [gaTicket(9102)],
    });
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockImplementation(async () => {
      if (mockedAcceptIncomingTransfers.mock.calls.length === 0) {
        return {
          data: [
            {
              id: "incoming-1",
              status: "pending",
              fromUserEmail: "sender@example.com",
              orderId: order1.orderId,
              event: order1.event,
              tickets: [gaTicket(9101)],
            },
            {
              id: "incoming-2",
              status: "pending",
              fromUserEmail: "sender@example.com",
              orderId: order2.orderId,
              event: order2.event,
              tickets: [gaTicket(9102)],
            },
          ],
        } as never;
      }
      return {
        data: [
          {
            id: "incoming-2",
            status: "pending",
            fromUserEmail: "sender@example.com",
            orderId: order2.orderId,
            event: order2.event,
            tickets: [gaTicket(9102)],
          },
        ],
      } as never;
    });
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted" },
    } as never);

    render(<SeasonTickets />);

    const acceptButtons = await screen.findAllByRole("button", {
      name: "Accept transfer",
    });
    expect(acceptButtons).toHaveLength(2);

    await user.click(acceptButtons[0]!);
    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-1",
      });
    });
    expect(
      await screen.findAllByRole("button", { name: "Accept transfer" }),
    ).toHaveLength(1);
    expect(mockedAcceptIncomingTransfers).toHaveBeenCalledTimes(1);
  });

  it("accepts a pending incoming transfer from upcoming events", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    const recipientOrder = demoCompletedTicketOrder({
      id: 1306,
      orderId: "1306-recipient-order",
      source: "transfer",
      event: order.event,
      tickets: [ticket],
    });
    let resolveAccept: (value: { data: { status: string } }) => void = () => {};
    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [recipientOrder]
          : [],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [
              {
                id: "incoming-1",
                status: "pending",
                fromUserEmail: "m.rivera@example.com",
                event: order.event,
                tickets: [ticket],
              },
            ],
    }));
    mockedAcceptIncomingTransfers.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAccept = resolve;
        }) as never,
    );

    render(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
    const sentCallsBeforeAccept = mockedGetMySentTransfers.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;
    const incomingCallsBeforeAccept =
      mockedGetIncomingTransfers.mock.calls.length;

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(transferAcceptConfirmCopy("ticket", 1)),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Accept transfer" }).at(-1)!,
    );

    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Accepting…")).toBeInTheDocument();

    await act(async () => {
      resolveAccept({ data: { status: "accepted" } });
    });

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-1",
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Accept this transfer?" }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Accept transfer" }),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockedGetMyEvents).toHaveBeenCalledWith(
        expect.objectContaining({ fresh: true }),
      );
    });
    expect(mockedGetIncomingTransfers.mock.calls.length).toBeGreaterThan(
      incomingCallsBeforeAccept,
    );
    expect(mockedGetMySentTransfers.mock.calls.length).toBe(
      sentCallsBeforeAccept,
    );
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeAccept,
    );
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(
      screen.queryByText("Pending transfer from m.rivera@example.com"),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: `View ${icedogs.name}` }),
    ).toHaveAttribute("href", `/wallet/my-tickets/order/${recipientOrder.orderId}`);
  });

  it("keeps other upcoming events visible after accepting a transfer", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const ownedEvent = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const incomingEvent = icedogs;
    const ownedOrder = demoCompletedTicketOrder({ event: ownedEvent });
    const incomingOrder = demoCompletedTicketOrder({ event: incomingEvent });
    const [incomingTicket] = incomingOrder.tickets;
    const recipientOrder = demoCompletedTicketOrder({
      id: 1307,
      orderId: "1307-recipient-order",
      source: "transfer",
      event: incomingOrder.event,
      tickets: [incomingTicket],
    });
    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [ownedOrder, recipientOrder]
          : [ownedOrder],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [
              {
                id: "incoming-1",
                status: "pending",
                fromUserEmail: "m.rivera@example.com",
                event: incomingOrder.event,
                tickets: [incomingTicket],
              },
            ],
    }));
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted" },
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText(incomingEvent.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upcoming/i }),
    ).toHaveTextContent("2");

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Upcoming/i }),
      ).toHaveTextContent("2");
    });
    expect(screen.getAllByText(incomingEvent.name).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(ownedEvent.name).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByText("Pending transfer from m.rivera@example.com"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept transfer" }),
    ).not.toBeInTheDocument();
  });

  it("shows accepted tickets on upcoming after accepting from the received tab", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    navigationMocks.pathname = "/wallet/my-transfers/";
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    const recipientOrder = demoCompletedTicketOrder({
      id: 1307,
      orderId: "1307-recipient-order",
      source: "transfer",
      event: order.event,
      tickets: [ticket],
    });
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      event: order.event,
      tickets: [ticket],
    };
    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [recipientOrder]
          : [],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [pendingTransfer],
    }));
    mockedGetMyReceivedTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [{ ...pendingTransfer, status: "claimed" }]
          : [pendingTransfer],
    }));
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted" },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));
    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findAllByText(icedogs.name)).toHaveLength(1);
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(
      screen.queryByText("Pending transfer from m.rivera@example.com"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept transfer" }),
    ).not.toBeInTheDocument();
  });

  it("shows the accepted transfer on the received tab while keeping other received transfers", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const incomingOrder = demoCompletedTicketOrder({ event: icedogs });
    const otherEvent = DEMO_EVENTS.find(
      (row) => row.shortCode !== icedogs.shortCode,
    )!;
    const otherOrder = demoCompletedTicketOrder({ event: otherEvent });
    const [incomingTicket] = incomingOrder.tickets;
    const [otherTicket] = otherOrder.tickets;
    const createdAt = "2026-09-12T19:20:19.451Z";
    const transferedOn = "2026-09-13T19:21:48.735Z";
    const existingClaimed = {
      id: "received-claimed",
      status: "claimed",
      fromUserEmail: "sender@example.com",
      event: otherOrder.event,
      tickets: [otherTicket],
      createdAt: "2026-09-10T18:00:00.000Z",
      transferedOn: "2026-09-11T18:00:00.000Z",
    };
    const recipientOrder = demoCompletedTicketOrder({
      id: 1308,
      orderId: "1308-recipient-order",
      source: "transfer",
      event: incomingOrder.event,
      tickets: [incomingTicket],
    });
    const claimedCopy = `Claimed · ${formatEventWhen(
      transferedOn,
      incomingOrder.event?.venue?.timezone,
      "MMM D, YYYY",
    )}`;

    mockedGetMyEvents.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [recipientOrder]
          : [],
    }));
    mockedGetIncomingTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? []
          : [
              {
                id: "incoming-1",
                status: "pending",
                fromUserEmail: "m.rivera@example.com",
                event: incomingOrder.event,
                tickets: [incomingTicket],
                createdAt,
              },
            ],
    }));
    const pendingIncoming = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "m.rivera@example.com",
      event: incomingOrder.event,
      tickets: [incomingTicket],
      createdAt,
    };
    mockedGetMyReceivedTransfers.mockImplementation(async () => ({
      data:
        mockedAcceptIncomingTransfers.mock.calls.length > 0
          ? [
              existingClaimed,
              {
                ...pendingIncoming,
                status: "claimed",
                transferedOn,
              },
            ]
          : [existingClaimed],
    }));
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted", transferedOn },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMyReceivedTransfers).toHaveBeenCalled());
    await user.click(await screen.findByRole("button", { name: /received/i }));
    expect(await screen.findByText(otherEvent.name)).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-1",
      });
    });

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(screen.getByText(otherEvent.name)).toBeInTheDocument();
    expect(screen.getByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(claimedCopy)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept transfer" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/pending · awaiting claim/i)).not.toBeInTheDocument();
  });

  it("does not accept a transfer when the recipient closes the accept popup", async () => {
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
    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));

    expect(
      screen.queryByRole("heading", { name: "Accept this transfer?" }),
    ).not.toBeInTheDocument();
    expect(mockedAcceptIncomingTransfers).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
  });

  it("shows the event date instead of Tonight in the accept popup", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const timezone = icedogs.venue?.timezone;
    const start = moment
      .tz(timezone!)
      .hour(19)
      .minute(0)
      .second(0)
      .millisecond(0)
      .toISOString();
    const tonightEvent = { ...icedogs, start };
    const order = demoCompletedTicketOrder({ event: tonightEvent });
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
    const popup = screen.getByRole("heading", {
      name: "Accept this transfer?",
    }).parentElement!;
    expect(
      within(popup).getByText(
        formatEventWhen(start, timezone, "ddd, MMM D · h:mm A"),
      ),
    ).toBeInTheDocument();
    expect(within(popup).queryByText(/Tonight/)).not.toBeInTheDocument();
  });

  it("does not show Close on the accept transfer popup", async () => {
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
    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows Transfer has already been claimed in the accept popup when accept returns 226", async () => {
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
    mockedAcceptIncomingTransfers.mockResolvedValue({
      status: 226,
      data: {
        error: {
          message: ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
        },
      },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      ACCEPT_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
    expect(
      screen.getByRole("heading", { name: "Accept this transfer?" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Transfer accepted")).not.toBeInTheDocument();
  });

  it("shows could not accept transfer in the accept popup for other 4xx errors", async () => {
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
    mockedAcceptIncomingTransfers.mockRejectedValue({
      response: {
        status: 400,
        data: { error: { message: "Transfer not found" } },
      },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      ACCEPT_TRANSFER_API_ERROR_MESSAGES.couldNotAccept,
    );
  });

  it("shows the network error in the accept popup when accept fails with a server error", async () => {
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
    mockedAcceptIncomingTransfers.mockRejectedValue({
      response: { status: 500, data: { error: { message: "Internal Server Error" } } },
    } as never);

    render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    await confirmAcceptTransferInPopup(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(FIELD_COPY.network);
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

  it("shows the doors open time on a package game once the order is fetched", async () => {
    const order = demoCompletedPackageOrder();
    const packageEvent = pkg.events[0];
    const { doorsOpen } = DEMO_EVENTS.find(
      (row) => row.uuid === packageEvent.uuid,
    )!;
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${packageEvent.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetOrder.mockResolvedValue({
      data: {
        ...order,
        package: {
          ...order.package,
          events: pkg.events.map((row) =>
            row.uuid === packageEvent.uuid ? { ...row, doorsOpen } : row,
          ),
        },
      },
    } as never);

    render(<SeasonTickets />);

    expect(
      await screen.findByText(
        `Doors open ${formatEventWhen(doorsOpen, packageEvent.venue?.timezone, "h:mm A")}`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Doors")).not.toBeInTheDocument();
  });

  it("labels package game seats Tickets", async () => {
    const order = demoCompletedPackageOrder({
      tickets: demoCompletedPackageOrder().tickets.map((ticket) => ({
        ...ticket,
        offerName: "Standard Admission",
        offer: { name: "Standard Admission" },
      })),
    });
    const packageEvent = pkg.events[0];
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${packageEvent.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(<SeasonTickets />);

    const printButtons = await screen.findAllByRole("button", {
      name: "Print PDF",
    });
    for (const print of printButtons) {
      const seatRow = print.closest(".st-ev-seat") as HTMLElement;
      expect(within(seatRow).getByText("Tickets")).toBeInTheDocument();
      expect(within(seatRow).queryByText("Season tickets")).not.toBeInTheDocument();
    }
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
      screen.queryByText(
        "Show the QR code straight from your phone to scan at entry for any included event, or add the pass to your Apple/Google wallet.",
      ),
    ).not.toBeInTheDocument();
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

  it("shows Games included from the access pass when the package still lists past games", async () => {
    const order = demoCompletedPackageOrder();
    const pastEvent = {
      uuid: "evt-nmstate-past-games-included",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const packageEvents = [pastEvent, ...pkg.events];
    const passEvents = pkg.events.slice(1);
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        {
          ...order,
          package: {
            ...order.package,
            events: packageEvents,
          },
        },
      ],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [demoPackageAccessPass({ events: passEvents })] },
    } as never);

    render(<SeasonTickets />);

    expect(await screen.findByText("Games included")).toBeInTheDocument();
    expect(
      screen.getByText(
        `${passEvents.length} ${passEvents.length === 1 ? "game" : "games"}`,
      ),
    ).toBeInTheDocument();
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
    expect(screen.getByRole("dialog", { name: seatLine })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: `Enlarged QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Close$/ }),
    ).not.toBeInTheDocument();

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
    expect(screen.getByText("Attended")).toBeInTheDocument();
    expect(screen.queryByText("Past")).not.toBeInTheDocument();
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
      screen.queryByText(
        transferRecipientDescriptor("season pass", {
          passName: pass.name,
          passSeat: seatLabel(pass),
        }),
      ),
    ).not.toBeInTheDocument();
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

  it("keeps access-pass event count on My Transfers after sending a season pass and refetching", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const pastEvent = {
      uuid: "evt-nmstate-past",
      name: "Past Home Opener",
      start: "2025-09-01T19:00:00.000Z",
      venue: pkg.venue,
    };
    const fullEvents = [pastEvent, ...pkg.events];
    const pass = demoPackageAccessPass({ events: fullEvents });
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        {
          ...order,
          package: {
            ...order.package,
            events: pkg.events,
          },
        },
      ],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedCreateTicketTransfer.mockResolvedValue({
      data: { id: 8801, status: "pending" },
    } as never);

    const { rerender } = render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    expect(
      await screen.findByText("Season pass transfer pending"),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: 8801,
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          order: {
            orderId: order.orderId,
            package: {
              ...order.package,
              events: fullEvents,
            },
          },
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            events: fullEvents,
          },
          createdAt: "2026-09-16T12:00:00.000Z",
        },
      ],
    } as never);
    const sentCallsBeforeNav = mockedGetMySentTransfers.mock.calls.length;
    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    expect(
      await screen.findByText(`${fullEvents.length} events`),
    ).toBeInTheDocument();
    expect(screen.queryByText(`${pkg.events.length} events`)).not.toBeInTheDocument();
    expect(mockedGetMySentTransfers.mock.calls.length).toBeGreaterThan(
      sentCallsBeforeNav,
    );
  });

  it("hides season pass tabs and shows game list after pass transfer", async () => {
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
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await screen.findByText("Season pass transfer pending");
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]!);

    expect(screen.queryByRole("tab", { name: "Season pass" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Transfer season pass" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(pkg.events[1].name)).toBeInTheDocument();
  });

  it("shows remaining package tickets after reload when sent pass transfer uses order record id", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const strippedOrder = { ...order, tickets: [] };
    const pass = demoPackageAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [strippedOrder] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "season-pass-transfer-1",
          status: "pending",
          orderId: order.id,
          transferType: "access_pass",
          accessPassId: pass.uuid,
          tickets: order.tickets,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "package",
            sectionNumber: pass.sectionNumber,
            rowNumber: pass.rowNumber,
            seatNumber: pass.seatNumber,
          },
        },
      ],
    } as never);

    render(<SeasonTickets />);
    await user.click(await screen.findByRole("button", { name: /Packages/i }));

    expect(await screen.findByText("1 ticket")).toBeInTheDocument();
    expect(screen.getByText(`${pkg.events.length} games`)).toBeInTheDocument();
  });

  it("does not refetch the package page after transferring a season pass", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const strippedOrder = { ...order, tickets: [] };
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents
      .mockResolvedValueOnce({ data: [order] } as never)
      .mockResolvedValue({ data: [strippedOrder] } as never);
    mockedGetAccessPassesByOrder
      .mockResolvedValueOnce({ data: { data: [pass] } } as never)
      .mockResolvedValue({ data: { data: [] } } as never);

    render(<SeasonTickets />);

    await screen.findByRole("button", { name: "Transfer season pass" });
    const eventsCallsBeforeTransfer = mockedGetMyEvents.mock.calls.length;
    const passesCallsBeforeTransfer = mockedGetAccessPassesByOrder.mock.calls.length;

    await user.click(
      screen.getByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(
      await screen.findByText("Season pass transfer pending"),
    ).toBeInTheDocument();
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeTransfer);
    expect(mockedGetAccessPassesByOrder.mock.calls.length).toBe(
      passesCallsBeforeTransfer,
    );

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]!);

    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeTransfer);
    expect(mockedGetAccessPassesByOrder.mock.calls.length).toBe(
      passesCallsBeforeTransfer,
    );
    expect(
      screen.queryByRole("button", { name: "Transfer season pass" }),
    ).not.toBeInTheDocument();
  });

  it("restores the season pass on the package page after cancelling the transfer", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const strippedOrder = { ...order, tickets: [] as typeof order.tickets };
    const pass = demoPackageAccessPass();
    const sentList = mockMutableSentTransferList();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents
      .mockResolvedValueOnce({ data: [order] } as never)
      .mockResolvedValue({ data: [strippedOrder] } as never);
    mockedGetAccessPassesByOrder
      .mockResolvedValueOnce({ data: { data: [pass] } } as never)
      .mockResolvedValueOnce({ data: { data: [] } } as never)
      .mockResolvedValue({ data: { data: [pass] } } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend({
        id: 901,
        status: "pending",
        fromUserEmail: DEMO_SESSION.user.email,
        emailAddressToUser: "recipient@example.com",
        transferType: "access_pass",
        accessPassId: pass.uuid,
        orderId: order.orderId,
        access_pass: {
          uuid: pass.uuid,
          name: pass.name,
          type: "package",
          orderId: order.orderId,
          events: pass.events,
          sectionNumber: pass.sectionNumber,
          rowNumber: pass.rowNumber,
          seatNumber: pass.seatNumber,
        },
        createdAt: "2026-09-13T12:00:00.000Z",
      } as never);
      return { data: { id: 901, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockImplementation(async () => {
      sentList.clear();
      return { data: { status: "cancelled" } } as never;
    });

    const { rerender } = render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await screen.findByText("Season pass transfer pending");
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );
    expect(
      screen.queryByRole("button", { name: "Transfer season pass" }),
    ).not.toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Season pass" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: new RegExp(`Game tickets \\(${pkg.events.length}\\)`) }),
    ).toBeInTheDocument();
  });

  it("keeps season passes in seat order after cancelling one transfer", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
      sectionNumber: seat21.sectionNumber,
      rowNumber: seat21.rowNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
      sectionNumber: seat22.sectionNumber,
      rowNumber: seat22.rowNumber,
    });
    const sentList = mockMutableSentTransferList();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass22, pass21] },
    } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend({
        id: 902,
        status: "pending",
        fromUserEmail: DEMO_SESSION.user.email,
        emailAddressToUser: "recipient@example.com",
        transferType: "access_pass",
        accessPassId: pass21.uuid,
        orderId: order.orderId,
        access_pass: {
          uuid: pass21.uuid,
          name: pass21.name,
          type: "package",
          orderId: order.orderId,
          events: pass21.events,
          sectionNumber: pass21.sectionNumber,
          rowNumber: pass21.rowNumber,
          seatNumber: pass21.seatNumber,
        },
        createdAt: "2026-09-13T12:00:00.000Z",
      } as never);
      return { data: { id: 902, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockImplementation(async () => {
      sentList.clear();
      return { data: { status: "cancelled" } } as never;
    });

    const { rerender } = render(<SeasonTickets />);

    const transferButtons = await screen.findAllByRole("button", {
      name: "Transfer season pass",
    });
    expect(screen.getAllByText(/Seat 21|Seat 22/).map((node) => node.textContent)).toEqual([
      expect.stringContaining("Seat 21"),
      expect.stringContaining("Seat 22"),
    ]);
    await user.click(transferButtons[0]!);
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await screen.findByText("Season pass transfer pending");
    await user.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    rerender(<SeasonTickets />);

    await screen.findAllByRole("button", { name: "Transfer season pass" });
    expect(screen.getAllByText(/Seat 21|Seat 22/).map((node) => node.textContent)).toEqual([
      expect.stringContaining("Seat 21"),
      expect.stringContaining("Seat 22"),
    ]);
  });

  it("shows remaining package tickets on the Packages tab after a season pass transfer", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const strippedOrder = { ...order, tickets: [] };
    const pass = demoPackageAccessPass();
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents
      .mockResolvedValueOnce({ data: [order] } as never)
      .mockResolvedValue({ data: [strippedOrder] } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer season pass" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await screen.findByText("Season pass transfer pending");
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]!);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    await user.click(screen.getByRole("button", { name: /Packages/i }));

    expect(await screen.findByText("1 ticket")).toBeInTheDocument();
    expect(screen.getByText(`${pkg.events.length} games`)).toBeInTheDocument();
  });

  it("shows Fully Transferred when every package seat was sent with a pass", async () => {
    const user = userEvent.setup();
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    mockedGetMyEvents.mockResolvedValue({
      data: [{ ...order, tickets: [] }],
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "season-pass-transfer-21",
          status: "pending",
          orderId: order.id,
          transferType: "access_pass",
          accessPassId: pass21.uuid,
          access_pass: {
            uuid: pass21.uuid,
            name: pass21.name,
            type: "package",
            sectionNumber: seat21.sectionNumber,
            rowNumber: seat21.rowNumber,
            seatNumber: seat21.seatNumber,
          },
        },
        {
          id: "season-pass-transfer-22",
          status: "claimed",
          orderId: order.id,
          transferType: "access_pass",
          accessPassId: pass22.uuid,
          access_pass: {
            uuid: pass22.uuid,
            name: pass22.name,
            type: "package",
            sectionNumber: seat22.sectionNumber,
            rowNumber: seat22.rowNumber,
            seatNumber: seat22.seatNumber,
          },
        },
      ],
    } as never);

    render(<SeasonTickets />);
    await user.click(await screen.findByRole("button", { name: /Packages/i }));

    expect(await screen.findByText("Fully Transferred")).toBeInTheDocument();
    expect(screen.queryByText("1 ticket")).not.toBeInTheDocument();
    expect(screen.queryByText("2 tickets")).not.toBeInTheDocument();
  });

  it("keeps the total package game count in the header when some games are played", async () => {
    const order = demoCompletedPackageOrder();
    const events = [
      { ...pkg.events[0], start: "2020-08-15T23:00:00.000Z", status: "complete" },
      ...pkg.events.slice(1),
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

    expect(await screen.findByText(`${events.length} games`)).toBeInTheDocument();
    expect(
      await screen.findByRole("tab", { name: /Game tickets/i }),
    ).toBeInTheDocument();
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

  it("disables season pass transfer when a package game was already transferred", async () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const [, activeEvent, transferredEvent] = pkg.events;
    const events = [
      activeEvent,
      { ...transferredEvent, start: "2099-09-19T23:00:00.000Z" },
    ];
    const tickets = events.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
        ...(event.uuid === transferredEvent.uuid && ticket.seatNumber === seat22.seatNumber
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
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass21, pass22] },
    } as never);

    render(<SeasonTickets />);

    const transferButtons = await screen.findAllByRole("button", {
      name: "Transfer season pass",
    });
    expect(transferButtons).toHaveLength(2);
    expect(transferButtons[0]).toBeEnabled();
    expect(transferButtons[1]).toBeDisabled();
    expect(
      screen.getByText(PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred),
    ).toBeInTheDocument();
    expect(mockedCreateTicketTransfer).not.toHaveBeenCalled();
  });

  it("disables both season passes when two package games were transferred without ticket payloads", async () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      seatNumber: seat22.seatNumber,
    });
    const transferredEvents = [pkg.events[1], pkg.events[4]];
    const retainedEvents = pkg.events.filter(
      (event) =>
        !transferredEvents.some(
          (transferred) => transferred.uuid === event.uuid,
        ),
    );
    const tickets = retainedEvents.flatMap((event) =>
      order.tickets.map((ticket) => ({
        ...ticket,
        id: `${ticket.id}-${event.uuid}`,
        eventUUID: event.uuid,
      })),
    );
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...order.package, events: pkg.events },
          tickets,
        }),
      ],
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: transferredEvents.map((event, index) => ({
        id: `package-game-transfer-${index + 1}`,
        status: "pending",
        orderId: order.orderId,
        eventUUID: event.uuid,
      })),
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass21, pass22] },
    } as never);

    render(<SeasonTickets />);

    const transferButtons = await screen.findAllByRole("button", {
      name: "Transfer season pass",
    });
    expect(transferButtons).toHaveLength(2);
    expect(transferButtons[0]).toBeDisabled();
    expect(transferButtons[1]).toBeDisabled();
    expect(
      screen.getAllByText(PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred),
    ).toHaveLength(2);
  });

  it("disables season pass transfer for a pending package game transfer from sent transfers", async () => {
    const order = demoCompletedPackageOrder();
    const [seat21, seat22] = order.tickets;
    const pass21 = demoPackageAccessPass({
      uuid: "access-pass-seat-21",
      seatNumber: seat21.seatNumber,
    });
    const pass22 = demoPackageAccessPass({
      uuid: "access-pass-seat-22",
      sectionNumber: seat22.sectionNumber,
      rowNumber: seat22.rowNumber,
      seatNumber: seat22.seatNumber,
    });
    const transferredEvent = pkg.events[1];
    const transferredTicketId = `${seat22.id}-${transferredEvent.uuid}`;
    const retainedEvents = pkg.events.filter(
      (event) => event.uuid !== transferredEvent.uuid,
    );
    const tickets = [
      ...retainedEvents.flatMap((event) =>
        order.tickets.map((ticket) => ({
          ...ticket,
          id: `${ticket.id}-${event.uuid}`,
          eventUUID: event.uuid,
        })),
      ),
      {
        ...seat21,
        id: `${seat21.id}-${transferredEvent.uuid}`,
        eventUUID: transferredEvent.uuid,
      },
    ];
    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({
      data: [
        demoCompletedPackageOrder({
          package: { ...order.package, events: pkg.events },
          tickets,
          originalTickets: [
            {
              ...seat22,
              id: transferredTicketId,
              eventUUID: transferredEvent.uuid,
            },
          ],
        }),
      ],
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: "package-game-transfer-1",
          status: "pending",
          orderId: order.id,
          eventUUID: transferredEvent.uuid,
          tickets: [{ id: transferredTicketId, eventUUID: transferredEvent.uuid }],
          access_pass: {
            uuid: pass22.uuid,
            name: pass22.name,
            type: "package",
            sectionNumber: seat22.sectionNumber,
            rowNumber: seat22.rowNumber,
            seatNumber: seat22.seatNumber,
          },
        },
      ],
    } as never);
    mockedGetAccessPassesByOrder.mockResolvedValue({
      data: { data: [pass21, pass22] },
    } as never);

    render(<SeasonTickets />);

    const transferButtons = await screen.findAllByRole("button", {
      name: "Transfer season pass",
    });
    expect(transferButtons).toHaveLength(2);
    expect(transferButtons[0]).toBeEnabled();
    expect(transferButtons[1]).toBeDisabled();
    expect(
      screen.getByText(PASS_TRANSFER_DISPLAY_COPY.seasonPassTransferred),
    ).toBeInTheDocument();
  });

  it("shows pending-transfer copy when a season pass already has a pending transfer", async () => {
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
            message: PASS_TRANSFER_API_ERROR_MESSAGES.accessPassPending,
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
      "This season pass already has a pending transfer.",
    );
    expect(
      screen.queryByText("Season pass transfer pending"),
    ).not.toBeInTheDocument();
  });

  it("shows assigned copy when a pass transfer is rejected because the pass is already assigned", async () => {
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
        status: 402,
        data: {
          error: {
            message: PASS_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
          },
        },
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
      PASS_TRANSFER_DISPLAY_COPY.assigned,
    );
    expect(
      screen.queryByText("Access pass transfer pending"),
    ).not.toBeInTheDocument();
  });

  it("shows a retry message when a pass transfer fails with an unmapped 402", async () => {
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
        status: 402,
        data: { error: { message: "Unknown pass transfer error" } },
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
      "We couldn't transfer this season pass. Please try again.",
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

  it("shows organizer access passes nested under access_pass on myAccessPasses", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: {
        data: [
          {
            id: 41,
            createdAt: "2026-08-27T17:40:51.485Z",
            access_pass: {
              uuid: pass.uuid,
              name: pass.name,
              type: "organizer",
              status: "accepted",
              events: pass.events,
            },
          },
        ],
      },
    } as never);

    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes.*1/i }),
    );

    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toBeInTheDocument();
  });

  it("shows owned organizer passes from myAccessPasses after a claimed sent transfer", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: 88,
          status: "accepted",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          accessPassSnapshot: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
          },
        },
      ],
    } as never);

    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes.*1/i }),
    );

    expect(screen.getByText(pass.name)).toBeInTheDocument();
  });

  it("shows organizer access passes from a nested myAccessPasses payload", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: {
        data: {
          data: [
            {
              id: 41,
              attributes: pass,
            },
          ],
        },
      },
    } as never);

    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes.*1/i }),
    );

    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toBeInTheDocument();
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
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(
        `^/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/?$`,
      ),
    );
    expect(screen.getByText(`Pass #${pass.checkInCode}`)).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: `QR code for ${pass.name}` }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByText(
        "Show the QR code straight from your phone to scan at entry for any included event.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Tap the QR code to scan at entry for any included event or add this pass to your Apple/Google wallet.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Show QR code for ${pass.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: `QR code for ${pass.name}` }),
    ).not.toBeInTheDocument();
  });

  it("shows Attended instead of Past on past access-pass events", async () => {
    const pastEvent = {
      ...printableEvent,
      uuid: "evt-access-pass-past",
      name: "NMSU Soccer vs. Past Opponent",
      start: "2020-08-15T23:00:00.000Z",
      status: "complete",
    };
    const accessPass = demoAccessPass({ events: [pastEvent] });
    navigationMocks.pathname =
      `/wallet/my-tickets/order/${accessPass.orderId}/access-pass/${accessPass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: accessPass },
    } as never);

    render(<SeasonTickets />);

    expect(
      (await screen.findAllByText(pastEvent.name)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Attended").length).toBeGreaterThan(0);
    expect(screen.queryByText("Past")).not.toBeInTheDocument();
  });

  it("opens access pass details from the tab when the pass has no order id", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass({
      orderId: "",
      events: [printableEvent],
    });
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
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(`^/wallet/my-tickets/access-pass/${pass.uuid}/?$`),
    );

    navigationMocks.pathname = `/wallet/my-tickets/access-pass/${pass.uuid}/`;
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Next up")).toBeInTheDocument();
    expect(screen.getByText("All events")).toBeInTheDocument();
    expect(screen.getByText("Events included")).toBeInTheDocument();
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
    expect(screen.getByText("Attended")).toBeInTheDocument();
    expect(screen.queryByText("Past")).not.toBeInTheDocument();
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
    expect(screen.getByRole("navigation", { name: "Wallet" })).toBeInTheDocument();
    expect(
      screen.queryByTestId("wallet-access-pass-actions-footer"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Transfer access pass" }),
    ).toBeInTheDocument();
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
      screen.queryByText((_, el) => {
        const descriptor = transferRecipientDescriptor("access pass", {
          passName: pass.name,
          passSeat: seatLabel(pass),
        });
        return el?.tagName === "STRONG" && el.textContent === descriptor;
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`${pass.name} · ${seatLabel(pass)}`),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByText(formatAccessPassRemainingLine(0, pass.events.length)),
    ).toBeInTheDocument();
    expect(screen.queryByText("GA")).not.toBeInTheDocument();
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

  it("pins Transfer access pass in a mobile footer and hides wallet tabs", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    const pass = demoAccessPass();
    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    render(<SeasonTickets />);

    const footer = await screen.findByTestId("wallet-access-pass-actions-footer");
    expect(
      within(footer).getByRole("button", { name: "Transfer access pass" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Wallet" }),
    ).not.toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
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

  it("hides a transferred access pass without refetching the wallet", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);

    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    const { rerender } = render(<SeasonTickets />);

    await user.click(
      await screen.findByRole("button", { name: "Transfer access pass" }),
    );
    const eventsCallsBeforeTransfer = mockedGetMyEvents.mock.calls.length;
    const accessPassesCallsBeforeTransfer =
      mockedGetMyAccessPasses.mock.calls.length;
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    expect(
      await screen.findByText("Access pass transfer pending"),
    ).toBeInTheDocument();
    expect(mockedCreateTicketTransfer).toHaveBeenCalledTimes(1);
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeTransfer);
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeTransfer,
    );

    await user.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);
    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes/i }),
    );
    expect(screen.queryByText(pass.name)).not.toBeInTheDocument();
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeTransfer);
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeTransfer,
    );
  });

  it("shows a sent access pass on the Sent tab after My transfers refetch", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);
    mockedCreateTicketTransfer.mockResolvedValue({
      data: { id: 88, status: "pending" },
    } as never);

    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    const { rerender } = render(<SeasonTickets />);

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

    mockedGetMySentTransfers.mockResolvedValue({
      data: {
        data: [
          {
            id: 88,
            attributes: {
              status: "pending",
              transferType: "access_pass",
              accessPassId: pass.uuid,
              accessPassSnapshot: {
                uuid: pass.uuid,
                name: pass.name,
                type: "organizer",
                events: pass.events,
              },
              emailAddressToUser: "recipient@example.com",
              fromUserEmail: DEMO_SESSION.user.email,
              createdAt: "2026-09-17T18:00:00.000Z",
              tickets: { data: [] },
            },
          },
        ],
      },
    } as never);
    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel transfer" }),
    ).toBeInTheDocument();
  });

  it("keeps a just-sent access pass on Sent when the transfers refetch is empty", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);
    mockedCreateTicketTransfer.mockResolvedValue({
      data: { id: 88, status: "pending" },
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({ data: { data: [] } } as never);

    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    const { rerender } = render(<SeasonTickets />);

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

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(pass.name)).toBeInTheDocument();
    expect(screen.queryByText("No transfers sent")).not.toBeInTheDocument();
  });

  it("keeps a just-sent access pass on Sent when my-sent still only has the older claimed row", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    const claimedSent = {
      id: 88,
      status: "accepted",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      accessPassSnapshot: {
        uuid: pass.uuid,
        name: pass.name,
        type: "organizer",
        events: pass.events,
      },
      emailAddressToUser: "recipient@example.com",
      fromUserEmail: DEMO_SESSION.user.email,
      createdAt: "2026-09-10T18:00:00.000Z",
    };
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);
    mockedCreateTicketTransfer.mockResolvedValue({
      data: { id: 89, status: "pending" },
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: { data: [claimedSent] },
    } as never);

    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    const { rerender } = render(<SeasonTickets />);

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

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    expect(
      await screen.findByRole("button", { name: "Cancel transfer" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(pass.name).length).toBeGreaterThan(0);
    expect(screen.getByText("Pending · awaiting claim")).toBeInTheDocument();
  });

  it("keeps a new pending received access pass beside an older claimed transfer for the same pass", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    const claimedReceived = {
      id: "claimed-access-1",
      status: "claimed",
      transferType: "access_pass",
      accessPassId: pass.uuid,
      accessPassSnapshot: {
        uuid: pass.uuid,
        name: pass.name,
        type: "organizer",
        events: pass.events,
      },
      fromUserEmail: "sender@example.com",
      createdAt: "2026-09-10T18:00:00.000Z",
      transferedOn: "2026-09-10T18:05:00.000Z",
    };
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: { data: [claimedReceived] },
    } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-2",
          status: "pending",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
          fromUserEmail: "sender@example.com",
          createdAt: "2026-09-17T18:05:00.000Z",
        },
      ],
    } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(
      await screen.findByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending · awaiting claim")).toBeInTheDocument();
    expect(screen.getByText(/Claimed ·/)).toBeInTheDocument();
    expect(screen.getAllByText(pass.name).length).toBeGreaterThan(1);
  });

  it("shows a pending incoming access pass on the Access Pass tab", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            ...pass,
            checkInCode: undefined,
            backgroundColor: undefined,
          },
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(screen.getByRole("button", { name: /packages/i }));
    expect(screen.queryByText(pass.name)).not.toBeInTheDocument();
    expect(screen.queryByText("Season tickets")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Access passes/i }),
    );
    const [owned] = buildAccessPassSummaries([pass]);
    expect(
      await screen.findByText("Pending transfer from sender@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(screen.getByText("All-access pass")).toBeInTheDocument();
    expect(screen.getByText("Next event")).toBeInTheDocument();
    if (owned?.nextEvent?.name) {
      expect(screen.getByText(owned.nextEvent.name)).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        `${owned?.attendedCount ?? 0} attended · ${Math.max(0, (owned?.eventCount ?? 0) - (owned?.attendedCount ?? 0))} remaining`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        `${owned?.eventCount ?? pass.events.length} ${
          (owned?.eventCount ?? pass.events.length) === 1 ? "event" : "events"
        }`,
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("1 Access pass")).not.toBeInTheDocument();
    expect(screen.queryByText("Season tickets")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `View ${pass.name}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept transfer" }),
    ).toBeInTheDocument();
  });

  it("accepts an access pass on Received without refetching the wallet", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
        },
      ],
    } as never);
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted", transferedOn: "2026-09-13T19:21:48.735Z" },
    } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));
    await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
    const eventsCallsBeforeAccept = mockedGetMyEvents.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;
    const incomingCallsBeforeAccept =
      mockedGetIncomingTransfers.mock.calls.length;
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-access-1",
      });
    });
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeAccept);
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeAccept,
    );
    expect(mockedGetIncomingTransfers.mock.calls.length).toBe(
      incomingCallsBeforeAccept,
    );
    expect(await screen.findByText(pass.name)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept transfer" }),
    ).not.toBeInTheDocument();
  });

  it("accepts an access pass on the Access Pass tab with a targeted pass fetch only", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
          },
        },
      ],
    } as never);
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted", transferedOn: "2026-09-13T19:21:48.735Z" },
    } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);

    render(<SeasonTickets />);
    await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
    const eventsCallsBeforeAccept = mockedGetMyEvents.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;

    await user.click(
      await screen.findByRole("button", { name: /Access passes/i }),
    );
    await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-access-1",
      });
    });
    await waitFor(() => {
      expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
        accessPassesCallsBeforeAccept + 1,
      );
    });
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeAccept);
    expect(screen.queryByText("Pending transfer from sender@example.com")).not.toBeInTheDocument();
    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toBeInTheDocument();
  });

  it("keeps an accepted access pass on the Access Pass tab when the list API is stale", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
        },
      ],
    } as never);
    mockedAcceptIncomingTransfers.mockResolvedValue({
      data: { status: "accepted", transferedOn: "2026-09-13T19:21:48.735Z" },
    } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [] },
    } as never);

    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes/i }),
    );
    expect(await screen.findByText(pass.name)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
    await confirmAcceptTransferInPopup(user);

    await waitFor(() => {
      expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
        transferId: "incoming-access-1",
      });
    });
    expect(
      screen.queryByText("Pending transfer from sender@example.com"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(pass.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `View ${pass.name}` }),
    ).toBeInTheDocument();
  });

  it("keeps the accept modal open when an access pass accept fails", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const pass = demoAccessPass();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [
        {
          id: "incoming-access-1",
          status: "pending",
          fromUserEmail: "sender@example.com",
          transferType: "access_pass",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
        },
      ],
    } as never);
    mockedAcceptIncomingTransfers.mockRejectedValue({
      response: { status: 500 },
    });

    render(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes/i }),
    );
    await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
    const eventsCallsBeforeAccept = mockedGetMyEvents.mock.calls.length;
    const accessPassesCallsBeforeAccept =
      mockedGetMyAccessPasses.mock.calls.length;
    await confirmAcceptTransferInPopup(user);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Accept this transfer?")).toBeInTheDocument();
    expect(
      screen.getByText("Pending transfer from sender@example.com"),
    ).toBeInTheDocument();
    expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsBeforeAccept);
    expect(mockedGetMyAccessPasses.mock.calls.length).toBe(
      accessPassesCallsBeforeAccept,
    );
  });

  it("keeps a cancelled access pass after a stale access-pass refetch", async () => {
    const user = userEvent.setup();
    const pass = demoAccessPass();
    const sentList = mockMutableSentTransferList();
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [pass] },
    } as never);
    mockedGetMyAccessPass.mockResolvedValue({
      data: { data: pass },
    } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend({
        id: 911,
        status: "pending",
        fromUserEmail: DEMO_SESSION.user.email,
        emailAddressToUser: "recipient@example.com",
        orderId: pass.orderId,
        tickets: [],
        createdAt: "2026-09-13T12:00:00.000Z",
        accessPassId: pass.uuid,
        access_pass: {
          uuid: pass.uuid,
          name: pass.name,
          type: "organizer",
          events: pass.events,
        },
      } as never);
      return {
        data: {
          id: 911,
          status: "pending",
          accessPassId: pass.uuid,
          access_pass: {
            uuid: pass.uuid,
            name: pass.name,
            type: "organizer",
            events: pass.events,
          },
        },
      };
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    navigationMocks.pathname =
      `/wallet/my-tickets/order/${pass.orderId}/access-pass/${pass.uuid}/`;
    const { rerender } = render(<SeasonTickets />);
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
    await user.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    mockedGetMyAccessPasses.mockResolvedValue({
      data: { data: [] },
    } as never);
    mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    await user.click(
      await screen.findByRole("button", { name: /Access passes/i }),
    );
    expect(await screen.findByText(pass.name)).toBeInTheDocument();
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
      access_pass: {
        name: seasonPass.name,
        type: "package",
        events: pkg.events,
        sectionNumber: seasonPass.sectionNumber,
        rowNumber: seasonPass.rowNumber,
        seatNumber: seasonPass.seatNumber,
      },
      createdAt: "2026-09-11T18:00:00.000Z",
    };
    const accessTransfer = {
      id: "access-pass-transfer-1",
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: accessPass.orderId,
      access_pass: {
        name: accessPass.name,
        type: "organizer",
        events: accessPass.events,
      },
      createdAt: "2026-09-10T18:00:00.000Z",
    };

    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [seasonTransfer, accessTransfer],
    } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [seasonTransfer, accessTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [seasonTransfer, accessTransfer],
    } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    expect(await screen.findByText(seasonPass.name)).toBeInTheDocument();
    expect(screen.getByText(accessPass.name)).toBeInTheDocument();
    expect(
      screen.getByText(`${pkg.events.length} events`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        formatAccessPassRemainingLine(
          accessPass.events.length,
          accessPass.events.length,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sec M · Row M3 · Seat 21/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("1 Access pass")).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("season pass"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Sec M · Row M3 · Seat 21/i).length,
    ).toBeGreaterThan(1);
    expect(
      screen.getByText(`${pkg.events.length} games`),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(
        `To recipient@example.com · sent ${formatEventWhen(
          seasonTransfer.createdAt,
          undefined,
          "MMM D, YYYY",
        )}`,
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
    expect(
      screen.getAllByText(
        formatAccessPassRemainingLine(
          accessPass.events.length,
          accessPass.events.length,
        ),
      ).length,
    ).toBeGreaterThan(1);
    expect(screen.queryByText("1 Access pass")).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(
        `To recipient@example.com · sent ${formatEventWhen(
          accessTransfer.createdAt,
          undefined,
          "MMM D, YYYY",
        )}`,
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
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [singleTransfer, packageTransfer],
    } as never);

    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(packageEvent.name)).toBeInTheDocument();
    expect(screen.getAllByText(/pending · awaiting claim/i)).toHaveLength(2);

    const singleWhen = eventWhenLabel(
      ticketOrder.event,
      ticketOrder.event?.venue?.timezone,
    );
    const packageWhen = eventWhenLabel(
      packageEvent,
      packageEvent.venue?.timezone,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[0]!,
    );
    expect(
      screen.getByText(
        transferCancelReturnCopy("ticket", 1),
      ),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(singleWhen),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(
        `To recipient@example.com · sent ${formatEventWhen(
          singleTransfer.createdAt,
          ticketOrder.event?.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" })[1]!,
    );
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(packageWhen),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Cancel this transfer?" })
          .parentElement!,
      ).getByText(
        `To recipient@example.com · sent ${formatEventWhen(
          packageTransfer.createdAt,
          packageEvent.venue?.timezone,
          "MMM D, YYYY",
        )}`,
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

    await user.click(
      screen.getAllByRole("button", { name: "Accept transfer" })[0]!,
    );
    expect(
      within(
        screen.getByRole("heading", { name: "Accept this transfer?" })
          .parentElement!,
      ).getByText(singleWhen),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Accept this transfer?" })
          .parentElement!,
      ).getByText(
        `From ${DEMO_SESSION.user.email} · received on ${formatEventWhen(
          singleTransfer.createdAt,
          ticketOrder.event?.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    await user.click(
      screen.getAllByRole("button", { name: "Accept transfer" })[1]!,
    );
    expect(
      within(
        screen.getByRole("heading", { name: "Accept this transfer?" })
          .parentElement!,
      ).getByText(packageWhen),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("heading", { name: "Accept this transfer?" })
          .parentElement!,
      ).getByText(
        `From ${DEMO_SESSION.user.email} · received on ${formatEventWhen(
          packageTransfer.createdAt,
          packageEvent.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel transfer" }),
    ).not.toBeInTheDocument();
  });

  it("loads My Transfers from ticket-transfers only without calling myUpcomingEvents", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockClear();
    mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);

    render(<SeasonTickets />);

    await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());
    expect(mockedGetMyReceivedTransfers).toHaveBeenCalled();
    expect(mockedGetIncomingTransfers).toHaveBeenCalled();
    expect(mockedGetMyEvents).not.toHaveBeenCalled();
    expect(await screen.findByText(/no transfers sent/i)).toBeInTheDocument();
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

  it("says these tickets in the accept modal when more than one ticket was received", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const tickets = order.tickets.slice(0, 2);
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [
        {
          id: "received-2",
          status: "pending",
          fromUserEmail: DEMO_SESSION.user.email,
          emailAddressToUser: DEMO_USER.email,
          orderId: order.orderId,
          event: order.event,
          tickets,
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);
    mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);

    render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));
    await user.click(
      await screen.findByRole("button", { name: "Accept transfer" }),
    );
    expect(
      screen.getByText(transferAcceptConfirmCopy("ticket", 2)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(transferAcceptConfirmCopy("ticket", 1)),
    ).not.toBeInTheDocument();
  });

  it("only calls the cancel API when confirming cancel", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: 901,
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
      data: { status: "cancelled" },
    } as never);

    render(<SeasonTickets />);

    await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());
    mockedGetMyEvents.mockClear();
    mockedGetIncomingTransfers.mockClear();
    mockedGetMyAccessPasses.mockClear();
    mockedGetAccessPassesByOrder.mockClear();
    mockedGetMySentTransfers.mockClear();
    mockedGetMyReceivedTransfers.mockClear();
    mockedCancelMyTransfers.mockClear();

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );

    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
    expect(mockedCancelMyTransfers).toHaveBeenCalledTimes(1);
    expect(mockedGetMyEvents).not.toHaveBeenCalled();
    expect(mockedGetIncomingTransfers).not.toHaveBeenCalled();
    expect(mockedGetMyAccessPasses).not.toHaveBeenCalled();
    expect(mockedGetAccessPassesByOrder).not.toHaveBeenCalled();
    expect(mockedGetMySentTransfers).not.toHaveBeenCalled();
    expect(mockedGetMyReceivedTransfers).not.toHaveBeenCalled();
  });

  it("does not show Close on the cancel transfer popup", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        {
          id: 901,
          status: "pending",
          emailAddressToUser: "recipient@example.com",
          orderId: order.orderId,
          event: order.event,
          tickets: [ticket],
          createdAt: "2026-01-01T12:00:00.000Z",
        },
      ],
    } as never);

    render(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    expect(
      screen.getByRole("heading", { name: "Cancel this transfer?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows Transfer has already been claimed in the cancel popup when the transfer was already claimed", async () => {
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
            message: CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
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
      CANCEL_TRANSFER_API_ERROR_MESSAGES.alreadyClaimed,
    );
    expect(
      screen.getByRole("heading", { name: "Cancel this transfer?" }),
    ).toBeInTheDocument();
  });

  it("shows could not cancel transfer in the cancel popup for other 4xx errors", async () => {
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
        status: 403,
        data: { error: { message: "You cannot cancel this transfer" } },
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
      CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel,
    );
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

  it("removes cancelled pending transfers when incoming is still stale after refresh", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    navigationMocks.pathname = "/wallet/my-transfers/";
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T19:20:19.451Z",
    };

    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [pendingTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [pendingTransfer],
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    mockedGetIncomingTransfers.mockResolvedValue({
      data: [pendingTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [{ ...pendingTransfer, status: "cancelled" }],
    } as never);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(await screen.findByText("Nothing received yet")).toBeInTheDocument();
    expect(screen.queryByText("Accept transfer")).not.toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
  });

  it("removes cancelled pending transfers from the received tab after refresh", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    navigationMocks.pathname = "/wallet/my-transfers/";
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    const pendingTransfer = {
      id: "incoming-1",
      status: "pending",
      fromUserEmail: "sender@example.com",
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-12T19:20:19.451Z",
    };

    mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
    mockedGetIncomingTransfers.mockResolvedValue({
      data: [pendingTransfer],
    } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [pendingTransfer],
    } as never);

    const { rerender } = render(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Accept transfer" })).toHaveLength(
      1,
    );

    mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
    mockedGetMyReceivedTransfers.mockResolvedValue({
      data: [{ ...pendingTransfer, status: "cancelled" }],
    } as never);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: /received/i }));

    expect(await screen.findByText("Nothing received yet")).toBeInTheDocument();
    expect(screen.queryByText("Accept transfer")).not.toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
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
    mockedGetMySentTransfers.mockReset();
    mockedGetMyListings.mockReset();
    if (pathname.includes("my-transfers")) {
      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
      mockedGetMySentTransfers.mockReturnValue(new Promise(() => {}) as never);
      mockedGetMyReceivedTransfers.mockReturnValue(new Promise(() => {}) as never);
    } else if (pathname.includes("my-listings")) {
      mockedGetMyListings.mockReturnValue(new Promise(() => {}) as never);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    } else {
      mockedGetMyEvents.mockReturnValue(new Promise(() => {}) as never);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
    }

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

  it("loads my tickets again after a remount aborts the first fetch", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    const { unmount } = render(<SeasonTickets />);
    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    unmount();

    // Same browser session, new mount — do not call resetWalletApiHydrationForTests.
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
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

  it.each([
    ["/wallet/my-transfers/", "Transfers"],
    ["/wallet/my-listings/", "Listings"],
    ["/wallet/giving/", "Giving"],
  ])("shows the signed-in email on %s", async (pathname, heading) => {
    navigationMocks.pathname = pathname;

    render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: heading, level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    });
    if (window.innerWidth >= 900) {
      expect(screen.getByText(DEMO_SESSION.user.email)).toBeInTheDocument();
    }
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
          rowNumber: undefined,
          seatNumber: undefined,
          cost: 25,
          price: 25,
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
          rowNumber: undefined,
          seatNumber: undefined,
          cost: 25,
          price: 25,
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

  it("keeps ticket seats in order after cancelling a transfer", async () => {
    const user = userEvent.setup();
    const [first, second] = demoCheckoutCart({ ticketCount: 2 }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [second, first],
    });
    const sentList = mockMutableSentTransferList();
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend({
        id: 903,
        status: "pending",
        fromUserEmail: DEMO_SESSION.user.email,
        emailAddressToUser: "recipient@example.com",
        orderId: order.orderId,
        event: icedogs,
        tickets: [first],
        createdAt: "2026-09-13T12:00:00.000Z",
      } as never);
      return { data: { id: 903, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockImplementation(async () => {
      sentList.clear();
      return { data: { status: "cancelled" } } as never;
    });

    const { rerender } = render(
      <SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />,
    );

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${first.seatNumber}` }),
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(
      screen.getByRole("textbox", { name: "Email address" }),
      "recipient@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getAllByRole("button", { name: "Transfer" }).at(-1)!);
    await user.click(screen.getAllByRole("button", { name: "Close" }).at(-1)!);

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(
      <SeasonTickets initialScreen="event" eventUUID={icedogs.uuid} />,
    );

    const seatLines = await screen.findAllByText(/Sec .+ · Row .+ · Seat /);
    expect(seatLines[0]).toHaveTextContent(
      `Sec ${first.sectionNumber} · Row ${first.rowNumber} · Seat ${first.seatNumber}`,
    );
    expect(seatLines[1]).toHaveTextContent(
      `Sec ${second.sectionNumber} · Row ${second.rowNumber} · Seat ${second.seatNumber}`,
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

    expect(
      await screen.findAllByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toHaveLength(order.tickets.length);

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
    expect(details.getByText("Offer")).toBeInTheDocument();
    expect(
      details.getByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(details.getByText("Mobile entry")).toBeInTheDocument();
  });

  it("shows the printable offer name and time from the single-order ticket payload", async () => {
    const user = userEvent.setup();
    const listed = demoCompletedTicketOrder({
      event: printableEvent,
      tickets: demoCheckoutCart({ ticketCount: 1 }).tickets.map((ticket) => ({
        id: ticket.id,
        checkInCode: ticket.checkInCode,
        sectionNumber: ticket.sectionNumber,
        rowNumber: ticket.rowNumber,
        seatNumber: ticket.seatNumber,
        generalAdmission: true,
      })),
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({
      data: {
        ...listed,
        tickets: listed.tickets.map((ticket) => ({
          ...ticket,
          name: "Prelims",
          offer: { name: "Prelims" },
        })),
      },
    } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    expect(await screen.findByText("PRELIMS")).toBeInTheDocument();
    expect(
      screen.queryByText("PRELIMS • MORNING UNTIL 4:00"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Details" }));
    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    expect(within(modal!).getByText("Offer")).toBeInTheDocument();
    expect(
      within(modal!).getByText("PRELIMS • MORNING UNTIL 4:00"),
    ).toBeInTheDocument();

    fireEvent.click(modal!.parentElement!);
    expect(
      screen.queryByRole("heading", { name: "Ticket details" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Print PDF" }));
    await waitFor(() => {
      expect(pdfMocks.printTicketsPdf).toHaveBeenCalled();
    });
    expect(pdfMocks.printTicketsPdf.mock.calls[0][0].tickets[0]).toMatchObject({
      name: "Prelims",
      offer: { name: "Prelims" },
    });
  });

  it("hides a generic Standard Admission offer from ticket details", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({
      event: printableEvent,
      tickets: demoCheckoutCart({ ticketCount: 1 }).tickets.map((ticket) => ({
        ...ticket,
        offerName: "Standard Admission",
        offer: { name: "Standard Admission" },
      })),
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    expect(await screen.findByText("Tickets")).toBeInTheDocument();

    await user.click(
      (await screen.findAllByRole("button", { name: "Details" }))[0],
    );

    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    expect(within(modal!).queryByText("Offer")).not.toBeInTheDocument();
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

  it("shows the signed-in name in details when the listed ticket holder is Guest", async () => {
    const user = userEvent.setup();
    const listed = demoCompletedTicketOrder({
      event: printableEvent,
      firstName: undefined,
      lastName: undefined,
      email: undefined,
      users_permissions_user: null,
      user: null,
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({ data: listed } as never);

    render(
      <SeasonTickets initialScreen="event" eventUUID={printableEvent.uuid} />,
    );

    await user.click(
      (await screen.findAllByRole("button", { name: "Details" }))[0],
    );
    const modal = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    expect(
      within(modal!).getByText(`${DEMO_USER.firstName} ${DEMO_USER.lastName}`),
    ).toBeInTheDocument();
    expect(within(modal!).queryByText("Guest")).not.toBeInTheDocument();
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
        buyer: expect.objectContaining({
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
        }),
        tickets: [
          expect.objectContaining({
            id: order.tickets[0].id,
            checkInCode: order.tickets[0].checkInCode,
            offerName: order.tickets[0].offerName,
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
      screen.queryByText(/person receiving this ticket/i),
    ).not.toBeInTheDocument();
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
      await screen.findByText(transferSuccessTitle("ticket", 1)),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
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
      screen.queryByText(/person receiving these tickets/i),
    ).not.toBeInTheDocument();
    expect(order.tickets.length).toBeGreaterThan(1);
    expect(
      screen.getByText(
        transferRecipientNotifyCopy("ticket", order.tickets.length),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/you sent them a ticket/i),
    ).not.toBeInTheDocument();
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
      screen.queryByText(/person receiving this ticket/i),
    ).not.toBeInTheDocument();
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

  it("drops a transferred ticket from the event page without reloading the wallet", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

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
      await screen.findByText(transferSuccessTitle("ticket", 1)),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    expect(screen.queryByText(seatLabel(ticket))).not.toBeInTheDocument();
  });

  it("restores the upcoming tab after cancelling a just-sent transfer", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [ticket],
    });
    const sentList = mockMutableSentTransferList();
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend(pendingSentTransferStub({ id: 901, order, ticket }));
      return { data: { id: 901, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(<SeasonTickets />);

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
  });

  it("keeps cancelled tickets on upcoming after remounting my tickets", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [ticket],
    });
    const strippedOrder = {
      ...order,
      tickets: [],
    };
    const sentList = mockMutableSentTransferList();
    mockedGetMyEvents
      .mockResolvedValueOnce({ data: [order] } as never)
      .mockResolvedValue({ data: [strippedOrder] } as never);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend(pendingSentTransferStub({ id: 901, order, ticket }));
      return { data: { id: 901, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const { rerender, unmount } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(<SeasonTickets />);

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    unmount();
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    resetWalletApiHydrationForTests();
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
  });

  it("hides cancelled sent transfers after remounting my transfers when create returns no id", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [ticket],
    });
    const sentTransfer = {
      id: 901,
      status: "pending",
      fromUserEmail: DEMO_SESSION.user.email,
      emailAddressToUser: "recipient@example.com",
      orderId: order.orderId,
      event: order.event,
      tickets: [ticket],
      createdAt: "2026-09-13T12:00:00.000Z",
    };
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockResolvedValue({ data: null } as never);
    mockedGetMySentTransfers.mockResolvedValue({ data: [sentTransfer] } as never);
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const { rerender, unmount } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(<SeasonTickets />);

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
    expect(mockedCancelMyTransfers).toHaveBeenCalledWith("901");

    unmount();
    mockedGetMySentTransfers.mockResolvedValue({
      data: [{ ...sentTransfer, status: "canceled" }],
    } as never);
    navigationMocks.pathname = "/wallet/my-transfers/";
    render(<SeasonTickets />);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Cancel transfer" }),
      ).not.toBeInTheDocument();
    });
  });

  it("cancels a package event transfer when create returned no transfer id", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const packageEvent = pkg.events.find(
      (row) => row.uuid === "evt-nmstate-vs-delaware",
    )!;
    const order = demoCompletedPackageOrder({
      package: {
        ...pkg,
        events: pkg.events.map((row) =>
          row.uuid === packageEvent.uuid
            ? { ...row, enableTransfers: true }
            : row,
        ),
      },
    });
    const [baseTicket] = order.tickets;
    const ticket = {
      ...baseTicket,
      id: `${baseTicket.id}-${packageEvent.uuid}`,
      eventUUID: packageEvent.uuid,
    };
    const packageOrder = demoCompletedPackageOrder({
      package: order.package,
      tickets: [ticket],
    });
    const sentTransfer = {
      id: 5521,
      status: "pending",
      emailAddressToUser: "recipient@example.com",
      orderId: packageOrder.id,
      event: packageEvent,
      tickets: [{ id: baseTicket.id, eventUUID: packageEvent.uuid }],
      createdAt: "2026-09-13T12:00:00.000Z",
    };
    mockedGetMyEvents.mockResolvedValue({ data: [packageOrder] } as never);
    mockedCreateTicketTransfer.mockResolvedValue({ data: null } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [sentTransfer],
    } as never);
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    navigationMocks.pathname = `/wallet/my-tickets/order/${packageOrderId}/package/${pkg.uuid}/event/${packageEvent.uuid}/`;
    const { rerender } = render(<SeasonTickets />);

    expect(
      await screen.findByRole("heading", { name: packageEvent.name }),
    ).toBeInTheDocument();

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-transfers/";
    mockedGetMySentTransfers.mockClear();
    rerender(<SeasonTickets />);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );

    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
    expect(mockedCancelMyTransfers).toHaveBeenCalledWith(
      expect.stringMatching(/^5521$/),
    );
    expect(
      screen.queryByText(CANCEL_TRANSFER_API_ERROR_MESSAGES.couldNotCancel),
    ).not.toBeInTheDocument();
  });

  it("keeps one ga ticket on upcoming after cancelling one of two ga transfers and remounting", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const gaTickets = [
      {
        id: 9101,
        uuid: "ticket-ga-1",
        checkInCode: "GA-1",
        eventUUID: icedogs.uuid,
        generalAdmission: true,
        sectionName: "General Admission",
        sectionNumber: "Club",
        rowNumber: undefined,
        seatNumber: undefined,
        cost: 25,
        price: 25,
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
        rowNumber: undefined,
        seatNumber: undefined,
        cost: 25,
        price: 25,
        offerName: "General admission",
      },
    ];
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: gaTickets,
    });
    const strippedOrder = {
      ...order,
      tickets: [],
    };
    mockedGetMyEvents
      .mockResolvedValueOnce({ data: [order] } as never)
      .mockResolvedValue({ data: [strippedOrder] } as never);
    const sentList = mockMutableSentTransferList();
    let nextTransferId = 901;
    mockedCreateTicketTransfer.mockImplementation(async () => {
      const ticket = gaTickets[Math.min(nextTransferId - 901, gaTickets.length - 1)]!;
      const id = nextTransferId++;
      sentList.prepend(pendingSentTransferStub({ id, order, ticket }));
      return { data: { id, status: "pending" } } as never;
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const transferGaTicket = async (index: number) => {
      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      rerender(<SeasonTickets />);
      await user.click(await screen.findByRole("button", { name: "Transfer" }));
      await user.click(screen.getAllByRole("button", { name: "GA" })[index]!);
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.type(
        screen.getByRole("textbox", { name: "Email address" }),
        "recipient@example.com",
      );
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(
        screen.getAllByRole("button", { name: "Transfer" }).at(-1)!,
      );
      expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
      await user.click(
        screen.getAllByRole("button", { name: "Close" }).at(-1)!,
      );
    };

    const { rerender, unmount } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("2 tickets")).toBeInTheDocument();

    await transferGaTicket(0);
    await transferGaTicket(0);

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    expect(await screen.findAllByRole("button", { name: "Cancel transfer" })).toHaveLength(2);

    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
    expect(await screen.findAllByRole("button", { name: "Cancel transfer" })).toHaveLength(1);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();

    unmount();
    const remainingOrder = {
      ...order,
      tickets: [gaTickets[0]!],
    };
    mockedGetMyEvents.mockResolvedValue({ data: [remainingOrder] } as never);
    mockedGetMySentTransfers.mockResolvedValue({
      data: [
        pendingSentTransferStub({
          id: 902,
          order,
          ticket: gaTickets[1]!,
        }),
      ],
    } as never);
    resetWalletApiHydrationForTests();
    render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Upcoming/i }),
    ).toHaveTextContent("1");
  });

  it("restores cancelled transfer events in upcoming date order", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const earlierEvent = DEMO_EVENTS.find((row) => row.shortCode === "ICEDOG5")!;
    const laterEvent = icedogs;
    const earlierTickets = demoCheckoutCart({ ticketCount: 1 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7100 + index,
        eventUUID: earlierEvent.uuid,
      }),
    );
    const laterTickets = demoCheckoutCart({ ticketCount: 1 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7200 + index,
        eventUUID: laterEvent.uuid,
      }),
    );
    const earlierOrder = demoCompletedTicketOrder({
      id: 1475,
      orderId: "1475-643535-0700",
      event: earlierEvent,
      tickets: earlierTickets,
    });
    const laterOrder = demoCompletedTicketOrder({
      id: 1476,
      orderId: "1476-643535-0700",
      event: laterEvent,
      tickets: laterTickets,
    });
    const [transferredTicket] = laterTickets;
    mockedGetMyEvents.mockResolvedValue({
      data: [earlierOrder, laterOrder],
    } as never);
    const sentList = mockMutableSentTransferList();
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend(
        pendingSentTransferStub({
          id: 901,
          order: laterOrder,
          ticket: transferredTicket,
        }),
      );
      return {
        data: {
          id: 901,
          status: "pending",
          createdAt: "2026-09-13T12:00:00.000Z",
        },
      } as never;
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    const initialTitles = (await screen.findAllByText(
      new RegExp(`${earlierEvent.name}|${laterEvent.name}`),
    )).map((node) => node.textContent);
    expect(initialTitles).toEqual([earlierEvent.name, laterEvent.name]);

    navigationMocks.pathname = `/wallet/my-tickets/order/${laterOrder.orderId}/`;
    rerender(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${transferredTicket.seatNumber}` }),
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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    expect(screen.getByText(earlierEvent.name)).toBeInTheDocument();
    expect(screen.queryByText(laterEvent.name)).not.toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    await waitFor(() => {
      expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    });
    const restoredTitles = (
      await screen.findAllByText(
        new RegExp(`${earlierEvent.name}|${laterEvent.name}`),
      )
    ).map((node) => node.textContent);
    expect(restoredTitles).toEqual([earlierEvent.name, laterEvent.name]);
    expect(await screen.findAllByText("1 ticket")).toHaveLength(2);
  });

  it("lists a just-sent transfer first on the transfers page", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const olderEvent = DEMO_EVENTS.find((row) => row.shortCode === "RAPT003")!;
    const olderTickets = demoCheckoutCart({ ticketCount: 4 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7100 + index,
        eventUUID: olderEvent.uuid,
      }),
    );
    const olderOrder = demoCompletedTicketOrder({
      id: 1475,
      orderId: "1475-643535-0700",
      event: olderEvent,
      tickets: olderTickets,
    });
    const [olderTicket] = olderTickets;
    const newTickets = demoCheckoutCart({ ticketCount: 4 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7200 + index,
        eventUUID: icedogs.uuid,
      }),
    );
    const newOrder = demoCompletedTicketOrder({
      id: 1476,
      orderId: "1476-643535-0700",
      event: icedogs,
      tickets: newTickets,
    });
    const [newTicket] = newTickets;

    mockedGetMyEvents.mockResolvedValue({
      data: [olderOrder, newOrder],
    } as never);
    const sentList = mockMutableSentTransferList([
      pendingSentTransferStub({
        id: "older-sent",
        order: olderOrder,
        ticket: olderTicket,
        email: "old@example.com",
        createdAt: "2026-01-01T12:00:00.000Z",
      }),
    ]);
    mockedCreateTicketTransfer.mockImplementation(async () => {
      sentList.prepend(
        pendingSentTransferStub({
          id: 999,
          order: newOrder,
          ticket: newTicket,
          createdAt: "2026-09-13T12:00:00.000Z",
        }),
      );
      return {
        data: {
          id: 999,
          status: "pending",
          createdAt: "2026-09-13T12:00:00.000Z",
        },
      } as never;
    });

    navigationMocks.pathname = "/wallet/my-transfers/";
    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(olderEvent.name)).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${newOrder.orderId}/`;
    rerender(<SeasonTickets />);

    await user.click(await screen.findByRole("button", { name: "Transfer" }));
    await user.click(
      screen.getByRole("button", { name: `Seat ${newTicket.seatNumber}` }),
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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)!,
    );

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);

    const newTitle = await screen.findByText(icedogs.name);
    const oldTitle = screen.getByText(olderEvent.name);
    expect(
      newTitle.compareDocumentPosition(oldTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText(
        `To recipient@example.com · sent ${formatEventWhen(
          "2026-09-13T12:00:00.000Z",
          icedogs.venue?.timezone,
          "MMM D, YYYY",
        )}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Cancel transfer" })).toHaveLength(
      2,
    );
  });

  it("updates the upcoming tab after transferring without refetching the wallet", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets: [ticket],
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(<SeasonTickets />);

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText("No upcoming tickets yet")).toBeInTheDocument();
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
  });

  it("shows one ticket on upcoming after cancelling one of two full-event transfers", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const tickets = demoCheckoutCart({ ticketCount: 2 }).tickets.map(
      (ticket, index) => ({
        ...ticket,
        id: 7200 + index,
        eventUUID: icedogs.uuid,
      }),
    );
    const [firstTicket, secondTicket] = tickets;
    const order = demoCompletedTicketOrder({
      event: icedogs,
      tickets,
    });
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    const sentList = mockMutableSentTransferList();
    mockedCreateTicketTransfer.mockImplementation(async (payload: unknown) => {
      const ticketIds = (payload as { ticketIds?: Array<string | number> })
        .ticketIds ?? [];
      const ticket =
        tickets.find((row) => ticketIds.includes(row.id)) ?? firstTicket;
      const id = ticket.id === firstTicket.id ? 901 : 902;
      sentList.prepend(
        pendingSentTransferStub({
          id,
          order,
          ticket,
          createdAt:
            id === 901 ? "2026-09-12T12:00:00.000Z" : "2026-09-13T12:00:00.000Z",
        }),
      );
      return {
        data: {
          id,
          status: "pending",
          createdAt:
            id === 901 ? "2026-09-12T12:00:00.000Z" : "2026-09-13T12:00:00.000Z",
        },
      } as never;
    });
    mockedCancelMyTransfers.mockResolvedValue({
      data: { status: "cancelled" },
    } as never);

    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("2 tickets")).toBeInTheDocument();

    const transferTicket = async (ticket: (typeof tickets)[number]) => {
      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      rerender(<SeasonTickets />);
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
      expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
      await user.click(
        screen.getAllByRole("button", { name: "Close" }).at(-1)!,
      );
    };

    await transferTicket(firstTicket);
    await transferTicket(secondTicket);

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);
    expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-transfers/";
    rerender(<SeasonTickets />);
    await user.click(
      (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
    );
    await user.click(
      screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
    );
    expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
    expect(screen.queryByText("2 tickets")).not.toBeInTheDocument();
  });

  describe("transfer navigation UX", () => {
    it("loads My Transfers with sent, received, and incoming transfer lists, not the full wallet bundle", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      await waitFor(() => {
        expect(mockedGetMySentTransfers).toHaveBeenCalled();
        expect(mockedGetMyReceivedTransfers).toHaveBeenCalled();
        expect(mockedGetIncomingTransfers).toHaveBeenCalled();
      });
      expect(mockedGetMyEvents).not.toHaveBeenCalled();
      expect(mockedGetMyAccessPasses).not.toHaveBeenCalled();
    });

    it("keeps an accepted season pass on the received tab after accept", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const pass = demoPackageAccessPass();
      const order = demoCompletedPackageOrder();
      const transferedOn = "2026-09-13T19:21:48.735Z";
      const pendingPassTransfer = {
        id: "incoming-pass-1",
        status: "pending",
        transferType: "access_pass",
        accessPassId: pass.uuid,
        fromUserEmail: "sender@example.com",
        access_pass: {
          uuid: pass.uuid,
          name: pass.name,
          type: "package",
          events: pkg.events,
          sectionNumber: pass.sectionNumber,
          rowNumber: pass.rowNumber,
          seatNumber: pass.seatNumber,
        },
        orderId: order.orderId,
        order: {
          orderId: order.orderId,
          package: order.package,
        },
        createdAt: "2026-09-12T19:20:19.451Z",
      };

      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetIncomingTransfers.mockResolvedValue({
        data: [pendingPassTransfer],
      } as never);
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: { status: "accepted", transferedOn },
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      await user.click(await screen.findByRole("button", { name: /received/i }));
      expect(await screen.findByText(pass.name)).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
      await confirmAcceptTransferInPopup(user);

      await waitFor(() => {
        expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
          transferId: "incoming-pass-1",
        });
      });
      expect(await screen.findByText(pass.name)).toBeInTheDocument();
      expect(
        screen.getByText(
          `Claimed · ${formatEventWhen(
            transferedOn,
            pkg.venue?.timezone,
            "MMM D, YYYY",
          )}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Accept transfer" }),
      ).not.toBeInTheDocument();
    });

    it("keeps an accepted season pass on the received tab when history already lists it", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const pass = demoPackageAccessPass();
      const order = demoCompletedPackageOrder();
      const transferedOn = "2026-09-13T19:21:48.735Z";
      const pendingPassTransfer = {
        id: "incoming-pass-1",
        status: "pending",
        transferType: "access_pass",
        accessPassId: pass.uuid,
        fromUserEmail: "sender@example.com",
        access_pass: {
          uuid: pass.uuid,
          name: pass.name,
          type: "package",
          events: pkg.events,
          sectionNumber: pass.sectionNumber,
          rowNumber: pass.rowNumber,
          seatNumber: pass.seatNumber,
        },
        orderId: order.orderId,
        order: {
          orderId: order.orderId,
          package: order.package,
        },
        createdAt: "2026-09-12T19:20:19.451Z",
      };

      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({
        data: [pendingPassTransfer],
      } as never);
      mockedGetIncomingTransfers.mockResolvedValue({
        data: [pendingPassTransfer],
      } as never);
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: { status: "accepted", transferedOn },
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      await user.click(await screen.findByRole("button", { name: /received/i }));
      await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
      await confirmAcceptTransferInPopup(user);

      expect(await screen.findByText(pass.name)).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Accept transfer" }),
      ).not.toBeInTheDocument();
    });

    it("keeps an accepted season pass on received after revisiting My Transfers without refetch", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const pass = demoPackageAccessPass();
      const order = demoCompletedPackageOrder();
      const pendingPassTransfer = {
        id: "incoming-pass-1",
        status: "pending",
        transferType: "access_pass",
        accessPassId: pass.uuid,
        fromUserEmail: "sender@example.com",
        access_pass: {
          uuid: pass.uuid,
          name: pass.name,
          type: "package",
          events: pkg.events,
          sectionNumber: pass.sectionNumber,
          rowNumber: pass.rowNumber,
          seatNumber: pass.seatNumber,
        },
        orderId: order.orderId,
        order: {
          orderId: order.orderId,
          package: order.package,
        },
        createdAt: "2026-09-12T19:20:19.451Z",
      };

      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetIncomingTransfers.mockResolvedValue({
        data: [pendingPassTransfer],
      } as never);
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: {
          status: "accepted",
          transferedOn: "2026-09-13T19:21:48.735Z",
        },
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      const { rerender } = render(<SeasonTickets />);

      await user.click(await screen.findByRole("button", { name: /received/i }));
      await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
      await confirmAcceptTransferInPopup(user);
      expect(await screen.findByText(pass.name)).toBeInTheDocument();

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);
      await user.click(await screen.findByRole("button", { name: /received/i }));

      expect(await screen.findByText(pass.name)).toBeInTheDocument();
    });

    it("accepts from the received tab without refetching incoming transfers", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const order = demoCompletedTicketOrder({ event: icedogs });
      const [ticket] = order.tickets;
      const pendingTransfer = {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "sender@example.com",
        event: order.event,
        tickets: [ticket],
        createdAt: "2026-09-12T19:20:19.451Z",
      };

      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({
        data: [pendingTransfer],
      } as never);
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: { status: "accepted", transferedOn: "2026-09-13T19:21:48.735Z" },
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      await user.click(await screen.findByRole("button", { name: /received/i }));
      await user.click(await screen.findByRole("button", { name: "Accept transfer" }));
      const incomingCallsBeforeAccept = mockedGetIncomingTransfers.mock.calls.length;

      await confirmAcceptTransferInPopup(user);

      await waitFor(() => {
        expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
          transferId: "incoming-1",
        });
      });
      expect(mockedGetIncomingTransfers.mock.calls.length).toBe(
        incomingCallsBeforeAccept,
      );
      expect(mockedGetMyEvents).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("button", { name: "Accept transfer" }),
      ).not.toBeInTheDocument();
    });

    it("reloads My Tickets after accepting on upcoming when the API has no orders yet", async () => {
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
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: { status: "accepted" },
      } as never);

      render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());

      await user.click(
        await screen.findByRole("button", { name: "Accept transfer" }),
      );
      await confirmAcceptTransferInPopup(user);

      await waitFor(() => {
        expect(mockedAcceptIncomingTransfers).toHaveBeenCalledWith({
          transferId: "incoming-1",
        });
      });
      await waitFor(() => {
        expect(mockedGetMyEvents).toHaveBeenCalledWith(
          expect.objectContaining({ fresh: true }),
        );
      });
      expect(
        screen.queryByText("Pending transfer from m.rivera@example.com"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: `View ${icedogs.name}` }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    });

    it("round-trips My Tickets accept through Transfers without duplicate events", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const order = demoCompletedTicketOrder({ event: icedogs });
      const [ticket] = order.tickets;
      const recipientOrder = demoCompletedTicketOrder({
        id: 1310,
        orderId: "1310-recipient-order",
        source: "transfer",
        event: order.event,
        tickets: [ticket],
      });
      mockedGetMyEvents
        .mockResolvedValueOnce({ data: [] } as never)
        .mockResolvedValue({ data: [recipientOrder] } as never);
      mockedGetIncomingTransfers.mockImplementation(async () => ({
        data:
          mockedAcceptIncomingTransfers.mock.calls.length > 0
            ? []
            : [
                {
                  id: "incoming-1",
                  status: "pending",
                  fromUserEmail: "m.rivera@example.com",
                  event: order.event,
                  tickets: [ticket],
                },
              ],
      }));
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedAcceptIncomingTransfers.mockResolvedValue({
        data: { status: "accepted" },
      } as never);

      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetIncomingTransfers).toHaveBeenCalled());

      await user.click(
        await screen.findByRole("button", { name: "Accept transfer" }),
      );
      await confirmAcceptTransferInPopup(user);
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      await waitFor(() =>
        expect(mockedGetMyEvents.mock.calls.length).toBeGreaterThan(1),
      );
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
      expect(screen.getByText("1 ticket")).toBeInTheDocument();
    });

    it("cancels in-flight My Transfers reload when navigating to My Tickets", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const ownedOrder = demoCompletedTicketOrder({ event: icedogs });
      const staleTransfer = {
        id: "stale-transfer-1",
        status: "pending",
        fromUserEmail: "sender@example.com",
        emailAddressToUser: "recipient@example.com",
        event: ownedOrder.event,
        tickets: ownedOrder.tickets,
        createdAt: "2026-09-12T19:20:19.451Z",
      };
      let resolveSentTransfers: (value: { data: unknown[] }) => void = () => {};
      let resolveMyEvents: (value: { data: unknown[] }) => void = () => {};

      mockedGetMySentTransfers.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSentTransfers = resolve;
          }) as never,
      );
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyEvents.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveMyEvents = resolve;
          }) as never,
      );
      mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyAccessPasses.mockResolvedValue({ data: { data: [] } } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());

      await act(async () => {
        resolveSentTransfers({ data: [staleTransfer] });
      });
      await act(async () => {
        resolveMyEvents({ data: [ownedOrder] });
      });

      expect(
        await screen.findByRole("link", { name: `View ${icedogs.name}` }),
      ).toHaveAttribute("href", `/wallet/my-tickets/order/${ownedOrder.orderId}`);
      expect(screen.getByText("My tickets")).toBeInTheDocument();
    });

    it("fetches incoming on My Transfers and again when navigating to My Tickets", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());
      expect(mockedGetIncomingTransfers).toHaveBeenCalledTimes(1);
      expect(mockedGetMyEvents).not.toHaveBeenCalled();

      mockedGetMyReceivedTransfers.mockClear();
      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);

      await waitFor(() => {
        expect(mockedGetMyEvents).toHaveBeenCalled();
        expect(mockedGetIncomingTransfers.mock.calls.length).toBeGreaterThan(1);
      });
      expect(mockedGetMyReceivedTransfers).not.toHaveBeenCalled();
    });

    it("loads My Tickets with wallet routes, not the My Transfers listings bundle", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
      mockedGetIncomingTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);

      navigationMocks.pathname = "/wallet/my-tickets/";
      render(<SeasonTickets />);

      await waitFor(() => {
        expect(mockedGetMyEvents).toHaveBeenCalled();
        expect(mockedGetMyAccessPasses).toHaveBeenCalled();
        expect(mockedGetIncomingTransfers).toHaveBeenCalled();
      });
      expect(mockedGetMyReceivedTransfers).not.toHaveBeenCalled();
    });

    it("loads resale listings without the wallet tickets or transfer bundle", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);

      navigationMocks.pathname = "/wallet/my-listings/";
      render(<SeasonTickets />);

      await waitFor(() => {
        expect(mockedGetMyListings).toHaveBeenCalled();
      });
      expect(mockedGetMyEvents).not.toHaveBeenCalled();
      expect(mockedGetMySentTransfers).not.toHaveBeenCalled();
      expect(mockedGetIncomingTransfers).not.toHaveBeenCalled();
      expect(mockedGetMyReceivedTransfers).not.toHaveBeenCalled();
    });

    it("does not fetch wallet routes on profile or giving", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);

      navigationMocks.pathname = "/wallet/my-profile/";
      const { rerender } = render(<SeasonTickets />);
      expect(await screen.findByRole("heading", { name: "Profile", level: 1 })).toBeInTheDocument();
      expect(mockedGetMyEvents).not.toHaveBeenCalled();
      expect(mockedGetMyListings).not.toHaveBeenCalled();
      expect(mockedGetMySentTransfers).not.toHaveBeenCalled();

      navigationMocks.pathname = "/wallet/giving/";
      rerender(<SeasonTickets />);
      expect(await screen.findByRole("heading", { name: "Giving", level: 1 })).toBeInTheDocument();
      expect(mockedGetMyEvents).not.toHaveBeenCalled();
      expect(mockedGetMyListings).not.toHaveBeenCalled();
      expect(mockedGetMySentTransfers).not.toHaveBeenCalled();
    });

    it("shows received tab count after initial load without switching tabs", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const order = demoCompletedTicketOrder({ event: icedogs });
      const [ticket] = order.tickets;
      const pendingTransfer = {
        id: "incoming-1",
        status: "pending",
        fromUserEmail: "sender@example.com",
        event: order.event,
        tickets: [ticket],
        createdAt: "2026-09-12T19:20:19.451Z",
      };
      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({
        data: [pendingTransfer],
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      const receivedTab = await screen.findByRole("button", { name: /received/i });
      await waitFor(() => {
        expect(receivedTab.textContent).toMatch(/1/);
      });
    });

    it("keeps the transfers loader until sent ticket-transfers finish loading", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
      let resolveTransfers!: (value: unknown) => void;
      const transfersPending = new Promise((resolve) => {
        resolveTransfers = resolve;
      });
      mockedGetMySentTransfers.mockReturnValue(transfersPending as never);
      mockedGetMyReceivedTransfers.mockReturnValue(transfersPending as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      expect(await screen.findByLabelText("Loading tickets")).toBeInTheDocument();
      resolveTransfers({ data: [] });
      await waitFor(() => {
        expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
      });
    });

    it("clears the transfers loader when leaving My Transfers mid-fetch", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      mockedGetMyEvents.mockResolvedValue({ data: [] } as never);
      let resolveTransfers!: (value: unknown) => void;
      const transfersPending = new Promise((resolve) => {
        resolveTransfers = resolve;
      });
      mockedGetMySentTransfers.mockReturnValue(transfersPending as never);
      mockedGetMyReceivedTransfers.mockReturnValue(transfersPending as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      const { rerender } = render(<SeasonTickets />);
      expect(await screen.findByLabelText("Loading tickets")).toBeInTheDocument();

      mockedGetMySentTransfers.mockResolvedValue({ data: [] } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      await waitFor(() => {
        expect(screen.getByText("My tickets")).toBeInTheDocument();
      });

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);
      await waitFor(() => {
        expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
      });
      expect(screen.getByText("No transfers sent")).toBeInTheDocument();
    });

    it("keeps existing sent transfers visible when appending a new local send after My Transfers refetches", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const gaTickets = [
        {
          id: 9101,
          uuid: "ticket-ga-1",
          checkInCode: "GA-1",
          eventUUID: icedogs.uuid,
          generalAdmission: true,
          sectionName: "General Admission",
          sectionNumber: "Club",
          rowNumber: undefined,
          seatNumber: undefined,
          cost: 25,
          price: 25,
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
          rowNumber: undefined,
          seatNumber: undefined,
          cost: 25,
          price: 25,
          offerName: "General admission",
        },
      ];
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: gaTickets,
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [
          pendingSentTransferStub({
            id: 901,
            order,
            ticket: gaTickets[0]!,
            email: "first@example.com",
          }),
        ],
      } as never);
      mockedCreateTicketTransfer.mockResolvedValue({
        data: { id: 902, status: "pending" },
      } as never);

      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());
      const sentCallsAfterMount = mockedGetMySentTransfers.mock.calls.length;

      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      rerender(<SeasonTickets />);

      await user.click(await screen.findByRole("button", { name: "Transfer" }));
      await user.click(screen.getAllByRole("button", { name: "GA" })[0]!);
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.type(
        screen.getByRole("textbox", { name: "Email address" }),
        "second@example.com",
      );
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(
        screen.getAllByRole("button", { name: "Transfer" }).at(-1)!,
      );
      expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
      await user.click(
        screen.getAllByRole("button", { name: "Close" }).at(-1)!,
      );

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);

      expect(await screen.findAllByRole("button", { name: "Cancel transfer" })).toHaveLength(
        2,
      );
      expect(screen.getByText(/first@example\.com/)).toBeInTheDocument();
      expect(screen.getByText(/second@example\.com/)).toBeInTheDocument();
      expect(mockedGetMySentTransfers.mock.calls.length).toBeGreaterThan(
        sentCallsAfterMount,
      );
    });

    it("refetches sent transfers before showing My Transfers after send via the modal link", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      const sentTransfer = pendingSentTransferStub({
        id: 901,
        order,
        ticket,
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedCreateTicketTransfer.mockResolvedValue({ data: null } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [sentTransfer],
      } as never);

      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
      const sentCallsAfterMount = mockedGetMySentTransfers.mock.calls.length;

      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      rerender(<SeasonTickets />);

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
      expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
      expect(mockedGetMySentTransfers.mock.calls.length).toBe(
        sentCallsAfterMount,
      );

      mockedGetMySentTransfers.mockClear();
      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);

      expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Cancel transfer" }),
      ).not.toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: "Cancel transfer" }),
      ).toBeInTheDocument();
      expect(mockedGetMySentTransfers).toHaveBeenCalled();
    });

    it("shows accessPassSnapshot event count on pending sent season pass transfers", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const pkg = demoSeasonPackage();
      const pass = demoPackageAccessPass();
      const order = demoCompletedPackageOrder();
      const pastEvent = {
        uuid: "evt-nmstate-past",
        name: "Past Home Opener",
        start: "2025-09-01T19:00:00.000Z",
        venue: pkg.venue,
      };
      const fullEvents = [pastEvent, ...pkg.events];
      mockedGetMySentTransfers.mockResolvedValue({
        data: [
          {
            id: "sent-pass-1",
            status: "pending",
            transferType: "access_pass",
            accessPassId: pass.uuid,
            accessPassSnapshot: {
              uuid: pass.uuid,
              name: pass.name,
              type: "package",
              events: pkg.events.slice(1),
              sectionNumber: pass.sectionNumber,
              rowNumber: pass.rowNumber,
              seatNumber: pass.seatNumber,
            },
            access_pass: {
              uuid: pass.uuid,
              name: pass.name,
              type: "package",
              events: pkg.events.slice(1),
              sectionNumber: pass.sectionNumber,
              rowNumber: pass.rowNumber,
              seatNumber: pass.seatNumber,
            },
            orderId: order.orderId,
            order: {
              orderId: order.orderId,
              package: {
                ...order.package,
                events: fullEvents,
              },
            },
            createdAt: "2026-09-16T12:00:00.000Z",
          },
        ],
      } as never);
      mockedGetMyReceivedTransfers.mockResolvedValue({ data: [] } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);

      expect(
        await screen.findByText(`${pkg.events.slice(1).length} events`),
      ).toBeInTheDocument();
      expect(screen.queryByText(`${fullEvents.length} events`)).not.toBeInTheDocument();
      expect(mockedGetAccessPassesByOrder).not.toHaveBeenCalled();
    });

    it("does not refetch sent transfers after cancel success on My Transfers", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      const sentTransfer = pendingSentTransferStub({
        id: 901,
        order,
        ticket,
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [sentTransfer],
      } as never);
      mockedCancelMyTransfers.mockResolvedValue({
        data: { status: "cancelled" },
      } as never);

      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMySentTransfers).toHaveBeenCalled());
      const sentCallsAfterOpen = mockedGetMySentTransfers.mock.calls.length;

      await user.click(
        (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
      );
      await user.click(
        screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
      );
      expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
      expect(mockedGetMySentTransfers.mock.calls.length).toBe(
        sentCallsAfterOpen,
      );
      expect(mockedCancelMyTransfers).toHaveBeenCalledWith("901");
    });

    it("does not refetch wallet events after cancel when returning to My Tickets", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      const sentTransfer = pendingSentTransferStub({
        id: 901,
        order,
        ticket,
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [sentTransfer],
      } as never);
      mockedCancelMyTransfers.mockResolvedValue({
        data: { status: "cancelled" },
      } as never);

      navigationMocks.pathname = "/wallet/my-tickets/";
      const { rerender } = render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
      const eventsCallsAfterMount = mockedGetMyEvents.mock.calls.length;

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);
      await user.click(
        (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
      );
      await user.click(
        screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
      );
      expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();
      expect(mockedCancelMyTransfers).toHaveBeenCalledTimes(1);

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
      expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsAfterMount);
    });

    it("send transfer only calls ticket-transfer API before closing modal", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedCreateTicketTransfer.mockResolvedValue({
        data: { id: 902, status: "pending" },
      } as never);

      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      render(<SeasonTickets />);
      await waitFor(() => expect(mockedGetMyEvents).toHaveBeenCalled());
      const eventsCallsAfterMount = mockedGetMyEvents.mock.calls.length;
      const sentCallsAfterMount = mockedGetMySentTransfers.mock.calls.length;

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
      expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();
      expect(mockedCreateTicketTransfer).toHaveBeenCalledTimes(1);
      expect(mockedGetMySentTransfers.mock.calls.length).toBe(
        sentCallsAfterMount,
      );
      expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsAfterMount);

      await user.click(
        screen.getAllByRole("button", { name: "Close" }).at(-1)!,
      );
      expect(mockedGetMyEvents.mock.calls.length).toBe(eventsCallsAfterMount);
      expect(mockedGetMySentTransfers.mock.calls.length).toBe(
        sentCallsAfterMount,
      );
      expect(mockedGetAccessPassesByOrder).not.toHaveBeenCalled();
    });

    it.each([
      {
        label: "optimistic transfer id",
        createResponse: { data: null } as never,
      },
      {
        label: "real API transfer id with mismatched order ids",
        createResponse: {
          data: { id: 901, status: "pending" },
        } as never,
      },
    ])(
      "dedupes pending sent rows when My Transfers merges API and local transfer ($label)",
      async ({ createResponse }) => {
        const user = userEvent.setup();
        sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
        const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
        const order = demoCompletedTicketOrder({
          event: icedogs,
          tickets: [ticket],
        });
        const sentList = mockMutableSentTransferList();
        mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
        mockedCreateTicketTransfer.mockImplementation(async () => {
          sentList.prepend({
            ...pendingSentTransferStub({ id: 901, order, ticket }),
            orderId: 12345,
          });
          return createResponse;
        });

        const { rerender } = render(<SeasonTickets />);
        navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
        rerender(<SeasonTickets />);

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
        await user.click(
          screen.getAllByRole("button", { name: "Close" }).at(-1)!,
        );

        navigationMocks.pathname = "/wallet/my-transfers/";
        rerender(<SeasonTickets />);

        expect(
          await screen.findAllByRole("button", { name: "Cancel transfer" }),
        ).toHaveLength(1);
      },
    );

    it("send round trip keeps local ticket removal and shows merged sent list", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const olderEvent = DEMO_EVENTS.find((row) => row.shortCode === "RAPT003")!;
      const olderOrder = demoCompletedTicketOrder({
        event: olderEvent,
        tickets: demoCheckoutCart({ ticketCount: 1 }).tickets.map(
          (ticket, index) => ({
            ...ticket,
            id: 7100 + index,
            eventUUID: olderEvent.uuid,
          }),
        ),
      });
      const [olderTicket] = olderOrder.tickets;
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      mockedGetMyEvents.mockResolvedValue({
        data: [olderOrder, order],
      } as never);
      const sentList = mockMutableSentTransferList([
        pendingSentTransferStub({
          id: 800,
          order: olderOrder,
          ticket: olderTicket,
          createdAt: "2026-09-12T12:00:00.000Z",
        }),
      ]);
      mockedCreateTicketTransfer.mockImplementation(async () => {
        sentList.prepend(
          pendingSentTransferStub({ id: 901, order, ticket }),
        );
        return { data: null } as never;
      });

      navigationMocks.pathname = "/wallet/my-tickets/";
      const { rerender } = render(<SeasonTickets />);
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

      navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
      rerender(<SeasonTickets />);

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
      await user.click(
        screen.getAllByRole("button", { name: "Close" }).at(-1)!,
      );

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      expect(screen.queryByText(icedogs.name)).not.toBeInTheDocument();

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);
      expect(
        await screen.findAllByRole("button", { name: "Cancel transfer" }),
      ).toHaveLength(2);
    });

    it("cancel round trip restores ticket locally and hides canceled transfer on return", async () => {
      const user = userEvent.setup();
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      const sentTransfer = pendingSentTransferStub({
        id: 901,
        order,
        ticket,
      });
      mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [sentTransfer],
      } as never);
      mockedCancelMyTransfers.mockResolvedValue({
        data: { status: "cancelled" },
      } as never);

      navigationMocks.pathname = "/wallet/my-tickets/";
      const { rerender, unmount } = render(<SeasonTickets />);
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();

      navigationMocks.pathname = "/wallet/my-transfers/";
      rerender(<SeasonTickets />);
      await user.click(
        (await screen.findAllByRole("button", { name: "Cancel transfer" }))[0]!,
      );
      await user.click(
        screen.getAllByRole("button", { name: "Cancel transfer" }).at(-1)!,
      );
      expect(await screen.findByText("Transfer cancelled")).toBeInTheDocument();

      navigationMocks.pathname = "/wallet/my-tickets/";
      rerender(<SeasonTickets />);
      expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
      expect(screen.getByText("1 ticket")).toBeInTheDocument();

      unmount();
      mockedGetMySentTransfers.mockResolvedValue({
        data: [{ ...sentTransfer, status: "canceled" }],
      } as never);
      navigationMocks.pathname = "/wallet/my-transfers/";
      render(<SeasonTickets />);
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Cancel transfer" }),
        ).not.toBeInTheDocument();
      });
    });

    it("remount uses API wallet data without session restore overlay", async () => {
      sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
      const [ticket] = demoCompletedTicketOrder({ event: icedogs }).tickets;
      const order = demoCompletedTicketOrder({
        event: icedogs,
        tickets: [ticket],
      });
      mockedGetMyEvents.mockResolvedValue({
        data: [{ ...order, tickets: [] }],
      } as never);
      mockedGetMySentTransfers.mockResolvedValue({
        data: [
          pendingSentTransferStub({
            id: 901,
            order,
            ticket,
          }),
        ],
      } as never);

      render(<SeasonTickets />);
      expect(await screen.findByText("No upcoming tickets yet")).toBeInTheDocument();
    });
  });

  it("lowers the upcoming ticket count after a partial transfer without refetching", async () => {
    const user = userEvent.setup();
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    const order = demoCompletedTicketOrder({ event: icedogs });
    const [ticket] = order.tickets;
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);

    const { rerender } = render(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(`${order.tickets.length} tickets`)).toBeInTheDocument();

    navigationMocks.pathname = `/wallet/my-tickets/order/${order.orderId}/`;
    rerender(<SeasonTickets />);

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
    expect(await screen.findByText(transferSuccessTitle("ticket", 1))).toBeInTheDocument();

    navigationMocks.pathname = "/wallet/my-tickets/";
    rerender(<SeasonTickets />);

    expect(await screen.findByText(icedogs.name)).toBeInTheDocument();
    expect(screen.getByText(`${order.tickets.length - 1} tickets`)).toBeInTheDocument();
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
      screen.queryByText(transferSuccessTitle("ticket", 1)),
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
    expect(screen.queryByText(transferSuccessTitle("ticket", 1))).not.toBeInTheDocument();
  });

  it("shows assigned copy when ticket transfer is rejected because tickets are already assigned", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockRejectedValue({
      response: {
        status: 402,
        data: {
          error: {
            message: TICKET_TRANSFER_API_ERROR_MESSAGES.alreadyAssigned,
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
      ticketTransferAssignedCopy(1),
    );
    expect(screen.queryByText(transferSuccessTitle("ticket", 1))).not.toBeInTheDocument();
  });

  it("shows a retry message when ticket transfer fails with an unmapped 402", async () => {
    const user = userEvent.setup();
    const order = demoCompletedTicketOrder({ event: icedogs });
    const ticket = order.tickets[0];
    mockedGetMyEvents.mockResolvedValue({ data: [order] } as never);
    mockedCreateTicketTransfer.mockRejectedValue({
      response: {
        status: 402,
        data: { error: { message: "Unknown ticket transfer error" } },
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
      TICKET_TRANSFER_DISPLAY_COPY.failed,
    );
    expect(screen.queryByText(transferSuccessTitle("ticket", 1))).not.toBeInTheDocument();
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

  it("shows the access-pass QR on a phone instead of the desktop scan hint", async () => {
    render(<SeasonTickets />);

    expect(
      await screen.findByRole("button", { name: `Show QR code for ${pass.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tap the QR code to scan at entry for any included event or add this pass to your Apple/Google wallet.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Show the QR code straight from your phone to scan at entry for any included event.",
      ),
    ).not.toBeInTheDocument();
  });

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
    expect(screen.getAllByText("GA")).toHaveLength(2);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
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

  it("shows the printable offer name on the phone ticket card", async () => {
    render(<SeasonTickets />);

    expect(
      await screen.findAllByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toHaveLength(order.tickets.length);
  });

  it("hides the default Tickets badge on the phone ticket when the offer is not printable", async () => {
    const listed = demoCompletedTicketOrder({
      event: icedogs,
      tickets: demoCheckoutCart({ ticketCount: 1 }).tickets.map((ticket) => ({
        ...ticket,
        offerName: "Standard Admission",
        offer: { name: "Standard Admission" },
      })),
    });
    mockedGetMyEvents.mockResolvedValue({ data: [listed] } as never);
    navigationMocks.pathname = `/wallet/my-tickets/order/${listed.orderId}/`;

    render(<SeasonTickets />);

    expect(
      await screen.findAllByRole("button", { name: "View QR-Code" }),
    ).toHaveLength(1);
    expect(screen.queryByText("Tickets")).not.toBeInTheDocument();
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
      screen.getByRole("heading", { name: seatLabel(ticket) }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code/i })).toBeInTheDocument();
    expect(screen.getByText("Scan this code at entry")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: seatLabel(ticket) }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR code/i })).not.toBeInTheDocument();

    const sheet = screen
      .getByRole("heading", { name: "Ticket details" })
      .closest("div")?.parentElement;
    fireEvent.click(sheet!);
    expect(
      screen.getByRole("heading", { name: "Ticket details" }),
    ).toBeInTheDocument();
    fireEvent.click(sheet!.parentElement!);
    expect(
      screen.queryByRole("heading", { name: "Ticket details" }),
    ).not.toBeInTheDocument();
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
      expect(mockedDownloadGooglePass).toHaveBeenCalledWith({
        event: expect.objectContaining({ uuid: icedogs.uuid }),
        ticket: expect.objectContaining({ checkInCode: ticket.checkInCode }),
      });
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

describe("SeasonTickets code screen", () => {
  it("tells the shopper codes expire after 5 minutes", async () => {
    sessionMocks.getSession.mockReturnValue(DEMO_SESSION);
    render(<SeasonTickets initialScreen="code" />);

    expect(
      await screen.findByRole("heading", { name: /enter your code/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(DEMO_USER.email)).toBeInTheDocument();
    expect(
      screen.getByText(/codes expire after 5 minutes/i),
    ).toBeInTheDocument();
  });
});
