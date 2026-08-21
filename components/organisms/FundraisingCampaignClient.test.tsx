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

vi.mock("@/lib/api", () => ({
  getPublicFundraisingCampaign: vi.fn(),
  createLandingPageDonationIntent: vi.fn(),
  confirmLandingPageDonation: vi.fn(),
}));

import { FundraisingCampaignClient } from "@/components/organisms/FundraisingCampaignClient";
import {
  createLandingPageDonationIntent,
  getPublicFundraisingCampaign,
} from "@/lib/api";

const mockedCampaign = vi.mocked(getPublicFundraisingCampaign);
const mockedIntent = vi.mocked(createLandingPageDonationIntent);

describe("FundraisingCampaignClient donor fields", () => {
  beforeEach(() => {
    mockedCampaign.mockReset();
    mockedIntent.mockReset();
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
    await user.type(screen.getByLabelText(/^email$/i), DEMO_USER.email);
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

    await user.type(screen.getByLabelText(/^email$/i), "shopper@mailinator.com");
    await user.click(
      screen.getByRole("button", { name: /continue to payment/i }),
    );

    expect(await screen.findByText(FIELD_COPY.invalidEmail)).toBeInTheDocument();
    expect(mockedIntent).not.toHaveBeenCalled();
  });
});
