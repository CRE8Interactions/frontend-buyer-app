import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletPayouts from "@/components/organisms/WalletPayouts";
import { __resetWalletAccountCacheForTests } from "@/lib/walletAccountCache";
import { demoLinkedBankAccount } from "@/lib/demo/fixtures";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  getBankAccount: vi.fn(),
  getAvailableFunds: vi.fn(),
}));

import { getAvailableFunds, getBankAccount } from "@/lib/api";

const mockedGetBankAccount = vi.mocked(getBankAccount);
const mockedGetAvailableFunds = vi.mocked(getAvailableFunds);

describe("WalletPayouts", () => {
  beforeEach(() => {
    __resetWalletAccountCacheForTests();
    mockedGetBankAccount.mockReset();
    mockedGetAvailableFunds.mockReset();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    mockedGetBankAccount.mockResolvedValue({ data: demoLinkedBankAccount() } as never);
  });

  it("shows the saved payouts again without loading them", async () => {
    mockedGetAvailableFunds.mockResolvedValue({
      data: { available: [{ payout: 20 }], onHold: [] },
    } as never);
    const first = render(<WalletPayouts />);
    expect(await screen.findByText("$20.00")).toBeInTheDocument();
    expect(mockedGetBankAccount).toHaveBeenCalledTimes(1);
    expect(mockedGetAvailableFunds).toHaveBeenCalledTimes(1);
    first.unmount();

    mockedGetBankAccount.mockReturnValue(new Promise(() => {}) as never);
    mockedGetAvailableFunds.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletPayouts />);
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading tickets")).not.toBeInTheDocument();
    expect(mockedGetBankAccount).toHaveBeenCalledTimes(1);
    expect(mockedGetAvailableFunds).toHaveBeenCalledTimes(1);
  });

  it("shows deposited and on-hold totals without a withdraw action", async () => {
    mockedGetAvailableFunds.mockResolvedValue({
      data: {
        available: [{ payout: 12.5 }, { payout: 7.5 }],
        onHold: [{ payout: 20 }],
      },
    } as never);
    render(<WalletPayouts />);

    const last4 = demoLinkedBankAccount().external_accounts.data[0].last4;
    expect(await screen.findByRole("heading", { name: `Depositing to account • ${last4}` })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/wallet/bank-account/");
    expect(screen.queryByRole("heading", { name: "No bank account linked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Link account" })).not.toBeInTheDocument();
    expect(screen.getByText("Resale payouts are deposited to your bank after the event.")).toBeInTheDocument();
    expect(screen.getAllByText("$20.00")).toHaveLength(2);
    expect(screen.getByText("Payouts are deposited after the event. You do not need to withdraw them.")).toBeInTheDocument();
    expect(screen.getByText("Held until the event ends, then deposited to your bank.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Invoices" })).not.toBeInTheDocument();
  });

  it("shows the ticket blocks while payouts are loading", () => {
    mockedGetAvailableFunds.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletPayouts />);
    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(screen.queryByText("Depositing to your bank")).not.toBeInTheDocument();
  });

  it("sends an unfinished bank link to the bank account page", async () => {
    mockedGetBankAccount.mockResolvedValue({
      data: demoLinkedBankAccount({ charges_enabled: true, payouts_enabled: false }),
    } as never);
    mockedGetAvailableFunds.mockResolvedValue({ data: { available: [], onHold: [] } } as never);
    render(<WalletPayouts />);

    expect(await screen.findByRole("heading", { name: "No bank account linked" })).toBeInTheDocument();
    expect(screen.getByText("Link a bank account to receive payouts.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link account" })).toHaveAttribute(
      "href",
      "/wallet/bank-account/",
    );
    expect(screen.queryByRole("link", { name: "Manage" })).not.toBeInTheDocument();
    expect(screen.queryByText("Payouts are deposited after the event. You do not need to withdraw them.")).not.toBeInTheDocument();
  });

  it("sends shoppers with no bank to the bank account page", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: {} } as never);
    mockedGetAvailableFunds.mockResolvedValue({ data: { available: [], onHold: [] } } as never);
    render(<WalletPayouts />);

    expect(await screen.findByRole("heading", { name: "No bank account linked" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link account" })).toHaveAttribute(
      "href",
      "/wallet/bank-account/",
    );
  });
});
