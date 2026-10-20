import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletPayouts from "@/components/organisms/WalletPayouts";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", () => ({
  getBankAccount: vi.fn(),
  getAvailableFunds: vi.fn(),
  getMyUpcomingOrders: vi.fn(),
  createBankAccount: vi.fn(),
}));

import { getAvailableFunds, getBankAccount, getMyUpcomingOrders } from "@/lib/api";

const mockedGetBankAccount = vi.mocked(getBankAccount);
const mockedGetAvailableFunds = vi.mocked(getAvailableFunds);
const mockedGetMyUpcomingOrders = vi.mocked(getMyUpcomingOrders);

describe("WalletPayouts", () => {
  beforeEach(() => {
    mockedGetBankAccount.mockReset();
    mockedGetAvailableFunds.mockReset();
    mockedGetMyUpcomingOrders.mockReset();
    mockedGetBankAccount.mockResolvedValue({ data: { id: "acct-1" } } as never);
    mockedGetMyUpcomingOrders.mockResolvedValue({ data: [] } as never);
  });

  it("shows deposited and on-hold totals without a withdraw action", async () => {
    mockedGetAvailableFunds.mockResolvedValue({
      data: {
        available: [{ payout: 12.5 }, { payout: 7.5 }],
        onHold: [{ payout: 20 }],
      },
    } as never);
    render(<WalletPayouts />);

    expect(await screen.findByRole("heading", { name: "Payouts" })).toBeInTheDocument();
    expect(screen.getByText("Resale payouts are deposited to your bank after the event.")).toBeInTheDocument();
    expect(screen.getAllByText("$20.00")).toHaveLength(2);
    expect(screen.getByText("Payouts are deposited after the event. You do not need to withdraw them.")).toBeInTheDocument();
    expect(screen.getByText("Held until the event ends, then deposited to your bank.")).toBeInTheDocument();
    expect(screen.getAllByText("$20.00")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /withdraw/i })).not.toBeInTheDocument();
  });
});
