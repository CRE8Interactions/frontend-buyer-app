"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowRight, Armchair, CalendarCheck, MapPin } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Description } from "@/components/ui/description";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchField } from "@/components/ui/search-field";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DoneView, money } from "./Checkout";
import { CheckoutView } from "./CheckoutSwitch";
import PageHead from "./PageHead";
import type { Team } from "./teams";

/* Flex packs, made for a long list. The fan sits first and deals as many vouchers as the pack holds; slide to a size, or open the list to
   search and sort every pack. Tap a game under the fan to spend a voucher and see what a flex voucher is for. Sizes and prices are the team's
   flex list, the same ones the storefront shows. Breaking cases: no packs, one pack (no slider), twenty or more (the list scrolls, the fan stops at twelve). */

const FAN_MAX = 12;
type Pack = Team["flex"][number];
const price = (p: Pack) => parseFloat(p.price.replace(/[^0-9.]/g, ""));

export default function FlexStudio({ team }: { team: Team }) {
  const packs = useMemo(() => [...team.flex].sort((a, b) => a.count - b.count), [team.flex]);
  const eachMax = Math.max(0, ...packs.map((p) => p.each));
  const best = packs.reduce<Pack | undefined>((a, p) => (!a || p.each < a.each ? p : a), undefined);
  const [idx, setIdx] = useState(() => Math.max(0, packs.findIndex((p) => p === best)));
  const [screen, setScreen] = useState<"buy" | "checkout" | "done">("buy");
  const [tab, setTab] = useState("slide");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"size" | "price" | "value">("size");
  const [spent, setSpent] = useState<number[]>([]);
  const [fly, setFly] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLElement | null)[]>([]);
  const flights = useRef(0);
  const pack = packs[idx];
  const games = team.featured.slice(0, 3);
  const save = (p: Pack) => (eachMax ? Math.round((1 - p.each / eachMax) * 100) : 0);
  const left = pack ? Math.max(0, pack.count - spent.length) : 0;
  const pick = (count: number) => { const i = packs.findIndex((p) => p.count === count); if (i >= 0) { setIdx(i); setSpent([]); } };
  const list = useMemo(() => {
    const n = q.trim();
    const rows = packs.filter((p) => !n || String(p.count).includes(n));
    return [...rows].sort((a, b) => (sort === "size" ? a.count - b.count : sort === "price" ? price(a) - price(b) : a.each - b.each));
  }, [packs, q, sort]);

  const spend = (i: number) => {
    if (!pack || left <= 0 || spent.includes(i)) return;
    const fan = fanRef.current, chip = chips.current[i], v = fan?.querySelector("i");
    if (fan && chip && v) {
      const f = fan.getBoundingClientRect(), c = chip.getBoundingClientRect();
      const vh = (v as HTMLElement).offsetHeight;
      const id = ++flights.current;
      setFly({ id, dx: c.left + c.width / 2 - (f.left + f.width / 2), dy: c.top + c.height / 2 - (f.bottom - 12 - vh / 2) });
      setTimeout(() => setFly((x) => (x && x.id === id ? null : x)), 800);
    }
    setSpent((s) => [...s, i]);
  };

  if (screen === "done" && pack) {
    return <DoneView title={`${pack.count} vouchers, ready to use`} againLabel="Back to flex packs" onAgain={() => setScreen("buy")}
      text={<>Redeem any voucher for any 2026 home game. They&apos;re in your wallet now, and a confirmation is on its way to <strong className="font-semibold">jordan.reyes@gmail.com</strong>.</>}
      items={Array.from({ length: pack.count }, (_, i) => ({ key: String(i), title: "AGGIE-FLEX-" + String(4820 + i * 7), note: "Any home game" }))} />;
  }
  if (screen === "checkout" && pack) {
    return <CheckoutView onBack={() => setScreen("buy")} onPaid={() => setScreen("done")} productTitle="Aggie Football Flex Pack" productNote="2026 season · any home game" logo={team.logo}
      intro="Complete your purchase and the vouchers land in your wallet." total={price(pack)}
      lines={[{ title: `${pack.count} flex vouchers`, note: `${money(pack.each)} each · redeem any home game`, amount: price(pack) }]} />;
  }

  return (
    <div className="n-wrap pg-page pg-flex has-bar">
      <PageHead back={{ href: "/nm-state", label: team.name }} title="Aggie Football Flex Pack" mark={team.crest}>
        <p className="pg-facts">
          <span><MapPin weight="bold" aria-hidden />Aggie Memorial Stadium</span>
          <span><Armchair weight="bold" aria-hidden />Any home game</span>
          <span><CalendarCheck weight="bold" aria-hidden />Redeem any time before kickoff</span>
        </p>
      </PageHead>

      {!pack ? (
        <Card variant="secondary" className="p-6">
          <Empty><EmptyHeader><EmptyTitle>No flex packs on sale yet</EmptyTitle><EmptyDescription>This team has not released any. You can still buy tickets game by game.</EmptyDescription></EmptyHeader>
            <Button href="/nm-state#schedule">See the schedule<ArrowRight weight="bold" aria-hidden /></Button></Empty>
        </Card>
      ) : (
        <section id="packs" data-chapter="Pick a pack" aria-label="Pick a pack" className="pg-two">
          <div className="pg-vis max-lg:order-1">
            <div className="pg-fan" ref={fanRef} role="img" aria-label={`${left} of ${pack.count} vouchers left`} style={{ ["--n" as string]: Math.min(left, FAN_MAX), ["--sp" as string]: `${(18 / (Math.min(left, FAN_MAX) - 1 || 1)).toFixed(2)}deg` }}>
              {Array.from({ length: Math.min(left, FAN_MAX) }, (_, k) => <i key={`${pack.count}-${k}`} style={{ ["--k" as string]: k }} />)}
              {fly && <span key={fly.id} className="pg-fly" style={{ ["--dx" as string]: `${fly.dx}px`, ["--dy" as string]: `${fly.dy}px` }} />}
              <span className="pg-fan-n"><Badge size="lg" variant="soft">{`${left} of ${pack.count} vouchers`}</Badge></span>
            </div>
            <div className="grid gap-3 px-1">
              <Description className="!text-base !text-h-foreground !font-medium text-balance text-center">{left > 0 ? "Try it: tap a game to spend a voucher." : "That is every voucher spent. Reset to deal them again."}</Description>
              <div className="pg-games">
                {games.map((g, i) => {
                  const done = spent.includes(i);
                  return (
                    <span key={g.head} className="block min-w-0" ref={(el) => { chips.current[i] = el; }}>
                      {/* a game is a plain card: the crest and the game. Tapping it spends a voucher and stamps it Spent. */}
                      <Button variant="secondary" className="pg-game !grid h-auto w-full !gap-0 !p-0 whitespace-normal" data-spent={done ? "1" : "0"} disabled={done || left <= 0}
                        onClick={() => spend(i)} aria-label={done ? `Voucher spent on ${g.head}, ${g.date}` : `Spend a voucher on ${g.head}, ${g.date}`}>
                        <span className="pg-game-crest" aria-hidden>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={g.opp} alt="" />
                        </span>
                        <span className="pg-game-t"><b>vs. {g.short}</b><span>{g.date} · {g.time}</span><em>{g.tag}</em></span>
                        {done && <span className="pg-game-stamp" aria-hidden>Spent</span>}
                      </Button>
                    </span>
                  );
                })}
              </div>
              {spent.length > 0 && <Button variant="ghost" className="justify-self-center" onClick={() => setSpent([])}><ArrowCounterClockwise weight="bold" aria-hidden />Reset the demo</Button>}
            </div>
          </div>

          <div className="pg-stick max-lg:order-2">
            <Card variant="secondary" className="gap-4 p-4">
              {packs.length > 1 ? (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList aria-label="How to choose a pack" className="w-full">
                    <TabsTrigger value="slide" className="flex-1">Slide</TabsTrigger>
                    <TabsTrigger value="list" className="flex-1">All {packs.length} packs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="slide" className="mt-4 px-1 pb-1">
                    <Slider label="Vouchers" aria-label="Number of vouchers" min={0} max={packs.length - 1} step={1} value={[idx]} onValueChange={(v) => pick(packs[v[0]].count)}
                      output={(v) => `${packs[v[0]]?.count ?? ""}`}
                      marks={packs.length <= 6 ? packs.map((p, i) => ({ value: i, label: String(p.count) })) : [0, Math.floor((packs.length - 1) / 2), packs.length - 1].map((i) => ({ value: i, label: String(packs[i].count) }))} />
                  </TabsContent>
                  <TabsContent value="list" className="mt-4 grid gap-3">
                    <SearchField variant="primary" aria-label="Search packs by number of vouchers" placeholder="Search by number of vouchers" value={q} onChange={(e) => setQ(e.target.value)} shortcutKey="" shortcutLabel="" />
                    <ToggleGroup type="single" detached tone="neutral" size="sm" disallowEmptySelection aria-label="Sort packs" value={sort} onValueChange={(v) => setSort(v as typeof sort)} className="flex-wrap">
                      <ToggleGroupItem value="size">Size</ToggleGroupItem><ToggleGroupItem value="price">Price</ToggleGroupItem><ToggleGroupItem value="value">Best value</ToggleGroupItem>
                    </ToggleGroup>
                    <div className="-mx-1 max-h-[300px] overflow-y-auto overscroll-contain px-1 pb-1">
                      {list.length === 0 ? (
                        <Empty className="p-6"><EmptyHeader><EmptyTitle>No pack matches “{q}”</EmptyTitle><EmptyDescription>Try another number of vouchers.</EmptyDescription></EmptyHeader><Button variant="secondary" onClick={() => setQ("")}>Clear search</Button></Empty>
                      ) : (
                        <RadioGroup layout="card" aria-label="Pack size" value={String(pack.count)} onValueChange={(v) => pick(Number(v))} className="gap-2 [&>[data-slot=radio-field]]:mt-0">
                          {list.map((p) => (
                            <RadioGroupItem key={p.count} value={String(p.count)} description={`${money(p.each)} each`} meta={p.price}
                              label={<span className="flex flex-wrap items-center gap-2">{p.count} vouchers{p === best ? <Badge variant="soft" color="accent">Best value</Badge> : save(p) > 0 ? <Badge variant="soft">{`Save ${save(p)}%`}</Badge> : null}</span>} />
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : null}

              <div className="flex items-end justify-between gap-3 border-t border-dashed border-h-separator pt-4">
                <div className="grid gap-1">
                  <span className="text-base font-semibold">{pack.count} {pack.count === 1 ? "voucher" : "vouchers"}</span>
                  <span className="flex flex-wrap items-center gap-2 text-sm text-h-muted">{money(pack.each)} each{pack === best && packs.length > 1 ? <Badge variant="soft" color="accent">Best value</Badge> : save(pack) > 0 ? <Badge variant="soft">{`Save ${save(pack)}%`}</Badge> : null}</span>
                </div>
                <b className="text-4xl font-medium leading-none tracking-tight tabular-nums">{pack.price}</b>
              </div>
              <Button size="lg" className="hidden w-full min-[960px]:flex" onClick={() => setScreen("checkout")}>Get {pack.count} {pack.count === 1 ? "voucher" : "vouchers"}<ArrowRight weight="bold" aria-hidden /></Button>
              <Description>Taxes and fees included. Pick your game and seat when you redeem, or send a voucher to a friend.</Description>
            </Card>
          </div>
        </section>
      )}

      {pack && <div className="pg-bar glass glass-float"><div><b>{pack.price}</b><small>{pack.count} {pack.count === 1 ? "voucher" : "vouchers"}</small></div><Button size="lg" className="!h-11 !text-[15px]" onClick={() => setScreen("checkout")}>Get {pack.count} {pack.count === 1 ? "voucher" : "vouchers"}<ArrowRight weight="bold" aria-hidden /></Button></div>}
    </div>
  );
}
