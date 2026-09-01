import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ORGS, demoAccessPassTemplate } from "@/lib/demo/fixtures";

const icedogs = DEMO_ORGS.find((org) => org.slug === "niagara-icedogs")!;
const passPath = `/${icedogs.slug}/access-pass/apt-icedogs-club/`;

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  isAuthenticated: false,
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

const hrefSetter = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => "/niagara-icedogs/access-pass/apt-icedogs-club/",
  useParams: () => ({ slug: "niagara-icedogs" }),
}));

vi.mock("@/lib/api", () => ({
  getAccessPassTemplate: vi.fn(),
  placeAccessPassIntoCart: vi.fn(),
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
    rememberCheckoutReturnPath: vi.fn(),
  };
});

import AccessPassDetailClient from "@/components/organisms/AccessPassDetailClient";
import { getAccessPassTemplate, placeAccessPassIntoCart } from "@/lib/api";
import { setLastKnown } from "@/lib/auth";
import { checkoutHref } from "@/lib/cart";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";

const mockedGetPass = vi.mocked(getAccessPassTemplate);
const mockedPlacePass = vi.mocked(placeAccessPassIntoCart);
const mockedSetLastKnown = vi.mocked(setLastKnown);

function stubLocation() {
  vi.stubGlobal("location", {
    pathname: passPath,
    search: "",
    origin: "http://localhost",
    get href() {
      return `http://localhost${passPath}`;
    },
    set href(value: string) {
      hrefSetter(value);
    },
  });
}

async function renderPass(
  template: ReturnType<typeof demoAccessPassTemplate> | null = demoAccessPassTemplate(),
) {
  mockedGetPass.mockResolvedValue({ data: template } as never);
  const user = userEvent.setup();
  render(
    <AccessPassDetailClient uuid="apt-icedogs-club" backHref={`/${icedogs.slug}/`} />,
  );
  return user;
}

describe("AccessPassDetailClient login redirect", () => {
  beforeEach(() => {
    hrefSetter.mockReset();
    routerMocks.replace.mockReset();
    routerMocks.push.mockReset();
    mockedGetPass.mockReset();
    mockedPlacePass.mockReset();
    mockedSetLastKnown.mockReset();
    authMocks.isAuthenticated = false;
    authMocks.ready = true;
    cacheOrgBranding(icedogs);
    stubLocation();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("covers the pass with a loader and soft-navigates to login when a logged-out shopper buys", async () => {
    const pass = demoAccessPassTemplate();
    const user = await renderPass(pass);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /log in to buy/i }));

    expect(screen.queryByRole("heading", { name: pass.name })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log in to buy/i })).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-bt-tenant-loader], [data-bt-platform-loader]"),
    ).toBeTruthy();
    expect(mockedSetLastKnown).toHaveBeenCalledWith(passPath);
    expect(routerMocks.replace).toHaveBeenCalledWith(
      `/login/?from=${encodeURIComponent(passPath)}`,
    );
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it("still adds the pass to cart when the shopper is already logged in", async () => {
    authMocks.isAuthenticated = true;
    const pass = demoAccessPassTemplate();
    mockedPlacePass.mockResolvedValue({ data: { cartId: "cart-access-pass-1" } } as never);
    const user = await renderPass(pass);

    expect(
      await screen.findByRole("heading", { name: pass.name }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /checkout/i }));

    await waitFor(() => {
      expect(mockedPlacePass).toHaveBeenCalledWith(pass.id);
      expect(routerMocks.push).toHaveBeenCalledWith(
        checkoutHref("cart-access-pass-1"),
      );
    });
    expect(routerMocks.replace).not.toHaveBeenCalled();
    // Soft navigation only: a document load would spin the browser tab.
    expect(hrefSetter).not.toHaveBeenCalled();
  });
});
