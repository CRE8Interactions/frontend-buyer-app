"use client";

/**
 * The ticket pass: a square QR with its code on top, the browse tile's cutout (9px notches) and perforation (a row of small round holes), then the seat stub
 * (SEC / ROW / SEAT in capitals, first and last at the edges, the middle one centred), an accessible-seating pill
 * when the ticket has it, and the add-to-wallet badge. Built for one moment, standing at a gate, so the code leads.
 * Tap the QR to enlarge it; an ended event greys and blurs the code so it cannot be scanned.
 */

import { Fragment } from "react";
import { Wheelchair } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import WalletBadges from "@/components/organisms/WalletBadges";
import { WalletQr } from "@/components/organisms/WalletPass";
import type { PhoneKind } from "@/hooks/usePhoneKinds";
import { cn } from "@/lib/utils";

/* Scale for the seat stub. Section, row and seat are short codes on most tickets and a name on some ("Club Level
   Lounge", "Loge Box 214"), so each value picks its size from its length instead of overflowing: big for a code,
   smaller for a short name, small and wrapping for a long one. A long section also takes a row of its own. */
function valueSize(v: string) {
  const n = v.length;
  if (n <= 3) return "text-[40px] leading-none";
  if (n <= 6) return "text-[28px] leading-none";
  return "text-[20px] leading-[1.15] line-clamp-2 break-words [overflow-wrap:anywhere]";
}

function Spot({ k, v, align = "left", className }: { k: string; v: string; align?: "left" | "center" | "right"; className?: string }) {
  return (
    <div className={cn("min-w-0", align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left", className)}>
      <dt className="text-[13px] font-medium uppercase tracking-[0.12em] text-mute">{k}</dt>
      <dd className={cn("mt-1.5 font-semibold tracking-[-0.04em] tabular-nums text-foreground", valueSize(v))} title={v}>{v}</dd>
    </div>
  );
}

/* A pass is two parts with a real cutout between them: each half is masked with a circle at the joint, so the notch
   is a hole in the card (the page shows through), not a coloured dot painted on top. */
const NOTCH_TOP = "[mask-image:radial-gradient(circle_9px_at_0_100%,transparent_98%,black),radial-gradient(circle_9px_at_100%_100%,transparent_98%,black)] [mask-composite:intersect] [-webkit-mask-composite:source-in]";
const NOTCH_BOTTOM = "[mask-image:radial-gradient(circle_9px_at_0_0,transparent_98%,black),radial-gradient(circle_9px_at_100%_0,transparent_98%,black)] [mask-composite:intersect] [-webkit-mask-composite:source-in]";
/* The perforation is the browse tile's: a row of small round holes (1.6px, 11px apart) between the two notches (just inside the stub, since its mask would clip anything above it), inset 22px, in the text colour so it reads in light and dark. */
const PERFORATION = "before:pointer-events-none before:absolute before:inset-x-[22px] before:top-0 before:h-1 before:bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-foreground)_42%,transparent)_1.6px,transparent_2.2px)] before:bg-[length:11px_4px] before:bg-repeat-x before:content-['']";

export type TicketPassProps = {
  /** The ticket code printed under the QR and encoded in it. */
  code: string;
  /** "Sec A · Row F" fills SEC and ROW; any other text (General admission) is shown as ENTRY. */
  row: string;
  /** The seat value. */
  seat: string;
  /** Shows the accessible-seating pill. */
  accessible?: boolean;
  /** The event is over: the code is greyed, blurred and struck through, and the wallet badge goes. */
  ended?: boolean;
  /** Tickets in the order, so the wallet badge can offer "all of them". */
  count?: number;
  /** Accessible name, e.g. "Ticket 2 of 8". */
  label: string;
  /** Called when the QR is tapped. Leave out for a pass that is only looked at. */
  onEnlarge?: () => void;
  /** Force one wallet badge (Storybook and tests); otherwise the device decides. */
  wallet?: PhoneKind;
};

export function TicketPass({ code, row, seat, accessible, ended = false, count = 1, label, onEnlarge, wallet }: TicketPassProps) {
  const m = /^Sec (.+?) · Row (.+)$/.exec(row);
  const longSection = !!m && m[1].length > 6;
  return (
    <div role="group" aria-label={label} data-slot="ticket-pass" className="flex flex-col">
      <div className={cn("flex flex-col items-center gap-4 rounded-t-[28px] border border-b-0 border-border bg-card px-6 pb-8 pt-6", NOTCH_TOP)}>
        {ended ? (
          <div className="relative w-full max-w-[264px]">
            <WalletQr code={code} sweep={false} className="aspect-square w-full rounded-[20px] p-3.5 opacity-25 blur-[3px] grayscale ring-1 ring-border" />
            <span className="absolute inset-0 grid place-items-center"><Badge variant="neutral" size="lg">Event ended</Badge></span>
          </div>
        ) : onEnlarge ? (
          <button
            type="button"
            onClick={onEnlarge}
            aria-label={`Enlarge the QR code, ${label}`}
            className="relative block w-full max-w-[264px] cursor-pointer rounded-[20px] outline-none h-no-highlight transform-gpu [touch-action:manipulation] [transition:transform_250ms_ease] motion-reduce:[transition:none] active:[transform:scale(0.98)] focus-visible:h-focus-ring"
          >
            <WalletQr code={code} className="aspect-square w-full rounded-[20px] p-3.5 ring-1 ring-border" />
          </button>
        ) : (
          <WalletQr code={code} className="aspect-square w-full max-w-[264px] rounded-[20px] p-3.5 ring-1 ring-border" />
        )}
        <p className={cn("max-w-full text-balance text-center font-mono text-[13px] uppercase tracking-[0.14em] text-mute", ended && "line-through")}>
          {/* the code may only break at its dashes, never inside a segment */}
          {code.split("-").map((part, i) => <Fragment key={i}>{i > 0 && <>-<wbr /></>}{part}</Fragment>)}
        </p>
      </div>
      <div className={cn("relative rounded-b-[28px] border border-t-0 border-border bg-card px-6 pb-6 pt-8", NOTCH_BOTTOM, PERFORATION)}>
        {m ? (
          <dl className={cn("grid gap-x-4 gap-y-5", longSection ? "grid-cols-2" : "grid-cols-3")}>
            <Spot k="Sec" v={m[1]} className={longSection ? "col-span-2" : undefined} />
            <Spot k="Row" v={m[2]} align={longSection ? "left" : "center"} />
            <Spot k="Seat" v={seat} align="right" />
          </dl>
        ) : (
          <dl><Spot k="Entry" v={row} /></dl>
        )}
        {accessible && (
          <div className="mt-5 flex justify-center">
            <Badge variant="neutral" size="lg"><Wheelchair weight="bold" aria-hidden /> Accessible seating</Badge>
          </div>
        )}
        {!ended && <WalletBadges count={count} wallet={wallet} className="mt-5 [&>div]:justify-center" />}
      </div>
    </div>
  );
}
