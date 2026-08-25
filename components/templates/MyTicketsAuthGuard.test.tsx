import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyTicketsAuthGuard from "@/components/templates/MyTicketsAuthGuard";

const hrefSetter = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
  setLastKnown: vi.fn(),
  getLastKnown: vi.fn(),
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
    mockedGetLastKnown.mockReturnValue(null);
    vi.stubGlobal("location", {
      pathname: "/my-tickets/",
      search: "?login",
      origin: "http://localhost",
      get href() {
        return "http://localhost/my-tickets/?login";
      },
      set href(value: string) {
        hrefSetter(value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends logged-out shoppers to login with the wallet return path", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    expect(screen.getAllByLabelText(/redirecting/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Wallet content")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith("/my-tickets/?login");
      expect(hrefSetter).toHaveBeenCalledWith(
        "/login/?from=%2Fmy-tickets%2F%3Flogin",
      );
    });
  });

  it("returns a guest arriving from checkout success back to the wallet", async () => {
    mockedUseAuth.mockReturnValue(authState(false));
    mockedGetLastKnown.mockReturnValue(
      "/checkout/checkout-success/?intentId=pi_test",
    );
    render(
      <MyTicketsAuthGuard>
        <div>Wallet content</div>
      </MyTicketsAuthGuard>,
    );

    await waitFor(() => {
      expect(mockedSetLastKnown).toHaveBeenCalledWith("/my-tickets/?login");
      expect(hrefSetter).toHaveBeenCalledWith(
        "/login/?from=%2Fmy-tickets%2F%3Flogin",
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
    expect(hrefSetter).not.toHaveBeenCalled();
  });
});
