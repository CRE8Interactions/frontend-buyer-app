"use client";

import Link from "next/link";
import { deckColour } from "@/lib/flex-deck";
import { ArrowRight } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Badge } from "@/components/ui/badge";
import type { Team } from "./teams";

/* The season pass cards and the flex pack cards, in one place. The team page and every venue page draw them from here, so a change to either is one edit
   and they can never drift apart. A pass tilts toward the pointer; a pack's vouchers fan out. */

export function PassCards({ team, passes }: { team: Team; passes: Team["passes"] }) {
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
    <div className="tm-passes">
      {passes.map((p) => (
        <article key={p.title} className="tm-pass" data-hot={p.hot ? "1" : "0"} onPointerMove={tilt} onPointerLeave={settle}>
          {p.cover ? (
            <div className="tm-pass-top pg-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.cover} alt="" loading="lazy" aria-hidden />
            </div>
          ) : (
            <div className="tm-pass-top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={team.logo} alt="" aria-hidden />
              <span className="tm-pass-n">{p.n}</span>
              <small>{p.unit}</small>
            </div>
          )}
          <div className="tm-pass-b">
            <Badge variant="soft" color="default" size="sm">{p.kicker}</Badge>
            <h3><Link className="tm-pass-a" href={p.href}>{p.title}</Link></h3>
            {p.cover && <span className="tm-pass-meta">{p.n} {p.unit}</span>}
            <p>{p.range}. {p.note}</p>
          </div>
          <div className="tm-pass-f">
            <span className="tm-pr"><small>From</small><b>{p.price}</b></span>
            <Button href={p.href} variant="secondary" size="sm">Select<ArrowRight weight="bold" aria-hidden /></Button>
          </div>
        </article>
      ))}
    </div>
  );
}

/* "WENDYS FAMILY 4 PACK" -> "Wendys Family 4 Pack"; names that are already mixed case are left alone */
const nice = (n: string) => (n === n.toUpperCase() ? n.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : n);
/* "Oct 13 – Mar 19" (years are added only when the range crosses one or is not this year) */
function span(a?: string, b?: string) {
  if (!a || !b) return "";
  const x = new Date(a), y = new Date(b);
  if (isNaN(+x) || isNaN(+y)) return "";
  const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const yr = (d: Date) => d.getUTCFullYear();
  const mid = new Date(y.getTime() - 12 * 36e5);
  const long = yr(x) !== yr(mid) || yr(x) !== new Date().getFullYear();
  return long ? `${md(x)}, ${yr(x)} – ${md(mid)}, ${yr(mid)}` : `${md(x)} – ${md(mid)}`;
}

export function FlexCards({ flex }: { flex: Team["flex"] }) {
  const base = Math.max(0, ...flex.map((f) => f.each));
  return (
    <div className="tm-flex">
      {flex.map((x) => {
        const save = base ? Math.round((1 - x.each / base) * 100) : 0;
        const n = Math.min(x.count, 12);
        return (
          <article key={x.href} className="tm-fx">
            {save > 0 && <Badge className="tm-fx-sv" variant="soft" color="accent" size="sm">{`Save ${save}%`}</Badge>}
            <div className="tm-fan" data-n={n} style={{ ["--n" as string]: n, ["--sp" as string]: `${(16 / (n - 1 || 1)).toFixed(2)}deg`, ...(deckColour(x.desc, x.name) ? { ["--t" as string]: deckColour(x.desc, x.name)!.t, ["--t2" as string]: deckColour(x.desc, x.name)!.t2, ["--on-t" as string]: deckColour(x.desc, x.name)!.on } : {}) }} aria-hidden>
              {Array.from({ length: n }, (_, k) => <i key={k} style={{ ["--k" as string]: k }} />)}
            </div>
            <div className="tm-fx-h">
              <div className="tm-fx-t">
                <h3><Link className="tm-fx-a" href={x.href}>{x.name ? nice(x.name) : `${x.count} vouchers`}</Link></h3>
              </div>
              {(x.name || span(x.start, x.end)) && <p className="tm-fx-m">{[x.name ? `${x.count} vouchers` : "", span(x.start, x.end)].filter(Boolean).join(" · ")}</p>}
            </div>
            <div className="tm-fx-f">
              <span className="tm-pr"><small>Pack price</small><b>{x.price}</b></span>
              <span className="tm-fx-e">{"$"}{x.each.toFixed(2)} each</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
