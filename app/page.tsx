import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/organisms/Nav";
import Reveal from "@/components/atoms/Reveal";
import SwitchTimeline from "@/components/organisms/SwitchTimeline";
import PricingEngine from "@/components/organisms/PricingEngine";
import RotatingWord from "@/components/atoms/RotatingWord";
import Testimonials from "@/components/organisms/Testimonials";
import LogoMarquee from "@/components/organisms/LogoMarquee";
import SiteFooter from "@/components/organisms/SiteFooter";
import { ArrowRight, Seat, Spark, Users, Shield, Layers, Bolt, Check } from "@/components/atoms/icons";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/",
  image: "/hero-bg.jpg",
  ogHeadline: "Sports-first ticketing for teams & venues",
  subtitle: "Sell more. Keep more. One platform.",
  cta: "Get Started",
});

const DELIVER = [
  "Dedicated onboarding and migration support",
  "Direct access to experienced ticketing professionals",
  "Features built alongside leagues, teams, and venues",
];

const STATS = [
  { n: "+18%", l: "Revenue per order", d: "From add-ons, packaging, and built-in upsells across partner organizations." },
  { n: "−40%", l: "Fewer pricing complaints", d: "After switching to all-in checkout where fans see the final total upfront." },
  { n: "<90s", l: "Event changes go live instantly", d: "Update pricing or release seats — live on your site in under 90 seconds." },
  { n: "+12%", l: "Mobile checkout conversion", d: "Two-tap checkout with Apple Pay and Google Pay vs. traditional flows." },
];

const SWITCH = [
  { t: "A dedicated rep who knows your building.", hl: "dedicated rep", d: "Not a help desk. Not a chatbot. A real person who knows your venue, your calendar, and your operations." },
  { t: "Launch in weeks, not months.", hl: "weeks, not months", d: "Onboarding, migration, and your first on-sale — handled with a timeline built around your season." },
  { t: "All-in pricing fans trust.", hl: "All-in pricing", d: "The price on the listing is the price at checkout. No surprise fees. Higher conversion. Fewer complaints." },
  { t: "Built for leagues, teams, and venues. Nothing else.", hl: "leagues, teams, and venues", d: "Every product decision, every integration, every update is shaped by what organizations like yours actually need." },
];

const CASES = [
  { slug: "niagara-icedogs", org: "Niagara IceDogs · OHL", r: "90% faster season-ticket exchanges for staff and fans.", img: "/cases/icedogs.jpg", teamLogo: "/cases/logos/icedogs.svg", bright: 1 },
  { slug: "des-moines-buccaneers", org: "Des Moines Buccaneers · USHL", r: "Group sales reinvented with self-serve seat selection.", img: "/cases/buccaneers.jpg", teamLogo: "/cases/logos/buccaneers.svg", bright: 1 },
  { slug: "ogden-raptors", org: "Ogden Raptors · Pioneer League", r: "$75K+ in new revenue and 2x sponsor value.", img: "/cases/raptors.jpg", teamLogo: "/cases/logos/raptors.svg", bright: 1.02 },
  { slug: "nm-state", org: "NM State Athletics · Conference USA", r: "From paper tickets to fully digital entry across all athletics.", img: "/cases/nmstate.jpg", teamLogo: "/cases/logos/nmstate.png", bright: 1.18 },
];

export default function Home() {
  return (
    <>
      <Nav variant="marketing" />

      {/* ===== HERO ===== */}
      <header id="top" className="relative flex min-h-[calc(100svh-70px)] items-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/hero-bg.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center 18%" }}
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{ background: "rgba(5,27,53,0.38)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 85% 68% at 50% 46%, rgba(5,27,53,0.42), transparent 72%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, #051B35 0%, transparent 26%, transparent 72%, #051B35 100%)" }} />
        </div>

        <div className="container-x w-full py-16 text-center">
          <Reveal>
            <Link href="/case-study/nm-state" className="group inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[13px] text-white shadow-lg shadow-black/40 transition-colors hover:border-white/20 hover:bg-white/[0.1]">
              Now powering NM State Athletics
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#a6e773] text-[#051B35] transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-3 w-3" /></span>
            </Link>
            <h1 className="mx-auto mt-6 max-w-[900px] text-[clamp(40px,6.2vw,76px)] font-semibold leading-[1.12] tracking-[-0.025em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">
              <span className="block">Build Bigger.</span>
              <span className="block text-[#a6e773]">Block by Block.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[600px] text-[clamp(16px,1.8vw,20px)] font-medium leading-relaxed text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
              The ticketing platform that puts leagues, teams, and venues in control of their revenue, their data, and their fans.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sell" className="btn btn-primary" style={{ minWidth: 210, justifyContent: "center" }}>Schedule a discovery call <ArrowRight className="arrow" /></Link>
            </div>
          </Reveal>
        </div>
      </header>

      {/* ===== TRUSTED ===== */}
      <section id="partners" className="relative -mt-px overflow-hidden pb-20 pt-7 lg:pb-24 lg:pt-9">
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[420px] w-[420px] rounded-full bg-[#3874E0]/[0.12] blur-[150px]" />
        <div className="container-x relative">
          <Reveal>
            <h2 className="h2 max-w-[760px]">Trusted across every level of the game.</h2>
            <p className="lede mt-4 max-w-[660px]">From NCAA Division I athletics to 60-team league deployments, OHL and USHL clubs, and professional baseball organizations, blocktickets powers ticketing across North America.</p>
          </Reveal>
        </div>
        <Reveal delay={80} className="mt-12">
          <LogoMarquee />
        </Reveal>
        <Reveal delay={140}>
          <p className="container-x mt-10 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-center text-[13px] font-medium tracking-[0.02em] text-[#9DA2B3]">
            {["NCAA Division I", "63-Team League Deployment", "OHL & USHL Clubs", "Professional Baseball"].map((c, i) => (
              <span key={c} className="flex items-center gap-3.5">
                {i > 0 && <span className="text-[#6E7180]" aria-hidden>•</span>}
                {c}
              </span>
            ))}
          </p>
        </Reveal>
      </section>

      {/* ===== VALUE ===== */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -right-40 top-1/4 h-[460px] w-[460px] rounded-full bg-[#3874E0]/[0.16] blur-[150px]" />
        <div className="container-x relative py-20 lg:py-24">
          <div className="grid gap-5 md:grid-cols-2">
            <Reveal className="relative overflow-hidden rounded-[22px] border border-white/10 p-8 sm:p-10" >
              <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(56,116,224,0.10), transparent 55%)" }} />
              <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#3874E0]/15 blur-3xl" />
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#BCBFCC]"><Bolt className="h-5 w-5" /></span>
              <h3 className="relative mt-6 text-[clamp(26px,3vw,40px)] font-semibold leading-tight tracking-[-0.02em] text-white">Your venue, your fans, your revenue.</h3>
              <p className="relative mt-5 max-w-[520px] text-[clamp(22px,2.1vw,29px)] font-medium leading-relaxed text-[#9DA2B3]">
                Control over pricing, reporting, and fan relationships. Built around your organization, not the platform.
              </p>
            </Reveal>
            <Reveal delay={100} className="card p-8 sm:p-10">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#9DA2B3]"><Shield className="h-5 w-5" /></span>
              <h3 className="mt-6 text-[24px] font-semibold leading-snug tracking-[-0.015em] text-white">A partner, not a platform.</h3>
              <p className="mt-3.5 text-[17.5px] leading-relaxed text-[#9DA2B3]">
                Technology matters. So does having a team that picks up the phone, understands the challenges, and helps solve them.
              </p>
              <ul className="mt-6 space-y-4">
                {DELIVER.map((p) => (
                  <li key={p} className="flex gap-3.5 text-[17.5px] leading-relaxed text-[#9DA2B3]">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#a6e773]" />{p}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== FEATURES (bento) ===== */}
      <section id="features" className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -left-40 top-1/4 h-[460px] w-[460px] rounded-full bg-[#3874E0]/[0.12] blur-[140px]" />
        <div className="container-x relative py-20 lg:py-24">
          <Reveal>
            <h2 className="h2 max-w-[760px]">Everything you need to sell tickets and run events.</h2>
            <p className="lede mt-4 max-w-[576px]">
              Ticketing, box office, memberships, fan engagement, and revenue optimization in one platform.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 lg:auto-rows-fr lg:grid-cols-6">
            <Feature className="lg:col-span-4" icon={<Seat className="h-5 w-5" />} eyebrow="Venue control" title="Interactive seat maps & live inventory"
              body="Price and manage inventory by seat, row, or section. Update availability, holds, and pricing in real time across every sales channel." glow="#3874E0" />
            <Feature className="lg:col-span-2 lg:row-span-2" icon={<Spark className="h-5 w-5" />} eyebrow="Dynamic pricing" title="AI-powered pricing based on real demand."
              body="Our AI analyzes historical sales and market demand to identify pricing opportunities across your inventory. No spreadsheets. No guesswork." glow="#3874E0" bodyClassName="text-[clamp(18px,1.7vw,22px)]" link={{ href: "#ai-engine", label: "See how the engine works" }} />
            <Feature className="lg:col-span-2" icon={<Users className="h-5 w-5" />} eyebrow="Fan CRM" title="Know your fans."
              body="Track attendance, purchasing behavior, and renewals in one place. Turn occasional buyers into long-term supporters." glow="#3874E0" />
            <Feature className="lg:col-span-2" icon={<Shield className="h-5 w-5" />} eyebrow="Zero fraud" title="Your event is protected."
              body="CAPTCHA, rate limiting, and identity verification activate automatically during high-demand on-sales." glow="#3874E0" />
            <Feature className="lg:col-span-6" icon={<Layers className="h-5 w-5" />} eyebrow="Revenue retention" title="Grow recurring revenue."
              body="Season memberships, flex plans, group sales, payment plans, and invoicing managed in one platform." glow="#3874E0"
              aside={<RecurringRevenuePanel />} />
          </div>
        </div>
      </section>

      {/* ===== OUTCOMES ===== */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -left-40 bottom-0 h-[460px] w-[460px] rounded-full bg-[#3874E0]/[0.14] blur-[150px]" />
        <div className="container-x relative py-20 lg:py-24">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow" style={{ letterSpacing: "0.2em" }}>Outcomes</div>
              <h2 className="h2 mt-3 max-w-[640px]">The results speak for themselves.</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-[#9DA2B3]">
              <Check className="h-3.5 w-3.5 text-[#BCBFCC]" /> Partner-reported metrics
            </span>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.l} delay={i * 70} className="relative overflow-hidden rounded-[18px] border border-white/[0.08] p-6">
                <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05), transparent)" }} />
                <div className="relative text-[36px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-white">{s.n}</div>
                <div className="relative mt-4 text-[14px] font-medium text-white">{s.l}</div>
                <p className="relative mt-2 text-[12px] leading-relaxed text-[#9DA2B3]">{s.d}</p>
              </Reveal>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-[760px] text-center text-[12px] text-[#9DA2B3]/80">
            Real results from real partners — measured across every on-sale, every game night, and every transaction.
          </p>
        </div>
      </section>

      {/* ===== AI PRICING ENGINE ===== */}
      <section id="ai-engine" className="relative border-t border-white/10">
        <div className="pointer-events-none absolute right-0 top-[18%] h-[420px] w-[420px] rounded-full bg-[#3874E0]/[0.10] blur-[150px]" />
        <div className="container-x relative py-20 lg:py-24">
          <Reveal>
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#a6e773] shadow-[0_0_10px_#a6e773]" />
              AI Pricing Engine
            </span>
            <h2 className="h2 mt-5 max-w-[760px]">Stop pricing tickets in a spreadsheet.</h2>
            <p className="lede mt-4 max-w-[600px]">
              Most teams leave <span className="font-medium text-white">15–30% of revenue</span> on the table every season. Drop in your existing ticket data and the engine cleans it, scores demand, and tells you exactly which seats to move — and why.
            </p>
          </Reveal>
          <PricingEngine />
          <Reveal delay={150}>
            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="#demo" className="btn btn-primary">See it on your data</Link>
              <span className="text-[14px] text-[#9DA2B3]">Upload one season export — see your revenue gap in minutes.</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== WHY SWITCH ===== */}
      <section className="relative border-t border-white/10">
        <div className="pointer-events-none absolute left-0 top-1/3 h-[520px] w-[520px] -translate-x-1/3 rounded-full bg-[#3874E0]/[0.12] blur-[140px]" />
        <div className="container-x py-20 lg:py-24">
          <SwitchTimeline
            items={SWITCH}
            heading={
              <>
                Why organizations switch and why they stay.
              </>
            }
            sub="What we hear from every GM, venue operator, and ownership group we work with."
          />
        </div>
      </section>

      {/* ===== CASES ===== */}
      <section id="previews" className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -right-44 top-1/3 h-[500px] w-[500px] rounded-full bg-[#3874E0]/[0.22] blur-[150px]" />
        <div className="container-x relative py-20 lg:py-24">
          <Reveal>
            <div className="eyebrow" style={{ letterSpacing: "0.2em" }}>Featured stories</div>
            <h2 className="h2 mt-3 max-w-[640px]">Real results from real organizations.</h2>
            <p className="lede mt-4 max-w-[576px]">A few of the leagues, teams, and venues using Blocktickets to grow revenue, save time, and simplify operations.</p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {CASES.map((c, i) => (
              <Link key={c.org} href={`/case-study/${c.slug}`} className="group block">
                <Reveal delay={i * 70} className="overflow-hidden rounded-[18px] border border-white/[0.08] transition-colors duration-300 group-hover:border-white/25">
                  <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-[#06203c]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.img} alt="" style={{ filter: `brightness(${c.bright})` }} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {/* consistent darkening + center vignette so every logo sits on the same brightness */}
                    <div className="absolute inset-0" style={{ background: "radial-gradient(125% 125% at 50% 45%, rgba(5,27,53,0.42) 0%, rgba(5,27,53,0.76) 100%)" }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.teamLogo} alt={c.org} className="relative max-h-24 w-auto max-w-[62%] object-contain drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)] sm:max-h-28" />
                  </div>
                  <div className="bg-[#0a2342]/40 p-5">
                    <h3 className="text-[14px] font-medium text-white">{c.org}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#9DA2B3]">{c.r}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#BCBFCC] transition-colors group-hover:text-[#a6e773]">
                      Read case study <ArrowRight className="arrow h-3.5 w-3.5" />
                    </span>
                  </div>
                </Reveal>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATEMENT ===== */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute -right-40 bottom-0 h-[560px] w-[560px] rounded-full bg-[#a6e773]/[0.08] blur-[150px]" />
        <div className="container-x relative py-24 lg:py-28">
          <Reveal>
            <div className="eyebrow" style={{ letterSpacing: "0.16em" }}>One platform</div>
            <h2 className="mt-6 max-w-[15ch] text-[clamp(40px,7vw,96px)] font-light leading-[1.05] tracking-[-0.03em] text-[#9DA2B3]">
              <span className="block whitespace-nowrap">
                Your <RotatingWord words={["game day", "front office", "box office", "fan base"]} />
              </span>
              <span className="block">deserves a platform built for this.</span>
            </h2>
            <p className="mt-6 max-w-[640px] text-[21px] font-semibold leading-relaxed text-[#9DA2B3]">
              From the first ticket sold to the last scan at the door — and every transfer and renewal in between.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ===== TESTIMONIAL ===== */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#3874E0]/[0.10] blur-[140px]" />
        <div className="container-x relative py-24 text-center lg:py-28">
          <Reveal className="mx-auto max-w-[820px]">
            <div className="eyebrow" style={{ letterSpacing: "0.16em" }}>What our partners are saying</div>
            <Testimonials />
          </Reveal>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section id="demo" className="border-t border-white/10">
        <div className="container-x py-20 lg:py-28">
          <Reveal className="relative mx-auto max-w-[960px] overflow-hidden rounded-[22px] border border-white/10 px-6 py-16 text-center shadow-2xl shadow-black/40 sm:py-[72px]">
            <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(166, 231, 115,0.18), #051B35 60%)" }} />
            <span className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#a6e773]/[0.10] blur-[110px]" />
            <div className="relative mx-auto max-w-[640px]">
              <div className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#9DA2B3]">Get started</div>
              <h2 className="mt-4 text-[clamp(32px,4.4vw,54px)] font-semibold leading-tight tracking-[-0.02em] text-white">
                Ready to build bigger?
              </h2>
              <p className="mx-auto mt-4 max-w-[480px] text-[16px] leading-relaxed text-[#9DA2B3]">
                Book a walkthrough and we&rsquo;ll show you the entire platform.
              </p>
              <div className="mt-9 flex justify-center">
                <Link href="/sell" className="btn btn-primary" style={{ minWidth: 210, justifyContent: "center" }}>Schedule a discovery call <ArrowRight className="arrow" /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function Feature({ className = "", icon, eyebrow, title, body, glow, bodyClassName = "text-[14px]", link, aside, backdrop }: {
  className?: string; icon: React.ReactNode; eyebrow: string; title: string; body: string; glow: string; bodyClassName?: string;
  link?: { href: string; label: string }; aside?: React.ReactNode; backdrop?: React.ReactNode;
}) {
  return (
    <Reveal className={`relative flex flex-col overflow-hidden rounded-[22px] border border-white/[0.08] p-7 shadow-xl shadow-black/20 ${className}`}>
      <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))" }} />
      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${glow}40` }} />
      {backdrop && <span className="pointer-events-none absolute inset-0">{backdrop}</span>}
      <div className="relative flex flex-1 flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] text-[#BCBFCC]">{icon}</span>
          <p className="mt-5 text-[12px] font-medium uppercase tracking-[0.06em] text-[#9DA2B3]">{eyebrow}</p>
          <h3 className="mt-2 text-[24px] font-medium leading-snug tracking-[-0.01em] text-white">{title}</h3>
          <p className={`mt-2 max-w-[60ch] leading-relaxed text-[#9DA2B3] ${bodyClassName}`}>{body}</p>
          {link && (
            <Link href={link.href} className="group/lnk mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-medium text-[#BCBFCC] transition-colors hover:text-[#a6e773]">
              {link.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover/lnk:translate-x-0.5" />
            </Link>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </Reveal>
  );
}

/* Mini product vignette for the revenue card: membership, payment plan,
   and invoice rows — the copy, shown as UI. */
function RecurringRevenuePanel() {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#051B35] p-4 lg:w-[360px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13.5px] font-semibold text-white">Season membership</p>
          <p className="mt-0.5 text-[11.5px] text-[#9DA2B3]">2026–27 · Sec E · Row 9</p>
        </div>
        <span className="rounded-full bg-[#a6e773]/15 px-2.5 py-1 text-[11px] font-semibold text-[#a6e773]">Auto-renew on</span>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-[13.5px] font-semibold text-white">Payment plan</p>
          <p className="text-[11.5px] text-[#9DA2B3]"><b className="font-semibold text-white">4 of 6</b> payments</p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-2/3 rounded-full" style={{ background: "linear-gradient(90deg,#7fd14a,#a6e773)" }} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <div>
          <p className="text-[13.5px] font-semibold text-white">Group invoice</p>
          <p className="mt-0.5 text-[11.5px] tabular-nums text-[#9DA2B3]">#1482 · 20 tickets</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4caf50]/15 px-2.5 py-1 text-[11px] font-semibold text-[#86e29b]">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          Paid
        </span>
      </div>
    </div>
  );
}


