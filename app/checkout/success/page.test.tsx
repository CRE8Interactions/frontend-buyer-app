import { act, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("@/lib/orderReceipt", () => ({
  downloadOrderReceipt: vi.fn(),
}));

import CheckoutSuccessPageRoute from "@/app/checkout/success/page";
import { getOrder, getOrderByPaymentIntentId } from "@/lib/api";
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
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
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
    });
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
