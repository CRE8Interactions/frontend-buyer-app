import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_USER,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";
import { resolveCompletedOrderFees } from "@/lib/ticketSummary";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { setGuestCheckoutBuyer } from "@/lib/guestCheckout";

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
  useSearchParams: () => new URLSearchParams("intentId=pi_test"),
  usePathname: () => "/checkout/success/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  getOrder: vi.fn(),
  getOrderByPaymentIntentId: vi.fn(),
  getEventByUuid: vi.fn(),
  getEventByShortCode: vi.fn(),
  getOrganizationStorefront: vi.fn(),
  downloadApplePass: vi.fn(),
  downloadGooglePass: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/intercom", () => ({
  hideIntercomLauncher: vi.fn(),
}));

vi.mock("@/lib/tracking", () => ({
  trackCheckoutCompleted: vi.fn(),
  trackPurchase: vi.fn(),
}));

vi.mock("@/lib/orderReceipt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orderReceipt")>();
  return {
    ...actual,
    downloadOrderReceipt: vi.fn(),
  };
});

import CheckoutSuccessPageRoute from "@/app/checkout/success/page";
import {
  downloadApplePass,
  downloadGooglePass,
  getOrder,
  getOrderByPaymentIntentId,
} from "@/lib/api";
import { seatLabel } from "@/lib/wallet";
import { __resetCompletedOrderInflightForTests } from "@/lib/completedOrder";
import { useAuth } from "@/lib/auth";
import {
  __setOrderPaymentDetailsPollForTests,
  formatOrderPaymentMethodSummary,
} from "@/lib/orderPayment";
import { downloadOrderReceipt } from "@/lib/orderReceipt";
import {
  STRIPE_PAYMENT_SYNC_DELAY_MS,
  markStripePaymentSyncStarted,
} from "@/lib/stripePaymentSync";

const mockedGetOrderByPi = vi.mocked(getOrderByPaymentIntentId);
const mockedGetOrder = vi.mocked(getOrder);
const mockedUseAuth = vi.mocked(useAuth);
const mockedDownload = vi.mocked(downloadOrderReceipt);
const mockedDownloadApplePass = vi.mocked(downloadApplePass);
const mockedDownloadGooglePass = vi.mocked(downloadGooglePass);

describe("Checkout success receipt", () => {
  beforeEach(() => {
    __resetCompletedOrderInflightForTests();
    __setOrderPaymentDetailsPollForTests({ attempts: 5, delayMs: 0 });
    sessionStorage.clear();
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      user: DEMO_USER,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder(),
    } as never);
    mockedGetOrder.mockReset();
    mockedDownload.mockReset();
    mockedDownload.mockResolvedValue(undefined);
  });

  afterEach(() => {
    __setOrderPaymentDetailsPollForTests(null);
    vi.useRealTimers();
  });

  it("shows the org loader before the order arrives when an org is cached", () => {
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    cacheOrgBranding(raptors);
    mockedGetOrderByPi.mockReturnValue(new Promise(() => {}) as never);
    render(<CheckoutSuccessPageRoute />);
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(screen.getByText(/retrieving payment details/i)).toBeInTheDocument();
    expect(screen.getByAltText(/blocktickets/i)).toHaveAttribute(
      "src",
      "/blocktickets-logo.svg",
    );
    expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
  });

  it("does not show the Blocktickets loader when no org is cached yet", () => {
    mockedGetOrderByPi.mockReturnValue(new Promise(() => {}) as never);
    render(<CheckoutSuccessPageRoute />);
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
  });

  it("shows the order offer name beside the seat thumbnail", async () => {
    render(<CheckoutSuccessPageRoute />);
    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("falls back to the seat line when the order has no offer name", async () => {
    const order = demoCompletedTicketOrder();
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({
        tickets: (order.tickets as Array<Record<string, unknown>>).map(
          (ticket) => ({ ...ticket, offerName: undefined, offer: undefined }),
        ),
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    expect(
      await screen.findByText(
        `Sec ${listing.sectionNumber} · Row ${listing.rowNumber}`,
      ),
    ).toBeInTheDocument();
  });

  it("shows the package ticket offer beside the seat thumbnail", async () => {
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedPackageOrder(),
    } as never);
    render(<CheckoutSuccessPageRoute />);
    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
  });

  it("shows Standard admission for a package order with no offer", async () => {
    const order = demoCompletedPackageOrder();
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedPackageOrder({
        tickets: (order.tickets as Array<Record<string, unknown>>).map(
          (ticket) => ({ ...ticket, offerName: undefined, offer: undefined }),
        ),
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);
    expect(await screen.findByText("Standard admission")).toBeInTheDocument();
    expect(
      screen.queryByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).not.toBeInTheDocument();
  });

  it("shows Blocktickets completed-order fee lines for a package", async () => {
    const order = demoCompletedPackageOrder({
      total: 452.2,
      serviceFee: 40,
      processingFee: 12.2,
      estimatedProcessingFee: 12.3,
      priceObject: [{ estimatedPaymentProcessingFee: 12.38 }],
      salesTax: 0,
    });
    mockedGetOrderByPi.mockResolvedValue({ data: order } as never);
    render(<CheckoutSuccessPageRoute />);

    expect(await screen.findByText("$399.82")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(screen.getByText("$12.38")).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
  });

  it("lists the promo code and a pre-discount subtotal on a discounted order", async () => {
    const order = demoCompletedTicketOrder({
      total: 5.5,
      serviceFee: 2.5,
      processingFee: 0.5,
      estimatedProcessingFee: 0.5,
      salesTax: 0,
      discountApplied: 2,
      discountBreakdown: { code: "TESTDIS" },
    });
    mockedGetOrderByPi.mockResolvedValue({ data: order } as never);
    render(<CheckoutSuccessPageRoute />);

    expect(await screen.findByText("Promo (TESTDIS)")).toBeInTheDocument();
    expect(screen.getByText(`-${formatCurrency(2)}`)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(4.5))).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(5.5)).length).toBeGreaterThan(0);
  });

  it("downloads a receipt PDF from the completed order", async () => {
    const order = demoCompletedTicketOrder();
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(mockedDownload).toHaveBeenCalledWith({
      order: expect.objectContaining({ orderId: order.orderId }),
      purchaser: {
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        email: DEMO_USER.email,
      },
      sellerLogoUrl: expect.stringContaining("raptors"),
      sellerName: DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!.name,
    });
  });

  it("downloads a receipt using the page org name when the order omits it", async () => {
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    cacheOrgBranding(raptors);
    const order = demoCompletedTicketOrder();
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({
        organization: null,
        event: {
          ...(order.event as object),
          branding: undefined,
          organization: { uuid: raptors.uuid },
        },
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(mockedDownload).toHaveBeenCalledWith(
      expect.objectContaining({ sellerName: raptors.name }),
    );
  });

  it("keeps the receipt button loading until the PDF is ready", async () => {
    let finishDownload: () => void = () => {};
    mockedDownload.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDownload = resolve;
        }),
    );
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    const loadingButton = await screen.findByRole("button", {
      name: /downloading/i,
    });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute("aria-busy", "true");

    finishDownload();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /download receipt/i }),
      ).toBeEnabled();
    });
  });

  it("shows an error when the receipt cannot be created", async () => {
    mockedDownload.mockRejectedValue(new Error("Receipt unavailable"));
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(
      await screen.findByText(/could not download receipt/i),
    ).toBeInTheDocument();
  });

  it("still shows the confirmation when the first order lookup is canceled", async () => {
    mockedGetOrderByPi
      .mockRejectedValueOnce({ code: "ERR_CANCELED", message: "canceled" })
      .mockResolvedValueOnce({
        data: demoCompletedTicketOrder(),
      } as never);
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(screen.queryByText(/order not found/i)).not.toBeInTheDocument();
  });

  it("summarizes a flex pack with Blocktickets completed-order fee lines", async () => {
    const order = demoCompletedFlexPackOrder({
      estimatedProcessingFee: 4.25,
    });
    const pack = demoFlexPack();
    const totals = resolveCompletedOrderFees(order);
    mockedGetOrderByPi.mockResolvedValue({ data: order } as never);
    render(<CheckoutSuccessPageRoute />);

    expect((await screen.findAllByText(pack.name)).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(`${pack.gameTickets} flex vouchers`),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(totals.subtotal)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(
      screen.queryByText(
        `${formatCurrency(1)} × ${pack.gameTickets}`,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText(formatCurrency(totals.serviceFee))).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(totals.processingFee)),
    ).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(totals.tax))).toBeInTheDocument();
  });

  it("shows zero-valued Blocktickets fee lines for a flex pack", async () => {
    const order = demoCompletedFlexPackOrder({
      processingFee: 0,
      estimatedProcessingFee: 0,
    });
    mockedGetOrderByPi.mockResolvedValue({ data: order } as never);
    render(<CheckoutSuccessPageRoute />);

    expect(
      (await screen.findAllByText(demoFlexPack().name)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2);
  });

  it("does not look up the order by orderId when last4 is missing", async () => {
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({ last4: undefined }),
    } as never);
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("does not look up the order until the stripe-sync delay has elapsed", async () => {
    vi.useFakeTimers();
    markStripePaymentSyncStarted();
    const order = demoCompletedTicketOrder();
    render(<CheckoutSuccessPageRoute />);

    expect(mockedGetOrderByPi).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STRIPE_PAYMENT_SYNC_DELAY_MS - 1);
    });
    expect(mockedGetOrderByPi).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mockedGetOrderByPi).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    expect(
      await screen.findByText(formatOrderPaymentMethodSummary(order)),
    ).toBeInTheDocument();
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("keeps the confirmation hidden until stripe-sync writes last4", async () => {
    vi.useFakeTimers();
    __setOrderPaymentDetailsPollForTests({ attempts: 5, delayMs: 1_000 });
    markStripePaymentSyncStarted();
    const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
    cacheOrgBranding(raptors);
    const pending = demoCompletedTicketOrder({
      last4: undefined,
      paymentMethodType: "card",
    });
    const ready = demoCompletedTicketOrder();
    mockedGetOrderByPi
      .mockResolvedValueOnce({ data: pending } as never)
      .mockResolvedValueOnce({ data: ready } as never);

    render(<CheckoutSuccessPageRoute />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(STRIPE_PAYMENT_SYNC_DELAY_MS);
    });
    expect(mockedGetOrderByPi).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/retrieving payment details/i)).toBeInTheDocument();
    expect(screen.queryByText("Card")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(mockedGetOrderByPi).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    expect(
      await screen.findByText(formatOrderPaymentMethodSummary(ready)),
    ).toBeInTheDocument();
  });

  it("still shows the confirmation if payment details are missing after the delay", async () => {
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({
        last4: undefined,
        paymentMethodType: undefined,
      }),
    } as never);

    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(mockedGetOrderByPi).toHaveBeenCalledTimes(5);
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("downloads a receipt using the signed-in user's first and last name", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      user: {
        ...DEMO_USER,
        firstName: undefined,
        lastName: undefined,
        first_name: DEMO_USER.firstName,
        last_name: DEMO_USER.lastName,
      },
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(mockedDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaser: expect.objectContaining({
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
        }),
      }),
    );
    expect(mockedGetOrder).not.toHaveBeenCalled();
  });

  it("loads the buyer name from the full order when the success payload omits it", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      user: { ...DEMO_USER, firstName: undefined, lastName: undefined },
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    const order = demoCompletedTicketOrder({
      firstName: undefined,
      lastName: undefined,
    });
    mockedGetOrderByPi.mockResolvedValue({ data: order } as never);
    mockedGetOrder.mockResolvedValue({
      data: demoCompletedTicketOrder({
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(mockedGetOrder).toHaveBeenCalledWith(order.orderId);
    expect(mockedDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaser: expect.objectContaining({
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
        }),
      }),
    );
  });

  it("downloads a receipt using the guest first and last name when the order omits them", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      user: null,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    setGuestCheckoutBuyer({
      email: DEMO_USER.email,
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
    });
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
      }),
    } as never);
    render(<CheckoutSuccessPageRoute />);

    await userEvent.click(
      await screen.findByRole("button", { name: /download receipt/i }),
    );

    expect(mockedDownload).toHaveBeenCalledWith(
      expect.objectContaining({
        purchaser: {
          firstName: DEMO_USER.firstName,
          lastName: DEMO_USER.lastName,
          email: DEMO_USER.email,
        },
      }),
    );
  });

  it("loads a completed order for a logged-out guest", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      user: null,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByText(DEMO_SEATED_TICKET_GROUPS[0].offer!.name!),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to my wallet/i }),
    ).toHaveAttribute("href", "/wallet/my-tickets/");
    expect(
      screen.queryByRole("link", {
        name: /create an account to manage your tickets/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`We've emailed it to ${DEMO_USER.email}`)),
    ).toBeInTheDocument();
  });

  it("shows an error when the completed order cannot be loaded", async () => {
    mockedGetOrderByPi.mockRejectedValue(new Error("unavailable"));
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByText(/unable to load your order/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /order not found/i }),
    ).toBeInTheDocument();
  });
});

describe("Checkout success guest wallet", () => {
  const order = demoCompletedTicketOrder();
  const tickets = (order.tickets as Array<Record<string, unknown>>).slice(0, 2);

  function guestAuth() {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      ready: true,
      user: null,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
  }

  function stubPhone(userAgent: string) {
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
    guestAuth();
    mockedGetOrderByPi.mockResolvedValue({
      data: demoCompletedTicketOrder({ tickets }),
    } as never);
    mockedDownloadApplePass.mockReset();
    mockedDownloadGooglePass.mockReset();
    mockedDownloadApplePass.mockResolvedValue({
      data: new Blob(["pkpass"], { type: "application/vnd.apple.pkpass" }),
    } as never);
    mockedDownloadGooglePass.mockResolvedValue({
      data: { url: "https://pay.google.com/gp/v/save/ticket-1" },
    } as never);
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
    stubPhone("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
    Reflect.deleteProperty(navigator, "userAgent");
  });

  it("offers Apple Wallet to a guest on iPhone", async () => {
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    ).toBeInTheDocument();
  });

  it("offers Google Wallet to a guest on Android", async () => {
    stubPhone("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByRole("button", { name: "Add to Google Wallet" }),
    ).toBeInTheDocument();
  });

  it("does not offer a phone wallet to a signed-in shopper on iPhone", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      user: DEMO_USER,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByRole("link", { name: /go to my wallet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Apple Wallet" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer a phone wallet to a guest on desktop", async () => {
    stubPhone("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    render(<CheckoutSuccessPageRoute />);

    expect(
      await screen.findByRole("link", { name: /go to my wallet/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Add to (Apple|Google) Wallet/ }),
    ).not.toBeInTheDocument();
  });

  it("opens a one-ticket picker from the wallet bar", async () => {
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Add a ticket to your wallet.",
    });
    expect(
      within(dialog).getByText(
        /Passes are added one ticket at a time/i,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole("radio")).toHaveLength(tickets.length);
    expect(
      within(dialog).getByRole("radio", {
        name: new RegExp(seatLabel(tickets[0]), "i"),
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(mockedDownloadApplePass).not.toHaveBeenCalled();
  });

  it("shows an error and leaves the add button usable when the pass cannot be built", async () => {
    mockedDownloadApplePass.mockRejectedValue(new Error("500"));
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Add a ticket to your wallet.",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not add/i);
    expect(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    ).toBeEnabled();
    expect(within(dialog).queryByText("Adding…")).not.toBeInTheDocument();
  });

  it("keeps the picker open and locks a seat after it is added", async () => {
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Add a ticket to your wallet.",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );

    await waitFor(() => {
      expect(mockedDownloadApplePass).toHaveBeenCalledTimes(1);
    });
    expect(mockedDownloadApplePass).toHaveBeenCalledWith(
      expect.objectContaining({
        obj: expect.objectContaining({ checkInCode: tickets[0].checkInCode }),
      }),
    );
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("ADDED")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("radio", {
        name: new RegExp(seatLabel(tickets[0]), "i"),
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("radio", {
        name: new RegExp(seatLabel(tickets[1]), "i"),
      }),
    ).toHaveAttribute("aria-checked", "true");

    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );
    await waitFor(() => {
      expect(mockedDownloadApplePass).toHaveBeenCalledTimes(2);
    });
    expect(mockedDownloadApplePass).toHaveBeenLastCalledWith(
      expect.objectContaining({
        obj: expect.objectContaining({ checkInCode: tickets[1].checkInCode }),
      }),
    );
  });

  it("closes the picker and disables the bar when every ticket is added", async () => {
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Add a ticket to your wallet.",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );
    await waitFor(() => {
      expect(mockedDownloadApplePass).toHaveBeenCalledTimes(1);
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    const done = screen.getByRole("button", {
      name: "All tickets added to Apple Wallet",
    });
    expect(done).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Add to Apple Wallet" }),
    ).not.toBeInTheDocument();
  });

  it("does not let seats be changed while a pass is being added", async () => {
    let finishAdd: () => void = () => {};
    mockedDownloadApplePass.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishAdd = () =>
            resolve({
              data: new Blob(["pkpass"], {
                type: "application/vnd.apple.pkpass",
              }),
            } as never);
        }),
    );
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Add a ticket to your wallet.",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Add to Apple Wallet" }),
    );

    const otherSeat = within(dialog).getByRole("radio", {
      name: new RegExp(seatLabel(tickets[1]), "i"),
    });
    expect(otherSeat).toBeDisabled();
    expect(
      within(dialog).getByRole("radio", {
        name: new RegExp(seatLabel(tickets[0]), "i"),
      }),
    ).toBeDisabled();

    finishAdd();
    await waitFor(() => {
      expect(mockedDownloadApplePass).toHaveBeenCalledTimes(1);
    });
    expect(mockedDownloadApplePass).toHaveBeenCalledWith(
      expect.objectContaining({
        obj: expect.objectContaining({ checkInCode: tickets[0].checkInCode }),
      }),
    );
  });

  it("does not add a pass when the picker is closed", async () => {
    const user = userEvent.setup();
    render(<CheckoutSuccessPageRoute />);

    await user.click(
      await screen.findByRole("button", { name: "Add to Apple Wallet" }),
    );
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockedDownloadApplePass).not.toHaveBeenCalled();
  });
});
