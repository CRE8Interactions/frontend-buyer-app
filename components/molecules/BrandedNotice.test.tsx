import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BrandedNotice from "@/components/molecules/BrandedNotice";
import { getOrganizationsOnSale } from "@/lib/api";
import { DEMO_EVENTS, DEMO_ORGS } from "@/lib/demo/fixtures";
import {
  cacheEventBranding,
  cacheOrgBranding,
} from "@/lib/orgBrandingCache";

let mockPathname = "/browse/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useParams: () => ({}),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  getOrganizationsOnSale: vi.fn(),
}));

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;
const raptorsEvent = DEMO_EVENTS.find(
  (event) => event.organization.slug === "ogden-raptors",
)!;
const mockedGetOrganizationsOnSale = vi.mocked(getOrganizationsOnSale);

beforeEach(() => {
  sessionStorage.clear();
  mockPathname = "/browse/";
  mockedGetOrganizationsOnSale.mockReset();
  mockedGetOrganizationsOnSale.mockResolvedValue({ data: [] } as never);
});

describe("BrandedNotice", () => {
  it("shows the message and the team's way back when the page knows the org", () => {
    render(
      <BrandedNotice
        title="No tickets on sale"
        message="No ticket inventory is currently on sale for this event."
        branding={{
          primaryColor: raptors.branding.primaryColor,
          logoSrc: raptors.branding.logo.url,
          name: raptors.name,
          slug: raptors.slug,
        }}
      />,
    );

    expect(screen.getByText("No tickets on sale")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No ticket inventory is currently on sale for this event.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `See ${raptors.name} events` }),
    ).toHaveAttribute("href", expect.stringMatching(`^/${raptors.slug}/?$`));
  });

  it("falls back to the branding cached for the route when the event never loaded", () => {
    mockPathname = `/e/${raptorsEvent.slug}/${raptorsEvent.shortCode}/tickets/`;
    cacheEventBranding(raptorsEvent, raptorsEvent.organization);

    render(
      <BrandedNotice
        title="Event unavailable"
        message="This event page could not be found."
        branding={null}
      />,
    );

    expect(
      screen.getByText("This event page could not be found."),
    ).toBeInTheDocument();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `See ${raptors.name} events` }),
    ).toHaveAttribute("href", expect.stringMatching(`^/${raptors.slug}/?$`));
  });

  it("shows matching org branding on a missing event without an exact event cache entry", () => {
    mockPathname = `/e/${raptors.slug}-vs-yuba-sutter-freebirds/AFG/tickets/`;
    cacheOrgBranding(raptors);

    render(
      <BrandedNotice
        title="Event unavailable"
        message="This event page could not be found."
        branding={null}
      />,
    );

    expect(screen.getByText(raptors.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `See ${raptors.name} events` }),
    ).toHaveAttribute("href", expect.stringMatching(`^/${raptors.slug}/?$`));
  });

  it("loads matching org branding for a direct missing-event link", async () => {
    mockPathname = `/e/${raptors.slug}-vs-yuba-sutter-freebirds/AFG/tickets/`;
    mockedGetOrganizationsOnSale.mockResolvedValue({
      data: DEMO_ORGS,
    } as never);

    render(
      <BrandedNotice
        title="Event unavailable"
        message="This event page could not be found."
        branding={null}
      />,
    );

    expect(await screen.findByText(raptors.name)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: `See ${raptors.name} events` }),
    ).toHaveAttribute("href", expect.stringMatching(`^/${raptors.slug}/?$`));
  });

  it("waits on the loader instead of flashing a navy notice while branding loads", async () => {
    mockPathname = `/e/${raptors.slug}-vs-yuba-sutter-freebirds/AFG/tickets/`;
    let release: (organizations: unknown) => void = () => {};
    mockedGetOrganizationsOnSale.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }) as never,
    );

    render(
      <BrandedNotice
        title="Event unavailable"
        message="This event page could not be found."
        branding={null}
      />,
    );

    expect(screen.queryByText("Event unavailable")).not.toBeInTheDocument();

    release({ data: DEMO_ORGS });

    expect(await screen.findByText("Event unavailable")).toBeInTheDocument();
    expect(screen.getByText(raptors.name)).toBeInTheDocument();
  });

  it("still offers browse when no team branding is known", () => {
    render(
      <BrandedNotice
        title="Event unavailable"
        message="This event page could not be found."
        branding={null}
      />,
    );

    expect(
      screen.getByText("This event page could not be found."),
    ).toBeInTheDocument();
    expect(screen.queryByText(raptors.name)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse events" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/browse\/?$/),
    );
  });
});
