/* Artwork for the AI engine showcase (Engine.tsx). Server components, CSS-only motion.
   Every figure comes from the original copy of this section. */

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
const N = ({ to, dec = false }: { to: number; dec?: boolean }) => (
  <span className={`en-n${dec ? " en-d" : ""}`} style={{ ["--to" as string]: to }} />
);
const Kpi = ({ v, l }: { v: React.ReactNode; l: string }) => (
  <div><span className="n-kv">{v}</span><span className="n-kl">{l}</span></div>
);

const ROWS: { c: string[]; bad?: "duplicate" | "malformed" }[] = [
  { c: ["Floor A", "4", "12", "$85", "Oct 3"] },
  { c: ["Floor A", "4", "12", "$85", "Oct 3"], bad: "duplicate" },
  { c: ["Floor B", "7", "3", "$92", "Oct 5"] },
  { c: ["Upper", "–", "7", "$–", "Oct 5"], bad: "malformed" },
  { c: ["Suite 2", "1", "6", "$240", "Oct 6"] },
  { c: ["Suite 2", "1", "6", "$240", "Oct 6"], bad: "duplicate" },
  { c: ["Floor C", "9", "14", "$78", "Oct 7"] },
  { c: ["Upper", "5", "–", "$–", "Oct 8"], bad: "malformed" },
  { c: ["Lower 4", "3", "21", "$64", "Oct 8"] },
];
export function Ingest() {
  const cols = ["Section", "Row", "Seat", "Price", "Date"];
  return (
    <div className="en-art a1">
      <div className="a1-drop">
        <div className="a1-file">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M10 13h6M10 17h4" /></svg>
          <div><b>season-export.csv</b><small>48,210 rows · 5 columns</small></div>
          <span className="a1-st"><span className="a1-st1"><i />Cleaning</span><span className="a1-st2"><Check />Clean</span></span>
          <i className="a1-pg" />
        </div>
      </div>
      <div className="a1-sheet">
        <div className="a1-r a1-h"><span />{cols.map((c, i) => <span key={c} className="a1-hk" style={{ ["--i" as string]: i }}>{c}</span>)}</div>
        {ROWS.map((r, i) => (
          <div key={i} className={`a1-r${r.bad ? " a1-bad" : ""}`} style={{ ["--d" as string]: `${0.5 + i * 0.2}s` }}>
            <span className="a1-ck">{!r.bad && <Check />}</span>
            {r.c.map((v, k) => (k === 4 && r.bad ? <span key={k} className="a1-flag">{r.bad}</span> : <span key={k}>{v}</span>))}
          </div>
        ))}
        <div className="a1-more">+ 48,205 more rows, cleaned the same way</div>
        <i className="a1-scan" />
      </div>
      {/* the same filled cards as the revenue panel: small colour square, big figure, name, one quiet line */}
      <div className="a1-x">
        {[
          { v: <><N to={998} dec />%</>, l: "Data quality", s: "duplicates and gaps flagged" },
          { v: "48,210", l: "Rows cleaned", s: "5 columns mapped" },
          { v: "1.4s", l: "First dashboard", s: "no setup wizard" },
        ].map((g, i) => (
          <div key={g.l} style={{ ["--i" as string]: i }}>
            <i />
            <b>{g.v}</b>
            <span>{g.l}</span>
            <small>{g.s}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

const OCC = [94, 61, 88, 48, 70, 55, 91, 67, 52, 78];
export function Diagnose() {
  return (
    <div className="en-art a2">
      <div className="a2-sum">
        <p className="a2-rev"><span>Season revenue</span><b>$42,000</b></p>
        <div className="a2-sbar"><i className="s" /><i className="e" /></div>
        <p className="a2-sl"><span><b><N to={725} dec />%</b> occupied</span><span className="bad"><b><N to={275} dec />%</b> going empty</span></p>
      </div>
      <div className="a2-games" role="img" aria-label="Occupancy by event: G1 94%, G2 61%, G3 88%, G4 48%, G5 70%, G6 55%, G7 91%, G8 67%, G9 52%, G10 78%">
        {OCC.map((h, i) => (
          <div key={i} className={`a2-g${h >= 85 ? " hot" : ""}${h < 55 ? " low" : ""}`} style={{ ["--h" as string]: `${h}%`, ["--i" as string]: i }}>
            <i />
            <span className="a2-gn">G{i + 1}</span>
            <b className="a2-gp">{h}%</b>
          </div>
        ))}
      </div>
      <p className="a2-lg"><span><i className="s" />Sold</span><span><i className="h" />Near sellout</span><span><i className="e" />Empty: revenue priced wrong</span></p>
    </div>
  );
}

const RECS = [
  { seg: "VIP Suite", chip: "Underpriced", why: "Below market vs. comparable demand", to: 191, up: true },
  { seg: "Premium Floor", chip: "99% demand", why: "Near-capacity demand score", to: 64, up: true },
  { seg: "Upper Bowl", chip: "Soft demand", why: "Drop to drive volume and fill seats", to: 12, up: false },
];
/* Diverging bars on one shared zero line: raises grow right, the cut grows left. Widths are
   proportional to the dollar move (191 = 76% of the track). */
export function Recommend() {
  return (
    <div className="en-art a3">
      <div className="a3-top"><span className="a3-dot" />Price move per seat<em>Demand-scored</em></div>
      <div className="a3-chart">
        {RECS.map((r, i) => (
          <div key={r.seg} className={`a3-row${r.up ? "" : " down"}`} style={{ ["--i" as string]: i }}>
            <div className="a3-h"><b>{r.seg}</b><span className="a3-chip">{r.chip}</span></div>
            <div className="a3-track">
              <span className="a3-bar" style={{ ["--w" as string]: `${(r.to / 191) * 74}%` }} />
              <b className="a3-v">{r.up ? "+" : "−"}$<N to={r.to} /></b>
            </div>
            <small>{r.why}</small>
          </div>
        ))}
      </div>
      <div className="a3-total"><span>Applying these moves across the season</span><b>+$<N to={114} dec />K</b></div>
    </div>
  );
}

/* One flow: the same two segments in the fan bar and in the revenue bar, joined by ribbons, so the
   13% slice visibly widens to 54%. "Everyone else" is the remainder of 100. */
const SEGS = [
  { k: "c", name: "Corporate buyers", fan: 13, rev: 54, x: "4.2×" },
  { k: "s", name: "Season ticket holders", fan: 9, rev: 23, x: "2.6×" },
  { k: "o", name: "Everyone else", fan: 78, rev: 23, x: "" },
];
export function Protect() {
  // one idea: a small group of fans brings in most of the revenue. Two donuts (share of fans, share of revenue),
  // the same three groups in each, so the green slice visibly grows from 13% to 54%.
  const donuts = [
    { label: "Share of fans", key: "fan" as const },
    { label: "Share of revenue", key: "rev" as const },
  ];
  return (
    <div className="en-art a4">
      <p className="a4-lead"><b>13% of your fans</b> bring in <b>54% of your revenue</b>. Protect them first when you raise prices.</p>
      <div className="a4-donuts">
        {donuts.map((d) => {
          let start = 0;
          return (
            <div key={d.key} className="a4-dn">
              <div className="a4-ring">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                  <circle className="t" cx="50" cy="50" r="38" />
                  {SEGS.map((g, i) => {
                    const o = start;
                    start += g[d.key];
                    return <circle key={g.k} className={`seg ${g.k}`} cx="50" cy="50" r="38" pathLength="100" style={{ ["--w" as string]: g[d.key], ["--o" as string]: o, ["--i" as string]: i }} />;
                  })}
                </svg>
                <div className="a4-mid"><b><N to={SEGS[0][d.key]} />%</b><span>Corporate</span></div>
              </div>
              <span className="a4-rl">{d.label}</span>
            </div>
          );
        })}
      </div>
      <ul className="a4-legend">
        {SEGS.map((g) => <li key={g.k} className={g.k}><i />{g.name}</li>)}
      </ul>
      {/* wide screens have the room: what each group is worth per fan, revenue share divided by fan share */}
      <div className="a4-x">
        {SEGS.map((g, i) => (
          <div key={g.k} className={g.k} style={{ ["--i" as string]: i }}>
            <i />
            <b>{(g.rev / g.fan).toFixed(1)}×</b>
            <span>{g.name}</span>
            <small>revenue per fan vs the average</small>
          </div>
        ))}
      </div>
    </div>
  );
}
