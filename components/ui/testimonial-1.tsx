"use client";

import { useState, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { ArrowUp } from "@phosphor-icons/react";

interface Partner {
  logo: string;
  /** Plain name, used for alt text. */
  alt: string;
  /** Name shown on hover; broken with <br /> so it always fits. */
  name: ReactNode;
  /** Extra revenue shown on hover (placeholder values for now). */
  figure?: string;
  label?: string;
}

/* Blocktickets partners: original logos. NOTE: every revenue figure below is a PLACEHOLDER (random
   numbers, except where a case study states one: Ogden Raptors). Replace with real numbers before launch. */
const partners: Partner[] = [
  { logo: "/clients/icedogs.svg", alt: "Niagara IceDogs", name: <>Niagara<br />IceDogs</>, figure: "$48K+", label: "in new revenue" },
  { logo: "/clients/pjhl.png", alt: "Provincial Junior Hockey League", name: <>Provincial<br />Junior Hockey<br />League</>, figure: "$62K+", label: "in new revenue" },
  { logo: "/clients/nmstate.png", alt: "NM State Athletics", name: <>NM State<br />Athletics</>, figure: "$120K+", label: "in new revenue" },
  { logo: "/clients/buccaneers.svg", alt: "Des Moines Buccaneers", name: <>Des Moines<br />Buccaneers</>, figure: "$54K+", label: "in new revenue" },
  { logo: "/clients/houston-bulls.png", alt: "Houston Bulls", name: <>Houston<br />Bulls</>, figure: "$38K+", label: "in new revenue" },
  { logo: "/clients/raptors.svg", alt: "Ogden Raptors", name: <>Ogden<br />Raptors</>, figure: "$75K+", label: "in new revenue" },
  { logo: "/clients/iowa-bulls.png", alt: "North Iowa Bulls", name: <>North Iowa<br />Bulls</>, figure: "$41K+", label: "in new revenue" },
];

const tags = ["NCAA Division I", "60-Team League Deployment", "OHL & USHL Clubs", "Professional Baseball"];

/* Hover card reveal. The card is portaled to <body>, so these rules are global.
   Radix sets data-state (delayed-open / instant-open / closed) and data-side. */
const CARD_CSS = `
@keyframes pt-in{from{opacity:0;transform:translateY(-10px) scale(.95)}to{opacity:1;transform:none}}
@keyframes pt-in-top{from{opacity:0;transform:translateY(10px) scale(.95)}to{opacity:1;transform:none}}
@keyframes pt-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-6px) scale(.97)}}
@keyframes pt-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.pt-card{transform-origin:var(--radix-tooltip-content-transform-origin);will-change:transform,opacity}
.pt-card[data-state$="open"][data-side="bottom"]{animation:pt-in .32s cubic-bezier(.22,1,.36,1)}
.pt-card[data-state$="open"][data-side="top"]{animation:pt-in-top .32s cubic-bezier(.22,1,.36,1)}
.pt-card[data-state="closed"]{animation:pt-out .16s ease-in forwards}
.pt-card[data-state$="open"]>*{animation:pt-rise .45s cubic-bezier(.22,1,.36,1) both}
.pt-card>:nth-child(1){animation-delay:50ms}
.pt-card>:nth-child(2){animation-delay:100ms}
.pt-card>:nth-child(3){animation-delay:170ms}
@media (prefers-reduced-motion:reduce){.pt-card,.pt-card>*{animation:none!important}}
@keyframes pt-scroll{to{transform:translateX(-50%)}}
.pt-marquee{display:flex;width:max-content;animation:pt-scroll 32s linear infinite;will-change:transform}
.pt-marquee[data-paused="true"]{animation-play-state:paused}
.pt-fade{-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
@media (prefers-reduced-motion:reduce){.pt-marquee{animation:none}.pt-scrollbox{overflow-x:auto}}
`;

/* Round photo in the heading. Hover or focus opens a quote card. The card is rendered in a
   portal at the end of <body>, so it sits above everything (nav, other avatars, text). */
function PersonTip({
  src, name, role, quote, sizeClass,
}: { src: string; name: string; role: string; quote: string; sizeClass: string }) {
  return (
    <TooltipProvider delayDuration={80} skipDelayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            tabIndex={0}
            aria-label={`${name}, ${role}`}
            className="inline-block mx-2 align-middle relative outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-full"
          >
            <div className={`relative overflow-hidden origin-center transition-all duration-300 rounded-full border-2 border-white ${sizeClass}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={src} alt={name} className="object-cover w-full h-full" style={{ objectPosition: "center 20%" }} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent
            side="bottom"
            align="center"
            sideOffset={14}
            collisionPadding={16}
            avoidCollisions
            className="pt-card z-[200] w-[min(400px,calc(100vw-32px))] rounded-2xl bg-white p-5 sm:p-6 text-left text-neutral-900 shadow-[0_28px_64px_-14px_rgba(10,10,10,.32),0_6px_18px_rgba(10,10,10,.1)] ring-1 ring-black/5"
          >
            <span aria-hidden className="block h-10 select-none font-serif text-[104px] leading-[1] text-neutral-300">“</span>
            <p className="mt-2 text-[17px] sm:text-lg font-medium leading-normal tracking-normal">{quote}</p>
            <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-11 w-11 rounded-full object-cover" style={{ objectPosition: "center 20%" }} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug">{name}</p>
                <p className="mt-0.5 text-sm leading-snug text-neutral-500">{role}</p>
              </div>
            </div>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Testimonial1() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="bg-transparent w-full flex flex-col items-center justify-center py-4 sm:py-10 lg:py-16 px-4 md:px-6 lg:px-8 relative">
      <style dangerouslySetInnerHTML={{ __html: CARD_CSS }} />
      <div className="w-full max-w-6xl mx-auto">
        {/* Community Badge */}
        <p className="mb-3 text-center text-[14px] font-medium leading-[1.4] text-[var(--ink2)]">Our partners</p>

        {/* Main Heading with Images */}
        <div className="text-center max-w-screen-xl mx-auto relative text-[var(--ink)]">
          <h2 className="text-[clamp(38px,4.2vw,56px)] font-semibold leading-[1.1] tracking-[-0.03em]">
            Trusted across <br className="sm:hidden" />
            <PersonTip
              src="/people/joe-fields.jpg"
              name="Joe Fields"
              role="Director of Athletics · New Mexico State University"
              quote="A transformational partnership that will set our athletics department on an upward trajectory like never before."
              sizeClass="w-[52px] h-[52px] sm:w-14 sm:h-14 lg:w-16 lg:h-16 md:hover:w-24 lg:hover:w-32"
            />
            every level
            <br />
            of
            <PersonTip
              src="/people/eric-grundfast.jpg"
              name="Eric Grundfast"
              role="President · Des Moines Buccaneers"
              quote="Each person can choose their own seat and pay individually. It’s removed a major friction point for fans and staff."
              sizeClass="w-[52px] h-[52px] sm:w-14 sm:h-14 lg:w-16 lg:h-16 md:hover:w-24 lg:hover:w-32"
            />
            the game
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-[var(--ink2)] [text-wrap:pretty]">
            From NCAA Division I athletics to 60-team league deployments, OHL and USHL clubs, and professional baseball organizations, blocktickets powers ticketing across North America.
          </p>
        </div>
      </div>

      {/* The logo strip is wider than the text column. */}
      <div className="w-full max-w-[1500px] mx-auto">
        {/* Below lg: the same logos as one endless row moving right to left, full width. Touching it pauses it, letting go resumes. */}
        <div className="lg:hidden relative left-1/2 w-screen -translate-x-1/2 mt-7 py-3 bg-transparent">
          <div className="pt-scrollbox pt-fade overflow-hidden">
            <div
              className="pt-marquee"
              data-paused={paused}
              onPointerDown={() => setPaused(true)}
              onPointerUp={() => setPaused(false)}
              onPointerCancel={() => setPaused(false)}
              onPointerLeave={() => setPaused(false)}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 ? true : undefined}>
                  {partners.map((p) => (
                    <div key={p.alt} className="flex w-[168px] sm:w-[200px] shrink-0 items-center justify-center px-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img loading="lazy" decoding="async" src={p.logo} alt={copy === 0 ? p.alt : ""} draggable={false} className="h-14 sm:h-16 w-full object-contain [filter:var(--logo-img-filter)] select-none" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* From lg up: one row of logos. Hover or focus shows the name and figure. */}
        <div className="hidden lg:flex flex-wrap justify-center gap-x-4 gap-y-6 lg:flex-nowrap lg:gap-6 bg-[var(--plate)] mt-10 w-full mx-auto px-4 sm:px-6 py-7 border rounded-md border-[var(--plate-line)]">
          {partners.map((p, index) => (
            <div
              key={p.alt}
              tabIndex={0}
              className="group relative basis-[calc(50%-0.5rem)] sm:basis-[calc(33.333%-0.667rem)] lg:basis-0 lg:flex-1 min-h-[96px] sm:min-h-[112px] outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-xl bg-[var(--logo-tile)] px-2"
            >
              {index !== 0 && (
                <div className="hidden lg:block w-0.5 h-12 border border-dashed border-[var(--plate-line)] absolute -left-3 top-1/2 -translate-y-1/2" />
              )}
              <div className="relative h-full w-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.logo}
                  alt={p.alt}
                  className="w-full h-16 sm:h-20 lg:h-[72px] object-contain [filter:var(--logo-img-filter)] mx-auto translate-y-0 group-hover:-translate-y-8 group-focus:-translate-y-8 opacity-100 group-hover:opacity-0 group-focus:opacity-0 transition-all duration-300 ease-out"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 translate-y-3 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100 transition-all duration-300 ease-out pointer-events-none">
                  <div className="w-40 shrink-0 text-center">
                    <p className="text-[15px] sm:text-base font-semibold leading-snug tracking-normal text-[var(--plate-ink)]">{p.name}</p>
                    {p.figure && (
                      <div className="mt-2.5 border-t border-[var(--tile-line)] pt-2">
                        <span className="inline-flex items-center justify-center gap-1 text-xl font-semibold leading-tight text-[var(--plate-ink)]">
                          <ArrowUp className="w-4 h-4 text-green-600" aria-hidden />
                          {p.figure}
                        </span>
                        <span className="mt-1 block text-[13px] sm:text-sm font-medium leading-snug text-[var(--plate-ink2)]">{p.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 lg:mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-[var(--ink2)]">
          {tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
      </div>
    </div>
  );
}
