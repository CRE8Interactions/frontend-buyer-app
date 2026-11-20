"use client";

/**
 * The official "Add to Apple Wallet" and "Add to Google Wallet" badges as real buttons. The badge artwork is
 * Apple's and Google's own and is never recoloured or redrawn; it only scales, at one fixed height, keeping its own ratio
 * (Apple 3.24:1, Google 3.62:1, so the widths differ and the proportions hold). Only one shows at a time,
 * following the device: iPhones get Apple, Android phones Google, a desktop Apple. Custom on request of the owner
 * (the library button cannot wear a platform badge); behaviour matches PhoneWalletButtons, including the demo log.
 */

import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { usePhoneKinds, type PhoneKind } from "@/hooks/usePhoneKinds";
import { demoLog } from "@/lib/walletDemo";
import { cn } from "@/lib/utils";

const NAME: Record<PhoneKind, string> = { apple: "Apple Wallet", google: "Google Wallet" };
const BADGE: Record<PhoneKind, string> = { apple: "/wallet/add-to-apple-wallet.svg", google: "/wallet/add-to-google-wallet.svg" };
/** Intrinsic ratios of the official files, so width is always derived from height. */
const RATIO: Record<PhoneKind, number> = { apple: 110.095 / 34.016, google: 199 / 55 };

/** The add flow both the badges and the add-all buttons share: busy wallet, error copy, demo log, toast. */
function useWalletAdd(count: number, force?: PhoneKind) {
  const { kinds: all, phone } = usePhoneKinds();
  // A desktop has no wallet to add to: it gets the hand-off (QR + link) instead of a badge that would do nothing.
  const kinds = force ? [force] : phone ? all : [];
  const [busy, setBusy] = useState<PhoneKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (k: PhoneKind, n: number = count) => {
    setBusy(k);
    setError(null);
    setTimeout(() => {
      setBusy(null);
      const fail = (window as unknown as { __walletDemo?: { failWallet?: boolean } }).__walletDemo?.failWallet;
      demoLog("phone-wallet", { wallet: k, count: n, outcome: fail ? "error" : "added" });
      if (fail) {
        setError(n > 1 ? `Could not add these tickets to ${NAME[k]}. Try again, or add them one at a time.` : `Could not add this ticket to ${NAME[k]}. Please try again.`);
        return;
      }
      toast(n > 1 ? `${n} tickets sent to your phone wallet` : "Ticket sent to your phone wallet");
    }, 800);
  };
  return { kinds, busy, error, add };
}

/** Add a ticket: the official badge for this device's wallet. One wallet shows at a time (iPhone Apple, Android
 *  Google). With more than one ticket in the order, tapping it asks whether to add just this ticket or all of them
 *  (a bottom sheet, the same two-way choice phone wallets give), so there is no second add-all button. Fixed at 48px tall. */
export default function WalletBadges({ count = 1, wallet, className }: { count?: number; /** Show this wallet whatever the device is (Storybook and tests). */ wallet?: PhoneKind; className?: string }) {
  const { kinds, busy, error, add } = useWalletAdd(count, wallet);
  const [ask, setAsk] = useState(false);
  if (!kinds.length) return null;
  const k = kinds[0];
  const many = count > 1;
  return (
    <div className={className}>
      <div className="flex items-center">
        <button
          type="button"
          disabled={busy !== null}
          aria-label={`Add to ${NAME[k]}`}
          aria-haspopup={many ? "dialog" : undefined}
          onClick={() => (many ? setAsk(true) : add(k, 1))}
          style={{ aspectRatio: RATIO[k] }}
          className={cn(
            "relative block shrink-0 cursor-pointer rounded-[10px] outline-none h-no-highlight transform-gpu [touch-action:manipulation] select-none [-webkit-touch-callout:none]",
            "h-12",
            "[transition:transform_250ms_ease,filter_150ms_var(--e-out),opacity_150ms_var(--e-out)] motion-reduce:[transition:none]",
            "[@media(hover:hover)]:hover:brightness-110 active:[transform:scale(0.97)] focus-visible:h-focus-ring",
            "disabled:cursor-progress disabled:opacity-60",
          )}
        >
          {/* the file is the button face: nothing is drawn over it */}
          <img src={BADGE[k]} alt="" draggable={false} className="block size-full select-none" />
          {busy === k && <span className="sr-only" role="status">Adding</span>}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-destructive">{error}</p>}
      {many && (
        <Drawer open={ask} onOpenChange={setAsk}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add tickets to {NAME[k]}</DrawerTitle>
              <DrawerDescription>This order has {count} tickets. Add this one, or all of them.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
              <Button size="lg" className="w-full" onClick={() => { setAsk(false); add(k, count); }}>Add all {count} tickets</Button>
              <Button size="lg" variant="tertiary" className="w-full" onClick={() => { setAsk(false); add(k, 1); }}>Add just this ticket</Button>
              <DrawerClose asChild><Button size="lg" variant="ghost" className="w-full">Cancel</Button></DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

/** Desktop hand-off: a wallet is a phone thing, so scan this page's own link with a phone (or copy it). Renders
 *  nothing until the device is known and on phones, so it never flashes up on a phone before detection. */
export function WalletHandoff({ className }: { className?: string }) {
  const { kinds, phone } = usePhoneKinds();
  if (!kinds.length || phone) return null;
  const url = typeof window === "undefined" ? "" : window.location.origin + window.location.pathname;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Could not copy the link");
    }
  };
  return (
    <div className={cn("flex items-center gap-4 rounded-[20px] bg-card p-4", className)}>
      <div className="shrink-0 rounded-[12px] bg-white p-2 text-black">
        <QRCodeSVG value={url} size={96} level="M" fgColor="currentColor" bgColor="transparent" title="Link to this ticket page" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-medium">Add to your phone&apos;s wallet</p>
        <p className="mt-1 text-[15px] text-ink2">Scan with your phone to open this page there.</p>
        <Button variant="tertiary" size="sm" className="mt-2" onClick={copy}>Copy link</Button>
      </div>
    </div>
  );
}
