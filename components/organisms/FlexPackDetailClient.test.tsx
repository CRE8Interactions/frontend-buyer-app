import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { demoFlexPack } from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";
import {
  __resetInAppBackForTests,
} from "@/lib/inAppBack";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  isAuthenticated: true,
  ready: true,
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
  usePathname: () => "/niagara-icedogs/flex-pack/cfa9c3cb-e81c-4141-ac56-c8edcd0f0303/",
  useParams: () => ({ slug: "niagara-icedogs" }),
}));

vi.mock("@/lib/api", () => ({
  getFlexPack: vi.fn(),
  placeFlexPackIntoCart: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    isAuthenticated: authMocks.isAuthenticated,
    ready: authMocks.ready,
    user: null,
    session: null,
  }),
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/cart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cart")>();
  return {
    ...actual,
    setStoredCart: vi.fn(),
  };
});

import FlexPackDetailClient from "@/components/organisms/FlexPackDetailClient";
import { getFlexPack, placeFlexPackIntoCart } from "@/lib/api";
import { checkoutHref } from "@/lib/cart";

const mockedGetFlexPack = vi.mocked(getFlexPack);
const mockedPlaceFlex = vi.mocked(placeFlexPackIntoCart);

function flexResponse(pack: ReturnType<typeof demoFlexPack> | null) {
  return { data: pack } as never;
}

async function renderFlex(
  pack: ReturnType<typeof demoFlexPack> | null = demoFlexPack(),
) {
  mockedGetFlexPack.mockResolvedValue(flexResponse(pack));
  const user = userEvent.setup();
  render(
    <>
      <GlobalRouteTransitionLoader />
      <FlexPackDetailClient
        uuid="cfa9c3cb-e81c-4141-ac56-c8edcd0f0303"
        backHref="/niagara-icedogs/"
      />
    </>,
  );
  return user;
}

describe("Flex pack detail (FlexPackDetailClient)", () => {
  beforeEach(() => {
    mockedGetFlexPack.mockReset();
    mockedPlaceFlex.mockReset();
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
    authMocks.isAuthenticated = true;
    authMocks.ready = true;
    __resetInAppBackForTests();
  });

  it("shows the pack name and Get N vouchers", async () => {
    const pack = demoFlexPack();
    await renderFlex(pack);

    expect(
      await screen.findByRole("heading", { name: pack.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Get ${pack.gameTickets} vouchers` }),
    ).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(pack.price))).toBeInTheDocument();
    expect(screen.getByText("How the flex pack works")).toBeInTheDocument();
    expect(screen.queryByText(/taxes and fees included/i)).not.toBeInTheDocument();
  });

  it("says the flex pack was not found when the API returns nothing", async () => {
    await renderFlex(null);

    expect(await screen.findByText("Flex pack not found.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /get .* vouchers/i }),
    ).not.toBeInTheDocument();
  });

  it("disables purchase when the pack is sold out", async () => {
    const pack = demoFlexPack({ isSoldOut: true });
    await renderFlex(pack);

    expect(await screen.findByRole("heading", { name: pack.name })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sold out" })).toBeDisabled();
  });

  it("adds the pack to cart and goes to checkout", async () => {
    const pack = demoFlexPack();
    mockedPlaceFlex.mockResolvedValue({ data: { cartId: "cart-flex-1" } } as never);
    const user = await renderFlex(pack);

    await screen.findByRole("heading", { name: pack.name });
    await user.click(
      screen.getByRole("button", { name: `Get ${pack.gameTickets} vouchers` }),
    );

    await waitFor(() => {
      expect(mockedPlaceFlex).toHaveBeenCalledWith(pack.id);
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("cart-flex-1"));
    });
  });

  it("takes a logged-out shopper to checkout instead of login", async () => {
    authMocks.isAuthenticated = false;
    const hrefSetter = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/niagara-icedogs/flex-pack/cfa9c3cb-e81c-4141-ac56-c8edcd0f0303/",
      search: "",
      origin: "http://localhost",
      get href() {
        return "http://localhost/";
      },
      set href(value: string) {
        hrefSetter(value);
      },
    });
    const pack = demoFlexPack();
    mockedPlaceFlex.mockResolvedValue({ data: { cartId: "cart-flex-2" } } as never);
    const user = await renderFlex(pack);

    await screen.findByRole("heading", { name: pack.name });
    await user.click(
      screen.getByRole("button", { name: `Get ${pack.gameTickets} vouchers` }),
    );

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("cart-flex-2"));
    });
    expect(hrefSetter).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
