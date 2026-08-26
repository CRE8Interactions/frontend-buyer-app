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
    expect(
      screen.getByRole("link", { name: /^purchase policy$/i }),
    ).toHaveAttribute("data-next-link");
    expect(screen.getByRole("link", { name: /^home$/i })).not.toHaveAttribute(
      "target",
    );
  });

  it("opens legal pages in a new tab", () => {
    render(<SiteFooter />);

    for (const name of [
      /^purchase policy$/i,
      /^terms & conditions$/i,
      /^privacy policy$/i,
      /^disclaimer$/i,
      /^cookies policy$/i,
    ]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAttribute("data-next-link");
    }
  });

  it("opens Help Center in a new tab instead of a Next.js Link", () => {
    render(<SiteFooter />);

    const help = screen.getByRole("link", { name: /help center/i });
    expect(help).toHaveAttribute("href", "https://help.blocktickets.xyz/en/");
    expect(help).toHaveAttribute("target", "_blank");
    expect(help).toHaveAttribute("rel", "noopener noreferrer");
    expect(help).not.toHaveAttribute("data-next-link");
  });
});
