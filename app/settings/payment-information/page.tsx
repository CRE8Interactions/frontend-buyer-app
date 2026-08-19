"use client";

import { useEffect, useState } from "react";
import WalletShell from "@/components/templates/WalletShell";
import BackChip from "@/components/molecules/BackChip";
import PageLoader from "@/components/molecules/PageLoader";
import { cardCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import {
  createBankAccount,
  getBankAccount,
  removeBankAccount,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

type BankAccount = {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  external_accounts?: {
    data?: { bank_name?: string; last4?: string }[];
  };
};

export default function PaymentInformationPage() {
  const { ready, isAuthenticated } = useAuth();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBankAccount();
      setAccount(res.data as BankAccount);
    } catch (err) {
      console.error(err);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void load();
  }, [ready, isAuthenticated]);

  const hasBank = Boolean(account?.external_accounts);
  const complete = Boolean(account?.charges_enabled && account?.payouts_enabled);
  const bank = account?.external_accounts?.data?.[0];

  const linkAccount = async () => {
    setBusy(true);
    try {
      const res = await createBankAccount({});
      const link = (res.data as { link?: string })?.link;
      if (link) window.open(link, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeBankAccount();
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <WalletShell>
      <BackChip href="/settings/" label="Settings" />
      <h2 className="mt-6 text-[22px] font-semibold tracking-[-0.01em]">Payment information</h2>
      <p className="mt-1 text-[14px] text-[#9DA2B3]">
        Money from ticket sales is issued to the bank account linked here.
      </p>

      {loading ? (
        <PageLoader message="Loading…" label="Loading" className="mt-6 min-h-[30vh]" />
      ) : (
        <div className={`${cardCls} mt-6 p-6 sm:p-7`}>
          {hasBank && complete ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#A6E773]/15 text-[#A6E773]">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="m3 9 9-6 9 6M4 9v11h16V9M9 20v-6h6v6" />
                  </svg>
                </span>
                <div>
                  <p className="text-[15px] font-semibold">
                    {bank?.bank_name || "Bank account"}{" "}
                    <Pill variant="success" size="sm" className="ml-2">
                      Linked
                    </Pill>
                  </p>
                  <p className="mt-0.5 text-[13px] tabular-nums text-[#9DA2B3]">
                    •••• {bank?.last4 || "····"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove()}
                className="text-[13px] font-semibold text-[#ff7a72] hover:text-[#ff9a93] disabled:opacity-50"
              >
                {busy ? "Removing…" : "Remove"}
              </button>
            </div>
          ) : hasBank && !complete ? (
            <div>
              <p className="text-[14px] text-[#9DA2B3]">
                You haven&rsquo;t finished setting up your banking info. Continue to complete your
                bank account.
              </p>
              <Button className="mt-4" disabled={busy} onClick={() => void linkAccount()}>
                {busy ? "Opening…" : "Continue setup"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[14px] text-[#9DA2B3]">No bank account linked yet.</p>
              <Button size="sm" disabled={busy} onClick={() => void linkAccount()}>
                {busy ? "Opening…" : "+ Link bank account"}
              </Button>
            </div>
          )}
        </div>
      )}
    </WalletShell>
  );
}
