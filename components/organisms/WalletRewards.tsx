"use client";

/**
 * Rewards, compact: the membership card (a HoloCard: thin-film hologram that follows the light, no flip), the points to
 * the next level, a timeline of levels as milestone nodes joined by rows of seat-dot pips, and the fine print folded into
 * the library accordion. Colours follow lib/cardTheme: a colour or tier name from the backend wins, else the level's own
 * step (Basic, Bronze, Silver, Gold, Platinum). A backend can also send its own `levels`.
 */

import { useState } from "react";
import { Check, Crown, Diamond, Lock, LockKeyOpen, Medal, Ticket, type Icon } from "@phosphor-icons/react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoyaltyCard } from "@/components/ui/loyalty-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Status } from "@/components/ui/status";
import { resolveCardTheme, tierKeyFor, type TierKey } from "@/lib/cardTheme";
import { Chips } from "@/components/organisms/WalletParts";
import { cn } from "@/lib/utils";
import { standing, type Membership, type RewardLevel } from "@/lib/walletMemberships";

/* each step's badge says what it is: bronze a medal, silver the key to early presales, gold a crown, platinum a diamond */
const ICON: Record<TierKey, Icon> = { basic: Ticket, bronze: Medal, silver: LockKeyOpen, gold: Crown, platinum: Diamond };
const PIPS = 8;
const iconFor = (l: RewardLevel): Icon => ICON[tierKeyFor(l.name) ?? "basic"];

function Timeline({ levels, points }: { levels: RewardLevel[]; points: number }) {
  const next = levels.find((l) => l.at > points);
  const cells: React.ReactNode[] = [];
  levels.forEach((l, i) => {
    const reached = points >= l.at;
    const isNext = next?.name === l.name;
    const Ic = iconFor(l);
    const th = resolveCardTheme({ name: l.name, color: l.color });
    cells.push(
      <li key={l.name} className="flex w-[104px] flex-col items-center gap-1 text-center text-[13px] leading-tight">
        {/* the badge is the step's own metal once you have it, and a locked grey one until then */}
        <span
          className={cn("relative flex size-11 items-center justify-center rounded-full", !reached && "bg-secondary text-ink2", isNext && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
          style={reached ? { background: `linear-gradient(135deg, ${th.stops[0]}, ${th.stops[1]} 45%, ${th.stops[3]})`, color: th.ink, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .12), inset 0 1px 0 rgb(255 255 255 / .6)" } : undefined}
        >
          <Ic weight="bold" className="size-5" />
          {!reached && <Lock weight="fill" className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-card p-[3px] text-mute" />}
        </span>
        <b className={cn("mt-0.5 font-semibold", !reached && "text-ink2")}>{l.name}</b>
        <span className="tabular-nums text-ink2">{l.at.toLocaleString()}</span>
        {l.teaser && <span className={cn("text-[12px] leading-snug", reached ? "text-foreground" : "text-ink2")}>{l.teaser}</span>}
        {isNext && <span className="whitespace-nowrap font-medium text-green-deep">{(l.at - points).toLocaleString()} to go</span>}
      </li>,
    );
    const to = levels[i + 1];
    if (to) {
      const share = Math.min(1, Math.max(0, (points - l.at) / (to.at - l.at)));
      const on = Math.round(share * PIPS);
      cells.push(
        <li key={`${l.name}-pips`} aria-hidden className="relative mt-[14px] flex min-w-0 items-end gap-[3px]">
          {Array.from({ length: PIPS }, (_, k) => (
            <span key={k} className={cn("h-4 min-w-0 flex-1 rounded-[4px]", k < on ? "bg-primary" : "bg-secondary")} />
          ))}
          {share > 0 && share < 1 && (
            <span className="absolute top-full mt-2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background" style={{ left: `${(on / PIPS) * 100}%` }}>
              <span aria-hidden className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-foreground" />
              <span className="relative">You</span>
            </span>
          )}
        </li>,
      );
    }
  });
  const cols = levels.flatMap((_, i) => (i < levels.length - 1 ? ["auto", "minmax(0,1fr)"] : ["auto"])).join(" ");
  return (
    <ol aria-label={`${points.toLocaleString()} points${next ? `, ${(next.at - points).toLocaleString()} to ${next.name}` : ""}`} className="hidden items-start gap-x-1.5 pb-6 sm:grid" style={{ gridTemplateColumns: cols }}>
      {cells}
    </ol>
  );
}

/** The same timeline for a phone: steps stacked, the pips running down between badges, "You" beside where you are. */
function TimelineVertical({ levels, points }: { levels: RewardLevel[]; points: number }) {
  const next = levels.find((l) => l.at > points);
  const PIP = 7;
  const GAP = 3;
  return (
    <ol aria-label={`${points.toLocaleString()} points${next ? `, ${(next.at - points).toLocaleString()} to ${next.name}` : ""}`} className="flex flex-col sm:hidden">
      {levels.map((l, i) => {
        const reached = points >= l.at;
        const isNext = next?.name === l.name;
        const Ic = iconFor(l);
        const th = resolveCardTheme({ name: l.name, color: l.color });
        const to = levels[i + 1];
        const share = to ? Math.min(1, Math.max(0, (points - l.at) / (to.at - l.at))) : 0;
        const on = Math.round(share * PIPS);
        return (
          <li key={l.name} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4">
            <div className="flex flex-col items-center">
              <span
                className={cn("relative flex size-11 shrink-0 items-center justify-center rounded-full", !reached && "bg-secondary text-ink2", isNext && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
                style={reached ? { background: `linear-gradient(135deg, ${th.stops[0]}, ${th.stops[1]} 45%, ${th.stops[3]})`, color: th.ink, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .12), inset 0 1px 0 rgb(255 255 255 / .6)" } : undefined}
              >
                <Ic weight="bold" className="size-5" />
                {!reached && <Lock weight="fill" className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-card p-[3px] text-mute" />}
              </span>
              {to && (
                <div aria-hidden className="relative my-2 flex flex-col items-center" style={{ gap: GAP }}>
                  {Array.from({ length: PIPS }, (_, k) => (
                    <span key={k} className={cn("w-4 rounded-[3px]", k < on ? "bg-primary" : "bg-secondary")} style={{ height: PIP }} />
                  ))}
                  {share > 0 && share < 1 && (
                    <span className="absolute left-full ml-3 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background" style={{ top: on * (PIP + GAP) - GAP / 2 }}>
                      <span aria-hidden className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rotate-45 bg-foreground" />
                      <span className="relative">You</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-col pb-5 pt-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <b className={cn("text-[16px] font-semibold", !reached && "text-ink2")}>{l.name}</b>
                <span className="text-[13px] tabular-nums text-ink2">{l.at.toLocaleString()} pts</span>
              </div>
              {l.teaser && <span className={cn("mt-0.5 text-[14px] leading-snug", reached ? "text-foreground" : "text-ink2")}>{l.teaser}</span>}
              {isNext && <span className="mt-1 text-[13px] font-medium text-green-deep">{(l.at - points).toLocaleString()} to go</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** One club's card, progress and fine print. Everything it shows comes from the membership the backend sent. */
function MembershipPanel({ name, m }: { name: string; m: Membership }) {
  const mobile = useIsMobile();
  const { club, points, memberId, since, tier, earn, boost, activity } = m;
  const { sorted, next, current } = standing(m);
  /* the timeline starts after the first step: that one is just where everyone begins, so it has no badge */
  const ladder = sorted.slice(1);
  /* the card: the backend's colour or tier name if it sent one, else the level the points put you in (and that level's own colour if it has one) */
  const theme = resolveCardTheme(tier?.name || tier?.color ? { name: tier.name ?? current.name, color: tier.color } : { name: current.name, color: current.color });
  const item = "text-[15px] text-foreground";
  const label = theme.label || current.name;

  return (
    <div className="grid items-start gap-5 rounded-[28px] bg-card p-4 sm:gap-6 sm:rounded-[32px] sm:p-6 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:gap-8">
        <LoyaltyCard aspect={mobile ? 1.8 : undefined} theme={theme} club={club} status={label} points={points} name={name} since={since} memberId={memberId} />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            {next ? (
              <div className="flex items-baseline gap-2.5">
                <span className="text-[clamp(32px,3.6vw,44px)] font-semibold leading-none tracking-[-0.04em] tabular-nums">{(next.at - points).toLocaleString()}</span>
                <span className="text-[17px] font-medium">points to {next.name}</span>
              </div>
            ) : (
              <span className="text-[clamp(28px,3vw,36px)] font-semibold leading-none tracking-[-0.03em]">Top level</span>
            )}
            {boost && <Status color="success" className="max-sm:text-[13px]">{boost}</Status>}
          </div>
          <Timeline levels={ladder} points={points} />
          <Accordion variant="card" type="multiple">
            {/* phones: the timeline is a fold-out (the horizontal one above is for wider screens) */}
            <AccordionItem value="path" className="sm:hidden">
              <AccordionTrigger>{next ? `Your path to ${next.name}` : "Your levels"}</AccordionTrigger>
              <AccordionContent><TimelineVertical levels={ladder} points={points} /></AccordionContent>
            </AccordionItem>
            <AccordionItem value="earn">
              <AccordionTrigger>How you earn points</AccordionTrigger>
              <AccordionContent>
                <ul className="divide-y divide-border">
                  {earn.map((r) => <li key={r.label} className={cn("flex items-baseline justify-between gap-6 py-2.5", item)}><span>{r.label}</span><span className="shrink-0 font-medium tabular-nums">{r.value}</span></li>)}
                </ul>
                {boost && <p className="mt-2 text-[13px] text-ink2">{club}: {boost.charAt(0).toLowerCase() + boost.slice(1)}.</p>}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="levels">
              <AccordionTrigger>What each level gets you</AccordionTrigger>
              <AccordionContent>
                <p className="mb-3 text-[13px] text-ink2">You’re {label}.</p>
                <ul className="flex flex-col gap-4">
                  {ladder.map((l) => {
                    const got = points >= l.at;
                    return (
                      <li key={l.name}>
                        <div className={cn("flex items-baseline justify-between font-medium", item)}><span>{l.name}</span><span className="text-[13px] font-normal tabular-nums text-ink2">{got ? "Reached" : `${(l.at - points).toLocaleString()} to unlock`}</span></div>
                        <ul className={cn("mt-1.5 flex flex-col gap-1.5", !got && "opacity-70")}>
                          {(l.perks ?? []).map((p) => <li key={p} className={cn("flex items-start gap-2.5", item)}>{got ? <Check weight="bold" className="mt-1 size-4 shrink-0 text-green-deep" /> : <Lock weight="bold" className="mt-1 size-4 shrink-0 text-ink2" />}{p}</li>)}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
            {activity.length > 0 && (
              <AccordionItem value="activity">
                <AccordionTrigger>Recent activity</AccordionTrigger>
                <AccordionContent>
                  <ul className="divide-y divide-border">
                    {activity.slice(0, 5).map((a) => (
                      <li key={a.id} className={cn("flex items-baseline justify-between gap-4 py-2.5", item)}>
                        <span className="min-w-0">{a.label}<span className="block text-[13px] text-ink2">{a.on}</span></span>
                        <span className={cn("shrink-0 font-medium tabular-nums", a.points < 0 && "text-ink2")}>{a.points > 0 ? "+" : "−"}{Math.abs(a.points).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
    </div>
  );
}

/** Every club the buyer belongs to. One club shows its card straight away; several get a switcher (a club's name as a tab). None: nothing to show. */
export default function WalletRewards({ name, memberships }: { name: string; memberships: Membership[] }) {
  const [pick, setPick] = useState(memberships[0]?.id);
  if (!memberships.length) return null;
  const active = memberships.find((m) => m.id === pick) ?? memberships[0];
  return (
    <section aria-label="Rewards" className="flex flex-col gap-3">
      <h2 className="px-1 text-[clamp(20px,1.8vw,24px)] font-semibold tracking-[-0.02em]">{memberships.length > 1 ? "Memberships" : "Rewards"}</h2>
      {memberships.length > 1 && (
        <Chips label="Your memberships" value={active.id} onChange={setPick} items={memberships.map((m) => ({ id: m.id, label: m.club }))} />
      )}
      <MembershipPanel key={active.id} name={name} m={active} />
    </section>
  );
}
