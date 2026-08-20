import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const authState = {
  isAuthenticated: false,
  logout: vi.fn(),
};

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

vi.mock("@/lib/auth", () => ({
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
  });

  it("shows Log in when the shopper is signed out", () => {
    render(
      <NavAuthActions buttonStyle={{}} logoutStyle={{}} />,
    );

    expect(screen.getByRole("link", { name: /^log in$/i })).toHaveAttribute(
      "href",
      "/login/",
    );
    expect(
      screen.queryByRole("link", { name: /^my wallet$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^log out$/i }),
    ).not.toBeInTheDocument();
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
