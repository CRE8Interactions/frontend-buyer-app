import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ORGS } from "@/lib/demo/fixtures";
import RouteLoader, {
  BrandedLoader,
} from "@/components/molecules/RouteLoader";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useParams: () => ({}),
}));

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

beforeEach(() => {
  mockPathname = "/";
});

afterEach(() => {
  document.getElementById("bt-boot-loader")?.remove();
});

describe("BrandedLoader", () => {
  it("shows the tenant loader with loading tickets copy", () => {
    render(
      <BrandedLoader
        branding={{
          primaryColor: raptors.branding.primaryColor,
          logoSrc: raptors.branding.logo.url,
          name: raptors.name,
        }}
      />,
    );

    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(screen.getByText("loading tickets")).toBeInTheDocument();
    expect(screen.queryByText(/loading blocktickets/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
    expect(screen.getByAltText(raptors.name)).toHaveAttribute(
      "src",
      raptors.branding.logo.url,
    );
  });

  it("does not show the Blocktickets launch loader when branding is missing", () => {
    const { container } = render(<BrandedLoader />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/loading blocktickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading tickets/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
  });

  it("replaces the pre-hydrate splash when it paints the tenant loader", () => {
    const splash = document.createElement("div");
    splash.id = "bt-boot-loader";
    document.documentElement.appendChild(splash);

    render(
      <BrandedLoader
        branding={{
          primaryColor: raptors.branding.primaryColor,
          logoSrc: raptors.branding.logo.url,
          name: raptors.name,
        }}
      />,
    );

    expect(document.getElementById("bt-boot-loader")).toBeNull();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
  });

  it("leaves the pre-hydrate splash up when it has no loader to paint", () => {
    const splash = document.createElement("div");
    splash.id = "bt-boot-loader";
    document.documentElement.appendChild(splash);

    render(<BrandedLoader />);

    expect(document.getElementById("bt-boot-loader")).not.toBeNull();
  });
});

describe("RouteLoader", () => {
  it("paints the cached tenant loader before page branding arrives", () => {
    mockPathname = "/checkout/";
    cacheOrgBranding(raptors);
    render(<RouteLoader />);

    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(screen.getByText("getting payment ready")).toBeInTheDocument();
    expect(screen.queryByText(/loading tickets/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/loading blocktickets/i)).not.toBeInTheDocument();
  });

  it("shows retrieving payment details on checkout confirmation", () => {
    mockPathname = "/checkout/checkout-success/";
    cacheOrgBranding(raptors);
    render(<RouteLoader />);

    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(screen.getByText("retrieving payment details")).toBeInTheDocument();
    expect(screen.queryByText(/loading tickets/i)).not.toBeInTheDocument();
  });

  it("shows the Blocktickets spinner on login instead of the last team", () => {
    cacheOrgBranding(raptors);
    mockPathname = "/login/";
    render(<RouteLoader />);

    expect(screen.getByAltText(/blocktickets/i)).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();
  });

  it("shows the Blocktickets spinner on home, browse, and Our Story", () => {
    cacheOrgBranding(raptors);
    mockPathname = "/browse/";
    const { rerender } = render(<RouteLoader />);

    expect(screen.getByAltText(/blocktickets/i)).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();

    mockPathname = "/our-story/";
    rerender(<RouteLoader />);
    expect(screen.getByAltText(/blocktickets/i)).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();

    mockPathname = "/";
    rerender(<RouteLoader />);
    expect(screen.getByAltText(/blocktickets/i)).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();
  });

  it("shows the Blocktickets spinner on the wallet unless this landing came from a tenant", () => {
    cacheOrgBranding(raptors);
    mockPathname = "/wallet/my-tickets/";
    const { rerender } = render(<RouteLoader />);

    expect(screen.getByAltText(/blocktickets/i)).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();

    rerender(<RouteLoader walletEntryFromTenant />);
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();
  });
});
