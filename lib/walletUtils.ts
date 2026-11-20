/** Plain helpers the wallet components share. They live here, not beside the components, so editing a component
    can be hot-patched instead of forcing a full page reload. */

export type Address = { street: string; apt: string; city: string; state: string; zip: string };
export type TransferKind = "ticket" | "pass";

export const H1 = "text-balance text-[clamp(32px,4.2vw,56px)] font-semibold leading-[1.06] tracking-[-0.03em]";

export const fmtAddress = (a: Address) => [a.street, a.apt, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(", ");

/** The hover light on a ticket row follows the pointer, as on Browse. Put it on the list. */
export const glow = (e: React.PointerEvent<HTMLElement>) => {
  const row = (e.target as HTMLElement).closest<HTMLElement>(".tk");
  if (!row) return;
  const r = row.getBoundingClientRect();
  row.style.setProperty("--px", `${e.clientX - r.left}px`);
  row.style.setProperty("--py", `${e.clientY - r.top}px`);
};

/** What the server would answer for a transfer to this address (demo recipients trigger each error). */
export function transferOutcome(to: string, own: string, kind: TransferKind): string | null {
  const e = to.trim().toLowerCase();
  const what = kind === "pass" ? "pass" : "tickets";
  if (e === own.toLowerCase()) return `These ${what} are already assigned to this email address.`;
  if (e.startsWith("scanned@")) return `These ${what} have already been scanned and can't be transferred.`;
  if (e.startsWith("pending@")) return `This ${kind} already has a pending transfer.`;
  if (e.startsWith("blocked@")) return "This season pass can't be transferred because one or more included game tickets have already been transferred.";
  if (e.startsWith("risky@")) return "Email is invalid. Please try again.";
  if (e.startsWith("fail@")) return kind === "pass" ? "Unable to transfer this pass. Please try again." : "We couldn't transfer those tickets. Please try again.";
  if (e.startsWith("down@")) return "We're experiencing technical difficulties. Please try again later.";
  return null;
}

/** The most a resale ticket can be listed for, per ticket. */
export const MAX_ASKING = 10000;
export const MAX_ASKING_TEXT = `$${MAX_ASKING.toLocaleString("en-US")}`;
/** A price for a tight space: whole dollars and commas up to the cap, then $12.3K, $1.2M. */
export const priceShort = (n: number) =>
  n > MAX_ASKING
    ? `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })}`;

/** The picture a sheet's ambient glow is taken from: the poster, else the photo, else the crest. */
export const glowFor = (e: { poster?: string; photo?: string; crest?: string }) => e.poster ?? e.photo ?? e.crest ?? null;
