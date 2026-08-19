import type { ReactNode } from "react";

/**
 * PageHero — the shared hero system (DESIGN-SYSTEM.md §5): photo + 4-layer
 * stack, in order — navy wash, navy radial under the text, top/bottom fade
 * that melts the nav in and dissolves into the page. No green tint, no
 * border-b; the fade is the transition. Each page brings its own photo.
 */
export default function PageHero({
  id,
  img,
  /** Optional background video (e.g. "/hero-bg.mp4"). Autoplays muted/looped; `img` is the poster. */
  video,
  imgPosition = "center",
  /** Navy wash opacity — 0.38 default, ≈0.34 when the photo is content. */
  wash = 0.38,
  /** Radial shape, e.g. "ellipse 85% 68% at 50% 46%" — center it under the text. */
  radial,
  radialOpacity = 0.42,
  fadeMid = "52%",
  fadeEnd = "92%",
  className = "flex min-h-[calc(100svh-70px)] items-center overflow-hidden",
  children,
}: {
  id?: string;
  img: string;
  video?: string;
  imgPosition?: string;
  wash?: number;
  radial: string;
  radialOpacity?: number;
  fadeMid?: string;
  fadeEnd?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <header id={id} className={`relative ${className}`}>
      <div className="absolute inset-0 -z-10">
        {video ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={img}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: imgPosition }}
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: imgPosition }} />
        )}
        <div className="absolute inset-0" style={{ background: `rgba(5,27,53,${wash})` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(${radial}, rgba(5,27,53,${radialOpacity}), transparent 72%)` }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, #051B35 0%, transparent 26%, transparent ${fadeMid}, #051B35 ${fadeEnd})` }} />
      </div>
      {children}
    </header>
  );
}
