/**
 * LogoMarquee — full-bleed, auto-scrolling strip of client logos. Logos only
 * (no names), each on a clean light chip so every mark stays legible on the
 * dark background regardless of its own colors. Pauses on hover, edge-faded,
 * honors prefers-reduced-motion. Self-contained CSS (no global dependency).
 */

const LOGOS = [
  { src: "/clients/icedogs.svg", alt: "Niagara IceDogs" },
  { src: "/clients/pjhl.png", alt: "Provincial Junior Hockey League" },
  { src: "/clients/nmstate.png", alt: "NM State Athletics" },
  { src: "/clients/buccaneers.svg", alt: "Des Moines Buccaneers" },
  { src: "/clients/houston-bulls.png", alt: "Houston Bulls" },
  { src: "/clients/raptors.svg", alt: "Ogden Raptors" },
  { src: "/clients/iowa-bulls.png", alt: "North Iowa Bulls" },
];

const CSS = `
@keyframes bt-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.bt-marquee-track { animation: bt-marquee 38s linear infinite; }
.bt-marquee-track:hover { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .bt-marquee-track { animation: none; } }
`;

export default function LogoMarquee() {
  const row = [...LOGOS, ...LOGOS];
  return (
    <div className="relative mx-auto max-w-[1180px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bt-marquee-track flex w-max items-center gap-4 sm:gap-5">
        {row.map((l, i) => (
          <div
            key={i}
            className="flex h-[100px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white px-10 shadow-lg shadow-black/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.src} alt={l.alt} className="h-14 w-auto max-w-[190px] object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}
