/** Demo data for Money (activity, payouts, bank account, giving). Dates count back from the demo's today, Jul 23, 2026. */

import { dayOf } from "@/lib/walletDemo";

export type BankState = "none" | "incomplete" | "verifying" | "linked";
export const BANK_STATES: { id: BankState; label: string }[] = [
  { id: "none", label: "Not linked" },
  { id: "incomplete", label: "Incomplete" },
  { id: "verifying", label: "Verifying" },
  { id: "linked", label: "Linked" },
];

export type ActivityKind = "purchase" | "refund" | "resale" | "pass" | "flex";
export type ActivityRow = { id: string; kind: ActivityKind; title: string; inDays: number; amount: number; fail?: boolean };

const TITLES = [
  "Ogden Raptors vs. Long Beach Coast", "Neon Vibes — 2026 Summer Series", "Niagara IceDogs vs. Erie Otters",
  "Harvest Nights Food & Wine", "Aggie Football Season Seats", "Boise Hawks vs. Missoula PaddleHeads",
  "Summer Nights Live: The Wharf Sessions", "Aggie Pick-4 Flex Pack", "Aggie Club Access Pass", "Long Beach Coast vs. Idaho Falls",
];
const KINDS: ActivityKind[] = ["purchase", "purchase", "purchase", "resale", "purchase", "refund", "purchase", "flex", "pass", "purchase"];

export const ACTIVITY_ROWS: ActivityRow[] = Array.from({ length: 28 }, (_, i) => {
  const kind = KINDS[i % KINDS.length];
  const base = 28 + ((i * 7) % 6) * 12;
  const amount = kind === "refund" ? base : kind === "resale" ? base * 0.9 : kind === "pass" ? 240 : kind === "flex" ? 180 : -base;
  return { id: `a${i}`, kind, title: TITLES[i % TITLES.length], inDays: -(i * 6 + 1), amount, fail: i === 4 };
});

export type Payout = { id: string; title: string; amount: number; status: "hold" | "processing" | "deposited" | "failed"; note: string };
export const PAYOUTS: Payout[] = [
  { id: "p1", title: "Niagara IceDogs vs. Erie Otters", amount: 42, status: "hold", note: "Held until the event ends, then deposited to your bank." },
  { id: "p2", title: "Neon Vibes — 2026 Summer Series", amount: 85.5, status: "processing", note: "Deposit started. It usually lands in 1–2 business days." },
  { id: "p3", title: "Harvest Nights Food & Wine", amount: 54, status: "deposited", note: "Deposited May 18 to the account ending 6021." },
  { id: "p4", title: "Boise Hawks vs. Missoula PaddleHeads", amount: 60, status: "failed", note: "Your bank returned this deposit. Check the account details and we’ll retry." },
];

export type Gift = { id: string; fund: string; amount: number; inDays: number };
export const GIFTS: Gift[] = [
  { id: "g1", fund: "Aggie Club — Annual Fund", amount: 250, inDays: -41 },
  { id: "g2", fund: "Football Excellence Fund", amount: 100, inDays: -118 },
  { id: "g3", fund: "Aggie Club — Annual Fund", amount: 250, inDays: -310 },
];

export const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;
export const monthOf = (inDays: number) => dayOf(inDays).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const shortDate = (inDays: number) => dayOf(inDays).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
