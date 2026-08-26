import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  logout: vi.fn(),
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

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    ready: authMocks.ready,
    logout: authMocks.logout,
    isAuthenticated: false,
    user: null,
    session: null,
    login: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import SignOut from "@/components/organisms/SignOut";

describe("SignOut", () => {
  beforeEach(() => {
    authMocks.logout.mockReset();
    authMocks.ready = true;
  });

  it("ends the session and offers Browse", () => {
    render(<SignOut />);

    expect(authMocks.logout).toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: /you.re signed out/i, level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to browse/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/browse\/?$/));
    expect(
      screen.getByRole("link", { name: /sign back in/i }),
    ).toHaveAttribute("href", expect.stringMatching(/^\/login\/?$/));
    expect(screen.queryByText(/welcome aggie nation/i)).not.toBeInTheDocument();
  });
});
