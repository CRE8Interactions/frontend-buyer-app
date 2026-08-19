import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import SiteFooter from "@/components/organisms/SiteFooter";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : "#"} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}));

describe("SiteFooter", () => {
  it("uses Next.js Link for in-app footer navigation", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: /^home$/i })).toHaveAttribute(
      "data-next-link",
    );
    expect(screen.getByRole("link", { name: /^browse$/i })).toHaveAttribute(
      "href",
      "/browse",
    );
    expect(screen.getByRole("link", { name: /^browse$/i })).toHaveAttribute(
      "data-next-link",
    );
  });

  it("keeps Help Center as a plain anchor instead of Next.js Link", () => {
    render(<SiteFooter />);

    const help = screen.getByRole("link", { name: /help center/i });
    expect(help).toBeInTheDocument();
    expect(help).not.toHaveAttribute("data-next-link");
  });
});
