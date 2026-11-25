import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  demoAddonOnlyCart,
  demoCheckoutCart,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));
const navState = vi.hoisted(() => ({ cartId: "15" }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  useSearchParams: () => new URLSearchParams(`cartId=${navState.cartId}`),
  usePathname: () => "/checkout/post-purchase/",
  useParams: () => ({}),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(async () => ({})),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div>Payment</div>,
  useStripe: () => ({ confirmPayment: vi.fn() }),
  useElements: () => ({}),
}));

vi.mock("@/lib/api", () => ({
  getCart: vi.fn(),
  getPaymentIntent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
  setLastKnown: vi.fn(),
}));

import PostPurchaseCheckoutRoute from "@/app/checkout/post-purchase/page";
import { getCart, getPaymentIntent } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const mockedGetCart = vi.mocked(getCart);
const mockedGetPaymentIntent = vi.mocked(getPaymentIntent);
const mockedUseAuth = vi.mocked(useAuth);

describe("Post-purchase add-on checkout", () => {
  beforeEach(() => {
    navState.cartId = "15";
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      ready: true,
      user: null,
      session: null,
      login: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
    });
    mockedGetPaymentIntent.mockResolvedValue({
      data: { client_secret: "cs_addon", id: "pi_addon" },
    } as never);
    vi.stubEnv("NEXT_PUBLIC_STRIPE_KEY", "pk_test_demo");
  });

  it("shows the empty-cart message when the add-on cart has no items", async () => {
    mockedGetCart.mockResolvedValue({
      data: { ...demoCheckoutCart(), addonItems: [] },
    } as never);

    render(<PostPurchaseCheckoutRoute />);

    expect(await screen.findByText("Your add-on cart is empty or has expired.")).toBeInTheDocument();
  });

  it("shows the separate charge total for a priced add-on cart", async () => {
    const cart = demoAddonOnlyCart();
    mockedGetCart.mockResolvedValue({ data: cart } as never);

    render(<PostPurchaseCheckoutRoute />);

    expect(
      await screen.findByText("This is a separate charge from your ticket order."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Total due now: ${formatCurrency(cart.addonQuote.customerTotal)}`),
    ).toBeInTheDocument();
  });
});
