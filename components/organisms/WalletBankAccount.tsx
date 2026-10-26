"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CenteredBusyLabel } from "@/components/atoms/BrandedActionButton";
import { WalletTicketsBlocksLoading } from "@/components/organisms/WalletTicketsLoader";
import { createBankAccount, getBankAccount, removeBankAccount } from "@/lib/api";

type ExternalBankAccount = {
  bank_name?: string;
  last4?: string;
};

type BankAccountRecord = {
  id?: string | number;
  external_accounts?: { data?: ExternalBankAccount[] } | ExternalBankAccount[] | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  bank_name?: string;
  last4?: string;
};

/** Stripe stores the payout account on external_accounts.data[0]. */
function linkedBankAccount(account: BankAccountRecord | null): ExternalBankAccount {
  const raw = account?.external_accounts;
  const first = Array.isArray(raw)
    ? raw[0]
    : Array.isArray(raw?.data)
      ? raw.data[0]
      : undefined;
  return {
    bank_name: first?.bank_name || account?.bank_name,
    last4: first?.last4 || account?.last4,
  };
}

const NAVY = "#051b35";
const GREEN = "#a6e773";

const backLinkStyle = {
  alignSelf: "flex-start" as const,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  color: NAVY,
  background: "#fff",
  border: "1px solid rgba(5,27,53,0.16)",
  borderRadius: 999,
  padding: "9px 16px 9px 12px",
  textDecoration: "none",
};

const actionButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  background: GREEN,
  color: NAVY,
  cursor: "pointer",
  minHeight: 44,
  boxSizing: "border-box" as const,
};

function BackArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ width: 16, height: 16 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function WalletBankAccount({ processing = false }: { processing?: boolean }) {
  const [account, setAccount] = useState<BankAccountRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"link" | "continue" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    getBankAccount()
      .then((res) => setAccount((res.data as BankAccountRecord) || null))
      .catch(() => setAccount(null))
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setBusy((current) => (current === "delete" ? current : null));
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const startSetup = async (source: "link" | "continue") => {
    setBusy(source);
    setError("");
    try {
      const res = await createBankAccount({});
      const link = (res.data as { link?: string } | undefined)?.link;
      if (link) {
        window.location.assign(link);
        return;
      }
      setError("Unable to open bank account setup. Try again.");
    } catch {
      setError("Unable to open bank account setup. Try again.");
    }
    setBusy(null);
  };

  const continueSetup = async () => {
    setBusy("continue");
    setError("");
    try {
      await removeBankAccount();
    } catch {
      setBusy(null);
      setError("Unable to open bank account setup. Try again.");
      return;
    }
    await startSetup("continue");
  };

  const removeBank = async () => {
    setBusy("delete");
    setError("");
    try {
      await removeBankAccount();
      setConfirmDelete(false);
      setLoaded(false);
      load();
    } catch {
      setError("Unable to remove bank account. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const complete = Boolean(account?.charges_enabled && account?.payouts_enabled);
  const linked = linkedBankAccount(account);
  const hasExternal = Array.isArray(account?.external_accounts)
    ? account.external_accounts.length > 0
    : Boolean(account?.external_accounts);
  const verifying = processing && !complete;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 16, color: NAVY }}>
      <Link href="/wallet/my-profile/" style={backLinkStyle}>
        <BackArrow />
        Back to profile
      </Link>
      {!loaded ? <WalletTicketsBlocksLoading /> : null}
      {loaded && !hasExternal ? (
        <section style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Bank Information</h1>
          <p style={{ margin: 0 }}>Link a bank account to receive resale payouts.</p>
          <button
            type="button"
            onClick={() => void startSetup("link")}
            disabled={busy === "link"}
            aria-label="Link bank account"
            aria-busy={busy === "link" || undefined}
            style={{ ...actionButtonStyle, cursor: busy === "link" ? "default" : "pointer", opacity: busy === "link" ? 0.55 : 1 }}
          >
            <CenteredBusyLabel loading={busy === "link"}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden style={{ width: 16, height: 16 }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Link bank account
              </span>
            </CenteredBusyLabel>
          </button>
        </section>
      ) : null}
      {loaded && hasExternal && !complete ? (
        <section style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Bank Information</h1>
          <p style={{ margin: 0 }}>
            {verifying
              ? "Verifying account check back in a few minutes"
              : "You haven't finished setting up your banking info, please continue to finish setting up your bank account"}
          </p>
          {verifying ? null : (
            <button
              type="button"
              onClick={() => void continueSetup()}
              disabled={busy === "continue"}
              aria-label="Continue"
              aria-busy={busy === "continue" || undefined}
              style={{ ...actionButtonStyle, cursor: busy === "continue" ? "default" : "pointer", opacity: busy === "continue" ? 0.55 : 1 }}
            >
              <CenteredBusyLabel loading={busy === "continue"}>Continue</CenteredBusyLabel>
            </button>
          )}
        </section>
      ) : null}
      {loaded && complete ? (
        <section style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 10px 30px -18px rgba(5,27,53,0.45)" }}>
          <h1 style={{ margin: "0 0 16px", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Bank Information</h1>
          {linked.bank_name ? (
            <p style={{ margin: "0 0 4px", fontSize: 16 }}>{linked.bank_name}</p>
          ) : null}
          {linked.last4 ? (
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{`XXXXX${linked.last4}`}</p>
          ) : null}
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#6e7180" }}>U.S. Dollars, United States</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setConfirmDelete(true);
            }}
            style={{ marginTop: 16, padding: 0, border: "none", background: "none", color: "#e11d48", fontSize: 16, fontWeight: 500, cursor: "pointer" }}
          >
            Delete
          </button>
        </section>
      ) : null}
      {confirmDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-bank-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 88,
            background: "rgba(5,27,53,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ width: 420, maxWidth: "100%", boxSizing: "border-box", background: "#fff", borderRadius: 26, padding: 24 }}>
            <h2 id="delete-bank-title" style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>Delete bank account?</h2>
            <p style={{ margin: "16px 0 0", color: "#6e7180" }}>This removes the linked account. You can link a new one after.</p>
            {error ? <p role="alert" style={{ margin: "16px 0 0", color: "#b42318" }}>{error}</p> : null}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, marginTop: 16, width: "100%" }}>
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => setConfirmDelete(false)}
                style={{ display: "block", width: "100%", boxSizing: "border-box", minHeight: 48, border: "none", borderRadius: 999, background: "#f1f3f8", color: NAVY, fontWeight: 600, cursor: busy === "delete" ? "default" : "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === "delete"}
                aria-label="Delete"
                aria-busy={busy === "delete" || undefined}
                onClick={() => void removeBank()}
                style={{ display: "flex", width: "100%", boxSizing: "border-box", minHeight: 48, alignItems: "center", justifyContent: "center", border: "none", borderRadius: 999, background: "#e11d48", color: "#fff", fontWeight: 600, cursor: busy === "delete" ? "default" : "pointer", opacity: busy === "delete" ? 0.55 : 1 }}
              >
                <CenteredBusyLabel loading={busy === "delete"} spinnerColor="#fff" trackColor="rgba(255,255,255,0.35)">
                  Delete
                </CenteredBusyLabel>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {error && !confirmDelete ? <p role="alert">{error}</p> : null}
    </div>
  );
}
