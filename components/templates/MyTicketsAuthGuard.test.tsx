import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTicketsAuthGuard from "@/components/templates/MyTicketsAuthGuard";

const hrefSetter = vi.fn();

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
  usePathname: () => "/wallet/my-tickets/",
  useParams: () => ({}),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
  setLastKnown: vi.fn(),
  getLastKnown: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { getLastKnown, setLastKnown, useAuth } from "@/lib/auth";

const mockedUseAuth = vi.mocked(useAuth);
const mockedSetLastKnown = vi.mocked(setLastKnown);
const mockedGetLastKnown = vi.mocked(getLastKnown);

function authState(isAuthenticated: boolean, ready = true) {
  return {
    isAuthenticated,
    ready,
    user: null,
    session: null,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  };
}

describe("MyTicketsAuthGuard", () => {
  beforeEach(() => {
    hrefSetter.mockReset();
    routerMocks.replace.mockReset();
    mockedGetLastKnown.mockReturnValue(null);
    vi.stubGlobal("location", {
      pathname: "/wallet/my-tickets/",
      search: "?login",
      origin: "http://localhost",
      get href() {
        return "http://localhost/wallet/my-tickets/?login";
      },
      set href(value: string) {
        hrefSetter(value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the Blocktickets splash instead of the wallet while auth is resolving", () => {
    mockedUseAuth.mockReturnValue(authState(false, false));
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(document.querySelector("[data-bt-tenant-loader]")).toBeNull();
    expect(screen.queryByText("Wallet content")).not.toBeInTheDocument();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("sends logged-out shoppers to login with the wallet return path", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    // The same splash stays up through the hop, so the wallet never paints
    // and the shopper never sees the loader blink out.
    expect(document.querySelector("[data-bt-platform-loader]")).toBeTruthy();
    expect(screen.queryByText("Wallet content")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith("/wallet/my-tickets/?login");
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/login/?from=%2Fwallet%2Fmy-tickets%2F%3Flogin",
      );
    });
    // Soft navigation only: a full document load would spin the browser tab.
    expect(hrefSetter).not.toHaveBeenCalled();
  });

  it("returns a guest arriving from checkout success back to the wallet", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    mockedGetLastKnown.mockReturnValue(
      "/checkout/success/?intentId=pi_test",
    );
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith("/wallet/my-tickets/?login");
      expect(routerMocks.replace).toHaveBeenCalledWith(
        "/login/?from=%2Fwallet%2Fmy-tickets%2F%3Flogin",
      );
    });
  });

  it("renders the wallet when the shopper is logged in", () => {
    mockedUseAuth.mockReturnValue(authState(true));
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    expect(screen.getByText("Wallet content")).toBeInTheDocument();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});
