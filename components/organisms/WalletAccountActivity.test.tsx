import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import moment from "moment-timezone";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletAccountActivity, { WalletActivityPage, __resetActivitySnapshotForTests } from "@/components/organisms/WalletAccountActivity";
import {
  DEMO_USER,
  demoAccessPassTemplate,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoFlexPack,
  demoCompletedTicketOrder,
  demoLinkedBankAccount,
  demoSeasonPackage,
  demoSoldListing,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  getMyUpcomingOrders: vi.fn(),
  getOrder: vi.fn(),
  getFlexPack: vi.fn(),
  getMyListings: vi.fn(async () => ({ data: [] })),
  getBankAccount: vi.fn(async () => ({ data: null })),
}));

vi.mock("@/lib/completedOrder", async () => {
  const actual = await vi.importActual<typeof import("@/lib/completedOrder")>(
    "@/lib/completedOrder",
  );
  return { ...actual, fetchCompletedOrder: vi.fn() };
});

vi.mock("@/lib/orderReceipt", () => ({
  downloadOrderReceipt: vi.fn(),
  shopperReceiptDownload: vi.fn(
    async (input: { order: unknown; user?: unknown }) => ({
      order: input.order,
      purchaser: input.user,
      sellerLogoUrl: "shared-receipt-logo",
      sellerName: "Shared seller",
    }),
  ),
}));

import { getBankAccount, getFlexPack, getMyListings, getMyUpcomingOrders, getOrder } from "@/lib/api";
import { fetchCompletedOrder } from "@/lib/completedOrder";
import { downloadOrderReceipt, shopperReceiptDownload } from "@/lib/orderReceipt";

const mockedGetMyUpcomingOrders = vi.mocked(getMyUpcomingOrders);
const mockedGetOrder = vi.mocked(getOrder);
const mockedGetFlexPack = vi.mocked(getFlexPack);
const mockedFetchCompletedOrder = vi.mocked(fetchCompletedOrder);
const mockedGetMyListings = vi.mocked(getMyListings);
const mockedGetBankAccount = vi.mocked(getBankAccount);
const mockedDownloadOrderReceipt = vi.mocked(downloadOrderReceipt);
const mockedShopperReceiptDownload = vi.mocked(shopperReceiptDownload);

function invoiceOrders() {
  const base = demoCompletedTicketOrder();
  const ticket = demoCompletedTicketOrder({
    createdAt: "2026-10-21T22:48:00.000Z",
    status: "complete",
    tickets: (base.tickets as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      transferred: true,
    })),
    users_permissions_user: {
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      email: DEMO_USER.email,
    },
  });
  const season = demoCompletedPackageOrder({
    id: 1475,
    createdAt: "2026-09-15T19:05:00.000Z",
    status: "refunded",
  });
  return { ticket, season };
}

function orderedDate(createdAt: string, timezone?: string) {
  const parsed = timezone ? moment.tz(createdAt, timezone) : moment(createdAt);
  return parsed.format("MMM D, YYYY, h:mm A");
}

describe("WalletAccountActivity", () => {
  beforeEach(() => {
    __resetActivitySnapshotForTests();
    mockedGetMyUpcomingOrders.mockReset();
    mockedGetOrder.mockReset();
    mockedGetFlexPack.mockReset();
    mockedFetchCompletedOrder.mockReset();
    mockedGetMyListings.mockReset();
    mockedGetBankAccount.mockReset();
    mockedDownloadOrderReceipt.mockReset();
    mockedDownloadOrderReceipt.mockResolvedValue(undefined);
    mockedShopperReceiptDownload.mockReset();
    mockedShopperReceiptDownload.mockImplementation(
      (async (input: { order?: unknown; user?: unknown }) => ({
        order: input.order,
        purchaser: input.user,
        sellerLogoUrl: "shared-receipt-logo",
        sellerName: "Shared seller",
      })) as never,
    );
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [] } as never);
    mockedGetMyListings.mockResolvedValue({ data: [] } as never);
    mockedGetBankAccount.mockResolvedValue({ data: null } as never);
  });

  it("shows a spinner in account activity until orders load", () => {
    mockedGetMyUpcomingOrders.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletAccountActivity />);
    expect(screen.getByRole("status", { name: "Loading activity" })).toBeInTheDocument();
    expect(screen.queryByText("Nothing here yet")).not.toBeInTheDocument();
  });

  it("keeps the loaded account activity when the profile list opens again", async () => {
    const order = demoCompletedTicketOrder();
    const eventName = (order.event as { name?: string }).name || "";
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [order] } as never);

    const profile = render(<WalletAccountActivity />);
    expect(await screen.findByText(eventName)).toBeInTheDocument();
    expect(mockedGetMyUpcomingOrders).toHaveBeenCalledTimes(1);
    profile.unmount();

    const activity = render(<WalletActivityPage />);
    expect(screen.getByText(eventName)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading tickets" })).not.toBeInTheDocument();
    activity.unmount();

    render(<WalletAccountActivity />);
    expect(screen.getByText(eventName)).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading activity" })).not.toBeInTheDocument();
    expect(mockedGetMyUpcomingOrders).toHaveBeenCalledTimes(1);
  });

  it("shows the empty account activity when there are no orders", async () => {
    render(<WalletAccountActivity />);
    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Purchases, payouts, and refunds will appear here.")).toBeInTheDocument();
  });

  it("lists orders newest first and downloads that order receipt", async () => {
    const user = userEvent.setup();
    const { ticket, season } = invoiceOrders();
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [season, ticket] } as never);
    render(<WalletAccountActivity />);

    const ticketEvent = ticket.event as { name?: string; venue?: { timezone?: string }; organization?: { name?: string } };
    const ticketName = String(ticketEvent.name);
    const seasonName = String((season.package as { name?: string }).name);
    const ordered = orderedDate(String((ticket as { createdAt?: string }).createdAt), ticketEvent.venue?.timezone);
    const ticketLine = `Purchase · ${ordered} · ${(ticket.tickets as unknown[]).length} tickets`;

    expect(await screen.findByText(ticketLine)).toBeInTheDocument();
    const ticketRow = screen.getByText(ticketName);
    const seasonRow = screen.getByText(seasonName);
    expect(
      ticketRow.compareDocumentPosition(seasonRow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("Transferred")).not.toBeInTheDocument();
    expect(screen.getByText("Refunded")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(Number(ticket.total)))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(Number(season.total)))).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Event" })).not.toBeInTheDocument();

    const downloads = screen.getAllByRole("button", { name: "Receipt" });
    await user.click(downloads[0]);

    expect(mockedShopperReceiptDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        hydratePricing: true,
        order: expect.objectContaining({ orderId: ticket.orderId }),
        user: expect.objectContaining({ email: DEMO_USER.email }),
      }),
    );
    expect(mockedDownloadOrderReceipt).toHaveBeenCalledWith({
      order: expect.objectContaining({ orderId: ticket.orderId }),
      purchaser: expect.objectContaining({ email: DEMO_USER.email }),
      sellerLogoUrl: "shared-receipt-logo",
      sellerName: "Shared seller",
    });
  });

  it("downloads an activity-page receipt through the same checkout receipt", async () => {
    const user = userEvent.setup();
    const { ticket } = invoiceOrders();
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [ticket] } as never);
    render(<WalletActivityPage />);

    await user.click(await screen.findByRole("button", { name: "Receipt" }));

    expect(mockedShopperReceiptDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        hydratePricing: true,
        order: expect.objectContaining({ orderId: ticket.orderId }),
      }),
    );
    expect(mockedDownloadOrderReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        sellerLogoUrl: "shared-receipt-logo",
        sellerName: "Shared seller",
      }),
    );
  });

  it("shows only the four newest orders", async () => {
    const orders = [0, 1, 2, 3, 4].map((index) => {
      const base = demoCompletedTicketOrder();
      return demoCompletedTicketOrder({
        id: 2000 + index,
        createdAt: `2026-10-${String(10 + index).padStart(2, "0")}T18:00:00.000Z`,
        event: { ...(base.event as object), name: `Game ${index}` },
      });
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: orders } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText("Game 4")).toBeInTheDocument();
    expect(screen.getByText("Game 3")).toBeInTheDocument();
    expect(screen.getByText("Game 2")).toBeInTheDocument();
    expect(screen.getByText("Game 1")).toBeInTheDocument();
    expect(screen.queryByText("Game 0")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Receipt" })).toHaveLength(4);
    expect(screen.getByRole("link", { name: "View all activity" })).toHaveAttribute("href", "/wallet/my-profile/activity/");
  });

  it("shows the ticket blocks while the activity page is loading", () => {
    mockedGetMyUpcomingOrders.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletActivityPage />);
    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^All / })).not.toBeInTheDocument();
  });

  it("lists every order and filters purchases, refunds, and resale", async () => {
    const user = userEvent.setup();
    const base = demoCompletedTicketOrder();
    const orders = [0, 1, 2, 3].map((index) =>
      demoCompletedTicketOrder({
        id: 2000 + index,
        status: index === 3 ? "refunded" : "complete",
        createdAt: `2026-10-${String(10 + index).padStart(2, "0")}T18:00:00.000Z`,
        event: { ...(base.event as object), name: `Game ${index}` },
      }),
    );
    const held = demoSoldListing();
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: orders } as never);
    mockedGetMyListings.mockResolvedValue({
      data: [
        demoSoldListing({
          payout: 184,
          fundsClaimed: false,
          soldAt: "2026-10-23T18:00:00.000Z",
          event: {
            ...(held.event as object),
            name: "Bulls vs. Lone Star Brahmas",
            start: "2026-12-01T23:00:00.000Z",
            end: "2026-12-02T02:00:00.000Z",
          },
        }),
      ],
    } as never);
    render(<WalletActivityPage />);

    expect(await screen.findByRole("heading", { name: "Account activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to profile" })).toHaveAttribute("href", "/wallet/my-profile/");
    expect(screen.getByRole("link", { name: "Back to profile" })).toHaveAttribute("data-in-app-back", "true");
    expect(screen.getByText("Purchases, payouts, and refunds on your account.")).toBeInTheDocument();
    expect(screen.queryByText("CREDIT BALANCE")).not.toBeInTheDocument();
    expect(await screen.findByText("Game 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All 5" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Purchases 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refunds 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resale 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Credits / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Gifts / })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Purchases 3" }));
    expect(screen.getByText("Game 2")).toBeInTheDocument();
    expect(screen.queryByText("Game 3")).not.toBeInTheDocument();
    expect(screen.queryByText(/tickets sold/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Refunds 1" }));
    expect(screen.getByText("Game 3")).toBeInTheDocument();
    expect(screen.queryByText("Game 2")).not.toBeInTheDocument();
  });

  it("shows row icons on the activity page and leaves them off the profile list", async () => {
    mockedGetMyListings.mockResolvedValue({ data: [demoSoldListing({ payout: 40 })] } as never);

    const profile = render(<WalletAccountActivity />);
    expect(await screen.findByText("1 ticket sold")).toBeInTheDocument();
    expect(document.querySelector(".bt-activity-mark")).toBeNull();
    profile.unmount();

    render(<WalletActivityPage />);
    expect(await screen.findByText("1 ticket sold")).toBeInTheDocument();
    expect(document.querySelector(".bt-activity-mark")).not.toBeNull();
  });

  it("shows a sold resale on hold, and the bank account once the payout is processed", async () => {
    const held = demoSoldListing();
    const event = {
      ...(held.event as object),
      name: "Bulls vs. Lone Star Brahmas",
    };
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [] } as never);
    mockedGetBankAccount.mockResolvedValue({ data: demoLinkedBankAccount() } as never);
    mockedGetMyListings.mockResolvedValue({
      data: [
        demoSoldListing({
          id: "listing-held",
          payout: 184,
          quantity: 2,
          fundsClaimed: false,
          soldAt: "2026-10-23T18:00:00.000Z",
          event: { ...event, start: "2026-12-01T23:00:00.000Z", end: "2026-12-02T02:00:00.000Z" },
        }),
        demoSoldListing({
          id: "listing-paid",
          payout: 90,
          quantity: 1,
          fundsClaimed: true,
          soldAt: "2026-09-02T18:00:00.000Z",
          event: { ...event, name: "Ice Rays", start: "2026-09-01T23:00:00.000Z", end: "2026-09-02T02:00:00.000Z" },
        }),
      ],
    } as never);
    render(<WalletActivityPage />);

    expect(await screen.findByText("2 tickets sold")).toBeInTheDocument();
    expect(screen.getByText("Resale · Oct 23, 2026 · Bulls vs. Lone Star Brahmas")).toBeInTheDocument();
    expect(screen.getByText("Payout on hold")).toBeInTheDocument();
    expect(screen.getByText("+$184.00")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View payout" })).not.toBeInTheDocument();
    expect(screen.getByText("1 ticket sold")).toBeInTheDocument();
    expect(screen.getByText("· To account ••5556")).toBeInTheDocument();
    expect(screen.getByText("+$90.00")).toBeInTheDocument();
  });

  it("names the selected tab when that activity list is empty", async () => {
    const user = userEvent.setup();
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [demoCompletedTicketOrder()] } as never);
    render(<WalletActivityPage />);

    await user.click(await screen.findByRole("button", { name: "Refunds 0" }));
    expect(screen.getByText("No refunds yet")).toBeInTheDocument();
    expect(screen.getByText("Refunds will show up here.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing here yet")).not.toBeInTheDocument();
  });

  it("counts the purchased seats when they are no longer linked to the order", async () => {
    const base = demoCompletedTicketOrder();
    const purchased = (base.tickets as Array<Record<string, unknown>>).map((ticket) => ({
      ...ticket,
      transferred: true,
    }));
    const moved = demoCompletedTicketOrder({
      tickets: [],
      originalTickets: purchased,
      status: "complete",
      createdAt: "2026-10-21T22:48:00.000Z",
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [moved] } as never);
    render(<WalletAccountActivity />);

    const timezone = (base.event as { venue?: { timezone?: string } }).venue?.timezone;
    expect(await screen.findByText(`Purchase · ${orderedDate("2026-10-21T22:48:00.000Z", timezone)} · ${purchased.length} tickets`)).toBeInTheDocument();
    expect(screen.queryByText("Transferred")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
  });

  it("shows the purchase time without a resold badge", async () => {
    const base = demoCompletedTicketOrder();
    const listed = demoCompletedTicketOrder({
      id: 1501,
      status: "complete",
      createdAt: "2026-10-21T22:48:00.000Z",
      tickets: (base.tickets as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        resale: true,
        on_sale_status: "resaleAvailable",
      })),
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [listed] } as never);
    render(<WalletAccountActivity />);

    const timezone = (base.event as { venue?: { timezone?: string } }).venue?.timezone;
    expect(await screen.findByText(`Purchase · ${orderedDate(String((listed as { createdAt?: string }).createdAt), timezone)} · ${(listed.tickets as unknown[]).length} tickets`)).toBeInTheDocument();
    expect(screen.queryByText("Resold")).not.toBeInTheDocument();
    expect(screen.queryByText("Transferred")).not.toBeInTheDocument();
  });

  it("shows the package name when a package order also has an event", async () => {
    const pkg = demoSeasonPackage();
    const season = demoCompletedPackageOrder({
      createdAt: "2026-11-12T23:52:00.000Z",
      status: "complete",
      event: {
        name: "First game of the season",
        venue: pkg.venue,
      },
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [season] } as never);
    render(<WalletAccountActivity />);

    const timezone = pkg.venue?.timezone;
    expect(await screen.findByText(pkg.name)).toBeInTheDocument();
    expect(screen.queryByText("First game of the season")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        `Purchase · ${orderedDate("2026-11-12T23:52:00.000Z", timezone)} · ${(season.tickets as unknown[]).length} tickets`,
      ),
    ).toBeInTheDocument();
  });

  it("shows a flex pack by its name and voucher count", async () => {
    const flex = demoCompletedFlexPackOrder({
      createdAt: "2026-11-13T01:19:00.000Z",
    });
    const pack = flex.flex_pack as { name: string; gameTickets: number; venue?: { timezone?: string } };
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [flex] } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(pack.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        `Purchase · ${orderedDate("2026-11-13T01:19:00.000Z", pack.venue?.timezone)} · ${pack.gameTickets} vouchers`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
  });

  it("names a flex pack from the saved order when the activity list omits it", async () => {
    const flex = demoCompletedFlexPackOrder({
      createdAt: "2026-11-13T01:19:00.000Z",
    });
    const pack = flex.flex_pack as { name: string; gameTickets: number; venue?: { timezone?: string } };
    mockedGetMyUpcomingOrders.mockResolvedValue({
      data: [
        {
          id: flex.id,
          orderId: flex.orderId,
          status: "complete",
          createdAt: flex.createdAt,
          total: 35.53,
          event: null,
          package: null,
          tickets: [],
        },
      ],
    } as never);
    mockedGetOrder.mockResolvedValue({ data: flex } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(pack.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        `Purchase · ${orderedDate("2026-11-13T01:19:00.000Z", pack.venue?.timezone)} · ${flex.vouchers.length} vouchers`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
    expect(mockedGetOrder).toHaveBeenCalledWith(flex.orderId);
    expect(mockedFetchCompletedOrder).not.toHaveBeenCalled();
  });

  it("loads the flex pack name when the order only has the pack id", async () => {
    const pack = demoFlexPack();
    const listed = {
      id: 12,
      orderId: "1458-320253-8602",
      status: "complete",
      createdAt: "2026-11-13T01:19:00.000Z",
      total: 35.53,
      event: null,
      tickets: [],
      flex_pack: { uuid: pack.uuid, gameTickets: pack.gameTickets },
    };
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({ data: listed } as never);
    mockedGetFlexPack.mockResolvedValue({ data: pack } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(pack.name)).toBeInTheDocument();
    expect(mockedGetFlexPack).toHaveBeenCalledWith(pack.uuid);
    expect(screen.getByText(new RegExp(`${pack.gameTickets} vouchers`))).toBeInTheDocument();
    expect(mockedFetchCompletedOrder).not.toHaveBeenCalled();
  });

  it("names a flex pack from the checkout order when the wallet list has no vouchers", async () => {
    const flex = demoCompletedFlexPackOrder({
      createdAt: "2026-11-13T01:13:00.000Z",
    });
    const pack = flex.flex_pack as { name: string; venue?: { timezone?: string } };
    const listed = {
      id: flex.id,
      orderId: flex.orderId,
      status: "complete",
      createdAt: flex.createdAt,
      total: 35.53,
      event: null,
      tickets: [],
      intentDetails: { id: "pi_flexpack123" },
    };
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [listed] } as never);
    mockedGetOrder.mockResolvedValue({ data: listed } as never);
    mockedFetchCompletedOrder.mockResolvedValue(flex as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(pack.name)).toBeInTheDocument();
    expect(mockedFetchCompletedOrder).toHaveBeenCalledWith("pi_flexpack123");
    expect(screen.getByText(/6 vouchers/)).toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
  });

  it("leaves a nameless purchase blank when no flex pack can be found", async () => {
    mockedGetMyUpcomingOrders.mockResolvedValue({
      data: [
        {
          id: 42,
          orderId: "order-blank",
          status: "complete",
          createdAt: "2026-11-13T01:13:00.000Z",
          total: 35.53,
          event: null,
          tickets: [],
        },
      ],
    } as never);
    mockedGetOrder.mockRejectedValue(new Error("missing"));
    render(<WalletAccountActivity />);

    expect(await screen.findByText(/0 tickets/)).toBeInTheDocument();
    expect(screen.queryByText("Flex pack")).not.toBeInTheDocument();
  });

  it("reads a flex pack when the activity list wraps it as a relation", async () => {
    const flex = demoCompletedFlexPackOrder();
    const pack = flex.flex_pack as { name: string; gameTickets: number; venue?: { timezone?: string } };
    mockedGetMyUpcomingOrders.mockResolvedValue({
      data: [
        {
          id: flex.id,
          orderId: flex.orderId,
          status: "complete",
          createdAt: "2026-11-13T01:19:00.000Z",
          total: 35.53,
          event: null,
          tickets: [],
          flex_pack: {
            data: {
              id: 4,
              attributes: {
                name: pack.name,
                gameTickets: pack.gameTickets,
                venue: pack.venue,
              },
            },
          },
        },
      ],
    } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(pack.name)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${pack.gameTickets} vouchers`))).toBeInTheDocument();
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("names a flex pack with no title and ignores a linked event", async () => {
    const flex = demoCompletedFlexPackOrder({
      createdAt: "2026-11-13T01:13:00.000Z",
      flex_pack: { name: " " },
      event: { name: "Home opener" },
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [flex] } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText("Flex pack")).toBeInTheDocument();
    expect(screen.queryByText("Home opener")).not.toBeInTheDocument();
    expect(screen.getByText(/6 vouchers/)).toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
  });

  it("shows an access pass by its name instead of an empty ticket count", async () => {
    const template = demoAccessPassTemplate();
    mockedGetMyUpcomingOrders.mockResolvedValue({
      data: [
        {
          id: 99,
          orderId: "pass-1",
          status: "complete",
          createdAt: "2026-11-13T01:13:00.000Z",
          total: template.price,
          event: null,
          tickets: [],
          access_pass_template: template,
        },
      ],
    } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText(template.name)).toBeInTheDocument();
    expect(
      screen.getByText(
        `Purchase · ${orderedDate("2026-11-13T01:13:00.000Z", template.venue?.timezone)} · 1 access pass`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0 tickets/)).not.toBeInTheDocument();
  });

  it("leaves ticket assignments and transferred-in tickets out of activity", async () => {
    const base = demoCompletedTicketOrder();
    const withName = (name: string) => ({ ...(base.event as object), name });
    const purchase = demoCompletedTicketOrder({
      id: 3001,
      orderId: "purchase-only",
      source: "website",
      event: withName("Purchased game"),
    });
    const assigned = demoCompletedTicketOrder({
      id: 3002,
      orderId: "assigned-only",
      source: "ticket_assignment",
      event: withName("Assigned game"),
    });
    const transferred = demoCompletedTicketOrder({
      id: 3003,
      orderId: "transferred-only",
      source: "transfer",
      event: withName("Transferred game"),
    });
    mockedGetMyUpcomingOrders.mockResolvedValue({
      data: [purchase, assigned, transferred],
    } as never);
    render(<WalletAccountActivity />);

    expect(await screen.findByText("Purchased game")).toBeInTheDocument();
    expect(screen.queryByText("Assigned game")).not.toBeInTheDocument();
    expect(screen.queryByText("Transferred game")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Receipt" })).toHaveLength(1);
  });

  it("shows an error when the receipt cannot be downloaded", async () => {
    const user = userEvent.setup();
    const { ticket } = invoiceOrders();
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [ticket] } as never);
    mockedDownloadOrderReceipt.mockRejectedValue(new Error("Receipt unavailable"));
    render(<WalletAccountActivity />);

    await user.click(await screen.findByRole("button", { name: "Receipt" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not download receipt.");
    expect(screen.getByRole("button", { name: "Receipt" })).toBeEnabled();
  });
});
