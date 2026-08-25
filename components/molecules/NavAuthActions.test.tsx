import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MouseEventHandler, ReactNode } from "react";

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  logout: vi.fn(),
  setLastKnown: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/browse/",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={typeof href === "string" ? href : "#"}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth", () => ({
  setLastKnown: authState.setLastKnown,
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    logout: authState.logout,
    ready: true,
    user: null,
    session: null,
    login: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import NavAuthActions from "@/components/molecules/NavAuthActions";

describe("NavAuthActions", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.logout.mockReset();
    authState.setLastKnown.mockReset();
    window.history.pushState({}, "", "/browse/?city=ogden");
  });

  it("returns a signed-out shopper to the current page after login", async () => {
    const user = userEvent.setup();
    render(
      <NavAuthActions buttonStyle={{}} logoutStyle={{}} />,
    );

    expect(screen.getByRole("link", { name: /^log in$/i })).toHaveAttribute(
      "href",
      "/login/?from=%2Fbrowse%2F",
    );
    expect(
      screen.queryByRole("link", { name: /^my wallet$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^log out$/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^log in$/i }));
    expect(authState.setLastKnown).toHaveBeenCalledWith(
      "/browse/?city=ogden",
    );
  });

  it("shows My wallet and Log out when the shopper is signed in", async () => {
    authState.isAuthenticated = true;
    const user = userEvent.setup();
    render(
      <NavAuthActions buttonStyle={{}} logoutStyle={{}} />,
    );

    expect(screen.getByRole("link", { name: /^my wallet$/i })).toHaveAttribute(
      "href",
      "/my-tickets/",
    );
    expect(
      screen.queryByRole("link", { name: /^log in$/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^log out$/i }));
    expect(authState.logout).toHaveBeenCalled();
  });
});
