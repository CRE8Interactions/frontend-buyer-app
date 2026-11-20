import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";
import Testimonial1 from "@/components/ui/testimonial-1";
import Nav from "./Nav";
import CounterSync from "./CounterSync";
import MotionGate from "./MotionGate";
import Intro from "./Intro";
import Reveal from "./Reveal";
import AiViz from "./AiViz";
import SeatMap from "./SeatMap";
import Engine from "./Engine";
import Process from "./Process";
import TextReveal from "./TextReveal";
import Stories from "./Stories";
import Rotator from "./Rotator";
import Quotes from "./Quotes";
import CubesCta from "./CubesCta";
import Footer from "./Footer";
import { Ingest, Diagnose, Recommend, Protect } from "./EnginePanels";
import { CSS } from "./styles";
import Button from "@/components/atoms/Button";

// /concept sets its own type: Geist for text, Geist Mono for the few monospace figures (step numbers)
const sans = Geist({ subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = pageMetadata({
  title: DEFAULT_TITLE.replace("Blocktickets", "blocktickets"),
  description: DEFAULT_DESCRIPTION.replace(/Blocktickets/g, "blocktickets"),
  path: "/",
  image: "/hero-bg.jpg",
  ogHeadline: "Sports-first ticketing for teams & venues",
  subtitle: "Sell more. Keep more. One platform.",
  cta: "Get Started",
});

const DELIVER = [
  "Your events, seat maps, fan data and pricing come across with you, so nothing starts from scratch.",
  "Hands-on onboarding for your staff, and direct access to experienced ticketing professionals.",
  "We build your seat maps and pricing alongside you, then open sales together.",
];
/* Four matching line drawings: same 64px frame, same 1.5px stroke, grey outline with one green accent each.
   They draw in once when the card is revealed, then the accent idles slowly. */
function StatArt({ i }: { i: number }) {
  return (
    <svg className="n-st-art" viewBox="0 0 64 64" aria-hidden="true">
      <rect className="sa-fr" x="1" y="1" width="62" height="62" rx="16" />
      {i === 0 && [14, 21, 28, 36].map((h, k) => (
        <rect key={k} className={`sa-o${k === 3 ? " sa-g" : ""}`} x={12 + k * 11} y={50 - h} width="8" height={h} rx="2.5" pathLength={100} style={{ ["--k" as string]: k }} />
      ))}
      {i === 1 && (<>
        <path className="sa-o" d="M13 17 C24 18 30 24 36 32 S46 43 51 44" pathLength={100} />
        <circle className="sa-dot" cx="51" cy="44" r="3" />
        <circle className="sa-ring" cx="51" cy="44" r="3" />
      </>)}
      {i === 2 && (<>
        <circle className="sa-o" cx="32" cy="32" r="14" pathLength={100} />
        <path className="sa-o" d="M32 15.5v3" />
        <g className="sa-hand"><path className="sa-g" d="M32 32V22" /></g>
        <circle className="sa-dot" cx="32" cy="32" r="2" />
      </>)}
      {i === 3 && (<>
        <rect className="sa-o" x="22" y="11" width="20" height="42" rx="6.5" pathLength={100} />
        <path className="sa-o" d="M29 16.5h6" pathLength={100} />
        <rect className="sa-o sa-btn" x="26" y="38" width="12" height="6" rx="3" pathLength={100} />
        <circle className="sa-dot" cx="32" cy="41" r="1.8" />
        <circle className="sa-ring" cx="32" cy="41" r="1.8" />
      </>)}
    </svg>
  );
}
const AUDIENCES = [
  { t: "game day", d: "M3 19V9c0-3 4-5 9-5s9 2 9 5v10M3 14c0 2 4 4 9 4s9-2 9-4" },
  { t: "front office", d: "M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16" },
  { t: "box office", d: "M3 9a2 2 0 0 0 0 4v3h18v-3a2 2 0 0 0 0-4V6H3zM13 6v10" },
  { t: "fan base", d: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c0-3 2.7-5 6-5s6 2 6 5M16 5.2a3 3 0 0 1 0 5.6M18 14.4c1.9.8 3 2.7 3 4.6" },
];
const Cnt = ({ to }: { to: number }) => <span className="en-n" style={{ ["--to" as string]: to }} />;
/* TODO(copy): each figure below needs a one-line attribution (which partner, what baseline) before launch:
   +18% revenue per order, <90s event changes, +12% mobile checkout conversion. Not in the repo, so not invented here. */
const STATS = [
  { n: <>+<Cnt to={18} />%</>, l: "Revenue per order", d: "From add-ons, packaging, and built-in upsells across partner organizations." },
  { n: <>−<Cnt to={40} />%</>, l: "Fewer pricing complaints", d: "After switching to all-in checkout where fans see the final total upfront." },
  { n: <>&lt;<Cnt to={90} />s</>, l: "Event changes go live instantly", d: "Update pricing or release seats, live on your site in under 90 seconds." },
  { n: <>+<Cnt to={12} />%</>, l: "Mobile checkout conversion", d: "Two-tap checkout with Apple Pay and Google Pay vs. traditional flows." },
];
const SWITCH = [
  { t: "A dedicated rep who knows your building", hl: "dedicated rep", d: "Not a help desk. Not a chatbot. A real person who knows your venue, your calendar, and your operations." },
  { t: "Launch in weeks, not months", hl: "weeks, not months", d: "Onboarding, migration, and your first on-sale, handled with a timeline built around your season." },
  { t: "All-in pricing fans trust", hl: "All-in pricing", d: "The price on the listing is the price at checkout. No surprise fees. Higher conversion. Fewer complaints." },
  { t: "Built for leagues, teams, and venues. Nothing else", hl: "leagues, teams, and venues", d: "Every product decision, every integration, every update is shaped by what organizations like yours actually need." },
];
const CASES = [
  { slug: "niagara-icedogs", org: "Niagara IceDogs · OHL", r: "90% faster season-ticket exchanges for staff and fans.", img: "/cases/icedogs.jpg", logo: "/cases/logos/icedogs.svg", b: 1 },
  { slug: "des-moines-buccaneers", org: "Des Moines Buccaneers · USHL", r: "Group sales reinvented with self-serve seat selection.", img: "/cases/buccaneers.jpg", logo: "/cases/logos/buccaneers.svg", b: 1 },
  { slug: "ogden-raptors", org: "Ogden Raptors · Pioneer League", r: "$75K+ in new revenue and 2x sponsor value.", img: "/cases/raptors.jpg", logo: "/cases/logos/raptors.svg", b: 1.02 },
  { slug: "nm-state", org: "NM State Athletics · Conference USA", r: "From paper tickets to fully digital entry across all athletics.", img: "/cases/nmstate.jpg", logo: "/cases/logos/nmstate.png", b: 1.18 },
];
const QUOTES = [
  { name: "Steven Tomlin", img: "/people/steven-tomlin.jpg", role: "Business Development & Ticket Sales · Niagara IceDogs", pre: "What used to take us 10–15 minutes per request now ", hl: "takes seconds", post: ". It’s saved our staff countless hours." },
  { name: "Eric Grundfast", img: "/people/eric-grundfast.jpg", role: "President · Des Moines Buccaneers", pre: "Each person can choose their own seat and pay individually. It’s ", hl: "removed a major friction point", post: " for fans and staff." },
  { name: "Trever Wilson", img: "/people/trever-wilson.jpg", role: "General Manager · Ogden Raptors", pre: "What really stood out was the fan data. It’s been key to ", hl: "closing larger sponsorships", post: "." },
  { name: "Joe Fields", img: "/people/joe-fields.jpg", role: "Director of Athletics · New Mexico State University", pre: "A ", hl: "transformational partnership", post: " that will set our athletics department on an upward trajectory like never before." },
];
/* number of lights in the chip's orbiting trail */
const TRAIL = 150;
const PT_TAGS = ["Migrate", "Onboard", "Launch"];
const PT_STEPS = ["We move you over", "We set your team up", "We go on sale together"];
const ENGINE = [
  { k: "01 · Ingest", t: "Drag in your data. We clean it", d: "No mapping wizard, no template. Drop in the export you already have and the dashboard populates as it processes." },
  { k: "02 · Diagnose", t: "See the revenue gap instantly", d: "That empty 27.5% is the gap, and it’s the first thing the engine targets." },
  { k: "03 · Recommend", t: "Which seats to move, and why", d: "The engine tells you the direction, the dollar amount, and the reason, so you can adjust with confidence instead of guessing." },
  { k: "04 · Protect", t: "Know who drives the revenue", d: "Now you know who to protect when you raise prices, and which games are worth pushing hardest on." },
];
const RECS = [
  { seg: "VIP Suite", chip: "Underpriced", why: "Below market vs. comparable demand", move: "+$191" },
  { seg: "Premium Floor", chip: "99% demand", why: "Near-capacity demand score", move: "+$64" },
  { seg: "Upper Bowl", chip: "Soft demand", why: "Drop to drive volume and fill empty seats", move: "−$12" },
];

const Arrow = () => (
  <svg aria-hidden viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

export default function ConceptLanding() {
  return (
    <div className={`n ${sans.className}`} style={{ ["--font-mono-n" as string]: mono.style.fontFamily }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <Intro />
      <CounterSync />
      <MotionGate />
      <Nav />

      {/* HERO */}
      <section className="n-hero">
        <div className="n-hero-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-bg.jpg" alt="" />
          <video className="n-video" autoPlay muted loop playsInline poster="/hero-bg.jpg" aria-hidden><source src="/hero-bg-640.mp4" type="video/mp4" media="(max-width: 760px)" /><source src="/hero-bg.mp4" type="video/mp4" /></video>
          <div className="n-hero-shade" />
          <div className="n-hero-body">
            <Reveal>
              <a href="/case-study/nm-state" className="n-chip">
                <span className="n-trail" aria-hidden style={{ ["--lag" as string]: `${((0.75 * 7.5) / TRAIL).toFixed(4)}s` }}>
                  {Array.from({ length: TRAIL }, (_, n) => TRAIL - 1 - n).map((k) => (
                    <i key={k} style={{ ["--k" as string]: k, ["--o" as string]: Math.pow(1 - k / TRAIL, 1.9).toFixed(3), ["--s" as string]: `${(7 - 5.4 * Math.pow(k / TRAIL, 0.85)).toFixed(2)}px`, ["--c" as string]: k < 5 ? "236,255,222" : "166,231,115" }} />
                  ))}
                </span>
                Now powering NM State Athletics <Arrow />
              </a>
              <h1 className="n-h1"><span>Build Bigger.</span><span>Block by Block.</span></h1></Reveal>
            <Reveal delay={120} className="n-hero-copy">
              <p>The ticketing platform that puts leagues, teams, and venues <b>in control of their revenue, their data, and their fans.</b></p>
              <div className="n-row">
                <Button href="/sell">Schedule a discovery call <Arrow /></Button>
                <Button href="#platform" variant="glass">See the platform</Button>
              </div>
            </Reveal>
          </div>
          <div className="n-stock"><i />NCAA Division I to professional baseball</div>
        </div>
      </section>

      {/* PARTNERS (cutout under the hero) */}
      <section id="partners" data-chapter="Partners" className="n-under">
        <div className="n-under-in" style={{ textAlign: "initial" }}>
          <Reveal><Testimonial1 /></Reveal>
        </div>
      </section>

      {/* VALUE */}
      <section data-chapter="Partnership" className="n-sec n-fb">
        <Reveal className="n-card n-pt">
          <TextReveal
            pill="A partner, not a platform"
            accent="You won’t take it alone."
            paras={[
              "Control over pricing, reporting, and fan relationships, built around your organization, not the platform. Technology matters. So does having a team that picks up the phone, understands the challenges, and helps solve them.",
              "Switching ticketing is a big step. You won’t take it alone.",
            ]}
          />
          <Process steps={PT_STEPS.map((t, i) => ({ k: PT_TAGS[i], t, d: DELIVER[i] }))} />
        </Reveal>
      </section>

      {/* FEATURES */}
      <section id="features" data-chapter="Platform" className="n-sec" style={{ paddingTop: 0 }}>
        <div className="n-wrap">
          <Reveal className="n-head">
            <h2 className="n-h2" id="platform">Everything you need to sell tickets and run events</h2>
            <p className="n-lede">Ticketing, box office, memberships, fan engagement, and revenue optimization in one platform.</p>
          </Reveal>
          <div className="n-bento">
            <Reveal className="n-card n-c4">
              <SeatMap />
              <p className="n-k" style={{ marginTop: 0 }}>Venue control</p>
              <h3>Interactive seat maps &amp; live inventory</h3>
              <p>Price and manage inventory by seat, row, or section. Update availability, holds, and pricing in real time across every sales channel.</p>
            </Reveal>
            <Reveal delay={80} className="n-card n-card-dark n-c2 n-r2">
              <AiViz />
              <p className="n-k">Dynamic pricing</p>
              <h3>AI-powered pricing based on real demand</h3>
              <p>Our AI analyzes historical sales and market demand to identify pricing opportunities across your inventory. No spreadsheets. No guesswork.</p>
              <Button href="#ai-engine" size="sm" className="n-pushbtn" style={{ marginTop: "auto", alignSelf: "flex-start" }}>See how the engine works <Arrow /></Button>
            </Reveal>
            <Reveal className="n-card n-c2"><p className="n-k">Fan CRM</p><h3>Know your fans</h3><p>Track attendance, purchasing behavior, and renewals in one place. Turn occasional buyers into long-term supporters.</p></Reveal>
            <Reveal delay={80} className="n-card n-c2"><p className="n-k">Fraud protection</p><h3>Bot and fraud protection</h3><p>CAPTCHA, rate limiting, and identity verification activate automatically during high-demand on-sales.</p></Reveal>
            <Reveal className="n-card n-c6">
              <div className="n-wide">
                <div><p className="n-k">Revenue retention</p><h3>Grow recurring revenue</h3><p>Season memberships, flex plans, group sales, payment plans, and invoicing managed in one platform.</p></div>
                <div className="n-ren rv" role="img" aria-label="Season membership with auto-renew on, a payment plan with 4 of 6 payments made, and a paid group invoice for 20 tickets">
                  <div className="rv-row">
                    <span className="rv-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 0 0 0 4v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a2 2 0 0 1 0-4V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" /><path d="M14 7v10" strokeDasharray="2 2.4" /></svg></span>
                    <div className="rv-t"><b>Season membership</b><small>2026–27 · Sec E · Row 9</small></div>
                    <span className="rv-tag"><svg className="rv-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>Auto-renew</span>
                  </div>
                  <div className="rv-plan">
                    <div className="rv-line"><b>Payment plan</b><span><em><span className="rv-sw"><span>4</span><span>5</span></span></em> of 6 paid</span></div>
                    <div className="rv-steps">
                      {["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                        <div key={m} className={`rv-st${i < 4 ? " on" : i === 4 ? " next" : ""}`} style={{ ["--i" as string]: i }}>
                          <i>{i < 5 && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}</i>
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rv-sum"><span><b className="rv-sw"><span>$960</span><span>$1,200</span></b> paid</span><span><b className="rv-sw"><span>$480</span><span>$240</span></b> remaining</span></div>
                    <div className="rv-next"><span className="rv-dot" /><span className="rv-sw"><span>Next: $240 on Nov 1, charged automatically</span><span>Nov 1 payment of $240 received automatically</span></span></div>
                  </div>
                  <div className="rv-row">
                    <span className="rv-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 12h6M10 16h6" /></svg></span>
                    <div className="rv-t"><b>Group invoice</b><small>#1482 · 20 tickets</small></div>
                    <span className="rv-tag rv-pay"><span className="rv-pend"><i />Pending</span><span className="rv-done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} /></svg>Paid</span></span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section id="results" data-chapter="Results" className="n-outsec">
        <Reveal className="n-card n-card-dark n-out">
          <div className="n-wrap n-wrap-flush">
            <div className="n-out-head">
              <div>
                <p className="n-k">Outcomes · Partner-reported metrics</p>
                <h2 className="n-h2" style={{ maxWidth: "18ch" }}>The results speak for themselves</h2>
              </div>
              <p className="n-out-note">Real results from real partners, measured across every on-sale, every game night, and every transaction.</p>
            </div>
            <div className="n-feat">
              <div className="n-fs" style={{ ["--i" as string]: 0 }}>
                <StatArt i={0} />
                <dd className="n-num">{STATS[0].n}</dd>
                <h3>{STATS[0].l}</h3>
                <p>{STATS[0].d}</p>
              </div>
              <dl className="n-stats">
                {STATS.slice(1).map((s, k) => (
                  <div key={s.l} className="n-stat" style={{ ["--i" as string]: k + 1 }}>
                    <StatArt i={k + 1} />
                    <div className="n-st-b"><dd className="n-num">{s.n}</dd><h3>{s.l}</h3><p>{s.d}</p></div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </section>

      {/* AI ENGINE */}
      <section id="ai-engine" data-chapter="AI engine" className="n-sec">
        <div className="n-wrap">
          <Reveal className="n-head">
            <p className="n-k">AI pricing engine</p>
            <h2 className="n-h2">Stop pricing tickets in a spreadsheet</h2>
            {/* TODO(copy): "15–30%" has no source on the page. Cite it, or label it as Blocktickets' own analysis, before launch. */}
            <p className="n-lede">Every seat that goes out the door unsold is revenue you priced wrong. Most teams leave 15–30% of revenue on the table every season. Drop in your existing ticket data and the engine cleans it, scores demand, and tells you exactly which seats to move, and why.</p>
          </Reveal>
          <Engine items={ENGINE} panels={[<Ingest key="1" />, <Diagnose key="2" />, <Recommend key="3" />, <Protect key="4" />]} />
          <Reveal className="n-cta-row">
            <div className="n-cta-copy"><b>Try it on your own numbers</b><span>Upload one season export, see your revenue gap in minutes.</span></div>
            <Button href="#demo">See it on your data <Arrow /></Button>
          </Reveal>
        </div>
      </section>

      {/* WHY SWITCH */}
      <section data-chapter="Why switch" className="n-sec" style={{ paddingTop: 0 }}>
        <div className="n-wrap n-sw">
          <Reveal>
            <h2 className="n-h2">Why organizations switch and why they stay</h2>
            <p className="n-lede" style={{ marginTop: 20, maxWidth: "34ch" }}>What we hear from every GM, venue operator, and ownership group we work with.</p>
          </Reveal>
          <ol className="n-sw-list">
            {SWITCH.map((s, i) => {
              const k = s.t.indexOf(s.hl);
              return (
                <Reveal as="li" key={s.t} delay={i * 60}>
                  <span className="n-mono">0{i + 1}</span>
                  <h3><span>{s.t.slice(0, k)}</span><b>{s.hl}</b><span>{s.t.slice(k + s.hl.length)}</span></h3>
                  <p>{s.d}</p>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* CASES */}
      <section id="previews" data-chapter="Stories" className="n-sec" style={{ paddingTop: 0 }}>
        <div className="n-wrap">
          <Reveal className="n-head">
            <h2 className="n-h2">Real results from real organizations</h2>
            <p className="n-lede">A few of the leagues, teams, and venues using blocktickets to grow revenue, save time, and simplify operations.</p>
          </Reveal>
          <Stories items={CASES} />
        </div>
      </section>

      {/* STATEMENT */}
      <section data-chapter="One platform" className="n-state">
        <div className="n-wrap">
          <Reveal>
            <h2 aria-label="Your game day, front office, box office, and fan base deserve a platform built for this.">
              Your <Rotator items={AUDIENCES} /> deserves a platform built for this.
            </h2>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section data-chapter="Voices" className="n-sec" style={{ paddingTop: 48 }}>
        <div className="n-wrap">
          <Quotes items={QUOTES} />
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="demo" data-chapter="Let’s talk" className="n-final">
        <CubesCta>
          <Reveal className="cb-copy">
            <h2>Ready to <span>build bigger?</span></h2>
            <p>Book a walkthrough and we’ll show you the entire platform.</p>
            <Button href="/sell">Schedule a discovery call <Arrow /></Button>
          </Reveal>
        </CubesCta>
      </section>

      <Footer />
    </div>
  );
}
