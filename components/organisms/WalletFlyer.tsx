"use client";

/**
 * The look of every detail sheet in the wallet, built around a square flyer. The flyer's own colours bleed up behind
 * the sheet as a soft blurred glow (so each sheet takes on its event), the flyer sits on it with a deep shadow, and the
 * content sits beside it (wide sheets) or under it (phones). Squares only: a matchup is two crests stacked with a VS
 * between them, a photo is cropped square, anything else is set in type on its tone.
 */

import { cn } from "@/lib/utils";
import type { WalletEvent, WalletTone } from "@/lib/walletDemo";

const TONE: Record<WalletTone, string> = {
  navy: "bg-[var(--navy)] text-white",
  seat: "bg-seat text-white",
  feature: "bg-feature text-white",
  card: "bg-secondary text-foreground",
};
const TONE_GLOW: Record<WalletTone, string> = {
  navy: "var(--navy)", seat: "var(--seat)", feature: "var(--ink2)", card: "var(--ink2)",
};

const SHADOW = "shadow-[0_32px_56px_-28px_rgb(0_0_0/.6),0_0_0_1px_rgb(255_255_255/.06)]";

/** The shell: ambient glow, the flyer + head on one side, the content on the other, an optional full-width footer. */
export function FlyerSheet({ glow, tone = "card", art, head, children, footer }: { glow?: string | null; tone?: WalletTone; art: React.ReactNode; head: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative isolate flex flex-col gap-6">
      {/* the glow: the flyer's picture, blown up, blurred and faint. It is pinned (sticky) so it stays put while the sheet scrolls over it. */}
      <div aria-hidden className="pointer-events-none sticky top-0 -z-10 -mb-6 h-0">
        <div className="absolute -inset-x-4 -top-2 h-[520px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_20%,transparent)] sm:-inset-x-8 sm:-top-16">
          {glow ? <img src={glow} alt="" decoding="async" className="size-full scale-150 object-cover opacity-25 blur-3xl saturate-125" /> : <div className="size-full opacity-20 blur-3xl" style={{ background: `radial-gradient(60% 60% at 50% 30%, ${TONE_GLOW[tone]}, transparent)` }} />}
        </div>
      </div>
      <div className="grid items-start gap-7 @2xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)] @2xl:gap-10">
        <div className="flex flex-col gap-5 @2xl:sticky @2xl:top-0">
          <div className="mx-auto w-[min(74%,292px)] @2xl:w-full">{art}</div>
          {head}
        </div>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
      {footer}
    </div>
  );
}

/** A square for anything: its picture, else a tone with a big mark. A glass badge in the corner says what it is. */
export function SquareArt({ img, tone = "card", bg, mark, badge }: { img?: string | null; tone?: WalletTone; bg?: string; mark?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className={cn("relative isolate aspect-square overflow-hidden rounded-[28px]", SHADOW, !img && !bg && TONE[tone])} style={!img && bg ? { background: bg, color: "#fff" } : undefined}>
      {img ? <img src={img} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-[clamp(72px,18vw,120px)] font-semibold leading-none tracking-[-0.05em] opacity-25">{mark}</div>}
      {img && <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />}
      {badge && <span className="absolute bottom-3 left-3 flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">{badge}</span>}
    </div>
  );
}

const homeCrest = (e: WalletEvent) => (/Las Cruces/.test(e.city) ? "/teams/nm-state-aggies.png" : null);

/** An event's flyer, always square: a matchup of two crests, a photo cropped square, or type on the event's tone. */
export function EventFlyer({ event }: { event: WalletEvent }) {
  const home = homeCrest(event);
  if (event.crest && home) {
    return (
      <div className={cn("relative isolate grid aspect-square grid-rows-2 gap-1 overflow-hidden rounded-[28px] bg-black", SHADOW)}>
        <img src={home} alt="" decoding="async" className="size-full object-cover" />
        <img src={event.crest} alt="" decoding="async" className="size-full object-cover" />
        <span aria-hidden className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background text-[13px] font-semibold tracking-[0.06em] text-foreground shadow-[0_8px_20px_-8px_rgb(0_0_0/.6)]">VS</span>
      </div>
    );
  }
  if (event.photo) return <SquareArt img={event.photo} tone={event.tone} />;
  return (
    <div className={cn("relative isolate flex aspect-square flex-col justify-between overflow-hidden rounded-[28px] p-6", TONE[event.tone], SHADOW)}>
      <span className="text-[clamp(72px,18vw,128px)] font-semibold leading-[0.85] tracking-[-0.05em] opacity-90">{event.initials}</span>
      <span className="text-balance text-[clamp(18px,3.4vw,24px)] font-semibold leading-tight tracking-[-0.02em] opacity-90">{event.title}</span>
    </div>
  );
}
