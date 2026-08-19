import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  DEMO_ORGS,
  DEMO_SEATED_TICKET_GROUPS,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";
import { formatPackageFromPrice, packageFromPrice } from "@/lib/eventFromPrice";
import {
  __resetInAppBackForTests,
  markInAppNavigation,
} from "@/lib/inAppBack";
import useSeatmapStore from "@/stores/seatmapStore";
import GlobalRouteTransitionLoader from "@/components/molecules/GlobalRouteTransitionLoader";

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
  usePathname: () => "/nm-state/package/pkg-nms-level-a/",
  useParams: () => ({ slug: "nm-state" }),
}));

vi.mock("@/components/organisms/InteractiveSeatmap", () => ({
  InteractiveSeatmap: () => (
    <div data-testid="interactive-seatmap">Interactive seat map</div>
  ),
  InteractiveSeatmapMemo: () => (
    <div data-testid="interactive-seatmap">Interactive seat map</div>
  ),
}));

vi.mock("@/components/molecules/SectionLocatorThumb", () => ({
  default: ({ sectionNumber }: { sectionNumber?: string | number }) => (
    <div data-testid="section-thumb">Thumb {String(sectionNumber || "")}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  getPackageFE: vi.fn(),
  placePackageIntoCart: vi.fn(),
}));

vi.mock("@/lib/intercom", () => ({
  hideIntercomLauncher: vi.fn(),
}));

vi.mock("@/lib/cart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cart")>();
  return {
    ...actual,
    setStoredCart: vi.fn(),
  };
});

import PackageDetailClient from "@/components/organisms/PackageDetailClient";
import { getPackageFE, placePackageIntoCart } from "@/lib/api";
import { checkoutHref } from "@/lib/cart";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";

const mockedGetPackage = vi.mocked(getPackageFE);
const mockedPlacePackage = vi.mocked(placePackageIntoCart);

function packageResponse(eventPackage: ReturnType<typeof demoSeasonPackage> | null) {
  return { data: { eventPackage } } as never;
}

function seedMapSelection(overrides: Record<string, unknown> = {}) {
  const group = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("s1"));
  if (!group) throw new Error("demo fixtures need a seated group holding seat s1");
  const selected = {
    ...group,
    seatId: "s1",
    seatNumber: 1,
    quantity: 1,
    ...overrides,
  };
  useSeatmapStore.setState({
    selectedFromMap: [selected],
    totalCount: 1,
    totalPrice: Number(group.price || 0),
  });
  return selected;
}

async function renderPackage(
  eventPackage: ReturnType<typeof demoSeasonPackage> | null = demoSeasonPackage(),
) {
  mockedGetPackage.mockResolvedValue(packageResponse(eventPackage));
  const user = userEvent.setup();
  render(<PackageDetailClient packageId="pkg-nms-level-a" backHref="/nm-state/" />);
  return user;
}

describe("Package detail (PackageDetailClient)", () => {
  beforeEach(() => {
    mockedGetPackage.mockReset();
    mockedPlacePackage.mockReset();
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
    __resetInAppBackForTests();
    useSeatmapStore.setState({
      selectedFromMap: [],
      totalCount: 0,
      totalPrice: 0,
      data: null,
      background: null,
      seatedError: null,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the org loader while the package loads", () => {
    const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
    cacheOrgBranding(nmState);
    mockedGetPackage.mockReturnValue(new Promise(() => {}) as never);

    render(
      <PackageDetailClient packageId="pkg-nms-level-a" backHref="/nm-state/" />,
    );

    const orgLoader = document.querySelector("[data-bt-tenant-loader]");
    expect(orgLoader).toBeTruthy();
    expect(screen.getByText(nmState.name)).toBeInTheDocument();
    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading package/i)).not.toBeInTheDocument();
    expect(orgLoader).not.toHaveAttribute("data-bt-platform-loader");
  });

  it("does not show the Blocktickets loader when no org is cached yet", () => {
    mockedGetPackage.mockReturnValue(new Promise(() => {}) as never);

    render(
      <PackageDetailClient packageId="pkg-nms-level-a" backHref="/nm-state/" />,
    );

    expect(document.querySelector("[data-bt-platform-loader]")).toBeNull();
    expect(screen.queryByText(/loading package/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
  });

  it("renders the branded package overview with included games and a seat CTA", async () => {
    const pkg = demoSeasonPackage();
    await renderPackage(pkg);

    expect(
      await screen.findByRole("heading", { name: pkg.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(pkg.venue.name)).toBeInTheDocument();
    expect(
      screen.getByText(`Same seat, ${pkg.events.length} games`),
    ).toBeInTheDocument();
    expect(screen.getByText(pkg.events[0].name)).toBeInTheDocument();
    expect(
      screen.getByText(pkg.events[pkg.events.length - 1].name),
    ).toBeInTheDocument();
    expect(screen.getByText(formatPackageFromPrice(packageFromPrice(pkg)!))).toBeInTheDocument();
    expect(screen.queryByText(/taxes (&|and) fees included/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        `From ${formatCurrency(
          Math.min(...pkg.package_tickets.map((row) => Number(row.price))),
        )}`,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /choose your seats/i }),
    ).toBeInTheDocument();
  });

  it("shows package not found when the API returns no package", async () => {
    await renderPackage(null);

    expect(await screen.findByText(/package not found/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /choose your seats/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the shopper on the overview when the package has no seat map", async () => {
    const pkg = demoSeasonPackage({ seatmap: undefined });
    const user = await renderPackage(pkg);
    await screen.findByRole("heading", { name: pkg.name });

    await user.click(screen.getByRole("button", { name: /choose your seats/i }));

    expect(
      await screen.findByText(/seat selection is not available for this package yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/select your seats/i)).not.toBeInTheDocument();
  });

  it("opens the shared seat map overlay with the selection panel", async () => {
    const pkg = demoSeasonPackage();
    const user = await renderPackage(pkg);
    await screen.findByRole("heading", { name: pkg.name });

    await user.click(screen.getByRole("button", { name: /choose your seats/i }));

    expect(
      await screen.findByRole("dialog", { name: /select your seats/i }),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("interactive-seatmap")).toBeInTheDocument();

    const selected = seedMapSelection({
      package: { name: pkg.name },
    });
    expect(await screen.findByText(/your selection/i)).toBeInTheDocument();
    expect(screen.getByText(String(selected.offer?.name))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /details/i })).toBeInTheDocument();
  });

  it("shows Standard admission and keeps Details when a package seat has no offer", async () => {
    const pkg = demoSeasonPackage();
    const user = await renderPackage(pkg);
    await screen.findByRole("heading", { name: pkg.name });

    await user.click(screen.getByRole("button", { name: /choose your seats/i }));
    await screen.findByText(/select your seats/i);
    await screen.findByTestId("interactive-seatmap");

    seedMapSelection({
      package: { name: pkg.name },
      offer: undefined,
    });

    expect(await screen.findByText("Standard admission")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /details/i })).toBeInTheDocument();
  });

  it("shows the seated-error modal when placing the package into a cart fails", async () => {
    mockedPlacePackage.mockRejectedValue(new Error("hold failed"));
    const pkg = demoSeasonPackage();
    const user = await renderPackage(pkg);
    await screen.findByRole("heading", { name: pkg.name });

    await user.click(screen.getByRole("button", { name: /choose your seats/i }));
    await screen.findByTestId("interactive-seatmap");
    seedMapSelection();
    await screen.findByText(/your selection/i);

    await user.click(screen.getByRole("button", { name: /^checkout$/i }));

    expect(
      await screen.findByText(/selected tickets not available/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/selected seats are not available/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedPlacePackage).toHaveBeenCalled();
    });
  });

  it("holds seats then opens checkout for the selected package", async () => {
    const nmState = DEMO_ORGS.find((org) => org.slug === "nm-state")!;
    cacheOrgBranding(nmState);
    let finishHold!: (value: unknown) => void;
    mockedPlacePackage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishHold = resolve;
        }),
    );
    const pkg = demoSeasonPackage();
    const user = userEvent.setup();
    mockedGetPackage.mockResolvedValue(packageResponse(pkg));
    render(
      <>
        <GlobalRouteTransitionLoader />
        <PackageDetailClient packageId="pkg-nms-level-a" backHref="/nm-state/" />
      </>,
    );
    await screen.findByRole("heading", { name: pkg.name });
    await user.click(screen.getByRole("button", { name: /choose your seats/i }));
    await screen.findByTestId("interactive-seatmap");
    seedMapSelection();
    await screen.findByText(/your selection/i);

    const checkoutBtn = screen.getByRole("button", { name: /^checkout$/i });
    fireEvent.click(checkoutBtn);
    fireEvent.click(checkoutBtn);

    const holdingBtn = await screen.findByRole("button", {
      name: /holding seats/i,
    });
    expect(holdingBtn).toBeDisabled();
    expect(
      within(holdingBtn).getByRole("status", { name: /loading/i }),
    ).toBeInTheDocument();
    expect(mockedPlacePackage).toHaveBeenCalledTimes(1);
    fireEvent.click(holdingBtn);
    expect(mockedPlacePackage).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/getting payment ready/i)).not.toBeInTheDocument();

    finishHold({ data: { cartId: "pkg-cart-1" } });

    await waitFor(() => {
      expect(mockedPlacePackage).toHaveBeenCalled();
      expect(routerMocks.push).toHaveBeenCalledWith(checkoutHref("pkg-cart-1"));
    });
    expect(screen.getByRole("button", { name: /holding seats/i })).toBeDisabled();
    const orgLoader = document.querySelector("[data-bt-tenant-loader]");
    expect(orgLoader).toBeTruthy();
    expect(
      within(orgLoader as HTMLElement).getByText(nmState.name),
    ).toBeInTheDocument();
    expect(
      within(orgLoader as HTMLElement).getByText(/getting payment ready/i),
    ).toBeInTheDocument();
    expect(orgLoader).not.toHaveAttribute("data-bt-platform-loader");
  });

  it("calls router.back from the circular header after in-app navigation", async () => {
    markInAppNavigation();
    await renderPackage();
    await screen.findByRole("heading");
    await userEvent.click(screen.getByRole("link", { name: /^back$/i }));
    expect(routerMocks.back).toHaveBeenCalledTimes(1);
    expect(routerMocks.push).not.toHaveBeenCalled();
  });

  it("falls back to the org href when the circular header has no in-app history", async () => {
    await renderPackage();
    const back = await screen.findByRole("link", { name: /^back$/i });
    expect(back).toHaveAttribute("href", "/nm-state/");
    await userEvent.click(back);
    expect(routerMocks.push).toHaveBeenCalledWith("/nm-state/");
    expect(routerMocks.back).not.toHaveBeenCalled();
  });

  it("keeps see tickets when the package has no pricing tiers", async () => {
    const pkg = demoSeasonPackage({ pricingTiers: [] });
    await renderPackage(pkg);
    await screen.findByRole("heading", { name: pkg.name });
    expect(screen.getByText(/see tickets/i)).toBeInTheDocument();
    expect(
      screen.queryByText(
        `From ${formatCurrency(
          Math.min(...pkg.package_tickets.map((row) => Number(row.price))),
        )}`,
      ),
    ).not.toBeInTheDocument();
  });
});
