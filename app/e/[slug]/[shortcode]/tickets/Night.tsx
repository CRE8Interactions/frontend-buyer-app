"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DeviceMobile, IdentificationBadge, MapPin, NavigationArrow, Tag, UsersThree } from "@phosphor-icons/react";
import Button from "@/components/atoms/Button";
import type { EventInfo } from "./event";
import { useNow } from "./useNow";
import Surface from "./Surface";

/* Game night: one stage instead of a row of boxes. The venue's own photograph fills it (with no photograph, the team colour and the sport's
   playing surface do), the venue is the headline, the doors-to-start route runs along the bottom as a bar with a puck that moves as the time does,
   and the things worth knowing are die-cut mini tickets pinned on the picture. On a phone the stage is short and the tickets become a swipeable row
   that overlaps its bottom edge. */

type Fact = { Icon: typeof Tag; title: string; text: string; tilt: number };

export default function Night({ info, live }: { info: EventInfo; live: boolean }) {
  const now = useNow(live);
  const still = !!useReducedMotion();
  const maps = `https://maps.google.com/?q=${encodeURIComponent(info.venue.maps)}`;

  const facts: Fact[] = useMemo(() => [
    { Icon: DeviceMobile, title: "Mobile tickets", text: "They land in your wallet and scan at the gate.", tilt: -1.6 },
    { Icon: Tag, title: info.fees ? "All-in prices" : "Fees at checkout", text: info.fees ? "Taxes and fees are in the price you see." : "You see the total before you pay.", tilt: 1.3 },
    { Icon: UsersThree, title: `Up to ${info.limit} an order`, text: "Seats you pick together stay together.", tilt: -1 },
    ...(info.age ? [{ Icon: IdentificationBadge, title: info.age, text: "Who can come to this one.", tilt: 1.5 }] : []),
  ], [info]);

  /* the route: doors, then the start; the puck sits where the clock is between them */
  const doors = info.doorsISO ? +new Date(info.doorsISO) : null;
  const start = +new Date(info.startISO);
  const p = doors === null || now === null ? 0 : Math.max(0, Math.min(1, (now - doors) / (start - doors || 1)));
  const until = (ms: number) => { const m = Math.max(1, Math.round(ms / 6e4)); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60; return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`; };
  const phase = now === null ? "" : now >= start ? "Underway" : doors !== null && now >= doors ? "Doors are open" : doors !== null ? `Doors open in ${until(doors - now)}` : "";

  return (
    <section className="nt" aria-labelledby="nt-h">
      <h2 className="ev-h2" id="nt-h">Game night<small>{info.day}, {info.date}</small></h2>

      <div className="nt-wrap">
        <div className="nt-stage">
          <div className="nt-bg" aria-hidden>
            {info.venue.photo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={info.venue.photo} alt="" loading="lazy" />
              : <><span className="nt-flat" /><Surface sport={info.sport} /></>}
            <span className="nt-scrim" />
          </div>

          <div className="nt-main">
            <div className="nt-head">
              <p className="nt-k">Where you&rsquo;re going</p>
              <h3 className="nt-name">{info.venue.name}</h3>
            </div>
            <div className="nt-body">
            <p className="nt-addr"><MapPin weight="bold" aria-hidden /><span>{info.venue.address || info.venue.line}{info.venue.capacity ? <em> · {info.venue.capacity.toLocaleString("en-US")} seats</em> : null}</span></p>
            <div className="nt-go"><Button href={maps} target="_blank" rel="noopener noreferrer" size="lg"><NavigationArrow weight="bold" aria-hidden />Get directions</Button></div>

            {doors !== null && info.doors ? (
              <div className="nt-route" role="group" aria-label="Game night schedule" style={{ ["--p" as string]: p } as React.CSSProperties}>
                <p><b>{info.doors}</b>Doors open</p>
                <span className="nt-track" aria-hidden />
                <p><b>{info.time}</b>{info.verb}</p>
                {phase ? <em className="nt-live">{phase}</em> : null}
              </div>
            ) : null}
            </div>
          </div>
        </div>

        <ul className="nt-tags" aria-label="Good to know">
          {facts.map(({ Icon, title, text, tilt }, i) => (
            <motion.li key={title} className="nt-tag"
              {...(still ? { style: { rotate: tilt } } : {
                initial: { opacity: 0, y: 28, rotate: 0 },
                whileInView: { opacity: 1, y: 0, rotate: tilt },
                whileHover: { y: -5, rotate: 0 },
                viewport: { once: true, amount: 0.25 },
                transition: { type: "spring", stiffness: 300, damping: 24, delay: i * 0.08 },
              })}>
              <span className="nt-ic" aria-hidden><Icon weight="bold" /></span>
              <span className="nt-tx"><b>{title}</b><small>{text}</small></span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
