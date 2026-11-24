"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  addonPassStatusLabel,
  type DigitalAddonPass,
} from "@/lib/addonCatalog";
import {
  addTicketToPhoneWallet,
  phoneWalletKinds,
  phoneWalletLabel,
  phoneWalletTheme,
} from "@/lib/phoneWallet";

export default function AddonDigitalPasses({
  passes,
  event,
  eventName,
  title = "Add-on passes",
}: {
  passes?: DigitalAddonPass[] | null;
  event?: Record<string, unknown> | null;
  eventName?: string | null;
  title?: string;
}) {
  const [walletError, setWalletError] = useState("");
  const wallets = phoneWalletKinds();
  if (!Array.isArray(passes) || passes.length === 0) return null;

  return (
    <section aria-label="Add-on passes" className="flex flex-col gap-3">
      <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
        {title} ({passes.length})
      </h2>
      <div className="rounded-[14px] bg-[#f7f8fc] p-4 text-[14px] text-[#4a5567]">
        <p className="font-semibold text-[#051b35]">Show this code at redemption</p>
        <p className="mt-1">
          Staff will scan your add-on pass when you arrive
          {eventName ? ` at ${eventName}` : ""}.
        </p>
      </div>
      {passes.map((pass) => (
        <article
          key={pass.checkInCode}
          className="flex flex-col items-center gap-2 rounded-[14px] border border-[rgba(5,27,53,0.08)] bg-white p-4 text-center"
        >
          <QRCodeSVG value={pass.checkInCode} size={160} />
          <h3 className="text-[16px] font-semibold">
            {pass.productName || "Add-on pass"}
          </h3>
          {pass.scope === "season" ? (
            <p className="text-[13px] text-[#6e7180]">Season pass</p>
          ) : null}
          <p className="text-[14px] tabular-nums">{pass.checkInCode}</p>
          <p className="text-[13px] font-semibold">{addonPassStatusLabel(pass.status)}</p>
          {wallets.length ? (
            <div className="mt-2 flex w-full flex-col gap-2">
              {wallets.map((kind) => {
                const theme = phoneWalletTheme(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className="w-full rounded-full px-4 py-3 text-[14px] font-semibold"
                    style={{ background: theme.buttonBg, color: theme.buttonColor }}
                    onClick={() => {
                      void addTicketToPhoneWallet(
                        event,
                        {
                          addonPass: true,
                          uuid: pass.uuid,
                          checkInCode: pass.checkInCode,
                          name: pass.productName,
                          sectionNumber: "Add-on",
                        },
                        kind,
                      ).then((error) => {
                        if (error) setWalletError(error);
                      });
                    }}
                  >
                    {phoneWalletLabel(kind)}
                  </button>
                );
              })}
            </div>
          ) : null}
        </article>
      ))}
      {walletError ? (
        <p role="alert" className="text-[13px] text-[var(--bt-error,#c0374a)]">
          {walletError}
        </p>
      ) : null}
    </section>
  );
}
