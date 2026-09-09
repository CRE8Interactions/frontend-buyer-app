import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  ShopperSearchField,
  ShopperSearchMobile,
  ShopperSearchProvider,
} from "@/components/molecules/ShopperSearchBar";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import { eventPurchasePath } from "@/lib/helpers";

const push = vi.fn();
const beginRouteTransition = vi.fn();

vi.mock("@/lib/routeTransition", () => ({
  beginRouteTransition: (...args: unknown[]) => beginRouteTransition(...args),
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
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/browse/",
}));

vi.mock("@/lib/api", () => ({
  searchEvents: vi.fn(),
}));

import { searchEvents } from "@/lib/api";

const mockedSearch = vi.mocked(searchEvents);

function renderSearch() {
  return render(
    <ShopperSearchProvider>
      <ShopperSearchField />
      <ShopperSearchMobile />
    </ShopperSearchProvider>,
  );
}

describe("ShopperSearchBar", () => {
  beforeEach(() => {
    push.mockReset();
    beginRouteTransition.mockReset();
    mockedSearch.mockReset();
    mockedSearch.mockResolvedValue({ data: DEMO_EVENTS } as never);
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  it("does not search until three characters and then caps suggestions at three", async () => {
    const user = userEvent.setup();
    renderSearch();

    const field = screen.getByRole("textbox", { name: /search for events/i });
    await user.type(field, "vs");
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockedSearch).not.toHaveBeenCalled();

    await user.type(field, ".");
    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith({ data: "vs." });
    });
    expect(
      await screen.findByRole("link", { name: new RegExp(DEMO_EVENTS[0].name, "i") }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link").filter((link) =>
        /\/e\//.test(link.getAttribute("href") || ""),
      ),
    ).toHaveLength(3);
    expect(screen.getByRole("link", { name: /see all results/i })).toHaveAttribute(
      "href",
      "/search/?query=vs.",
    );
  });

  it("types into the field when the bar's padding is clicked", async () => {
    const user = userEvent.setup();
    renderSearch();

    const field = screen.getByRole("textbox", { name: /search for events/i });
    await user.click(field.parentElement!);
    await user.keyboard("icedogs");

    expect(field).toHaveFocus();
    expect(field).toHaveValue("icedogs");
  });

  it("navigates to the search page on Enter", async () => {
    const user = userEvent.setup();
    renderSearch();

    const field = screen.getByRole("textbox", { name: /search for events/i });
    await user.type(field, "icedogs{Enter}");

    expect(beginRouteTransition).toHaveBeenCalledWith("/search/?query=icedogs");
    expect(push).toHaveBeenCalledWith("/search/?query=icedogs");
  });

  it("shows the no-match copy when the API returns nothing", async () => {
    mockedSearch.mockResolvedValue({ data: [] } as never);
    const user = userEvent.setup();
    renderSearch();

    await user.type(
      screen.getByRole("textbox", { name: /search for events/i }),
      "zzz",
    );

    expect(
      await screen.findByText(/sorry, there are no results matching your search/i),
    ).toBeInTheDocument();
  });

  it("closes the mobile sheet from Cancel", async () => {
    window.innerWidth = 390;
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole("button", { name: /open search/i, hidden: true }));
    expect(screen.getByRole("dialog", { name: /search/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog", { name: /search/i })).not.toBeInTheDocument();
  });

  it("links a suggestion to the seated tickets path", async () => {
    const seated = DEMO_EVENTS.find((event) => event.shortCode === "RAPT006")!;
    mockedSearch.mockResolvedValue({ data: [seated] } as never);
    const user = userEvent.setup();
    renderSearch();

    await user.type(
      screen.getByRole("textbox", { name: /search for events/i }),
      "chu",
    );

    expect(
      await screen.findByRole("link", { name: new RegExp(seated.name, "i") }),
    ).toHaveAttribute("href", eventPurchasePath(seated));
  });
});
