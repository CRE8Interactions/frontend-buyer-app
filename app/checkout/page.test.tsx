import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
} from "@/lib/demo/fixtures";
import { FLEX_PACK_VOUCHER_FEE_USD } from "@/lib/flexPackDisplay";
import { packageOrderSummary } from "@/lib/ticketSummary";
import { formatVenueLocationFromVenue } from "@/lib/venueLocation";

const navState = { cartId: "cart-raptors-1", extra: "" };
const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));
const locationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));
const stripeMocks = vi.hoisted(() => ({
  submit: vi.fn(async () => ({})),
  confirmPayment: vi.fn(async () => ({})),
  retrievePaymentIntent: vi.fn(async () => ({
    paymentIntent: { status: "requires_payment_method" },
  })),
}));

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
  useRouter: () => routerMocks,
  useSearchParams: () => {
    const params = new URLSearchParams(
      navState.cartId ? `cartId=${navState.cartId}` : "",
    );
    if (navState.extra) {
      new URLSearchParams(navState.extra).forEach((value, key) => {
        params.set(key, value);
      });
    }
    return params;
  },
  usePathname: () => "/checkout/",
  useParams: () => ({}),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() =>
    Promise.resolve({
      retrievePaymentIntent: stripeMocks.retrievePaymentIntent,
    }),
  ),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PaymentElement: ({
    onChange,
  }: {
    onChange?: (event: { complete: boolean }) => void;
  }) => (
    <button
      type="button"
      data-testid="payment-element"
      onClick={() => onChange?.({ complete: true })}
    >
      Payment
    </button>
  ),
  useStripe: () => ({
    confirmPayment: stripeMocks.confirmPayment,
    retrievePaymentIntent: stripeMocks.retrievePaymentIntent,
  }),
  useElements: () => ({ submit: stripeMocks.submit }),
}));

vi.mock("@/lib/api", () => ({
  dropUserCart: vi.fn(),
  getCart: vi.fn(),
  getPaymentIntent: vi.fn(),
  processFreeOrder: vi.fn(),
  processOrder: vi.fn(),
  redeemPromoCode: vi.fn(),
  removePromoCode: vi.fn(),
  resolveFundraisingCampaign: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/intercom", () => ({
  hideIntercomLauncher: vi.fn(),
}));

vi.mock("@/lib/tracking", () => ({
  injectMetaPixel: vi.fn(),
  trackAddPaymentInfo: vi.fn(),
  trackBeginCheckout: vi.fn(),
  trackCheckoutStage: vi.fn(),
  trackCheckoutStarted: vi.fn(),
}));

import CheckoutPageRoute from "@/app/checkout/page";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";
import { dropUserCart, getCart, getPaymentIntent, processOrder } from "@/lib/api";
import { setLastKnown, useAuth } from "@/lib/auth";
import {
  CHECKOUT_HOLD_SECONDS,
  formatHoldClock,
} from "@/lib/checkoutBranding";
import { eventPurchasePath, formatCurrency, packagePurchasePath } from "@/lib/helpers";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import { setCheckoutReturnPath } from "@/lib/cart";
import { msUntilStripePaymentSyncReady } from "@/lib/stripePaymentSync";

const mockedGetCart = vi.mocked(getCart);
const mockedGetPaymentIntent = vi.mocked(getPaymentIntent);
const mockedDropUserCart = vi.mocked(dropUserCart);
const mockedProcessOrder = vi.mocked(processOrder);
const mockedUseAuth = vi.mocked(useAuth);
const mockedSetLastKnown = vi.mocked(setLastKnown);

const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];
const raptorsOrg = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

function authState(isAuthenticated: boolean) {
  return {
    isAuthenticated,
    ready: true,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
}

function stubLocation(
  pathname = "/checkout/",
  search = "?cartId=cart-raptors-1",
) {
  const hrefSetter = vi.fn();
  locationMocks.replace.mockReset();
  vi.stubGlobal("location", {
    get href() {
      return `http://localhost${pathname}${search}`;
    },
    set href(value: string) {
      hrefSetter(value);
    },
    origin: "http://localhost",
    pathname,
    search,
    assign: vi.fn(),
    replace: locationMocks.replace,
  });
  return hrefSetter;
}

describe("Checkout page", () => {
  beforeEach(() => {
    navState.cartId = "cart-raptors-1";
    navState.extra = "";
    mockedUseAuth.mockReturnValue(authState(true));
    mockedGetCart.mockResolvedValue({
      data: demoCheckoutCart(),
    } as never);
    mockedGetPaymentIntent.mockResolvedValue({
      data: { client_secret: "cs_test", id: "pi_test" },
    } as never);
    mockedDropUserCart.mockResolvedValue({} as never);
    mockedProcessOrder.mockResolvedValue({} as never);
    stripeMocks.submit.mockResolvedValue({});
    stripeMocks.confirmPayment.mockResolvedValue({});
    stripeMocks.retrievePaymentIntent.mockResolvedValue({
      paymentIntent: { status: "requires_payment_method" },
    });
    routerMocks.push.mockReset();
    routerMocks.replace.mockReset();
    routerMocks.back.mockReset();
    locationMocks.replace.mockReset();
    vi.stubEnv("NEXT_PUBLIC_STRIPE_KEY", "pk_test_demo");
    stubLocation();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows the org loader before the cart arrives when an org is cached", () => {
    cacheOrgBranding(raptorsOrg);
    mockedGetCart.mockReturnValue(new Promise(() => {}) as never);
    render(<CheckoutPageRoute />);
    expect(screen.getByText(raptorsOrg.name)).toBeInTheDocument();
    expect(screen.getByText(/getting payment ready/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
  });

  it("does not show the Blocktickets loader when no org is cached yet", () => {
    mockedGetCart.mockReturnValue(new Promise(() => {}) as never);
    render(<CheckoutPageRoute />);
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();
  });

  it("renders org-branded checkout for the held seats", async () => {
    const cart = demoCheckoutCart();
    const ticket = cart.tickets[0];
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByAltText(raptorsEvent.name),
    ).toHaveAttribute("src", raptorsEvent.image.url);
    expect(screen.getByText(raptorsEvent.name)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Payment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Complete your purchase to lock in these seats."),
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId("payment-element"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/express checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pay securely with/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(DEMO_SEATED_TICKET_GROUPS[0].offer?.name || ""),
    ).toBeInTheDocument();
    expect(
      screen.getByText(raptorsEvent.venue.name),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(formatVenueLocationFromVenue(raptorsEvent.venue)),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        `Sec ${ticket.sectionName} · Row ${ticket.rowNumber} · Seat ${ticket.seatNumber}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByAltText(/seat view for this ticket/i)).toHaveAttribute(
      "src",
      getSeatViewImageCandidates(
        raptorsEvent.venue.slug,
        ticket.sectionNumber,
        ticket.sectionName,
      )[0],
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Pay ${formatCurrency(cart.total)}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
    expect(
      screen.getByText(`Seats held ${formatHoldClock(CHECKOUT_HOLD_SECONDS)}`),
    ).toBeInTheDocument();
    expect(screen.queryByText(/you.?re so close/i)).not.toBeInTheDocument();
  });

  it("offers Link save-info, purchase policy, and Stripe security on the payment form", async () => {
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("checkbox", {
        name: new RegExp(
          `one-click checkout with Link at ${raptorsOrg.name} venues`,
          "i",
        ),
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("link", { name: /purchase policy/i }),
    ).toHaveAttribute("href", "/purchase-policy/");
    expect(
      screen.getByRole("link", { name: /terms/i }),
    ).toHaveAttribute("href", "/terms-conditions/");
    expect(
      screen.getByText(/payments secured by stripe/i),
    ).toBeInTheDocument();
  });

  it("stays on checkout through process and confirm, then shows the org loader", async () => {
    cacheOrgBranding(raptorsOrg);
    let finishProcess!: (value: unknown) => void;
    mockedProcessOrder.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishProcess = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(demoCheckoutCart().total)}` }),
    );

    const processingBtn = await screen.findByRole("button", {
      name: /processing/i,
    });
    expect(processingBtn).toBeDisabled();
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();
    expect(stripeMocks.confirmPayment).not.toHaveBeenCalled();

    finishProcess({});

    await waitFor(() => {
      expect(mockedProcessOrder).toHaveBeenCalled();
      expect(stripeMocks.confirmPayment).toHaveBeenCalled();
      expect(locationMocks.replace).toHaveBeenCalledWith(
        "http://localhost/checkout/checkout-success/?intentId=pi_test",
      );
    });
    expect(msUntilStripePaymentSyncReady()).toBeGreaterThan(0);
    const orgLoader = document.querySelector("[data-bt-tenant-loader]");
    expect(orgLoader).toBeTruthy();
    expect(
      within(orgLoader as HTMLElement).getByText(raptorsOrg.name),
    ).toBeInTheDocument();
    expect(
      within(orgLoader as HTMLElement).getByText(/retrieving payment details/i),
    ).toBeInTheDocument();
  });

  it("does not open confirmation while the payment intent is still processing", async () => {
    cacheOrgBranding(raptorsOrg);
    let finishRetrieve!: (value: unknown) => void;
    stripeMocks.confirmPayment.mockResolvedValue({
      paymentIntent: { status: "processing" },
    });
    stripeMocks.retrievePaymentIntent.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRetrieve = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(demoCheckoutCart().total)}` }),
    );

    await waitFor(() => {
      expect(stripeMocks.confirmPayment).toHaveBeenCalled();
      expect(stripeMocks.retrievePaymentIntent).toHaveBeenCalled();
    });
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /processing/i }),
    ).toBeDisabled();

    finishRetrieve({ paymentIntent: { status: "succeeded" } });

    await waitFor(() => {
      expect(locationMocks.replace).toHaveBeenCalledWith(
        "http://localhost/checkout/checkout-success/?intentId=pi_test",
      );
    });
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeTruthy();
  });

  it("shows the card declined popup when process order fails", async () => {
    mockedProcessOrder.mockRejectedValue(new Error("failed"));
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(demoCheckoutCart().total)}` }),
    );

    expect(
      await screen.findByRole("heading", { name: /card declined/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/unable to complete purchase/i),
    ).toBeInTheDocument();
    expect(stripeMocks.confirmPayment).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
  });

  it("shows the card declined popup when Stripe confirm fails", async () => {
    stripeMocks.confirmPayment.mockResolvedValue({
      error: { message: "Your card was declined." },
    });
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(demoCheckoutCart().total)}` }),
    );

    expect(
      await screen.findByRole("heading", { name: /card declined/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
  });

  it("shows the card declined popup when Stripe does not mark the payment succeeded", async () => {
    stripeMocks.confirmPayment.mockResolvedValue({
      paymentIntent: { status: "requires_payment_method" },
    });
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(demoCheckoutCart().total)}` }),
    );

    expect(
      await screen.findByRole("heading", { name: /card declined/i }),
    ).toBeInTheDocument();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
  });

  it("offers Link save-info without a team name when the cart has no organization", async () => {
    mockedGetCart.mockResolvedValue({
      data: demoCheckoutCart({ organization: null }),
    } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("checkbox", {
        name: /one-click checkout with Link\.$/i,
      }),
    ).toBeChecked();
    expect(screen.queryByText(/venues/i)).not.toBeInTheDocument();
  });

  it("does not show a seat location image when the cart has no tickets", async () => {
    mockedGetCart.mockResolvedValue({
      data: { ...demoCheckoutCart(), tickets: [] },
    } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByAltText(raptorsEvent.name)).toBeInTheDocument();
    expect(
      screen.queryByAltText(/seat view for this ticket/i),
    ).not.toBeInTheDocument();
  });

  it("summarizes adjacent seats as together without listing each seat", async () => {
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    mockedGetCart.mockResolvedValue({
      data: demoCheckoutCart({ ticketCount: 2 }),
    } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText(`Sec ${listing.sectionNumber} · Row ${listing.rowNumber}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 tickets · seats are together"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Seat 7/)).not.toBeInTheDocument();
  });

  it("summarizes a package order with season seats", async () => {
    const cart = demoPackageCheckoutCart();
    const summary = packageOrderSummary(cart.package, cart.tickets);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.package.name)).toBeInTheDocument();
    expect(screen.getByText(summary.seasonLine)).toBeInTheDocument();
    expect(screen.getByText(summary.venueName)).toBeInTheDocument();
    expect(screen.getByText(summary.seats[0].seatLine)).toBeInTheDocument();
    expect(screen.getByText(summary.seats[0].context)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(
      screen.getAllByText(formatCurrency(summary.subtotal)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(cart.processingFee)),
    ).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(cart.serviceFee))).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: `Pay ${formatCurrency(cart.total)}`,
      }),
    ).toBeInTheDocument();
  });

  it("shows the package subtotal on the season seat line when ticket prices are zero", async () => {
    const priced = demoPackageCheckoutCart();
    const ticket = priced.tickets[0];
    const subtotal = 400;
    const serviceFee = 40;
    const processingFee = 12.2;
    const cart = demoPackageCheckoutCart({
      tickets: [
        { ...ticket, seatNumber: 22, cost: 0, price: 0 },
        { ...ticket, seatNumber: 23, cost: 0, price: 0 },
      ],
      serviceFee,
      processingFee,
      total: subtotal + serviceFee + processingFee,
    });
    mockedGetCart.mockResolvedValue({
      data: {
        ...cart,
        package: { ...cart.package, price: 0, pricingTiers: [] },
      },
    } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText(
        `Sec ${ticket.sectionNumber} · Row ${ticket.rowNumber} · Seats 22-23`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(subtotal)).length).toBeGreaterThan(
      1,
    );
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(0))).toBeInTheDocument();
  });

  it("still shows the package subtotal when the cart total is missing", async () => {
    const priced = demoPackageCheckoutCart();
    const cart = demoPackageCheckoutCart({
      tickets: [{ ...priced.tickets[0], cost: 0, price: 0 }],
      total: 0,
    });
    const summary = packageOrderSummary(cart.package, cart.tickets);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(summary.seats[0].seatLine)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(
      screen.getAllByText(formatCurrency(summary.subtotal)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(0))).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: `Pay ${formatCurrency(
          summary.subtotal + Number(cart.serviceFee) + Number(cart.processingFee),
        )}`,
      }),
    ).toBeInTheDocument();
  });

  it("still lists a package when the cart has no selected seats", async () => {
    const cart = demoPackageCheckoutCart({ tickets: [] });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(
      (await screen.findAllByText(cart.package.name)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.queryByText(/Sec /)).not.toBeInTheDocument();
  });

  it("does not list package fee lines when the cart has no fees", async () => {
    const cart = demoPackageCheckoutCart({
      serviceFee: 0,
      processingFee: 0,
    });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.package.name)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.queryByText("Processing Fee")).not.toBeInTheDocument();
    expect(screen.queryByText("Service Fee")).not.toBeInTheDocument();
  });

  it("summarizes a flex pack with the $1 voucher fee and processing fee", async () => {
    const cart = demoFlexPackCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.flex_pack.name)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Payment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Complete your purchase to lock in these seats."),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    expect(
      screen.getByText(`${cart.flex_pack.gameTickets} flex vouchers`),
    ).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(cart.processingFee)),
    ).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(
      screen.getByText(
        `${formatCurrency(FLEX_PACK_VOUCHER_FEE_USD)} × ${cart.flex_pack.gameTickets}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(cart.serviceFee)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: `Pay ${formatCurrency(cart.total)}`,
      }),
    ).toBeInTheDocument();
  });

  it("does not list a flex pack processing fee when it is zero", async () => {
    const cart = demoFlexPackCheckoutCart({ processingFee: 0 });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.flex_pack.name)).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.queryByText("Processing Fee")).not.toBeInTheDocument();
  });

  it("opens checkout success after a flex pack payment", async () => {
    const cart = demoFlexPackCheckoutCart();
    navState.cartId = String(cart.id);
    stubLocation("/checkout/", `?cartId=${cart.id}`);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    await user.click(await screen.findByTestId("payment-element"));
    await user.click(
      screen.getByRole("button", { name: `Pay ${formatCurrency(cart.total)}` }),
    );

    await waitFor(() => {
      expect(mockedProcessOrder).toHaveBeenCalled();
      expect(stripeMocks.confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmParams: {
            return_url: `http://localhost/checkout/checkout-success/?intentId=pi_test`,
          },
        }),
      );
      expect(locationMocks.replace).toHaveBeenCalledWith(
        "http://localhost/checkout/checkout-success/?intentId=pi_test",
      );
    });
  });

  it("sends a succeeded Stripe redirect to checkout success", async () => {
    navState.extra = "payment_intent=pi_flex&redirect_status=succeeded";
    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(locationMocks.replace).toHaveBeenCalledWith(
        "http://localhost/checkout/checkout-success/?intentId=pi_flex",
      );
    });
    expect(mockedGetCart).not.toHaveBeenCalled();
    expect(mockedGetPaymentIntent).not.toHaveBeenCalled();
  });

  it("does not open confirmation when Stripe redirect reports a failed payment", async () => {
    navState.extra = "payment_intent=pi_flex&redirect_status=failed";
    render(<CheckoutPageRoute />);

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    expect(locationMocks.replace).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("sends a remounted checkout with a succeeded PaymentIntent to confirmation", async () => {
    stripeMocks.retrievePaymentIntent.mockResolvedValue({
      paymentIntent: { status: "succeeded", id: "pi_test" },
    });
    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(locationMocks.replace).toHaveBeenCalledWith(
        "http://localhost/checkout/checkout-success/?intentId=pi_test",
      );
    });
  });

  it("sends logged-out shoppers to login with checkout as the return path", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    const hrefSetter = stubLocation();

    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith(
        "/checkout/?cartId=cart-raptors-1",
      );
      expect(hrefSetter).toHaveBeenCalledWith(
        "/login/?from=%2Fcheckout%2F%3FcartId%3Dcart-raptors-1",
      );
    });
    expect(mockedGetCart).not.toHaveBeenCalled();
  });

  it("shows checkout unavailable when there is no cart", async () => {
    navState.cartId = "";
    stubLocation("/checkout/", "");

    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText("Checkout unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no cart found/i),
    ).toBeInTheDocument();
  });

  it("keeps checkout open when the shopper continues from the leave confirmation", async () => {
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      await screen.findByRole("dialog", { name: /are you sure/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /continue with checkout/i }),
    );
    expect(
      screen.queryByRole("dialog", { name: /are you sure/i }),
    ).not.toBeInTheDocument();
    expect(mockedDropUserCart).not.toHaveBeenCalled();
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.getByText(raptorsEvent.name)).toBeInTheDocument();
  });

  it("drops the cart and returns to tickets when the order is cancelled", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGetCart.mockResolvedValue({
      data: demoCheckoutCart({ remainingTime: 3 }),
    } as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const cart = demoCheckoutCart({ remainingTime: 3 });
    render(<CheckoutPageRoute />);
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      await screen.findByRole("dialog", { name: /are you sure/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        eventUUID: cart.event.uuid,
        cartId: cart.id,
      });
      expect(routerMocks.push).toHaveBeenCalledWith(
        eventPurchasePath(raptorsEvent),
      );
    });

    vi.useRealTimers();
  });

  it("drops the cart and returns to the season package page when a package order is cancelled", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const cart = demoPackageCheckoutCart({ remainingTime: 3 });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPageRoute />);
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(
      await screen.findByRole("dialog", { name: /are you sure/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        cartId: cart.id,
        packageUUID: String(cart.package.uuid),
      });
      expect(routerMocks.push).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(routerMocks.push).not.toHaveBeenCalledWith(
      eventPurchasePath(raptorsEvent),
    );

    vi.useRealTimers();
  });

  it("returns to the page the shopper came from and drops package tickets", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const cart = demoPackageCheckoutCart({ remainingTime: 3 });
    const from = `/${cart.package.organization.slug}/`;
    setCheckoutReturnPath(from);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPageRoute />);
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    await screen.findByRole("dialog", { name: /are you sure/i });
    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        cartId: cart.id,
        packageUUID: String(cart.package.uuid),
      });
      expect(routerMocks.push).toHaveBeenCalledWith(from);
    });
    expect(routerMocks.push).not.toHaveBeenCalledWith(
      packagePurchasePath(cart.package),
    );

    vi.useRealTimers();
  });

  it("shows cart expired and returns to tickets when the hold runs out", async () => {
    setCheckoutReturnPath(`/${raptorsOrg.slug}/`);
    mockedGetCart.mockResolvedValue({
      data: demoCheckoutCart({ remainingTime: 0 }),
    } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/your reserved tickets were released/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        eventUUID: raptorsEvent.uuid,
        cartId: demoCheckoutCart().id,
      });
      expect(routerMocks.push).toHaveBeenCalledWith(
        eventPurchasePath(raptorsEvent),
      );
    });
    expect(routerMocks.push).not.toHaveBeenCalledWith(`/${raptorsOrg.slug}/`);
  });

  it("drops package tickets and returns to seat selection when the hold runs out", async () => {
    const cart = demoPackageCheckoutCart({ remainingTime: 0 });
    const from = `/${cart.package.organization.slug}/`;
    setCheckoutReturnPath(from);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        cartId: cart.id,
        packageUUID: String(cart.package.uuid),
      });
      expect(routerMocks.push).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(routerMocks.push).not.toHaveBeenCalledWith(from);
  });
});
