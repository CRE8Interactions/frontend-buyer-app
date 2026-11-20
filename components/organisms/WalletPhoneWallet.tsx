"use client";

/**
 * Add to Apple Wallet / Google Wallet. iPhones are offered Apple, Android phones Google, and a
 * desktop both. Every outcome is logged (window.__walletDemo.log); to see the failure copy set
 * window.__walletDemo.failWallet = true and press a button.
 */

import { useState } from "react";
import { Wallet as WalletIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePhoneKinds, type PhoneKind } from "@/hooks/usePhoneKinds";
import { demoLog } from "@/lib/walletDemo";

const NAME: Record<PhoneKind, string> = { apple: "Apple Wallet", google: "Google Wallet" };

export default function PhoneWalletButtons({
  count = 1, label, className,
}: { count?: number; label?: string; className?: string }) {
  const { kinds } = usePhoneKinds();
  const [busy, setBusy] = useState<PhoneKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (k: PhoneKind) => {
    setBusy(k); setError(null);
    setTimeout(() => {
      setBusy(null);
      const fail = (window as unknown as { __walletDemo?: { failWallet?: boolean } }).__walletDemo?.failWallet;
      demoLog("phone-wallet", { wallet: k, count, outcome: fail ? "error" : "added" });
      if (fail) {
        setError(count > 1 ? `Could not add these tickets to ${NAME[k]}. Try again, or add them one at a time.` : `Could not add this pass to ${NAME[k]}. Please try again.`);
        return;
      }
      toast("Pass sent to your phone wallet");
    }, 800);
  };

  if (!kinds.length) return null;
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <Button key={k} variant="secondary" size={count > 1 ? "lg" : "md"} disabled={busy !== null} onClick={() => add(k)}>
            <WalletIcon weight="bold" /> {busy === k ? "Adding…" : label ? `${label} to ${NAME[k]}` : `Add to ${NAME[k]}`}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
