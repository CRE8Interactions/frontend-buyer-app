import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetInAppBackForTests, markInAppNavigation } from "@/lib/inAppBack";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
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
}));

import BackChip from "@/components/molecules/BackChip";

describe("BackChip", () => {
  beforeEach(() => {
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
    __resetInAppBackForTests();
  });

  afterEach(() => {
    __resetInAppBackForTests();
  });

  it("calls router.back after in-app navigation instead of pushing the href", async () => {
    markInAppNavigation();
    render(<BackChip href="/my-events/" label="My events" />);
    await userEvent.click(screen.getByRole("link", { name: /my events/i }));
    expect(routerMocks.back).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("falls back to the href when this session has no in-app history", async () => {
    render(<BackChip href="/settings/" label="Settings" />);
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link).toHaveAttribute("href", "/settings/");
    await userEvent.click(link);
    expect(routerMocks.push).toHaveBeenCalledWith("/settings/");
    expect(routerMocks.back).not.toHaveBeenCalled();
  });
});
