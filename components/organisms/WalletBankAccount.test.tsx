import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletBankAccount from "@/components/organisms/WalletBankAccount";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  getBankAccount: vi.fn(),
  createBankAccount: vi.fn(),
  removeBankAccount: vi.fn(),
}));

import { getBankAccount } from "@/lib/api";

const mockedGetBankAccount = vi.mocked(getBankAccount);

describe("WalletBankAccount", () => {
  beforeEach(() => {
    mockedGetBankAccount.mockReset();
  });

  it("offers to link a bank when none is connected", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: {} } as never);
    render(<WalletBankAccount />);
    expect(await screen.findByRole("button", { name: "Link bank account" })).toBeInTheDocument();
  });

  it("asks the seller to finish an incomplete account", async () => {
    mockedGetBankAccount.mockResolvedValue({
      data: { external_accounts: [{}], charges_enabled: false, payouts_enabled: false },
    } as never);
    render(<WalletBankAccount />);
    expect(
      await screen.findByText(
        "You haven't finished setting up your banking info, please continue to finish setting up your bank account",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("says the account is being verified while setup is processing", async () => {
    mockedGetBankAccount.mockResolvedValue({
      data: { external_accounts: [{}], charges_enabled: false, payouts_enabled: false },
    } as never);
    render(<WalletBankAccount processing />);
    expect(
      await screen.findByText("Verifying account check back in a few minutes"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("shows the linked account once payouts are enabled", async () => {
    mockedGetBankAccount.mockResolvedValue({
      data: {
        external_accounts: [{}],
        charges_enabled: true,
        payouts_enabled: true,
        bank_name: "Chase",
        last4: "4242",
      },
    } as never);
    render(<WalletBankAccount />);
    expect(await screen.findByText("Chase ····4242")).toBeInTheDocument();
  });
});
