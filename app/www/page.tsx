"use client";

import { useState } from "react";
import AppShell from "@/components/templates/AppShell";
import Button from "@/components/atoms/Button";
import { savePassApple, savePassGoogle } from "@/lib/api";

/** Wallet pass download test page (legacy /www route). */
export default function WalletPassTestPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  const storeAppleWallet = async () => {
    setError(null);
    setBusy("apple");
    try {
      const response = await savePassApple();
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "event.pkpass";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
    } catch {
      setError("Failed to download the Apple Wallet pass.");
    } finally {
      setBusy(null);
    }
  };

  const storeGoogleWallet = async () => {
    setError(null);
    setBusy("google");
    try {
      const response = await savePassGoogle();
      const link = typeof response.data === "string" ? response.data : String(response.data);
      window.open(link, "_blank", "noopener,noreferrer");
    } catch {
      setError("Failed to open the Google Wallet pass.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell search={false} requireAuth>
      <div className="container-x py-16 sm:py-20">
        <p className="eyebrow">Internal</p>
        <h1 className="mt-3 text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.025em] text-white">
          Wallet pass test
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#9DA2B3]">
          Download a test pass for Apple Wallet or Google Wallet.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={storeAppleWallet} disabled={busy !== null}>
            {busy === "apple" ? "Downloading…" : "Apple Wallet"}
          </Button>
          <Button variant="outline" onClick={storeGoogleWallet} disabled={busy !== null}>
            {busy === "google" ? "Opening…" : "Google Wallet"}
          </Button>
        </div>
        {error ? <p className="mt-4 text-[14px] text-red-400">{error}</p> : null}
      </div>
    </AppShell>
  );
}
