import type { Metadata } from "next";
import MarketingPage from "@/components/templates/MarketingPage";
import Section from "@/components/molecules/Section";
import SectionHeader from "@/components/molecules/SectionHeader";
import StatCard from "@/components/molecules/StatCard";
import FeatureCard from "@/components/molecules/FeatureCard";
import DateChip from "@/components/molecules/DateChip";
import LogoTile from "@/components/molecules/LogoTile";
import EmptyState from "@/components/molecules/EmptyState";
import CtaPanel from "@/components/molecules/CtaPanel";
import BackChip from "@/components/molecules/BackChip";
import { cardCls, chipBtnCls } from "@/components/molecules/Card";
import Button from "@/components/atoms/Button";
import Pill from "@/components/atoms/Pill";
import Eyebrow from "@/components/atoms/Eyebrow";
import IconChip from "@/components/atoms/IconChip";
import BlockMarker from "@/components/atoms/BlockMarker";
import Glow from "@/components/atoms/Glow";
import RotatingWord from "@/components/atoms/RotatingWord";
import { Input, Label } from "@/components/atoms/form";
import { ArrowRight, Ticket, Seat, Spark, Users, Shield, Layers, Bolt, Check, Info, MapPin, Sort, Accessibility } from "@/components/atoms/icons";
import ModalDemo from "./ModalDemo";
import ListingDemo from "./ListingDemo";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Design System — Blocktickets",
  description:
    "The Blocktickets atomic design system: foundations, atoms, molecules, organisms, templates.",
  path: "/design-system/",
  noIndex: true,
});

const COLORS = [
  { name: "Navy (field)", hex: "#051B35", use: "Page background — the field everything sits on", border: true },
  { name: "White", hex: "#FFFFFF", use: "Headings, primary text, emphasis" },
  { name: "Green (accent)", hex: "#A6E773", use: "Act here / this is the brand — one moment per viewport" },
  { name: "Green (hover)", hex: "#B9EF93", use: "Primary button hover" },
  { name: "Steel", hex: "#BCBFCC", use: "Secondary text, icons, static links" },
  { name: "Space", hex: "#9DA2B3", use: "Muted/body text, eyebrows, captions" },
  { name: "Graphite", hex: "#6E7180", use: "Tertiary text, separators" },
  { name: "Electric blue", hex: "#3874E0", use: "Ambient glows only — never text, borders, or fills" },
  { name: "Elevated surface", hex: "#0A2747", use: "App cards on navy", border: true },
  { name: "Tile surface", hex: "#06203C", use: "Image and logo tiles", border: true },
];

const ICONS = [
  { name: "ArrowRight", el: <ArrowRight className="h-5 w-5" /> },
  { name: "Ticket", el: <Ticket className="h-5 w-5" /> },
  { name: "Seat", el: <Seat className="h-5 w-5" /> },
  { name: "Spark", el: <Spark className="h-5 w-5" /> },
  { name: "Users", el: <Users className="h-5 w-5" /> },
  { name: "Shield", el: <Shield className="h-5 w-5" /> },
  { name: "Layers", el: <Layers className="h-5 w-5" /> },
  { name: "Bolt", el: <Bolt className="h-5 w-5" /> },
  { name: "Check", el: <Check className="h-5 w-5" /> },
  { name: "Info", el: <Info className="h-5 w-5" /> },
  { name: "MapPin", el: <MapPin className="h-5 w-5" /> },
  { name: "Sort", el: <Sort className="h-5 w-5" /> },
  { name: "Accessibility", el: <Accessibility className="h-5 w-5" /> },
];

/* ---------- local presentation helpers ---------- */

function Swatch({ name, hex, use, border }: { name: string; hex: string; use: string; border?: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className={`h-20 ${border ? "border-b border-white/10" : ""}`} style={{ background: hex }} />
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-semibold text-white">{name}</span>
          <code className="text-[11px] tabular-nums text-[#9DA2B3]">{hex}</code>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#9DA2B3]">{use}</p>
      </div>
    </div>
  );
}

function Spec({ title, code, children, className = "" }: { title: string; code?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-6 sm:p-7 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {code && <code className="text-[11px] text-[#6E7180]">{code}</code>}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">{label}</span>
      {children}
    </div>
  );
}

/* ---------- page ---------- */

export default function DesignSystemPage() {
  return (
    <MarketingPage>
      {/* header */}
      <Section borderTop={false} pad="pb-16 pt-14 lg:pb-20 lg:pt-20" glow={<Glow className="-left-40 top-0 h-[420px] w-[420px]" />}>
        <SectionHeader
          eyebrow="Design system"
          title={
            <>
              Atoms <span className="text-[#6E7180]">→</span> molecules <span className="text-[#6E7180]">→</span> organisms{" "}
              <span className="text-[#6E7180]">→</span> templates <span className="text-[#6E7180]">→</span> pages.
            </>
          }
          titleMax="820px"
          lede="Every piece of the Blocktickets web experience, from raw tokens up to full page chrome. Rules live in DESIGN-SYSTEM.md; the code lives in components/, one folder per tier."
          ledeMax="680px"
        />
      </Section>

      {/* ===== FOUNDATIONS ===== */}
      <Section id="foundations" glow={<Glow className="-right-40 top-1/4 h-[440px] w-[440px]" opacity={0.1} />}>
        <SectionHeader
          eyebrow="Foundations"
          title="Color & type."
          lede="Navy is the field, everything else is accent. Green means “act here” — roughly one green moment per viewport. Never introduce a new color."
          ledeMax="640px"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLORS.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Spec title="Typography" code="Inter · next/font">
            <div className="space-y-7">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">Hero h1 · clamp(40–76px)</div>
                <div className="mt-2 text-[clamp(32px,4vw,56px)] font-semibold leading-[1.02] tracking-[-0.025em] text-white">
                  Build Bigger. <span className="text-[#a6e773]">Block by Block.</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">Section .h2 · clamp(30–48px)</div>
                <h2 className="h2 mt-2">The results speak for themselves.</h2>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">.eyebrow</div>
                <div className="eyebrow mt-2">Twelve px · uppercase · tracked</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">.lede</div>
                <p className="lede mt-2 max-w-[520px]">
                  Body copy runs Space gray at a relaxed 1.6 leading. Emphasis inside body copy is{" "}
                  <span className="font-semibold text-white">semibold white</span> — never color.
                </p>
              </div>
            </div>
          </Spec>
          <Spec title="Ambient glow" code='<Glow color="blue|green" />'>
            <p className="text-[13px] leading-relaxed text-[#9DA2B3]">
              One per section, alternating sides. Blue for most sections; green reserved for the statement and final CTA.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="relative h-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#051B35]">
                <Glow className="-left-16 top-1/2 h-56 w-56 -translate-y-1/2" opacity={0.2} blur={70} />
                <span className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">Blue · default</span>
              </div>
              <div className="relative h-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#051B35]">
                <Glow color="green" className="-right-16 top-1/2 h-56 w-56 -translate-y-1/2" opacity={0.16} blur={70} />
                <span className="absolute bottom-3 left-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">Green · statement + CTA only</span>
              </div>
            </div>
          </Spec>
        </div>
      </Section>

      {/* ===== ATOMS ===== */}
      <Section id="atoms" glow={<Glow className="-left-40 top-1/3 h-[460px] w-[460px]" opacity={0.1} />}>
        <SectionHeader
          eyebrow="Tier 1 · components/atoms"
          title="Atoms."
          lede="The smallest brand-locked pieces. Everything above this tier is composed from these."
          ledeMax="600px"
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Spec title="Button" code='<Button variant size href?>'>
            <Row label="Primary">
              <Button href="#">Book a walkthrough <ArrowRight className="arrow" /></Button>
              <Button href="#" size="sm">Log in</Button>
            </Row>
            <Row label="Outline">
              <Button variant="outline" href="#">Secondary action</Button>
              <Button variant="outline" size="sm" href="#">View package</Button>
            </Row>
            <Row label="Ghost">
              <Button variant="ghost" href="#">See the platform</Button>
            </Row>
            <Row label="Disabled">
              <Button disabled className="disabled:opacity-40">Validate</Button>
            </Row>
          </Spec>

          <Spec title="Pill" code='<Pill variant size>'>
            <Row label="Accent">
              <Pill>Today · 6:30 PM</Pill>
              <Pill size="sm"><Ticket className="h-[12px] w-[12px]" /> 3 tickets</Pill>
            </Row>
            <Row label="Success">
              <Pill variant="success">Claimed Sep 10</Pill>
              <Pill variant="success" size="sm">Linked</Pill>
            </Row>
            <Row label="Warning">
              <Pill variant="warning">Waiting to be claimed</Pill>
            </Row>
            <Row label="Neutral">
              <Pill variant="neutral">2 vouchers</Pill>
              <Pill variant="neutral" size="sm">Sec 109 · Row A</Pill>
            </Row>
          </Spec>

          <Spec title="Eyebrow · BlockMarker · IconChip" code="<Eyebrow> <BlockMarker> <IconChip>">
            <Row label="Eyebrow">
              <Eyebrow>Featured stories</Eyebrow>
              <Eyebrow tracking="0.2em">Outcomes</Eyebrow>
            </Row>
            <Row label="BlockMarker">
              <BlockMarker />
              <BlockMarker size="sm" />
              <span className="text-[12px] text-[#9DA2B3]">the green square motif</span>
            </Row>
            <Row label="IconChip">
              <IconChip><Bolt className="h-5 w-5" /></IconChip>
              <IconChip tone="space"><Shield className="h-5 w-5" /></IconChip>
              <span className="text-[12px] text-[#9DA2B3]">icons stay Steel/Space — never green</span>
            </Row>
          </Spec>

          <Spec title="Form" code="<Label> <Input>">
            <div className="max-w-[380px]">
              <Label htmlFor="ds-email">Email</Label>
              <Input id="ds-email" type="email" placeholder="Enter your email" className="mt-3" />
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-[#9DA2B3]">
              Navy input well on the elevated surface; green border on focus.
            </p>
          </Spec>

          <Spec title="Icons" code="atoms/icons.tsx · 24px grid · currentColor" className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
              {ICONS.map((i) => (
                <div key={i.name} className="flex flex-col items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-5 text-[#BCBFCC]">
                  {i.el}
                  <span className="text-[11px] text-[#6E7180]">{i.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-[#9DA2B3]">Tickets are always the Ticket icon — never a diamond or placeholder shape.</p>
          </Spec>

          <Spec title="Motion" code="<Reveal delay> <RotatingWord words>" className="lg:col-span-2">
            <p className="text-[13px] leading-relaxed text-[#9DA2B3]">
              Reveal fades + rises content into view on scroll (reduced-motion safe). RotatingWord cycles the statement line:
            </p>
            <div className="mt-4 text-[clamp(26px,3.4vw,44px)] font-light leading-[1.05] tracking-[-0.03em] text-[#9DA2B3]">
              Your <RotatingWord words={["game day", "front office", "box office", "fan base"]} />
            </div>
          </Spec>
        </div>
      </Section>

      {/* ===== MOLECULES ===== */}
      <Section id="molecules" glow={<Glow className="-right-44 top-1/4 h-[500px] w-[500px]" opacity={0.12} />}>
        <SectionHeader
          eyebrow="Tier 2 · components/molecules"
          title="Molecules."
          lede="Small compositions of atoms: headers, cards, chips, and panels that repeat across pages."
          ledeMax="600px"
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Spec title="SectionHeader" code="<SectionHeader eyebrow title lede>">
            <SectionHeader
              eyebrow="Featured stories"
              title="Real results from real organizations."
              lede="Eyebrow, section heading, and lede with the standard spacing rhythm baked in."
            />
          </Spec>

          <Spec title="StatCard" code="<StatCard value label detail>">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard value="+18%" label="Revenue per order" detail="From add-ons, packaging, and built-in upsells across partner organizations." />
              <StatCard value="<90s" label="Event changes live" detail="Update pricing or release seats — live on your site in under 90 seconds." />
            </div>
          </Spec>

          <Spec title="FeatureCard" code="<FeatureCard icon eyebrow title body link? aside?>" className="lg:col-span-2">
            <div className="grid gap-4 lg:grid-cols-2">
              <FeatureCard
                icon={<Seat className="h-5 w-5" />}
                eyebrow="Venue control"
                title="Interactive seat maps & live inventory"
                body="Price and manage inventory by seat, row, or section — in real time across every sales channel."
                glow="#3874E0"
              />
              <FeatureCard
                icon={<Spark className="h-5 w-5" />}
                eyebrow="Dynamic pricing"
                title="AI-powered pricing."
                body="Historical sales and market demand scored into pricing opportunities."
                glow="#3874E0"
                link={{ href: "#", label: "See how the engine works" }}
              />
            </div>
          </Spec>

          <Spec title="DateChip · LogoTile" code='<DateChip variant="glass|navy"> <LogoTile src>'>
            <Row label="Glass">
              <DateChip month="Jul" day="18" />
              <span className="text-[12px] text-[#9DA2B3]">hero event rows</span>
            </Row>
            <Row label="Navy">
              <DateChip variant="navy" month="Aug" day="02" />
              <span className="text-[12px] text-[#9DA2B3]">compact list rows</span>
            </Row>
            <Row label="LogoTile">
              <LogoTile src="/cases/logos/raptors.svg" />
            </Row>
          </Spec>

          <Spec title="Chips · Modal" code="<BackChip> chipBtnCls <Modal>">
            <Row label="BackChip">
              <BackChip href="#" />
              <BackChip href="#" label="My events" />
            </Row>
            <Row label="Chip button">
              <span className={chipBtnCls}><Ticket className="h-4 w-4" /> Transfer</span>
            </Row>
            <Row label="Modal">
              <ModalDemo />
            </Row>
          </Spec>

          <Spec title="Surfaces" code=".card · cardCls · card-glow · tile-glass" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card p-5">
                <p className="text-[13px] font-semibold text-white">Marketing card</p>
                <p className="mt-1 text-[12px] text-[#9DA2B3]"><code>.card</code> — faint wash + hairline, 18px radius</p>
              </div>
              <div className={`${cardCls} p-5`}>
                <p className="text-[13px] font-semibold text-white">App card</p>
                <p className="mt-1 text-[12px] text-[#9DA2B3]"><code>cardCls</code> — elevated #0a2747 + sheen</p>
              </div>
              <div className={`${cardCls} card-glow p-5`}>
                <p className="text-[13px] font-semibold text-white">Glow card</p>
                <p className="mt-1 text-[12px] text-[#9DA2B3]"><code>card-glow</code> — the one card that owns the moment</p>
              </div>
              <div className="tile-glass rounded-2xl p-5">
                <p className="text-[13px] font-semibold text-white">Glass tile</p>
                <p className="mt-1 text-[12px] text-[#9DA2B3]"><code>tile-glass</code> — electric-blue glass</p>
              </div>
            </div>
          </Spec>

          <Spec title="FilterChip · Switch · ListingRow" code="<FilterChip active> <Switch checked> <ListingRow>" className="lg:col-span-2">
            <ListingDemo />
          </Spec>

          <Spec title="EmptyState" code="<EmptyState icon>" className="lg:col-span-2">
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              }
            >
              No other upcoming events — grab tickets to your next game and it&rsquo;ll show up here.
            </EmptyState>
          </Spec>
        </div>

        <div className="mt-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
            <h3 className="text-[15px] font-semibold text-white">CtaPanel</h3>
            <code className="text-[11px] text-[#6E7180]">{'<CtaPanel title sub action size tint note?>'}</code>
          </div>
          <CtaPanel
            size="md"
            title="Ready to build bigger?"
            sub={"The closing CTA card — one of the few places the green wash is allowed."}
            action={{ href: "#", label: "Book a walkthrough" }}
          />
        </div>
      </Section>

      {/* ===== ORGANISMS & TEMPLATES ===== */}
      <Section id="organisms" glow={<Glow className="-left-40 bottom-0 h-[460px] w-[460px]" opacity={0.12} />}>
        <SectionHeader
          eyebrow="Tiers 3–5 · organisms, templates, pages"
          title="Organisms, templates, pages."
          lede="Organisms are full page regions — Nav, PageHero, LogoMarquee, Testimonials, SwitchTimeline, PricingEngine, BlockStack, SiteFooter, WalletMenu. Templates wrap them into chrome; pages are the app/ routes."
          ledeMax="720px"
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            { t: "MarketingPage", d: "Nav on top, slim SiteFooter below — this page is wrapped in it. Every marketing route composes it with PageHero + Sections." },
            { t: "AppShell", d: "Demo fan-app chrome: header with search, auth guard, ambient grid + glow orbs behind the content." },
            { t: "WalletShell", d: "Light Blocktickets canvas with navy header, green-pill section nav (My events / Transfers / Listings / Settings), and the wallet identity heading." },
          ].map((x) => (
            <div key={x.t} className="card p-6">
              <div className="flex items-center gap-3">
                <BlockMarker size="sm" />
                <h3 className="text-[16px] font-semibold text-white">{x.t}</h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#9DA2B3]">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-[22px] border border-white/[0.08]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E7180]">
            PageHero — photo + 4-layer navy stack (wash · radial · fade)
          </div>
          <div className="relative flex h-[340px] items-center overflow-hidden">
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "center 18%" }} />
              <div className="absolute inset-0" style={{ background: "rgba(5,27,53,0.38)" }} />
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 68% at 50% 46%, rgba(5,27,53,0.42), transparent 72%)" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #051B35 0%, transparent 26%, transparent 52%, #051B35 92%)" }} />
            </div>
            <div className="container-x relative w-full text-center">
              <h2 className="text-[clamp(28px,3.6vw,48px)] font-semibold leading-[1.02] tracking-[-0.025em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">
                Build Bigger. <span className="text-[#a6e773]">Block by Block.</span>
              </h2>
            </div>
          </div>
        </div>
      </Section>
    </MarketingPage>
  );
}
