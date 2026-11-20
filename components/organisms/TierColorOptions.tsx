"use client";

/** A look-at-it page: every look we are considering for each membership step, as the real card, side by side.
    Pick one per step and it becomes that step's colours in lib/cardTheme.ts. Not linked from the app. */

import { HoloCard } from "@/components/ui/holo-card";
import { TIER_OPTIONS, TIER_ORDER } from "@/lib/cardTheme";

export default function TierColorOptions() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-[110px] sm:px-8">
      <h1 className="text-[clamp(32px,4.2vw,56px)] font-semibold leading-[1.06] tracking-[-0.03em]">Card colours by step</h1>
      <p className="mt-2 max-w-[60ch] text-[17px] text-ink2">Move your cursor over each card. Each step has a few options; tell me the letter you want for each step.</p>
      <div className="mt-12 flex flex-col gap-16">
        {TIER_ORDER.map((k) => (
          <section key={k} aria-label={k} className="flex flex-col gap-5">
            <h2 className="text-[clamp(22px,2vw,28px)] font-semibold capitalize tracking-[-0.02em]">{k}</h2>
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {TIER_OPTIONS[k].map((o) => (
                <figure key={o.id} className="m-0 flex flex-col gap-3">
                  <HoloCard theme={o.theme}>
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div className="text-[15px] font-semibold tracking-[-0.02em]">Aggie Club</div>
                        <div className="text-[12px] font-medium uppercase tracking-[.12em] opacity-60">{o.theme.label}</div>
                      </div>
                      <div>
                        <div className="text-[38px] font-semibold leading-none tabular-nums tracking-[-0.04em]">2,140</div>
                        <div className="mt-1 text-[13px] opacity-60">points</div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div><div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Member</div><div className="text-[15px] font-semibold">Jordan Reyes</div></div>
                        <div className="text-right"><div className="text-[11px] font-medium uppercase tracking-[.12em] opacity-50">Since 2023</div><div className="text-[15px] font-semibold tabular-nums tracking-[.04em]">4407 0862</div></div>
                      </div>
                    </div>
                  </HoloCard>
                  <figcaption className="flex items-center gap-3 px-1 text-[15px]">
                    <b className="flex size-7 items-center justify-center rounded-full bg-secondary text-[13px] font-semibold">{o.id}</b>
                    <span className="font-medium">{o.name}</span>
                    <span className="ml-auto flex gap-1" aria-hidden>
                      {o.theme.stops.map((c, i) => <span key={i} className="size-4 rounded-full ring-1 ring-border" style={{ background: c }} />)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
