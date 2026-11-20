"use client";

/**
 * A season package, flex pack or access pass in the Tickets list.
 * - `PackRow` (the list view): a quiet row, the picture, the name, and one small ring at the right that shows what is left.
 * - `PackCard` (the tile view): the same cards the purchase flow uses on the team and venue pages (`pack-cards-styles.ts`): a package or pass
 *   is a plate with its name and what is left beside it, a flex pack its fan of vouchers over the name. Nothing there is styled on its own,
 *   it passes content to those cards, so a change to them reaches both.
 */


import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CaretRight, IdentificationCard, Lightning, Package } from "@phosphor-icons/react";
import { SegmentRing } from "@/components/ui/segment-ring";
import { Status } from "@/components/ui/status";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deckColour } from "@/lib/flex-deck";
import { ACCESS_PASSES, FLEX_PACKS, PACKAGES, imageFor, type WalletGame, type WalletTone } from "@/lib/walletDemo";

const TONE: Record<WalletTone, { t: string; on: string }> = {
  navy: { t: "var(--navy)", on: "#fff" },
  seat: { t: "var(--color-seat)", on: "#fff" },
  feature: { t: "var(--color-feature)", on: "#fff" },
  card: { t: "var(--ink2)", on: "#fff" },
};
const LABEL = { package: "Season package", flex: "Flex pack", pass: "Access pass" } as const;

type Plate = { cover?: string | null; t: string; on: string; mono?: string };
type Item = { left: number; total: number; unit: string; title: string; meta: string; transferred: boolean; plate?: Plate; fan?: { t: string; t2: string; on: string; used: boolean[] } };

const gamesLeft = (games: WalletGame[]) => games.filter((g) => g.state === "upcoming").length;

function describe(kind: "package" | "flex" | "pass", id: string): Item | null {
  if (kind === "package") {
    const p = PACKAGES.find((x) => x.id === id);
    if (!p) return null;
    const tone = TONE[p.tone];
    return { left: gamesLeft(p.games), total: p.games.length, unit: "games", title: p.name, meta: `${p.venue} · ${p.season}`, transferred: !!p.transferred, plate: { cover: imageFor(p.name) ?? imageFor(p.venue), t: tone.t, on: tone.on, mono: p.initials } };
  }
  if (kind === "flex") {
    const p = FLEX_PACKS.find((x) => x.id === id);
    if (!p) return null;
    const used = p.vouchers.map((v) => !!v.redeemed);
    const tint = deckColour(p.blurb, p.name) ?? { t: "#8c1d40", t2: "#c2415f", on: "#fff" };
    return { left: used.filter((u) => !u).length, total: used.length, unit: "credits", title: p.name, meta: p.blurb, transferred: false, fan: { ...tint, used } };
  }
  const p = ACCESS_PASSES.find((x) => x.id === id);
  if (!p) return null;
  return { left: gamesLeft(p.games), total: p.games.length, unit: "games", title: p.name, meta: `${p.season} · ${p.games.length} games`, transferred: p.status === "transferred", plate: { cover: p.cover, t: p.bg, on: p.fg } };
}

export function PackCard({ kind, id, selected, onOpen }: { kind: "package" | "flex" | "pass"; id: string; selected?: boolean; onOpen: () => void }) {
  const d = describe(kind, id);
  const r = rowData(kind, id);
  if (!d || !r) return null;
  const open = (e: React.SyntheticEvent) => { e.preventDefault(); onOpen(); };
  const ring = selected ? { boxShadow: "inset 0 0 0 2px rgb(var(--ink-rgb) / .55)" } : undefined;
  const state = d.transferred ? "Sent" : d.left === 0 ? "Used up" : null;
  const same = { height: "100%" } as const;

  if (d.fan) {
    const n = Math.min(d.fan.used.length, 12);
    return (
      <article className="tm-fx" style={{ ["--t" as string]: d.fan.t, ["--t2" as string]: d.fan.t2, ["--on-t" as string]: d.fan.on, ...same, ...ring }}>
        {state && <Badge className="tm-fx-sv" variant="soft" color="default" size="sm">{state}</Badge>}
        <div className="tm-fan" data-n={n} style={{ ["--n" as string]: n, ["--sp" as string]: `${(16 / (n - 1 || 1)).toFixed(2)}deg` }} aria-hidden>
          {d.fan.used.slice(0, n).map((u, k) => <i key={k} style={{ ["--k" as string]: k, filter: u ? "grayscale(1) brightness(1.25) contrast(.8)" : undefined }} />)}
        </div>
        <div className="tm-fx-h">
          <div className="tm-fx-t"><h3><a className="tm-fx-a" href="#" onClick={open}>{d.title}</a></h3></div>
          <p className="tm-fx-m">{d.meta}</p>
        </div>
        <div className="tm-fx-f">
          <span className="flex items-center gap-3">
            <Ring pips={r.pips} left={d.left} transferred={false} size={52} />
            <span className="tm-pr"><small>Credits left</small><b>of {d.total}</b></span>
          </span>
        </div>
      </article>
    );
  }

  const plate = d.plate!;
  const tilt = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
    el.style.setProperty("--px", `${x * 100}%`);
    el.style.setProperty("--py", `${y * 100}%`);
  };
  const settle = (e: React.PointerEvent<HTMLElement>) => { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); };
  return (
    <div style={{ perspective: 1200, height: "100%" }}>
      <article className="tm-pass" data-tile="" style={{ ["--t" as string]: plate.t, ["--on-t" as string]: plate.on, ...same, ...ring }} onPointerMove={tilt} onPointerLeave={settle}>
        {plate.cover ? (
          <div className="tm-pass-top pg-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plate.cover} alt="" loading="lazy" aria-hidden />
          </div>
        ) : (
          <div className="tm-pass-top">
            <span className="tm-pass-n">{d.total}</span>
            <small>{d.unit}</small>
          </div>
        )}
        <div className="tm-pass-b">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="soft" color="default" size="sm">{LABEL[kind]}</Badge>
            {state && <Badge variant="soft" color={d.transferred ? "info" : "default"} size="sm">{state}</Badge>}
          </span>
          <h3><a className="tm-pass-a" href="#" onClick={open}>{d.title}</a></h3>
          <span className="tm-pass-meta">{d.meta}</span>
        </div>
        <div className="tm-pass-f">
          <span className="flex items-center gap-3">
            <Ring pips={r.pips} left={d.left} transferred={d.transferred} size={52} />
            <span className="tm-pr"><small>{d.unit} left</small><b>{d.transferred ? "Sent" : `of ${d.total}`}</b></span>
          </span>
          <Button variant="secondary" size="sm" onClick={onOpen}>View<ArrowRight weight="bold" aria-hidden /></Button>
        </div>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
   The list row
   --------------------------------------------------------------------------------------------- */

const ROW_TONE: Record<WalletTone, string> = {
  navy: "bg-[var(--navy)] text-white",
  seat: "bg-seat text-white",
  feature: "bg-feature text-white",
  card: "bg-secondary text-foreground",
};
const ROW_ICON = { package: Package, flex: Lightning, pass: IdentificationCard } as const;

type Pip = "used" | "left" | "sent";
type ArtSpec =
  | { img?: string | null; tone: WalletTone; mono: string }
  | { tint: { t: string; t2: string; on: string }; count: number }
  | { bg: string; fg: string; cover?: string };
const gamePips = (games: WalletGame[]): Pip[] => games.map((g) => (g.state === "upcoming" ? "left" : g.state === "transferred" ? "sent" : "used"));

function rowData(kind: "package" | "flex" | "pass", id: string): { pips: Pip[]; left: number; unit: string; title: string; meta: string; transferred: boolean; art: ArtSpec } | null {
  if (kind === "package") {
    const p = PACKAGES.find((x) => x.id === id);
    if (!p) return null;
    const pips = gamePips(p.games);
    return { pips, left: pips.filter((x) => x === "left").length, unit: "games", title: p.name, meta: `${p.venue} · ${p.season}`, transferred: !!p.transferred, art: { img: imageFor(p.name) ?? imageFor(p.venue), tone: p.tone, mono: p.initials } };
  }
  if (kind === "flex") {
    const p = FLEX_PACKS.find((x) => x.id === id);
    if (!p) return null;
    const pips: Pip[] = p.vouchers.map((v) => (v.redeemed ? "used" : "left"));
    return { pips, left: pips.filter((x) => x === "left").length, unit: "credits", title: p.name, meta: p.blurb, transferred: false, art: { tint: deckColour(p.blurb, p.name) ?? { t: "#8c1d40", t2: "#c2415f", on: "#fff" }, count: p.vouchers.length } };
  }
  const p = ACCESS_PASSES.find((x) => x.id === id);
  if (!p) return null;
  const pips = gamePips(p.games);
  return { pips, left: pips.filter((x) => x === "left").length, unit: "games", title: p.name, meta: `${p.season} · ${p.games.length} games`, transferred: p.status === "transferred", art: { bg: p.bg, fg: p.fg, cover: p.cover } };
}

function Art({ kind, art }: { kind: "package" | "flex" | "pass"; art: ArtSpec }) {
  const Ic = ROW_ICON[kind];
  const base = "relative size-[76px] shrink-0 overflow-hidden rounded-[22px]";
  if ("tint" in art) {
    const n = Math.min(Math.max(art.count, 2), 4);
    return (
      <span aria-hidden className={cn(base, "flex items-end justify-center")} style={{ background: `radial-gradient(80% 90% at 50% 110%, ${art.tint.t}66, transparent 70%), linear-gradient(180deg, ${art.tint.t}22, transparent)` }}>
        <span className="relative mb-3.5 h-11 w-8">
          {Array.from({ length: n }, (_, k) => (
            <i key={k} className="absolute inset-0 rounded-[7px]" style={{ transformOrigin: "50% 140%", transform: `rotate(${(k - (n - 1) / 2) * 12}deg)`, background: `linear-gradient(170deg, ${art.tint.t2}, ${art.tint.t})`, boxShadow: "0 0 0 1px rgba(0,0,0,.2), 0 3px 8px rgba(0,0,0,.25)" }} />
          ))}
        </span>
      </span>
    );
  }
  if ("bg" in art) {
    return (
      <span aria-hidden className={cn(base, "flex items-end p-2")} style={{ background: art.bg, color: art.fg }}>
        {art.cover && <img src={art.cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-45" />}
        <span className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/40" />
        <Ic weight="bold" className="relative size-5" />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn(base, "flex items-center justify-center", !art.img && ROW_TONE[art.tone])}>
      {art.img ? <><img src={art.img} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" /></> : <span className="text-[26px] font-semibold tracking-[-0.03em] opacity-90">{art.mono}</span>}
    </span>
  );
}

/* What is left, as one small ring (the shared SegmentRing) with the number left in the middle. */
function Ring({ pips, left, transferred, size = 44 }: { pips: Pip[]; left: number; transferred: boolean; size?: number }) {
  return (
    <SegmentRing segments={pips} size={size}>
      <span className={cn("font-semibold tabular-nums tracking-[-0.02em]", size > 48 ? "text-[19px]" : "text-[15px]", (transferred || left === 0) && "text-ink2")}>{transferred ? "–" : left}</span>
    </SegmentRing>
  );
}

export default function PackRow({ kind, id, selected, onOpen }: { kind: "package" | "flex" | "pass"; id: string; selected?: boolean; onOpen: () => void }) {
  const d = rowData(kind, id);
  if (!d) return null;
  const Ic = ROW_ICON[kind];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${d.title}, ${LABEL[kind]}, ${d.transferred ? "transferred" : `${d.left} of ${d.pips.length} ${d.unit} left`}`}
      className={cn(
        "group flex w-full touch-manipulation select-none items-center gap-4 rounded-[28px] bg-card p-3.5 text-left outline-none transition-[background-color,transform] duration-200 ease-[var(--e-out)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[var(--h-focus)]",
        "[@media(hover:hover)]:hover:bg-secondary",
        selected && "bg-secondary",
      )}
    >
      <Art kind={kind} art={d.art} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[14px] text-ink2"><Ic weight="bold" aria-hidden className="size-3.5 shrink-0" />{d.transferred ? <Status color="info">Transferred</Status> : LABEL[kind]}</span>
        <span className="line-clamp-2 text-[18px] font-semibold leading-tight tracking-[-0.02em]">{d.title}</span>
        <span className="truncate text-[14px] text-ink2">{d.meta}</span>
      </span>
      <Ring pips={d.pips} left={d.left} transferred={d.transferred} />
      <CaretRight weight="bold" aria-hidden className="size-4 shrink-0 text-mute transition-transform duration-200 ease-[var(--e-out)] [@media(hover:hover)]:group-hover:translate-x-0.5" />
    </button>
  );
}
