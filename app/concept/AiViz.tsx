/* "AI-powered pricing based on real demand", as one small story: three signals (sales pace, demand, a market benchmark) light up, send a pulse down their wires into the AI, the AI flares, and the Premium Floor price rolls up
   $32 -> $96 (+$64 per seat; figures from the pricing-engine section of this page). 6 second loop. Server
   component, no client JS. Motion stops under prefers-reduced-motion and the finished state shows. */

// three signals converge on the AI (viewBox 300 x 104); each carries a travelling dot
const WIRES = ["M50 0 C50 56 150 44 150 104", "M150 0 V104", "M250 0 C250 56 150 44 150 104"];
const SIGNALS = [
  { label: "Sold in 48h", value: "82%", icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  { label: "Demand", counter: true, value: "", icon: "M5 20v-8M12 20V5M19 20v-11" },
  { label: "Market", value: "Checked", icon: "M4 8h13l-3-3M20 16H7l3 3" },
];

// a decorative barcode for the ticket stub: [y, thickness] pairs, bars run across the stub
const BARS: [number, number][] = [[0, 3], [6, 1.5], [10, 4], [17, 1.5], [21, 2.5], [26, 5], [34, 1.5], [38, 3], [44, 1.5], [48, 4], [55, 2], [60, 1.5], [64, 5], [72, 2], [77, 1.5], [81, 3]];

const SPARKLE = "M12 2c.7 5.2 3.1 7.6 8.3 8.3.9.1.9 1.3 0 1.4-5.2.7-7.6 3.1-8.3 8.3-.1.9-1.3.9-1.4 0-.7-5.2-3.1-7.6-8.3-8.3-.9-.1-.9-1.3 0-1.4C7.5 9.6 9.9 7.2 10.6 2c.1-.9 1.3-.9 1.4 0Z";

export default function AiViz() {
  return (
    <div className="pv aiv" role="img" aria-label="Three signals, sales pace, demand and a market benchmark, feed an AI that raises the Premium Floor price by 64 dollars per seat">
      <div className="aiv-in" aria-hidden="true">
        <div className="aiv-head">
          <span className="aiv-title">
            <span className="aiv-logo"><svg viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg></span>
            AI pricing
          </span>
          <span className="aiv-status">
            <span className="aiv-s aiv-s1">Reading demand</span>
            <span className="aiv-s aiv-s2">Raising the price</span>
            <span className="aiv-s aiv-s3">Price updated</span>
          </span>
        </div>

        <div className="aiv-main">
          <div className="aiv-sig">
            {SIGNALS.map((g, k) => (
              <span key={g.label} className="aiv-s-c" style={{ ["--k" as string]: k }}>
                <i className="aiv-s-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={g.icon} /></svg></i>
                <em>{g.label}</em>
                <b>{g.counter ? <span className="aiv-dnum" /> : g.value}</b>
              </span>
            ))}
          </div>

          <svg className="aiv-wires" viewBox="0 0 300 104" aria-hidden="true">
            {WIRES.map((d, k) => <path key={k} className="aiv-w" d={d} style={{ ["--k" as string]: k }} />)}
            {WIRES.map((d, k) => <circle key={k} className="aiv-dot" r="2.6" style={{ offsetPath: `path("${d}")`, ["--k" as string]: k }} />)}
          </svg>

          <div className="aiv-orb">
            <span className="aiv-orb-core"><svg viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg></span>
          </div>
          <i className="aiv-down" />

          <div className="aiv-tw">
            <div className="aiv-ticket">
              <div className="aiv-tmain">
                <span className="aiv-trow">
                  <span className="aiv-tlabel">Premium Floor</span>
                  <span className="aiv-chip">+$64</span>
                </span>
                <span className="aiv-tprice">
                  <span className="aiv-money">$<span className="aiv-pnum" /></span>
                  <span className="aiv-per">per seat</span>
                </span>
              </div>
              <div className="aiv-stub">
                <span className="aiv-sa"><svg className="aiv-bar" viewBox="0 0 40 84" aria-hidden="true">{BARS.map(([y, h], i) => <rect key={i} x="0" y={y} width="40" height={h} />)}</svg></span>
              </div>
              <i className="aiv-work" />
            </div>
          </div>

          <span className="aiv-note">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d={SPARKLE} /></svg>
            Sold 82% in 48 hours, so the AI raised the price
          </span>
        </div>
      </div>
    </div>
  );
}
