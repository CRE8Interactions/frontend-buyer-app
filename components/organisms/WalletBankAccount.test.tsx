import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import { createBankAccount, getBankAccount, removeBankAccount } from "@/lib/api";

const mockedGetBankAccount = vi.mocked(getBankAccount);
const mockedCreateBankAccount = vi.mocked(createBankAccount);
const mockedRemoveBankAccount = vi.mocked(removeBankAccount);

async function confirmDelete() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog", { name: "Delete bank account?" });
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));
  return { user, dialog };
}

const linkedStripeAccount = {
  external_accounts: { data: [{ bank_name: "Chase", last4: "5556" }] },
  charges_enabled: true,
  payouts_enabled: true,
};

describe("WalletBankAccount", () => {
  beforeEach(() => {
    mockedGetBankAccount.mockReset();
    mockedCreateBankAccount.mockReset();
    mockedRemoveBankAccount.mockReset();
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

  it("shows the masked Stripe account once payouts are enabled", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: linkedStripeAccount } as never);
    render(<WalletBankAccount />);
    expect(await screen.findByRole("heading", { name: "Bank Information" })).toBeInTheDocument();
    expect(screen.getByText("Chase")).toBeInTheDocument();
    expect(screen.getByText("XXXXX5556")).toBeInTheDocument();
    expect(screen.getByText("U.S. Dollars, United States")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByText("Bank account connected")).not.toBeInTheDocument();
  });

  it("asks before deleting, then removes the account and offers to link another", async () => {
    mockedGetBankAccount
      .mockResolvedValueOnce({ data: linkedStripeAccount } as never)
      .mockResolvedValueOnce({ data: { message: "No account" } } as never);
    mockedRemoveBankAccount.mockResolvedValue({ data: { deleted: true } } as never);
    const user = userEvent.setup();
    render(<WalletBankAccount />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(mockedRemoveBankAccount).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("dialog", { name: "Delete bank account?" })).getByRole("button", {
        name: "Delete",
      }),
    );

    expect(mockedRemoveBankAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: "Link bank account" })).toBeInTheDocument();
    expect(screen.queryByText("XXXXX5556")).not.toBeInTheDocument();
  });

  it("keeps the linked account when delete fails", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: linkedStripeAccount } as never);
    mockedRemoveBankAccount.mockRejectedValue(new Error("nope"));
    render(<WalletBankAccount />);

    await confirmDelete();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to remove bank account. Try again.",
    );
    expect(screen.getByText("XXXXX5556")).toBeInTheDocument();
  });

  it("shows the ticket blocks while the bank account is loading", () => {
    mockedGetBankAccount.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletBankAccount />);
    expect(screen.getByLabelText("Loading tickets")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bank Information" })).not.toBeInTheDocument();
  });

  it("shows a spinner in the link button while setup opens", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: {} } as never);
    mockedCreateBankAccount.mockReturnValue(new Promise(() => {}) as never);
    const user = userEvent.setup();
    render(<WalletBankAccount />);

    const button = await screen.findByRole("button", { name: "Link bank account" });
    await user.click(button);

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("keeps the setup spinner until Stripe opens", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });
    mockedGetBankAccount.mockResolvedValue({
      data: { external_accounts: [{}], charges_enabled: false, payouts_enabled: false },
    } as never);
    mockedRemoveBankAccount.mockResolvedValue({ data: {} } as never);
    mockedCreateBankAccount.mockResolvedValue({
      data: { link: "https://connect.stripe.com/setup" },
    } as never);
    const user = userEvent.setup();
    render(<WalletBankAccount />);

    const button = await screen.findByRole("button", { name: "Continue" });
    await user.click(button);

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("https://connect.stripe.com/setup"),
    );
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();

    const returned = new Event("pageshow");
    Object.defineProperty(returned, "persisted", { value: true });
    window.dispatchEvent(returned);

    await waitFor(() => expect(button).not.toHaveAttribute("aria-busy"));
    expect(button).toBeEnabled();
    vi.unstubAllGlobals();
  });

  it("clears the link spinner when Stripe setup cannot open", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: {} } as never);
    mockedCreateBankAccount.mockResolvedValue({ data: {} } as never);
    const user = userEvent.setup();
    render(<WalletBankAccount />);

    const button = await screen.findByRole("button", { name: "Link bank account" });
    await user.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to open bank account setup. Try again.",
    );
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).toBeEnabled();
  });

  it("shows a spinner in Continue while setup resumes", async () => {
    mockedGetBankAccount.mockResolvedValue({
      data: { external_accounts: [{}], charges_enabled: false, payouts_enabled: false },
    } as never);
    mockedRemoveBankAccount.mockReturnValue(new Promise(() => {}) as never);
    const user = userEvent.setup();
    render(<WalletBankAccount />);

    const button = await screen.findByRole("button", { name: "Continue" });
    await user.click(button);

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });

  it("shows a spinner in the confirm button while the account is deleting", async () => {
    mockedGetBankAccount.mockResolvedValue({ data: linkedStripeAccount } as never);
    mockedRemoveBankAccount.mockReturnValue(new Promise(() => {}) as never);
    render(<WalletBankAccount />);

    const { dialog } = await confirmDelete();
    const button = within(dialog).getByRole("button", { name: "Delete" });

    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
  });
});
