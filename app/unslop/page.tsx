import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/organisms/Nav";
import SiteFooter from "@/components/organisms/SiteFooter";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageMetadata } from "@/lib/seo";
import { CSS } from "./styles";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = pageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: "/unslop",
  image: "/hero-bg.jpg",
  ogHeadline: "Sports-first ticketing for teams & venues",
  subtitle: "Sell more. Keep more. One platform.",
  cta: "Get Started",
});

const LOGOS = [
  { src: "/clients/icedogs.svg", alt: "Niagara IceDogs" },
  { src: "/clients/pjhl.png", alt: "Provincial Junior Hockey League" },
  { src: "/clients/nmstate.png", alt: "NM State Athletics" },
  { src: "/clients/buccaneers.svg", alt: "Des Moines Buccaneers" },
  { src: "/clients/houston-bulls.png", alt: "Houston Bulls" },
  { src: "/clients/raptors.svg", alt: "Ogden Raptors" },
  { src: "/clients/iowa-bulls.png", alt: "North Iowa Bulls" },
];

const DELIVER = [
  "Dedicated onboarding and migration support",
  "Direct access to experienced ticketing professionals",
  "Features built alongside leagues, teams, and venues",
];

const STATS = [
  { n: "+18%", l: "Revenue per order", d: "From add-ons, packaging, and built-in upsells across partner organizations." },
  { n: "−40%", l: "Fewer pricing complaints", d: "After switching to all-in checkout where fans see the final total upfront." },
  { n: "<90s", l: "Event changes go live instantly", d: "Update pricing or release seats, live on your site in under 90 seconds." },
  { n: "+12%", l: "Mobile checkout conversion", d: "Two-tap checkout with Apple Pay and Google Pay vs. traditional flows." },
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

const OCCUPANCY = [94, 61, 88, 48, 70, 55, 91, 67, 52, 78];
const RECS = [
  { seg: "VIP Suite", chip: "Underpriced", why: "Below market vs. comparable demand", move: "+$191" },
  { seg: "Premium Floor", chip: "99% demand", why: "Near-capacity demand score", move: "+$64" },
  { seg: "Upper Bowl", chip: "Soft demand", why: "Drop to drive volume and fill empty seats", move: "−$12" },
];

export default function UnslopLanding() {
  return (
    <div className="u" style={{ ["--font-mono" as string]: mono.style.fontFamily }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Nav variant="marketing" />

      {/* HERO */}
      <header className="u-hero">
        <div className="u-hero-bg" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-bg.jpg" alt="" />
          <video autoPlay muted loop playsInline poster="/hero-bg.jpg" className="u-video">
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="u-wrap u-hero-copy">
          <a href="/case-study/nm-state" className="u-news"><span>New</span> Now powering NM State Athletics <i aria-hidden>→</i></a>
          <h1 className="u-display">Build Bigger.<br /><em>Block by Block.</em></h1>
          <p className="u-lede">The ticketing platform that puts leagues, teams, and venues in control of their revenue, their data, and their fans.</p>
          <div className="u-actions">
            <a href="/sell" className="u-btn u-btn-primary">Schedule a discovery call</a>
            <a href="#platform" className="u-btn u-btn-quiet">See the platform</a>
          </div>
        </div>
        <div className="u-wrap u-hero-view">
          <BoxOffice />
        </div>
      </header>

      {/* PARTNERS */}
      <section id="partners" className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">Partners</p>
          <h2 className="u-h2"><b>Trusted across every level of the game.</b> From NCAA Division I athletics to 60-team league deployments, OHL and USHL clubs, and professional baseball organizations, blocktickets powers ticketing across North America.</h2>
          <ul className="u-logos">
            {LOGOS.map((l) => (
              <li key={l.alt}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={l.src} alt={l.alt} /></li>
            ))}
          </ul>
          <p className="u-tags">
            {["NCAA Division I", "63-Team League Deployment", "OHL & USHL Clubs", "Professional Baseball"].map((c) => <span key={c}>{c}</span>)}
          </p>
        </div>
      </section>

      {/* VALUE */}
      <section className="u-sec">
        <div className="u-wrap u-split">
          <div>
            <p className="u-meta">Principle</p>
            <h2 className="u-h2"><b>Your venue, your fans, your revenue.</b> Control over pricing, reporting, and fan relationships. Built around your organization, not the platform.</h2>
          </div>
          <div className="u-panel">
            <h3 className="u-h3">A partner, not a platform</h3>
            <p className="u-body">Technology matters. So does having a team that picks up the phone, understands the challenges, and helps solve them.</p>
            <ul className="u-checks">
              {DELIVER.map((d) => <li key={d}><i aria-hidden />{d}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">Platform</p>
          <h2 className="u-h2" id="platform"><b>Everything you need to sell tickets and run events.</b> Ticketing, box office, memberships, fan engagement, and revenue optimization in one platform.</h2>
          <div className="u-grid">
            <article className="u-card u-c4">
              <SeatsViz />
              <p className="u-meta">Venue control</p>
              <h3 className="u-h3">Interactive seat maps &amp; live inventory</h3>
              <p className="u-body">Price and manage inventory by seat, row, or section. Update availability, holds, and pricing in real time across every sales channel.</p>
            </article>
            <article className="u-card u-c2 u-r2">
              <p className="u-meta">Dynamic pricing</p>
              <h3 className="u-h3">AI-powered pricing based on real demand</h3>
              <p className="u-body">Our AI analyzes historical sales and market demand to identify pricing opportunities across your inventory. No spreadsheets. No guesswork.</p>
              <a href="#ai-engine" className="u-link">See how the engine works <i aria-hidden>→</i></a>
            </article>
            <article className="u-card u-c2">
              <p className="u-meta">Fan CRM</p>
              <h3 className="u-h3">Know your fans</h3>
              <p className="u-body">Track attendance, purchasing behavior, and renewals in one place. Turn occasional buyers into long-term supporters.</p>
            </article>
            <article className="u-card u-c2">
              <p className="u-meta">Zero fraud</p>
              <h3 className="u-h3">Your event is protected</h3>
              <p className="u-body">CAPTCHA, rate limiting, and identity verification activate automatically during high-demand on-sales.</p>
            </article>
            <article className="u-card u-c6 u-wide">
              <div>
                <p className="u-meta">Revenue retention</p>
                <h3 className="u-h3">Grow recurring revenue</h3>
                <p className="u-body">Season memberships, flex plans, group sales, payment plans, and invoicing managed in one platform.</p>
              </div>
              <RenewalPanel />
            </article>
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <section className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">Outcomes · Partner-reported metrics</p>
          <h2 className="u-h2"><b>The results speak for themselves.</b> Real results from real partners, measured across every on-sale, every game night, and every transaction.</h2>
          <dl className="u-stub">
            {STATS.map((s) => (
              <div key={s.l} className="u-stub-cell">
                <dd className="u-num">{s.n}</dd>
                <dt className="u-stat-l">{s.l}</dt>
                <dd className="u-stat-d">{s.d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* AI ENGINE */}
      <section id="ai-engine" className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">AI pricing engine</p>
          <h2 className="u-h2"><b>Stop pricing tickets in a spreadsheet.</b> Most teams leave 15–30% of revenue on the table every season. Drop in your existing ticket data and the engine cleans it, scores demand, and tells you exactly which seats to move, and why.</h2>

          <ol className="u-steps">
            <li className="u-step">
              <div className="u-step-t"><span className="u-meta">01 · Ingest</span><h3 className="u-h3">Drag in your data. We clean it</h3><p className="u-body">No mapping wizard, no template. Drop in the export you already have and the dashboard populates as it processes.</p></div>
              <div className="u-step-d">
                <div className="u-row"><span>Schema detected automatically · Data quality after cleaning</span><b className="u-mono">99.8%</b></div>
                <div className="u-bar"><i style={{ width: "99.8%" }} /></div>
                <div className="u-kpis">
                  <Kpi v="48,210" l="Rows ingested & cleaned" />
                  <Kpi v="5" l="Columns mapped automatically" />
                  <Kpi v="1.4s" l="Time to first dashboard" />
                </div>
                <ul className="u-ticks">
                  {["Columns mapped: section, row, seat, price, sale date", "Duplicate and malformed rows removed", "Dashboard updating in real time"].map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </li>

            <li className="u-step">
              <div className="u-step-t"><span className="u-meta">02 · Diagnose</span><h3 className="u-h3">See the revenue gap instantly</h3><p className="u-body">That empty 27.5% is the gap. Every seat that goes out the door unsold is revenue you priced wrong, and it’s the first thing the engine targets.</p></div>
              <div className="u-step-d">
                <div className="u-row"><span>Season overview · 10 events · Auto-generated</span></div>
                <div className="u-kpis">
                  <Kpi v="$42,000" l="Season revenue" />
                  <Kpi v="72.5%" l="Occupancy across events" />
                  <Kpi v="27.5%" l="Seats going empty" />
                </div>
                <div className="u-row u-mt"><span>Occupancy by event</span><span>3 events near sellout</span></div>
                <div className="u-chart" role="img" aria-label="Occupancy by event: G1 94%, G2 61%, G3 88%, G4 48%, G5 70%, G6 55%, G7 91%, G8 67%, G9 52%, G10 78%">
                  {OCCUPANCY.map((h, i) => (
                    <div key={i} className="u-col">
                      <span className="u-mono u-val">{h}%</span>
                      <i className={h >= 85 ? "hot" : ""} style={{ height: `${h}%` }} />
                      <span className="u-mono u-lab">G{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </li>

            <li className="u-step">
              <div className="u-step-t"><span className="u-meta">03 · Recommend</span><h3 className="u-h3">Which seats to move, and why</h3><p className="u-body">The engine tells you the direction, the dollar amount, and the reason, so you can adjust with confidence instead of guessing.</p></div>
              <div className="u-step-d">
                <div className="u-row"><span>Pricing recommendations · Demand-scored</span></div>
                <table className="u-table">
                  <thead><tr><th>Segment</th><th>Signal</th><th>Reason</th><th className="r">Per seat</th></tr></thead>
                  <tbody>
                    {RECS.map((r) => (
                      <tr key={r.seg}><td>{r.seg}</td><td className="u-mono">{r.chip}</td><td>{r.why}</td><td className="r u-mono">{r.move}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3}>Applying these moves across the season, before any manual review</td><td className="r u-mono u-total">+$11,400 projected</td></tr></tfoot>
                </table>
              </div>
            </li>

            <li className="u-step">
              <div className="u-step-t"><span className="u-meta">04 · Protect</span><h3 className="u-h3">Know who drives the revenue</h3><p className="u-body">Now you know who to protect when you raise prices, and which games are worth pushing hardest on.</p></div>
              <div className="u-step-d">
                <div className="u-row"><span>Who drives your revenue · Fan CRM</span></div>
                <Split label="Corporate buyers" fans={13} rev={54} />
                <Split label="Season ticket holders" fans={9} rev={23} />
                <p className="u-legend"><span><i className="a" />Share of fan base</span><span><i className="b" />Share of revenue</span></p>
                <div className="u-kpis">
                  <Kpi v="$8,400" l="Season ticket holder lifetime value" />
                  <Kpi v="40%" l="Of revenue from top 3 games" />
                  <Kpi v="Top 3" l="Events to prioritize for dynamic pricing" />
                </div>
              </div>
            </li>
          </ol>

          <div className="u-actions u-mt">
            <a href="#demo" className="u-btn u-btn-primary">See it on your data</a>
            <span className="u-note">Upload one season export, see your revenue gap in minutes.</span>
          </div>
        </div>
      </section>

      {/* WHY SWITCH */}
      <section className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">Why switch</p>
          <h2 className="u-h2"><b>Why organizations switch and why they stay.</b> What we hear from every GM, venue operator, and ownership group we work with.</h2>
          <ol className="u-list">
            {SWITCH.map((s, i) => {
              const k = s.t.indexOf(s.hl);
              return (
                <li key={s.t}>
                  <span className="u-mono u-idx">0{i + 1}</span>
                  <h3 className="u-h3">{s.t.slice(0, k)}<b>{s.hl}</b>{s.t.slice(k + s.hl.length)}</h3>
                  <p className="u-body">{s.d}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* CASES */}
      <section id="previews" className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">Featured stories</p>
          <h2 className="u-h2"><b>Real results from real organizations.</b> A few of the leagues, teams, and venues using Blocktickets to grow revenue, save time, and simplify operations.</h2>
          <div className="u-cases">
            {CASES.map((c) => (
              <a key={c.slug} href={`/case-study/${c.slug}`} className="u-case">
                <div className="u-case-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" style={{ filter: `brightness(${c.b})` }} className="bg" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo} alt="" className="lg" />
                </div>
                <h3 className="u-h3">{c.org}</h3>
                <p className="u-body">{c.r}</p>
                <span className="u-link">Read case study <i aria-hidden>→</i></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">One platform</p>
          <h2 className="u-display u-display-sm"><b>Your game day, front office, box office, and fan base</b> deserve a platform built for this.</h2>
          <p className="u-lede">From the first ticket sold to the last scan at the door, and every transfer and renewal in between.</p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="u-sec">
        <div className="u-wrap">
          <p className="u-meta">What our partners are saying</p>
          <div className="u-quotes">
            {QUOTES.map((q) => (
              <figure key={q.name} className="u-quote">
                <blockquote>“{q.pre}<b>{q.hl}</b>{q.post}”</blockquote>
                <figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.img} alt="" />
                  <span><b>{q.name}</b><small>{q.role}</small></span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="u-sec u-cta">
        <div className="u-wrap">
          <p className="u-meta">Get started</p>
          <h2 className="u-display u-display-sm"><b>Ready to build bigger?</b> Book a walkthrough and we’ll show you the entire platform.</h2>
          <div className="u-actions">
            <a href="/sell" className="u-btn u-btn-primary">Schedule a discovery call</a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Kpi({ v, l }: { v: string; l: string }) {
  return <div className="u-kpi"><span className="u-kv">{v}</span><span className="u-kl">{l}</span></div>;
}

function Split({ label, fans, rev }: { label: string; fans: number; rev: number }) {
  return (
    <div className="u-split-row">
      <div className="u-row"><span>{label}</span><b className="u-mono">{fans}% of fans → {rev}% of revenue</b></div>
      <div className="u-bar2"><i className="a" style={{ width: `${fans}%` }} /></div>
      <div className="u-bar2"><i className="b" style={{ width: `${rev}%` }} /></div>
    </div>
  );
}

/* Box office window: the product, shown as it runs on a game night */
function BoxOffice() {
  const rows = [
    { s: "Lower Bowl", sold: "1,480", cap: "1,560", pct: 95, p: "$44.00" },
    { s: "Club Level", sold: "410", cap: "450", pct: 91, p: "$62.00" },
    { s: "Upper Bowl", sold: "1,260", cap: "1,640", pct: 77, p: "$28.00" },
    { s: "Suites & Premium", sold: "332", cap: "450", pct: 74, p: "$78.00" },
  ];
  return (
    <div className="u-win" role="img" aria-label="Box office dashboard for Saturday's game: $151,716 gross, 3,482 of 4,100 tickets sold">
      <div className="u-win-bar">
        <span className="u-mono">Box office</span>
        <span className="u-win-title">Saturday 7:05 PM · IceDogs vs. Generals</span>
        <span className="u-live"><i />On sale</span>
      </div>
      <div className="u-win-body">
        <div className="u-win-kpis">
          <Kpi v="$151,716" l="Gross · +9% vs last Saturday" />
          <Kpi v="3,482" l="Tickets sold of 4,100" />
          <Kpi v="$43.57" l="Average price" />
          <Kpi v="71%" l="Mobile checkout share" />
        </div>
        <table className="u-table u-table-sm">
          <thead><tr><th>Section</th><th className="r">Sold</th><th className="r">Capacity</th><th>Fill</th><th className="r">Price</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s}>
                <td>{r.s}</td><td className="r u-mono">{r.sold}</td><td className="r u-mono">{r.cap}</td>
                <td><span className="u-fill"><i style={{ width: `${r.pct}%` }} /></span><span className="u-mono u-pct">{r.pct}%</span></td>
                <td className="r u-mono">{r.p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeatsViz() {
  const taken = new Set([3, 4, 15, 16, 17, 28, 40, 41, 52, 53, 54, 66, 67, 75]);
  const chosen = new Set([30, 31, 32]);
  return (
    <div className="u-seats" role="img" aria-label="Seat map with three adjacent seats selected">
      {Array.from({ length: 84 }, (_, i) => <i key={i} className={chosen.has(i) ? "sel" : taken.has(i) ? "tk" : ""} />)}
    </div>
  );
}

function RenewalPanel() {
  return (
    <div className="u-ren">
      <div className="u-row"><div><b>Season membership</b><small>2026–27 · Sec E · Row 9</small></div><span className="u-mono">Auto-renew on</span></div>
      <div className="u-row u-mt"><b>Payment plan</b><span className="u-mono"><b>4 of 6</b> payments</span></div>
      <div className="u-bar"><i style={{ width: "66.7%" }} /></div>
      <div className="u-row u-mt"><div><b>Group invoice</b><small>#1482 · 20 tickets</small></div><span className="u-mono">Paid</span></div>
    </div>
  );
}
