"use client";

import Link from "next/link";
import { browseLeading } from "@/lib/browseType";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import { formatCurrency } from "@/lib/helpers";
import { fluidSize } from "@/lib/shopperFluidType";

const INK = BLOCKTICKETS_NAVY;
const SUB = "#6e7180";
const FAINT = "#4a5567";
const GREEN = "#2f8f4e";

/** Ticket breakdown shared by selling and editing a listing. */
export function ListingSaleSummary({
  asking,
  ticketCount,
  fee,
  actionLabel = "Agree and sell",
}: {
  asking: number;
  ticketCount: number;
  fee: number;
  actionLabel?: "Agree and sell" | "Update price";
}) {
  const count = Math.max(ticketCount, 1);
  const feeTotal = fee * count;
  const ticketsTotal = asking * count;
  const payout = (asking - fee) * count;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 14, borderBottom: "1px solid rgba(5,27,53,0.08)" }}>
        <div style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.015em" }}>Payment summary</div>
        <p style={{ margin: 0, fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: SUB }}>
          Please go to &apos;Settings&apos; in your &apos;Wallet&apos; and make sure your bank account is linked in order to receive funds from ticket sales.
        </p>
      </div>
      <div style={{ fontSize: fluidSize(12), fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: FAINT }}>Ticket Breakdown</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>Tickets</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: fluidSize(14), color: SUB }}>
            <span>Tickets: {formatCurrency(asking)} x {count}</span>
            <span>{formatCurrency(ticketsTotal)}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: fluidSize(15), fontWeight: 600 }}>Service Fees</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: fluidSize(14), color: SUB }}>
            <span>Service Fees: {formatCurrency(fee)} x {count}</span>
            <span>(-{formatCurrency(feeTotal)})</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: fluidSize(15), fontWeight: 600 }}>
          <span>Your Payout</span>
          <span>{formatCurrency(payout)}</span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: fluidSize(12), lineHeight: browseLeading("body"), color: SUB }}>
        By clicking &apos;{actionLabel}&apos; you are consenting to Blocktickets{" "}
        <Link href="/terms-conditions/" target="_blank" style={{ color: INK }}>terms and conditions</Link>.
      </p>
    </div>
  );
}

/** Confirmation after a listing is created or its price is updated. */
export function ListingSaleSuccess({
  mode,
  ticketCount,
}: {
  mode: "listed" | "updated";
  ticketCount: number;
}) {
  const count = Math.max(ticketCount, 1);
  const ticketsWord = count === 1 ? "ticket" : "tickets";
  const title =
    mode === "updated"
      ? count === 1
        ? "Your ticket price has been updated"
        : "Your ticket prices have been updated"
      : `Your ${ticketsWord} ${count === 1 ? "is" : "are"} listed for sale!`;
  const body =
    mode === "updated"
      ? count === 1
        ? "Your updated price will be in effect within 2 hours on the marketplace. If your ticket is sold before the price is updated you will receive funds based on the original price."
        : "Your updated prices will be in effect within 2 hours on the marketplace. If your tickets are sold before the price is updated you will receive funds based on the original price."
      : `${count === 1 ? "This ticket leaves" : "These tickets leave"} your wallet right away and returns only if you remove the listing before it's bought. We will notify you via email if a purchase is made. While your ${ticketsWord} ${count === 1 ? "is" : "are"} listed, you can change the price or delist ${count === 1 ? "it" : "them"} from the marketplace in 'My listings' at anytime.`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "6px 0 2px" }}>
      <div style={{ width: 78, height: 78, borderRadius: 999, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 38, height: 38 }}><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <div style={{ fontSize: 21, lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.02em", textAlign: "center" }}>
        {title}
      </div>
      <p style={{ margin: 0, fontSize: fluidSize(14), lineHeight: browseLeading("body"), color: SUB, textAlign: "center" }}>
        {body}
      </p>
      <p style={{ margin: 0, fontSize: fluidSize(12), lineHeight: browseLeading("body"), color: SUB, textAlign: "center" }}>
        If you have any question please reach out to{" "}
        <a href="mailto:help@blocktickets.xyz" style={{ color: INK }}>help@blocktickets.xyz</a>
      </p>
    </div>
  );
}
