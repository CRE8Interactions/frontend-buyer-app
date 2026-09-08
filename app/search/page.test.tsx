import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import { eventPurchasePath } from "@/lib/helpers";

const searchParams = new URLSearchParams();

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
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/search/",
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ready: true, isAuthenticated: false, user: null }),
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  searchEvents: vi.fn(),
}));

import SearchPage from "@/app/search/page";
import { searchEvents } from "@/lib/api";

const mockedSearch = vi.mocked(searchEvents);

describe("Search page", () => {
  beforeEach(() => {
    searchParams.delete("query");
    mockedSearch.mockReset();
  });

  it("stays quiet and skips the API when there is no query", () => {
    render(<SearchPage />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it("shows the result count, event names, and purchase links from DEMO fixtures", async () => {
    const hits = DEMO_EVENTS.filter((event) => /raptors/i.test(event.name));
    searchParams.set("query", "raptors");
    mockedSearch.mockResolvedValue({ data: hits } as never);

    render(<SearchPage />);

    expect(screen.getByRole("status", { name: /searching/i })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        name: new RegExp(`we found ${hits.length} results for .raptors.`, "i"),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(hits[0].name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: new RegExp(hits[0].name, "i") }),
    ).toHaveAttribute("href", eventPurchasePath(hits[0]));
    const seated = hits.find((event) => event.shortCode === "RAPT006")!;
    expect(
      screen.getByRole("link", { name: new RegExp(seated.name, "i") }),
    ).toHaveAttribute("href", eventPurchasePath(seated));
  });

  it("shows zero results copy when nothing matches", async () => {
    searchParams.set("query", "zzzz");
    mockedSearch.mockResolvedValue({ data: [] } as never);

    render(<SearchPage />);

    expect(
      await screen.findByRole("heading", {
        name: /we found 0 results for .zzzz./i,
      }),
    ).toBeInTheDocument();
  });

  it("shows a failure state when search errors", async () => {
    searchParams.set("query", "icedogs");
    mockedSearch.mockRejectedValue(new Error("network"));

    render(<SearchPage />);

    expect(
      await screen.findByText(/search failed\. please try again/i),
    ).toBeInTheDocument();
  });
});
