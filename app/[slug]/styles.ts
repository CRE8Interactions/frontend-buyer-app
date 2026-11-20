/* Team storefront (/nm-state): gameday. A face-off stage split on the diagonal like a matchup poster, a ticker,
   the schedule as ticket stubs, season seats as lanyard passes and flex packs as fanned voucher stacks.
   Page colours come from the shared tokens (paper, ink, green). --t is the team's own colour and --o the
   opponent's: third-party brand colours, not Blocktickets tokens. */
import { TICKET_STRIP_CSS } from "@/components/organisms/ticket-strip-styles";
import { PACK_CARDS_CSS } from "@/components/organisms/pack-cards-styles";

export const TM_CSS = `
/* The page wrapper sets --t (the team colour), --on-t (text on it) and --photo from app/[slug]/teams.ts; the values here are fallbacks.
   --t2 (the lighter accent) is derived from --t. */
.tm{--t2:color-mix(in oklab,var(--t) 74%,var(--on-photo));--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.tm a,.tm button{touch-action:manipulation}
.tm ::selection{background:color-mix(in srgb,var(--t2) 40%,transparent)}
.tm-main{padding:0 0 72px}
.tm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* the stage */
.tm-hero-wrap{--peek:clamp(96px,14svh,140px);padding:8px 8px 0;height:calc(100svh - var(--peek));min-height:580px}
.tm-hero{position:relative;height:100%;overflow:hidden;border-radius:28px;color:var(--on-photo);background:var(--photo-bg);isolation:isolate;touch-action:pan-y;--mx:0;--my:0;--c:0;--s:calc(var(--mx) * 5%)}
@media(min-width:960px){.tm-hero{border-radius:36px}}
.tm-bg{position:absolute;inset:0;z-index:-1}
.tm-bg>span{position:absolute;inset:0}
.tm-photo{background:var(--photo,none) var(--photo-pos,50% 50%)/cover;transform:scale(1.06);animation:tm-ken 24s ease-in-out infinite alternate;filter:saturate(.7) contrast(1.05)}
/* the venue's own picture behind each game, fading in as the stage turns to that game */
.tm-vph{background:center/cover;transform:scale(1.06);animation:tm-ken 24s ease-in-out infinite alternate;filter:saturate(.7) contrast(1.05);opacity:0;transition:opacity 1s var(--out)}
.tm-vph[data-on="1"]{opacity:1}
@keyframes tm-ken{to{transform:scale(1.14) translate(-1.2%,-1%)}}
/* the poster split: home colour on the left, the opponent's on the right, the stadium showing through both */
.tm-a{background:linear-gradient(160deg,color-mix(in srgb,var(--t) 88%,transparent),color-mix(in srgb,var(--t) 62%,var(--shade) 20%));clip-path:polygon(0 0,calc(58% + var(--s)) 0,calc(42% + var(--s)) 100%,0 100%);mix-blend-mode:hard-light}
.tm-b{background:linear-gradient(200deg,color-mix(in srgb,var(--o) 82%,transparent),color-mix(in srgb,var(--o) 50%,var(--shade) 30%));clip-path:polygon(calc(58% + var(--s)) 0,100% 0,100% 100%,calc(42% + var(--s)) 100%);mix-blend-mode:hard-light;opacity:0;transition:opacity 1s var(--out)}
.tm-b[data-on="1"]{opacity:1}
.tm-slash{background:linear-gradient(var(--photo-bg),var(--photo-bg));clip-path:polygon(calc(57.4% + var(--s)) 0,calc(58.6% + var(--s)) 0,calc(42.6% + var(--s)) 100%,calc(41.4% + var(--s)) 100%)}
.tm-scrim{background:linear-gradient(0deg,color-mix(in srgb,var(--shade) 90%,transparent) 0,color-mix(in srgb,var(--shade) 62%,transparent) 30%,color-mix(in srgb,var(--shade) 12%,transparent) 58%,transparent 72%),linear-gradient(180deg,color-mix(in srgb,var(--shade) 50%,transparent),transparent 22%)}
.tm-grain{opacity:.1;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E")}

/* the crests drift apart as the pointer moves, like two layers of a poster */
.tm-crests{position:absolute;inset:0;pointer-events:none}
/* a soft spot of shade over the crests, under the text: where a card reaches down onto the headline it dims slightly, so it stops competing with the type */
.tm-crests::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 52% 26% at 26% 64%,color-mix(in srgb,var(--photo-bg) 38%,transparent),transparent 72%)}
.tm-cr{--cw:clamp(116px,min(21vw,30svh),320px);position:absolute;top:max(28%,calc(96px + clamp(116px,min(21vw,30svh),320px) / 2));width:var(--cw);translate:-50% -50%}
/* the top is floored so a square crest on a short stage keeps clear of the floating nav */
/* the crest artwork is a jersey-backed card, so each one is set down like a trading card, tilted toward the other */
.tm-cr img{display:block;width:100%;height:auto;background:var(--on-photo);border-radius:clamp(12px,1.6vw,24px);box-shadow:0 0 0 clamp(3px,.4vw,6px) var(--on-photo),0 24px 50px color-mix(in srgb,var(--shade) 55%,transparent)}

/* a contest: the cards follow the pointer, lunge at each other as it nears the middle, and the side it is on grows while the other gives ground */
.tm-home{left:36%;transform:translate(calc(var(--mx) * 28px + var(--c) * 3.6vw),calc(var(--my) * 16px)) rotate(calc(-7deg + var(--c) * 10deg)) scale(calc(1 - var(--mx) * .09))}
.tm-away{left:69%;transform:translate(calc(var(--mx) * 28px - var(--c) * 3.6vw),calc(var(--my) * -16px)) rotate(calc(7deg - var(--c) * 10deg)) scale(calc(1 + var(--mx) * .09))}
.tm-away img{animation:tm-in .9s var(--land) backwards,tm-spar-b 2.4s ease-in-out .9s infinite alternate}
.tm-away .tm-mono{animation:tm-in .9s var(--land) backwards,tm-spar-b 2.4s ease-in-out .9s infinite alternate}
.tm-cr .tm-mono{display:grid;place-items:center;width:100%;aspect-ratio:1;border-radius:clamp(12px,1.6vw,24px);background:linear-gradient(160deg,var(--o,var(--ink3)),color-mix(in srgb,var(--o,var(--ink3)) 55%,var(--shade)));color:var(--on-photo);font-size:clamp(34px,6vw,92px);font-weight:600;letter-spacing:-.05em;box-shadow:0 0 0 clamp(3px,.4vw,6px) var(--on-photo),0 24px 50px color-mix(in srgb,var(--shade) 55%,transparent)}
/* a show or pass has one crest, set down in the middle */
.tm-solo{left:52.5%;transform:translate(calc(var(--mx) * 16px),calc(var(--my) * 10px)) rotate(-4deg)}
.tm-solo img{animation:tm-in .9s var(--land) backwards}
@keyframes tm-in{from{opacity:0;transform:translateX(70px) rotate(6deg) scale(.86)}}
.tm-home img{animation:tm-in2 .9s var(--land) backwards,tm-spar-a 2.4s ease-in-out .9s infinite alternate}
/* squaring up: with no pointer about, the two keep feinting at each other */
@keyframes tm-spar-a{to{transform:translateX(12px) rotate(2.5deg)}}
@keyframes tm-spar-b{to{transform:translateX(-12px) rotate(-2.5deg)}}
@keyframes tm-in2{from{opacity:0;transform:translateX(-70px) rotate(-6deg) scale(.86)}}
.tm-vs{position:absolute;left:calc(52.5% + var(--s));top:max(28%,calc(96px + clamp(116px,min(21vw,30svh),320px) / 2));translate:-50% -50%;scale:calc(1 + var(--c) * .18);z-index:1;display:grid;place-items:center;width:clamp(44px,5.4vw,76px);aspect-ratio:1;border-radius:50%;background:var(--photo-bg);box-shadow:0 0 0 2px color-mix(in srgb,var(--on-photo) 90%,transparent),0 10px 30px color-mix(in srgb,var(--shade) 50%,transparent);font-size:clamp(14px,1.7vw,24px);font-weight:700;letter-spacing:-.02em}
/* phones: a short stage would put 28% on the team id, so the crests sit just below it */
@media(max-width:599px){.tm-cr,.tm-vs{top:max(28%,calc(148px + clamp(116px,min(21vw,30svh),320px) / 2))}}
/* tablets: no room below the id without hitting the headline, so the crests shrink a little and step right, past a long team name */
@media(min-width:600px) and (max-width:959px){.tm-cr{--cw:clamp(116px,min(21vw,24svh),320px)}.tm-home{left:47%}.tm-vs{left:calc(61% + var(--s))}.tm-away{left:75%}}

.tm-id{position:absolute;left:clamp(18px,3.6vw,60px);top:84px;z-index:2;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:color-mix(in srgb,var(--on-photo) 92%,transparent)}
.tm-id img{width:44px;height:44px;padding:5px;border-radius:14px;background:var(--on-photo);object-fit:contain}
.tm-id small{display:block;font-size:13px;font-weight:400;color:color-mix(in srgb,var(--on-photo) 70%,transparent)}

.tm-hero-in{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;gap:clamp(18px,3.6svh,40px);height:100%;padding:96px clamp(18px,3.6vw,60px) 98px}
@media(min-width:960px){.tm-hero-in{padding-bottom:clamp(22px,3.6vw,40px)}}
.tm-title{display:grid;gap:clamp(10px,1.8svh,18px);max-width:min(100%,1100px)}
.tm-eyebrow,.tm-hm{display:flex;align-items:center;flex-wrap:wrap;gap:10px;opacity:0;animation:tm-fade .8s var(--out) .05s forwards}
.tm-eyebrow{font-size:14px;font-weight:500;color:color-mix(in srgb,var(--on-photo) 88%,transparent)}
.tm-eyebrow i,.tm-hm i{width:4px;height:4px;border-radius:50%;background:color-mix(in srgb,var(--on-photo) 55%,transparent)}
.tm-num{font-family:var(--font-mono-n),ui-monospace,monospace;font-size:13px;padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--on-photo) 35%,transparent)}
@keyframes tm-fade{to{opacity:1}}
/* long matchups (two long team names) step the headline down and widen its measure, so it holds to three lines and stays clear of the crests and the team id; --k and --mw come from the headline length in TeamStudio */
.tm-hl{margin:0;font-size:clamp(calc(38px - (1 - var(--k,1)) * 20px),calc(min(7vw,11svh) * var(--k,1)),104px);line-height:.92;letter-spacing:-.055em;font-weight:500;text-wrap:balance;max-width:var(--mw,12ch);text-shadow:0 2px 36px color-mix(in srgb,var(--shade) 45%,transparent)}
.tm-w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-right:.2em}
.tm-w>span{display:inline-block;transform:translateY(110%);animation:tm-word .95s var(--out) forwards}
@keyframes tm-word{to{transform:none}}
.tm-hm{font-size:clamp(14px,1.2vw,17px);color:color-mix(in srgb,var(--on-photo) 82%,transparent);animation-delay:.45s}

.tm-foot{display:flex;align-items:flex-end;gap:clamp(12px,2vw,28px)}
@media(min-width:960px){.tm-foot{padding-right:clamp(300px,25vw,380px)}}
.tm-ix{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,1.4vw,22px);flex:1;max-width:760px;list-style:none;margin:0;padding:0}
.tm-ixb{position:relative;display:grid;gap:3px;width:100%;padding:12px 0 0;border:0;border-top:1px solid color-mix(in srgb,var(--on-photo) 28%,transparent);background:none;color:var(--on-photo);font:inherit;text-align:left;cursor:pointer;opacity:.55;transition:opacity .4s var(--out)}
.tm-ixb[data-on="1"]{opacity:1}
@media(hover:hover) and (pointer:fine){.tm-ixb[data-on="0"]:hover{opacity:.85}}
.tm-ixb:focus-visible{outline:2px solid var(--on-photo);outline-offset:4px}
.tm-ixn{font-family:var(--font-mono-n),ui-monospace,monospace;font-size:13px;color:color-mix(in srgb,var(--on-photo) 80%,transparent)}
.tm-ixt{font-size:14.5px;font-weight:600;letter-spacing:-.01em;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tm-ixd{font-size:13px;color:color-mix(in srgb,var(--on-photo) 70%,transparent)}
.tm-ixp{position:absolute;left:0;top:-1px;height:2px;width:100%;background:var(--on-photo);transform-origin:left;transform:scaleX(0)}
.tm-ixb[data-on="1"] .tm-ixp{animation:tm-fill linear forwards}
@keyframes tm-fill{to{transform:scaleX(1)}}
@media(max-width:639px){.tm-ixt{display:none}.tm-ixb{padding-top:10px}}
.tm-ixc{flex:none;font-family:var(--font-mono-n),ui-monospace,monospace;font-size:13px;font-variant-numeric:tabular-nums;color:color-mix(in srgb,var(--on-photo) 80%,transparent)}
.tm-arrows{display:none;gap:6px;--foreground:var(--on-photo)}
@media(min-width:960px){.tm-arrows{display:flex}}

/* the notch: a stub cut from the corner of the stage, holding the one action */
.tm-cut{position:absolute;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:16px;padding:14px 14px 14px 22px;border-radius:30px 0 0 0;background:var(--paper);color:var(--ink)}
@media(min-width:960px){.tm-cut{gap:20px;padding:18px 18px 18px 28px;border-radius:36px 0 0 0}}
.tm-cut::before,.tm-cut::after{content:"";position:absolute;width:30px;height:30px;background:radial-gradient(circle at 0 0,transparent 29px,var(--paper) 29.5px)}
.tm-cut::before{right:0;bottom:100%}
.tm-cut::after{right:100%;bottom:0}
.tm-cut-p{display:grid;line-height:1;justify-items:start;padding-right:16px;border-right:2px dashed rgb(var(--ink-rgb) / .2)}
.tm-cut-p small{font-size:13px;color:var(--ink2)}
.tm-cut-p b{margin-top:4px;font-size:clamp(24px,2.4vw,34px);font-weight:600;letter-spacing:-.04em;font-variant-numeric:tabular-nums;animation:tm-fade .6s var(--out)}

/* the ticker: a tilted band in the team colour */
.tm-tick{margin:clamp(26px,5svh,48px) -2vw 0;padding:14px 0;overflow:hidden;background:var(--t);color:var(--on-t,var(--on-photo));transform:rotate(-1.2deg)}
.tm-tick ul{display:flex;width:max-content;gap:36px;padding-right:36px;animation:tm-run 50s linear infinite}
.tm-tick li{display:flex;align-items:center;gap:10px;font-size:clamp(17px,2vw,26px);font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.tm-tick li small{font-size:inherit;font-weight:500;opacity:.7;font-variant-numeric:tabular-nums}
.tm-tick svg{width:20px;height:20px}
@keyframes tm-run{to{transform:translateX(-50%)}}

/* sections */
.tm-sec{margin-top:64px;scroll-margin-top:96px}
@media(min-width:960px){.tm-sec{margin-top:88px}}
.tm-sh{display:flex;align-items:end;justify-content:space-between;flex-wrap:wrap;gap:12px 24px;margin-bottom:20px;padding-inline:4px}
.tm-sh h2{font-size:clamp(22px,2.4vw,30px);font-weight:600;letter-spacing:-.03em;line-height:1.1}
.tm-sh p{max-width:44ch;font-size:15px;line-height:1.5;color:var(--ink2)}
/* the venue's banner is pale, so it is darkened to the same dusk as the stadium photo on the team page before the team colours go over it */
.tm-vbanner .tm-photo{filter:saturate(.8) contrast(1.05) brightness(.5)}
/* venue information, set like the concept page's statement: one big sentence of the venue's facts, each in a chip, with its profile picture as the one image */
.tm-vi{display:grid;justify-items:center;gap:clamp(22px,3vw,36px);margin-block:clamp(56px,9vw,120px);text-align:center}
.tm-vi-s{max-width:20ch;font-size:clamp(24px,3.9vw,52px);font-weight:500;letter-spacing:-.04em;line-height:1.42;text-wrap:balance}
@media(min-width:760px){.tm-vi-s{max-width:28ch}}
.tm-vi-c{display:inline-flex;align-items:center;gap:.22em;padding:.02em .34em .08em;line-height:1.1;border-radius:999px;background:color-mix(in srgb,var(--t) 24%,var(--paper));border:.04em solid color-mix(in srgb,var(--t) 70%,var(--ink) 12%);white-space:nowrap}
.tm-vi-c svg{width:.78em;height:.78em;color:color-mix(in srgb,var(--t) 55%,var(--ink))}
.tm-vi-nb{white-space:nowrap}
.tm-vi-b{display:inline-block;position:relative;z-index:1;margin:.1em .15em .1em 0;padding:0;border:0;background:none;vertical-align:-.35em;cursor:zoom-in;border-radius:.3em}
.tm-vi-b[data-big="1"],.tm-vi-b:hover,.tm-vi-b:focus-visible{z-index:3}
.tm-vi-b[data-big="1"]{cursor:zoom-out}
.tm-vi-i{display:block;width:2.5em;height:2.5em;border-radius:.3em;object-fit:cover;transform-origin:20% 40%;box-shadow:0 0 0 .05em var(--paper),.08em .1em 0 .06em var(--t);will-change:transform}
.tm-vi-p{max-width:46ch;font-size:clamp(17px,1.5vw,20px);line-height:1.65;letter-spacing:-.01em;color:color-mix(in srgb,var(--ink) 78%,var(--paper));text-wrap:pretty}
.tm-vi-a{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
/* the page is paper, not the dark stage the library tokens are set for, so its secondary buttons take the ink colour */
.tm-vi-a [data-slot=button]:not(:first-child){color:var(--ink)}
.tm .pg-tabbar{position:static;background:none;margin-top:24px}
@media(max-width:639px){.tm .pg-tabbar{overflow-x:auto;scrollbar-width:none}}
.tm .pg-tabbar + .tm-sec{margin-top:20px}
/* the three tabs open on the same line: the heading row is one fixed height whatever sits beside the heading (the view toggle, a sentence) */
@media(min-width:760px){.pg-tabbar ~ .tm-sec .tm-sh{align-items:center;min-height:48px}}
#schedule .tm-sh{margin-bottom:10px}
/* the schedule opens the same way on the team page as on a venue page: the same gap under the strip, the same heading row */
.n-wrap > #schedule:first-child{margin-top:clamp(36px,4vw,46px)}
@media(min-width:760px){#schedule .tm-sh{align-items:center;min-height:48px}}
.pg-tabbar ~ .tm-sec .tm-sh{margin-bottom:10px}
.tm-count{font-size:14px;color:var(--ink2);font-variant-numeric:tabular-nums}
.tm-evtools{display:flex;align-items:center;gap:14px}
/* the finder: search and sport in one panel. Only the layout is ours; the field and the chips are the library's. */
.tm-finder{display:grid;gap:12px;padding:12px;border-radius:28px;background:var(--paper2)}
.tm-finder-r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
@media(max-width:620px){.tm-finder-r{grid-template-columns:minmax(0,1fr)}}
.tm-finder-one{display:grid;gap:12px;justify-items:start}
@media(max-width:620px){.tm-finder-one{justify-items:stretch}}
/* what sits under the filters is spaced off them */
.tm-finder + .tm-passes,.tm-finder + .tm-flex,.tm-finder + .tm-empty{margin-top:20px}
@media(min-width:640px){.tm-finder{padding:14px}}
/* just the switches, no search beside them: no tray behind them, and they line up with the section's own edge */
.tm-finder.tm-finder-one{padding:0;background:none;border-radius:0}

/* schedule: sticky month on the left, each game a stub with a perforated price end */
.tm-mo{display:grid;gap:16px;margin-top:36px}
@media(min-width:960px){.tm-mo{grid-template-columns:116px minmax(0,1fr);gap:24px;margin-top:48px}}
.tm-mo-h{display:flex;align-items:baseline;gap:10px;padding-inline:4px}
.tm-mo-h span:first-child{font-size:clamp(30px,3.4vw,46px);line-height:1;letter-spacing:-.045em;font-weight:500}
.tm-mo-h small{font-size:14px;line-height:1.2;font-weight:600;color:var(--ink2)}
.tm-mo-h small b{font-weight:inherit;font-variant-numeric:tabular-nums}
/* phone: the month pins as a small frosted capsule just under the floating nav (a 52px pill 14px from the top), and the next month pushes it away */
@media(max-width:959px){
  .tm-mo-h{position:sticky;top:76px;z-index:6;justify-self:start;align-items:center;gap:8px;margin-top:-4px;padding:7px 16px 7px 12px;border-radius:999px;background:color-mix(in srgb,var(--paper) 74%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.6);backdrop-filter:blur(16px) saturate(1.6);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .08),0 6px 18px -8px rgb(var(--ink-rgb) / .28)}
  .tm-mo-h::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--t2);flex:none}
  .tm-mo-h span:first-child{font-size:20px;letter-spacing:-.03em;font-weight:600}
  .tm-mo-h span:first-child,.tm-mo-h small{display:block;line-height:1;padding-top:1px}
  .tm-mo-h small{font-size:13px;font-weight:600;color:color-mix(in srgb,var(--ink) 82%,transparent)}
}
@media(min-width:960px){.tm-mo-h{position:sticky;top:112px;align-self:start;flex-direction:column;gap:6px;padding-top:6px}
  .tm-mo-h small::before{content:"";display:block;width:28px;height:2px;margin-bottom:7px;border-radius:2px;background:var(--t2)}}
.tm-ag{display:grid;gap:12px;list-style:none;margin:0;padding:0}
.tm-ag li{animation:tm-rise .55s var(--out) backwards;animation-delay:calc(var(--i) * 45ms)}
@keyframes tm-rise{from{opacity:0;transform:translateY(14px)}}
${TICKET_STRIP_CSS}
.tm-cat{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;line-height:1;color:var(--ink2)}
.tm-et-t .tm-cat{color:color-mix(in srgb,var(--on-photo) 92%,transparent);text-shadow:0 1px 10px color-mix(in srgb,var(--shade) 40%,transparent)}
/* scoped theming: inside a tile the library's accent token is the team colour, so the primary button comes out in team colours
   (text on it is --on-t; the concept sheet reads --on-green for link buttons, so that is scoped too) with no change to the component. The outline button's border and hover lean the same way.
   The ticket strip does the same through its own tk-team class (components/organisms/ticket-strip-styles.ts). */
.tm-et{--on-green:var(--on-t,var(--on-photo));--h-accent:var(--t);--h-accent-foreground:var(--on-t,var(--on-photo));--h-accent-hover:color-mix(in oklab,var(--t) 84%,var(--on-t,var(--on-photo)) 16%);--h-border:color-mix(in srgb,var(--t2) 55%,transparent);--h-default:color-mix(in oklab,var(--t) 14%,transparent);--h-default-hover:color-mix(in oklab,var(--t) 26%,transparent)}
.tm-et-cta{position:relative;z-index:4;display:grid}
/* page links inherit their text colour, which beats the button's own foreground token: use the token so the label reads on its fill in both themes */
.tm-et-cta [data-slot=button]{color:var(--button-fg)}
.tm-empty{display:grid;justify-items:center;gap:8px;padding:48px 24px;margin-top:32px;border-radius:28px;background:var(--paper2);text-align:center}
.tm-empty strong{font-size:18px;font-weight:600;letter-spacing:-.02em}
.tm-empty span{font-size:14px;color:var(--ink2);margin-bottom:6px}

/* tiles: a portrait ticket per game. The poster is the team colour with the opponent's crest on it; the title and chips sit on it,
   the stub below holds the price and the action, and a notch is cut from each side at the perforation. */
.tm-tg{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));list-style:none;margin:0;padding:0}
@media(max-width:559px){.tm-tg{grid-template-columns:minmax(0,1fr)}}
.tm-tg li{animation:tm-rise .55s var(--out) backwards;animation-delay:calc(var(--i) * 45ms);filter:drop-shadow(0 12px 22px color-mix(in srgb,var(--shade) 16%,transparent)) drop-shadow(0 1px 3px color-mix(in srgb,var(--shade) 20%,transparent))}
:root[data-nt="light"] .tm-tg li{filter:drop-shadow(0 12px 22px color-mix(in srgb,var(--shade) 10%,transparent)) drop-shadow(0 1px 3px color-mix(in srgb,var(--shade) 12%,transparent))}
@media(prefers-color-scheme:light){:root:not([data-nt="dark"]) .tm-tg li{filter:drop-shadow(0 12px 22px color-mix(in srgb,var(--shade) 10%,transparent)) drop-shadow(0 1px 3px color-mix(in srgb,var(--shade) 12%,transparent))}}
.tm-et{--sh:92px;--r:9px;position:relative;display:grid;grid-template-rows:minmax(0,1fr) var(--sh);aspect-ratio:3/4;border-radius:30px;background:var(--photo-bg);color:var(--on-photo);isolation:isolate;transition:transform .45s var(--land);
  -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),transparent 98%,var(--shade)),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),transparent 98%,var(--shade));mask-composite:intersect}
/* a hairline edge and the pointer light, above everything but the clicks */
.tm-et::after{content:"";position:absolute;inset:0;z-index:3;border-radius:inherit;pointer-events:none;background:radial-gradient(260px circle at var(--px,50%) var(--py,50%),color-mix(in srgb,var(--t2) 22%,transparent),transparent 70%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--on-photo) 9%,transparent)}
.tm-et-img{position:relative;display:grid;align-content:end;overflow:hidden;border-radius:30px 30px 0 0;color:var(--on-photo);background:radial-gradient(120% 90% at 100% 0,var(--t2),transparent 60%),linear-gradient(165deg,var(--t),color-mix(in srgb,var(--t) 55%,var(--shade)))}
.tm-et-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,color-mix(in srgb,var(--shade) 30%,transparent) 0%,transparent 24%,color-mix(in srgb,var(--shade) 30%,transparent) 46%,color-mix(in srgb,var(--shade) 66%,transparent) 70%,color-mix(in srgb,var(--shade) 92%,transparent) 100%)}
.tm-et-art{position:absolute;left:50%;top:31%;width:36%;translate:-50% -50%;rotate:-5deg;transition:transform .9s var(--out)}
.tm-et-art img{display:block;width:100%;height:auto;border-radius:12px;box-shadow:0 0 0 3px var(--on-photo),0 14px 30px color-mix(in srgb,var(--shade) 45%,transparent)}
.tm-et-art b{display:block;font-size:46px;font-weight:600;letter-spacing:-.02em;text-align:center;color:color-mix(in srgb,var(--on-photo) 90%,transparent)}
.tm-et-s{position:absolute;left:16px;top:16px;z-index:1;display:grid;color:var(--on-photo);text-shadow:0 1px 10px color-mix(in srgb,var(--shade) 55%,transparent)}
.tm-et-dt{position:absolute;right:14px;top:14px;z-index:1;display:grid}
/* the tile is dark in both themes, so the date on it is white in both (the badge would otherwise take the theme's dark text in light mode) */
.tm-et-dt [data-slot=badge]{color:var(--on-photo);text-shadow:0 1px 10px color-mix(in srgb,var(--shade) 55%,transparent)}
.tm-et-t{position:relative;z-index:1;display:grid;justify-items:start;gap:10px;padding:0 20px 24px}
.tm-et-t h4{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;overflow-wrap:anywhere;font-size:19px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance;text-shadow:0 1px 14px color-mix(in srgb,var(--shade) 45%,transparent)}
.tm-et-v{font-size:13px;line-height:1.4;color:color-mix(in srgb,var(--on-photo) 86%,transparent);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-shadow:0 1px 10px color-mix(in srgb,var(--shade) 40%,transparent)}
/* the whole tile is the link; the ring is drawn inside, because the mask would clip an outside outline */
.tm-et-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:30px}
.tm-et-a:focus-visible{outline:none}
.tm-et-a:focus-visible::after{box-shadow:inset 0 0 0 2px var(--ink)}
.tm-et-b{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px 0 22px;background:linear-gradient(180deg,color-mix(in srgb,var(--on-photo) 5%,transparent),transparent 60%)}
.tm-et-b::before{content:"";position:absolute;left:22px;right:22px;top:-2px;height:4px;background:radial-gradient(circle,color-mix(in srgb,var(--on-photo) 42%,transparent) 1.6px,transparent 2.2px) 0 0/11px 4px repeat-x}
.tm-et-b .tm-pr b{font-size:24px;letter-spacing:-.035em;color:var(--on-photo)}
.tm-et-b .tm-pr small{color:color-mix(in srgb,var(--on-photo) 62%,transparent)}
/* the stub is dark in both themes, so the outline button is set for a dark surface */
.tm-et-cta [data-slot=button]{--h-default-foreground:var(--on-photo)}
@keyframes tm-holes{to{background-position:11px 0}}
@media(hover:hover) and (pointer:fine){
  .tm-et:hover{transform:translateY(-5px)}
  .tm-et:hover .tm-et-art{transform:scale(1.1) rotate(2deg)}
  .tm-et:hover .tm-et-b::before{animation:tm-holes .8s linear infinite}
}
.tm-et:active{transform:scale(.99)}

${PACK_CARDS_CSS}

/* where they play */
/* cards keep one size however many there are: a lone venue is not stretched across the row */
.tm-venues{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(300px,420px))}
/* desktop: two cards per row, each half the row (a lone venue still takes one half, not the whole row) */
@media(min-width:960px){.tm-venues{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tm-vn-w{display:grid;border-radius:28px}
/* the picture sits on the left as a square, the details beside it */
.tm-vn{position:relative;display:grid;grid-template-columns:144px minmax(0,1fr);align-items:center;gap:18px;padding:10px 18px 10px 10px;border-radius:28px;background:var(--paper2)}
/* the venue from above: seating rows as rounded rectangles in the team colour, a pitch in the middle with the main sport on it */
.tm-vn-art{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:20px;overflow:hidden;color:var(--on-t,var(--on-photo));background:linear-gradient(160deg,var(--t),color-mix(in srgb,var(--t) 55%,var(--shade)))}
.tm-vn-art::before{content:"";position:absolute;inset:0;background:color-mix(in srgb,var(--on-t,var(--on-photo)) 34%,transparent);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.5' vector-effect='non-scaling-stroke'%3E%3Crect x='2' y='18' width='96' height='64' rx='20' stroke-opacity='1'/%3E%3Crect x='-10' y='6' width='120' height='88' rx='32' stroke-opacity='0.7'/%3E%3Crect x='-22' y='-6' width='144' height='112' rx='44' stroke-opacity='0.45'/%3E%3Crect x='-34' y='-18' width='168' height='136' rx='56' stroke-opacity='0.25'/%3E%3C/g%3E%3C/svg%3E") center/cover no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.5' vector-effect='non-scaling-stroke'%3E%3Crect x='2' y='18' width='96' height='64' rx='20' stroke-opacity='1'/%3E%3Crect x='-10' y='6' width='120' height='88' rx='32' stroke-opacity='0.7'/%3E%3Crect x='-22' y='-6' width='144' height='112' rx='44' stroke-opacity='0.45'/%3E%3Crect x='-34' y='-18' width='168' height='136' rx='56' stroke-opacity='0.25'/%3E%3C/g%3E%3C/svg%3E") center/cover no-repeat;transition:scale .6s var(--out)}
/* a venue picture: cropped to fill the square */
.tm-vn-art[data-photo]{background:var(--photo-bg)}
.tm-vn-art[data-photo]::before{display:none}
.tm-vn-art[data-photo] img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:cover;object-position:32% 40%;transition:transform .6s var(--out)}
.tm-vn-art[data-photo]::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--on-photo) 14%,transparent);pointer-events:none}
.tm-vn-pitch{position:relative;display:grid;place-items:center;width:104px;height:58px;border-radius:12px;background:color-mix(in srgb,var(--shade) 28%,var(--t));box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--on-t,var(--on-photo)) 65%,transparent)}
.tm-vn-pitch::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:2px;translate:-50% 0;background:color-mix(in srgb,var(--on-t,var(--on-photo)) 40%,transparent)}
.tm-vn-pitch svg{position:relative;width:26px;height:26px;padding:3px;border-radius:50%;background:var(--t);color:var(--on-t,var(--on-photo));box-sizing:content-box}
.tm-vn-b{display:grid;gap:6px;padding:0}
/* the button sits above the card-wide link; its padding is pulled back so the label reaches the card's text edge */
.tm-vn-cta{position:relative;z-index:2;margin-right:-10px}
.tm-vn small{font-size:13px;color:var(--ink2)}
.tm-vn h3{font-size:20px;font-weight:600;letter-spacing:-.025em;line-height:1.15}
.tm-vn-m{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:14px;color:var(--ink2);font-variant-numeric:tabular-nums}
.tm-vn-m b{font-size:14px;font-weight:600;color:var(--ink)}
.tm-vn-m i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.6}
/* the sport chips and the button share one row: chips at the left, the button pushed to the right edge */
.tm-vn-f{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;margin-top:8px}
.tm-vn-s{display:flex;flex-wrap:wrap;gap:6px}
.tm-vn-s span{display:inline-flex;align-items:center;gap:5px;padding:5px 10px 5px 8px;border-radius:999px;background:var(--paper);font-size:13px;font-weight:500;color:var(--ink2);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .08)}
.tm-vn-s svg{width:13px;height:13px;color:var(--t2)}
.tm-vn-go{position:absolute;right:16px;bottom:16px;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--paper);color:var(--ink);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .1);transition:transform .35s var(--land),background .2s,color .2s}
.tm-vn-go svg{width:15px;height:15px}
.tm-vn a::after{content:"";position:absolute;inset:0;z-index:1;border-radius:inherit}
.tm-vn a:focus-visible{outline:none}
.tm-vn a:focus-visible::after{outline:2px solid var(--ink);outline-offset:-3px}
/* the rings are placed with the translate property, so they grow with the scale property: a transform here would add a second translation and shove them off the card */
@media(hover:hover) and (pointer:fine){.tm-vn-w:hover .tm-vn-art::before{scale:1.12}.tm-vn-w:hover .tm-vn-art[data-photo] img{transform:scale(1.04)}.tm-vn-w:hover .tm-vn-go{background:var(--t);color:var(--on-t,var(--on-photo));transform:translate(2px,-2px)}}

/* phone: a venue is a row, with the picture as a small plate on the left */
@media(max-width:559px){
  .tm-venues{grid-template-columns:minmax(0,1fr)}
  .tm-vn{grid-template-columns:104px minmax(0,1fr);gap:14px;padding:10px 14px 10px 10px;border-radius:24px}
  /* on a phone the picture runs the full height of the card, however many lines the name takes, and is cropped to fit */
  .tm-vn{align-items:stretch}
  .tm-vn-art{aspect-ratio:auto;align-self:stretch;min-height:104px;border-radius:16px}
  .tm-vn-b{align-content:center}
  .tm-vn-pitch{width:64px;height:38px;border-radius:9px}
  .tm-vn-pitch svg{width:16px;height:16px;padding:2px}
  .tm-vn-b{padding:0;gap:4px}
  .tm-vn h3{font-size:18px}
  .tm-vn-f{margin-top:4px}
  .tm-vn-go{right:14px;bottom:auto;top:14px}
}

@media(prefers-reduced-motion:reduce){
  .tm-photo,.tm-vph,.tm-away img,.tm-home img,.tm-eyebrow,.tm-hm,.tm-w>span,.tm-cut-p b,.tm-tick ul,.tm-ag li{animation:none!important}
  .tm-eyebrow,.tm-hm{opacity:1}.tm-w>span{transform:none}
  .tm-et,.tm-et-art,.tm-pr b,.tm-cr,.tm-b,.tm-pass,.tm-fx,.tm-fan i,.tm-vn{transition:none}
  .tm-home,.tm-away,.tm-pass{transform:none}
  .tm-ixb[data-on="1"] .tm-ixp{animation:none;transform:scaleX(1)}
  .tm-vn-art::before,.tm-vn-go{transition:none}
  .tm-et:hover .tm-et-b::before{animation:none}
  .tm-tg li{animation:none}
}
`;
