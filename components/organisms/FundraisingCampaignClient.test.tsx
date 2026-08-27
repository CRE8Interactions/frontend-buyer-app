import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ORGS, DEMO_USER } from "@/lib/demo/fixtures";
import { FIELD_COPY } from "@/lib/fieldValidation";

const org = DEMO_ORGS[0];

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

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PaymentElement: () => null,
  useElements: () => ({}),
  useStripe: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/fundraise/demo-fundraiser/",
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ ready: true, isAuthenticated: false, user: null }),
  setLastKnown: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getPublicFundraisingCampaign: vi.fn(),
  createLandingPageDonationIntent: vi.fn(),
  confirmLandingPageDonation: vi.fn(),
  getPublicOrganizationBranding: vi.fn(),
}));

import { FundraisingCampaignClient } from "@/components/organisms/FundraisingCampaignClient";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";
import {
  createLandingPageDonationIntent,
  getPublicFundraisingCampaign,
  getPublicOrganizationBranding,
} from "@/lib/api";

const mockedCampaign = vi.mocked(getPublicFundraisingCampaign);
const mockedIntent = vi.mocked(createLandingPageDonationIntent);
const mockedOrg = vi.mocked(getPublicOrganizationBranding);

describe("FundraisingCampaignClient donor fields", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedCampaign.mockReset();
    mockedIntent.mockReset();
    mockedOrg.mockReset();
    mockedOrg.mockResolvedValue({ data: { organization: org } } as never);
    mockedCampaign.mockResolvedValue({
      data: {
        campaign: {
          slug: "demo-fundraiser",
          title: "Demo fundraiser",
          enableLandingPageDonation: true,
          organizationUUID: org.uuid,
          suggestedAmounts: [25],
        },
      },
    } as never);
    mockedIntent.mockResolvedValue({
      data: { clientSecret: "cs_test", donationAmount: 25 },
    } as never);
  });

  it("allows an empty donor name when the demo email is valid", async () => {
    const user = userEvent.setup();
    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationUUID={org.uuid}
      />,
    );

    await screen.findByRole("heading", { name: "Demo fundraiser" });
    await user.type(screen.getByLabelText(/email address/i), DEMO_USER.email);
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    await waitFor(() => {
      expect(mockedIntent).toHaveBeenCalledWith(
        "demo-fundraiser",
        expect.objectContaining({
          donorName: "",
          donorEmail: DEMO_USER.email,
        }),
      );
    });
  });

  it("does not enter digits in the donor name and rejects a blocked email", async () => {
    const user = userEvent.setup();
    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationUUID={org.uuid}
      />,
    );

    await screen.findByRole("heading", { name: "Demo fundraiser" });
    await user.type(screen.getByLabelText(/^name$/i), "1");
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("");

    await user.type(screen.getByLabelText(/email address/i), "shopper@mailinator.com");
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedIntent).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /continue to payment/i }),
    ).toBeEnabled();
  });

  it("requires an email when the donor is not anonymous", async () => {
    const user = userEvent.setup();
    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationUUID={org.uuid}
      />,
    );

    await screen.findByRole("heading", { name: "Demo fundraiser" });
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(await screen.findByText(FIELD_COPY.emailRequired)).toBeInTheDocument();
    expect(mockedIntent).not.toHaveBeenCalled();
  });

  it("shows the organization name on an org fundraiser", async () => {
    mockedCampaign.mockResolvedValue({
      data: {
        campaign: {
          slug: "demo-fundraiser",
          title: "Demo fundraiser",
          enableLandingPageDonation: true,
          organizationUUID: org.uuid,
          organization: org,
          suggestedAmounts: [25],
        },
      },
    } as never);

    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationSlug={org.slug}
      />,
    );

    expect(
      await screen.findByRole("img", { name: org.name }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: `${org.name} home` }),
    ).not.toBeInTheDocument();
  });

  it("holds the org loader, never the Blocktickets one, while an org fundraiser loads", async () => {
    cacheOrgBranding(org);
    let releaseCampaign: (value: unknown) => void = () => {};
    mockedCampaign.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseCampaign = resolve;
        }) as never,
    );

    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationSlug={org.slug}
      />,
    );

    expect(screen.getByText(org.name)).toBeInTheDocument();
    expect(screen.getByText("loading fundraiser")).toBeInTheDocument();
    expect(screen.queryByAltText(/blocktickets/i)).not.toBeInTheDocument();

    releaseCampaign({
      data: {
        campaign: {
          slug: "demo-fundraiser",
          title: "Demo fundraiser",
          organization: org,
        },
      },
    });

    expect(
      await screen.findByRole("heading", { name: "Demo fundraiser" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("loading fundraiser")).not.toBeInTheDocument();
  });

  it("holds the Blocktickets loader on /fundraise/:slug", () => {
    mockedCampaign.mockImplementation(() => new Promise(() => {}) as never);

    render(
      <FundraisingCampaignClient
        campaignSlug="demo-fundraiser"
        organizationUUID={org.uuid}
      />,
    );

    expect(screen.getByRole("status", { name: /loading/i })).toHaveAttribute(
      "data-bt-platform-loader",
    );
    expect(screen.getByAltText("Blocktickets")).toBeInTheDocument();
    expect(screen.getByText("loading fundraiser")).toBeInTheDocument();
    expect(screen.queryByText(org.name)).not.toBeInTheDocument();
  });
});
