import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  DEMO_EVENTS,
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_USER,
  demoAccessPassCheckoutCart,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
} from "@/lib/demo/fixtures";
import { packageOrderSummary, ticketSelectionSummary } from "@/lib/ticketSummary";
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
  retrievePaymentIntent: vi.fn(
    async (): Promise<{ paymentIntent: { status: string; id?: string } }> => ({
      paymentIntent: { status: "requires_payment_method" },
    }),
  ),
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
import {
  dropUserCart,
  getCart,
  getPaymentIntent,
  processFreeOrder,
  processOrder,
  redeemPromoCode,
  removePromoCode,
  resolveFundraisingCampaign,
} from "@/lib/api";
import { setLastKnown, useAuth } from "@/lib/auth";
import {
  CHECKOUT_HOLD_SECONDS,
  formatHoldClock,
} from "@/lib/checkoutBranding";
import { eventPurchasePath, flexPackPurchasePath, formatCurrency, imageUrl, packagePurchasePath } from "@/lib/helpers";
import { FIELD_COPY } from "@/lib/fieldValidation";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import { getSeatViewImageCandidates } from "@/lib/seatView";
import { markCheckoutLoginDetour, setCheckoutReturnPath } from "@/lib/cart";
import { msUntilStripePaymentSyncReady } from "@/lib/stripePaymentSync";

const mockedGetCart = vi.mocked(getCart);
const mockedGetPaymentIntent = vi.mocked(getPaymentIntent);
const mockedProcessFreeOrder = vi.mocked(processFreeOrder);
const mockedDropUserCart = vi.mocked(dropUserCart);
const mockedProcessOrder = vi.mocked(processOrder);
const mockedRedeemPromo = vi.mocked(redeemPromoCode);
const mockedRemovePromo = vi.mocked(removePromoCode);
const mockedResolveFundraising = vi.mocked(resolveFundraisingCampaign);
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

describe("Checkout page", { timeout: 20_000 }, () => {
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
    mockedProcessFreeOrder.mockResolvedValue({
      data: { id: "order-free-1", paymentIntentId: "pi_free" },
    } as never);
    mockedDropUserCart.mockResolvedValue({} as never);
    mockedProcessOrder.mockResolvedValue({} as never);
    mockedRedeemPromo.mockReset();
    mockedRemovePromo.mockReset();
    mockedRemovePromo.mockResolvedValue({} as never);
    mockedResolveFundraising.mockReset();
    mockedResolveFundraising.mockResolvedValue({ data: { campaign: null } } as never);
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
    expect(screen.getByAltText(/blocktickets/i)).toHaveAttribute(
      "src",
      "/blocktickets-logo.svg",
    );
    expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
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
      await screen.findByRole("button", {
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
          finishProcess = resolve as (value: unknown) => void;
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
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();
    expect(stripeMocks.confirmPayment).not.toHaveBeenCalled();

    finishProcess({});

    await waitFor(() => {
      expect(mockedProcessOrder).toHaveBeenCalled();
      expect(stripeMocks.confirmPayment).toHaveBeenCalled();
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_test",
      );
    });
    // Soft navigation only: a document load would spin the browser tab.
    expect(locationMocks.replace).not.toHaveBeenCalled();
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
          finishRetrieve = resolve as (value: unknown) => void;
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
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(/retrieving payment details/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /processing/i }),
    ).toBeDisabled();

    finishRetrieve({ paymentIntent: { status: "succeeded" } });

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_test",
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

  it("summarizes an event purchase with tickets and tax", async () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(cart.tickets);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText(
        `Tickets: ${formatCurrency(summary.unit)} x ${summary.count}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
    expect(screen.queryByText("Processing Fee")).not.toBeInTheDocument();
    expect(screen.queryByText("Service Fee")).not.toBeInTheDocument();
  });

  it("does not list event processing or service fees even when the cart has them", async () => {
    const cart = demoCheckoutCart({ serviceFee: 2.5, processingFee: 0.5 });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText(/Tickets:/),
    ).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.queryByText("Processing Fee")).not.toBeInTheDocument();
    expect(screen.queryByText("Service Fee")).not.toBeInTheDocument();
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

  it("still lists package processing and service fees when they are zero", async () => {
    const cart = demoPackageCheckoutCart({
      serviceFee: 0,
      processingFee: 0,
    });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.package.name)).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(0)).length).toBeGreaterThan(0);
  });

  it("does not show a promo code field for a package purchase", async () => {
    const cart = demoPackageCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.package.name)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/enter promo code/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/promo code/i)).not.toBeInTheDocument();
  });

  it("does not show a promo code field for a flex pack purchase", async () => {
    const cart = demoFlexPackCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.flex_pack.name)).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/enter promo code/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/promo code/i)).not.toBeInTheDocument();
  });

  it("does not show a promo code field for an access pass purchase", async () => {
    const cart = demoAccessPassCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByText(cart.access_pass_template.name),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/enter promo code/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/promo code/i)).not.toBeInTheDocument();
  });

  it("shows the package artwork instead of the first game poster", async () => {
    const base = demoPackageCheckoutCart();
    const cart = demoPackageCheckoutCart({
      package: {
        image: { url: "/cases/nmstate.jpg" },
        events: base.package.events.map((event) => ({
          ...event,
          image: { url: "/clients/nmstate.png" },
        })),
      },
    });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByAltText(cart.package.name)).toHaveAttribute(
      "src",
      imageUrl(cart.package.image),
    );
  });

  it("shows the flex pack artwork in the order summary", async () => {
    const cart = demoFlexPackCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByAltText(cart.flex_pack.name)).toHaveAttribute(
      "src",
      imageUrl(cart.flex_pack.image),
    );
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
      screen.queryByText(
        `${formatCurrency(1)} × ${cart.flex_pack.gameTickets}`,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(formatCurrency(cart.serviceFee)),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: `Pay ${formatCurrency(cart.total)}`,
      }),
    ).toBeInTheDocument();
  });

  it("still lists a flex pack processing fee when it is zero", async () => {
    const cart = demoFlexPackCheckoutCart({ processingFee: 0 });
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    render(<CheckoutPageRoute />);

    expect(await screen.findByText(cart.flex_pack.name)).toBeInTheDocument();
    expect(screen.getByText("Tax")).toBeInTheDocument();
    expect(screen.getByText("Service Fee")).toBeInTheDocument();
    expect(screen.getByText("Processing Fee")).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(0)).length).toBeGreaterThan(0);
  });

  it("lists the promo discount in the order summary until it is removed", async () => {
    const cart = demoCheckoutCart();
    const discount = 5;
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    mockedRedeemPromo.mockResolvedValue({
      data: {
        promoPricingDetails: {
          code: "TESTDIS",
          originalPrice: cart.total,
          discountedPrice: cart.total - discount,
          amountDiscounted: discount,
        },
      },
    } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    await user.type(
      await screen.findByPlaceholderText(/enter promo code/i),
      "TESTDIS",
    );
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(await screen.findByText("Promo (TESTDIS)")).toBeInTheDocument();
    expect(
      screen.getByText(`-${formatCurrency(discount)}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Pay ${formatCurrency(cart.total - discount)}`,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(screen.queryByText("Promo (TESTDIS)")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText(`-${formatCurrency(discount)}`),
    ).not.toBeInTheDocument();
  });

  it("keeps the discount line off the summary when the promo code is rejected", async () => {
    const cart = demoCheckoutCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    mockedRedeemPromo.mockRejectedValue({
      response: { data: { error: { message: "Promo code not found" } } },
    });
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    await user.type(
      await screen.findByPlaceholderText(/enter promo code/i),
      "TESTDIS",
    );
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(
      await screen.findByText(/promo code not found\. please try again\./i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter promo code/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.queryByText(/^Promo \(/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Pay ${formatCurrency(cart.total)}` }),
    ).toBeInTheDocument();
  });

  it("keeps Apply enabled when the promo field is empty and shows an error on submit", async () => {
    mockedGetCart.mockResolvedValue({ data: demoCheckoutCart() } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    const apply = await screen.findByRole("button", { name: /apply/i });
    expect(apply).toBeEnabled();
    await user.click(apply);

    expect(await screen.findByText(/enter a promo code/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter promo code/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(mockedRedeemPromo).not.toHaveBeenCalled();
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
            return_url: `http://localhost/checkout/success/?intentId=pi_test`,
          },
        }),
      );
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_test",
      );
    });
  });

  it("sends a succeeded Stripe redirect to checkout success", async () => {
    navState.extra = "payment_intent=pi_flex&redirect_status=succeeded";
    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_flex",
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
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_test",
      );
    });
  });

  it("lets logged-out shoppers enter guest details instead of sending them to login", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    const hrefSetter = stubLocation();

    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("heading", {
        name: /where should we send your tickets/i,
      }),
    ).toBeInTheDocument();
    expect(mockedGetCart).toHaveBeenCalled();
    expect(mockedGetPaymentIntent).not.toHaveBeenCalled();
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: /sign in/i }),
    ).toHaveAttribute(
      "href",
      "/login/?from=%2Fcheckout%2F%3FcartId%3Dcart-raptors-1",
    );
  });

  it("creates a payment intent with the guest buyer after valid details", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    stubLocation();
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    await user.type(
      await screen.findByLabelText(/email address/i),
      `  ${DEMO_USER.email.toUpperCase()}  `,
    );
    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    await waitFor(() => {
      expect(mockedGetPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          guest: {
            email: DEMO_USER.email,
            firstName: DEMO_USER.firstName,
            lastName: DEMO_USER.lastName,
          },
        }),
      );
    });
    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
  });

  it("does not create a payment intent for an invalid guest email", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    stubLocation();
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    await user.type(
      await screen.findByLabelText(/email address/i),
      "bot@mailinator.com",
    );
    await user.type(screen.getByLabelText(/first name/i), DEMO_USER.firstName);
    await user.type(screen.getByLabelText(/last name/i), DEMO_USER.lastName);
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedGetPaymentIntent).not.toHaveBeenCalled();
  });

  it("skips guest contact when the shopper is already logged in", async () => {
    render(<CheckoutPageRoute />);

    expect(await screen.findByTestId("payment-element")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /where should we send your tickets/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a checkout donation field when a campaign resolves", async () => {
    const cart = demoCheckoutCart();
    mockedGetCart.mockResolvedValue({
      data: {
        ...cart,
        event: {
          ...cart.event,
          organization: { ...cart.event.organization, uuid: raptorsOrg.uuid },
        },
      },
    } as never);
    mockedResolveFundraising.mockResolvedValue({
      data: {
        campaign: {
          title: "Spring fund",
          campaignUuid: "camp-1",
          donationRequirements: { mandatory: false, minimumAmount: 0 },
        },
      },
    } as never);

    render(<CheckoutPageRoute />);

    expect(await screen.findByText("Spring fund")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/donation amount/i),
    ).toBeInTheDocument();
  });

  it("sends logged-out package shoppers to login without flashing checkout", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    const cart = demoPackageCheckoutCart();
    navState.cartId = String(cart.id);
    const hrefSetter = stubLocation("/checkout/", `?cartId=${cart.id}`);
    mockedGetCart.mockResolvedValue({ data: cart } as never);

    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith(
        `/checkout/?cartId=${cart.id}`,
      );
      expect(routerMocks.replace).toHaveBeenCalledWith(
        `/login/?from=${encodeURIComponent(`/checkout/?cartId=${cart.id}`)}`,
      );
    });
    // Soft navigation only: a document load would spin the browser tab.
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(mockedGetPaymentIntent).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "Payment" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(cart.package.name)).not.toBeInTheDocument();
  });

  it("sends a $0 flex pack to checkout success without a payment intent", async () => {
    const cart = demoFlexPackCheckoutCart({ flex_pack: { price: 0 } });
    navState.cartId = String(cart.id);
    stubLocation("/checkout/", `?cartId=${cart.id}`);
    mockedGetCart.mockResolvedValue({ data: cart } as never);

    render(<CheckoutPageRoute />);

    await waitFor(() => {
      expect(mockedProcessFreeOrder).toHaveBeenCalledWith({ cartId: cart.id });
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/checkout/success/?intentId=pi_free",
      );
    });
    expect(mockedGetPaymentIntent).not.toHaveBeenCalled();
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
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
      expect(routerMocks.replace).toHaveBeenCalledWith(
        eventPurchasePath(raptorsEvent),
      );
    });
    expect(routerMocks.push).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("drops the cart and returns to the team page when a package order is cancelled", async () => {
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
      expect(routerMocks.replace).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(
      eventPurchasePath(raptorsEvent),
    );

    vi.useRealTimers();
  });

  it("keeps checkout on screen while the cancel is still releasing the cart", async () => {
    const cart = demoPackageCheckoutCart();
    cacheOrgBranding(cart.package.organization);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    let finishDrop!: () => void;
    mockedDropUserCart.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDrop = () => resolve({} as never);
        }) as never,
    );
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    await screen.findByRole("dialog", { name: /are you sure/i });
    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    expect(await screen.findByText(/cancelling/i)).toBeInTheDocument();
    expect(screen.getByText(cart.package.name)).toBeInTheDocument();
    expect(screen.queryByText(/loading tickets/i)).not.toBeInTheDocument();
    expect(routerMocks.replace).not.toHaveBeenCalled();

    finishDrop();
    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
  });

  it("pops checkout off the history when cancelling back to the page the shopper came from", async () => {
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
      expect(routerMocks.back).toHaveBeenCalled();
    });
    // A new entry would leave the dead checkout one step behind Back.
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(routerMocks.replace).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("returns to the package page instead of the login page when cancelling after a login bounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const cart = demoPackageCheckoutCart({ remainingTime: 3 });
    setCheckoutReturnPath(`/${cart.package.organization.slug}/`);
    markCheckoutLoginDetour();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutPageRoute />);
    expect(await screen.findByText("Secure checkout")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    await screen.findByRole("dialog", { name: /are you sure/i });
    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        `/${cart.package.organization.slug}/`,
      );
    });
    // Back would land on /login/?from=/checkout/, which bounces into checkout.
    expect(routerMocks.back).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("returns to the package page instead of the login page when the hold runs out after a login bounce", async () => {
    const cart = demoPackageCheckoutCart({ remainingTime: 0 });
    setCheckoutReturnPath(packagePurchasePath(cart.package) as string);
    markCheckoutLoginDetour();
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(routerMocks.back).not.toHaveBeenCalled();
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
      expect(routerMocks.replace).toHaveBeenCalledWith(
        eventPurchasePath(raptorsEvent),
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(
      `/${raptorsOrg.slug}/`,
    );
  });

  it("drops package tickets and returns to the package page when the hold runs out", async () => {
    const cart = demoPackageCheckoutCart({ remainingTime: 0 });
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
      expect(routerMocks.replace).toHaveBeenCalledWith(
        packagePurchasePath(cart.package),
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(
      `/${cart.package.organization.slug}/`,
    );
  });

  it("returns to the team package page named by the page the shopper came from", async () => {
    const org = demoPackageCheckoutCart().package.organization;
    const cart = demoPackageCheckoutCart({
      remainingTime: 0,
      package: { organization: { name: org.name } },
      organization: null,
    });
    setCheckoutReturnPath(`/${org.slug}/`);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        `/${org.slug}/package/${cart.package.uuid}/`,
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(
      `/venue/${cart.package.venue.slug}/package/${cart.package.uuid}/`,
    );
  });

  it("returns to the team package page from cached branding when nothing was stored", async () => {
    const org = demoPackageCheckoutCart().package.organization;
    const cart = demoPackageCheckoutCart({
      remainingTime: 0,
      package: { organization: { name: org.name } },
      organization: null,
    });
    cacheOrgBranding(org);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(<CheckoutPageRoute />);

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith(
        `/${org.slug}/package/${cart.package.uuid}/`,
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(
      `/venue/${cart.package.venue.slug}/package/${cart.package.uuid}/`,
    );
  });

  it("returns to the flex pack page when the hold runs out", async () => {
    const cart = demoFlexPackCheckoutCart({ remainingTime: 0 });
    const from = `/${cart.flex_pack.organization.slug}/`;
    setCheckoutReturnPath(from);
    cacheOrgBranding(cart.flex_pack.organization);
    mockedGetCart.mockResolvedValue({ data: cart } as never);
    const user = userEvent.setup();
    render(
      <>
        <GlobalRouteTransitionLoader />
        <CheckoutPageRoute />
      </>,
    );

    expect(
      await screen.findByRole("dialog", { name: /cart expired/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    await waitFor(() => {
      expect(mockedDropUserCart).toHaveBeenCalledWith({
        cartId: cart.id,
        flexPackUUID: String(cart.flex_pack.uuid),
      });
      expect(routerMocks.replace).toHaveBeenCalledWith(
        flexPackPurchasePath(cart.flex_pack),
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalledWith(from);
    // The flex pack loader covers the trip back — never the checkout form.
    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^pay /i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("payment-element")).not.toBeInTheDocument();
  });
});
