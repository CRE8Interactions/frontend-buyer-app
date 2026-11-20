/* The playing surface of the game, as line art: a rink, a court, a pitch, a field or a diamond. Every stroke is drawn on a normalised path
   (pathLength 1), so the page can draw it in once with a single dash animation (.ev-floor in styles.ts). It is decoration only, hidden from
   assistive technology; an event with no known sport shows none. */

const P = { pathLength: 1 } as const;

const ART: Record<string, { box: string; body: React.ReactNode }> = {
  Hockey: {
    box: "0 0 200 85",
    body: (
      <>
        <rect {...P} x="1" y="1" width="198" height="83" rx="28" />
        <line {...P} className="ev-hot" x1="100" y1="1" x2="100" y2="84" />
        <line {...P} x1="75" y1="1" x2="75" y2="84" />
        <line {...P} x1="125" y1="1" x2="125" y2="84" />
        <line {...P} x1="11" y1="5" x2="11" y2="80" />
        <line {...P} x1="189" y1="5" x2="189" y2="80" />
        <circle {...P} cx="100" cy="42.5" r="15" />
        <circle {...P} cx="36" cy="22" r="15" />
        <circle {...P} cx="36" cy="63" r="15" />
        <circle {...P} cx="164" cy="22" r="15" />
        <circle {...P} cx="164" cy="63" r="15" />
        <path {...P} d="M11 36.5h-7v12h7" />
        <path {...P} d="M189 36.5h7v12h-7" />
      </>
    ),
  },
  Basketball: {
    box: "0 0 94 50",
    body: (
      <>
        <rect {...P} x="1" y="1" width="92" height="48" />
        <line {...P} className="ev-hot" x1="47" y1="1" x2="47" y2="49" />
        <circle {...P} cx="47" cy="25" r="6" />
        <rect {...P} x="1" y="17" width="19" height="16" />
        <rect {...P} x="74" y="17" width="19" height="16" />
        <path {...P} d="M20 19a6 6 0 0 1 0 12" />
        <path {...P} d="M74 19a6 6 0 0 0 0 12" />
        <path {...P} d="M1 4.5h12.5a21 21 0 0 1 0 41H1" />
        <path {...P} d="M93 4.5H80.5a21 21 0 0 0 0 41H93" />
      </>
    ),
  },
  Football: {
    box: "0 0 120 53",
    body: (
      <>
        <rect {...P} x="1" y="1" width="118" height="51" />
        <line {...P} className="ev-hot" x1="60" y1="1" x2="60" y2="52" />
        {[16, 28, 40, 80, 92, 104].map((x) => <line {...P} key={x} x1={x} y1="1" x2={x} y2="52" />)}
        <circle {...P} cx="60" cy="26.5" r="5" />
        <line {...P} x1="11" y1="1" x2="11" y2="52" />
        <line {...P} x1="109" y1="1" x2="109" y2="52" />
      </>
    ),
  },
  Soccer: {
    box: "0 0 105 68",
    body: (
      <>
        <rect {...P} x="1" y="1" width="103" height="66" />
        <line {...P} className="ev-hot" x1="52.5" y1="1" x2="52.5" y2="67" />
        <circle {...P} cx="52.5" cy="34" r="9.2" />
        <rect {...P} x="1" y="14" width="16.5" height="40" />
        <rect {...P} x="87.5" y="14" width="16.5" height="40" />
        <rect {...P} x="1" y="24" width="5.5" height="20" />
        <rect {...P} x="98.5" y="24" width="5.5" height="20" />
        <path {...P} d="M17.5 27a9.2 9.2 0 0 1 0 14" />
        <path {...P} d="M87.5 27a9.2 9.2 0 0 0 0 14" />
      </>
    ),
  },
  Baseball: {
    box: "0 0 100 100",
    body: (
      <>
        <path {...P} d="M50 96 3 49A68 68 0 0 1 97 49z" />
        <path {...P} className="ev-hot" d="M50 80 24 54 50 28 76 54z" />
        <path {...P} d="M50 96 3 49" />
        <path {...P} d="M50 96 97 49" />
        <circle {...P} cx="50" cy="54" r="5" />
      </>
    ),
  },
};

export default function Surface({ sport }: { sport: string }) {
  const a = ART[sport];
  if (!a) return null;
  return (
    <div className="ev-floor" aria-hidden>
      <svg viewBox={a.box} preserveAspectRatio="xMidYMid meet">{a.body}</svg>
    </div>
  );
}
