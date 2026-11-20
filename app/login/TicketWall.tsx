/* What waits behind the login: real upcoming games from the storefront (Ogden Raptors, New Mexico State), as ticket stubs drifting past in rows.
   Hand-drawn on purpose (the page's own background, not the library's TicketStrip). Static, no requests, no images: the dates are baked in so the wall renders with the page. */
const GAMES = [
  { dow: "Tue", d: "28", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Wed", d: "29", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Thu", d: "30", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Fri", d: "31", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Sat", d: "1", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Sun", d: "2", t: "Ogden Raptors vs. Long Beach Coast", v: "Lindquist Field" },
  { dow: "Thu", d: "6", t: "New Mexico State Soccer vs. Grand Canyon", v: "NMSU Soccer Field" },
];
const ROWS = 5;

export default function TicketWall() {
  return (
    <div className="lg-wall" aria-hidden inert>
      <div className="lg-tilt">
        {Array.from({ length: ROWS }, (_, r) => {
          const list = [...GAMES.slice((r * 3) % GAMES.length), ...GAMES.slice(0, (r * 3) % GAMES.length)];
          return (
            <div key={r} className="lg-row" style={{ ["--dir" as string]: r % 2 ? 1 : -1, ["--dur" as string]: `${70 + r * 9}s`, ["--off" as string]: `-${(r % 2 ? 0.5 : 0.1) / GAMES.length * (70 + r * 9)}s` }}>
              {[0, 1].map((k) => (
                <div key={k} className="lg-track">
                  {list.map((g, i) => (
                    <div key={i} className="lg-stub">
                      <span className="lg-date"><i>{g.dow}</i><b>{g.d}</b></span>
                      <span className="lg-info"><strong>{g.t}</strong><small>{g.v}</small></span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
