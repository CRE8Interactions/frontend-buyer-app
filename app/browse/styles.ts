/* /browse: a headliner you can flip, venues drawn as lit sections, events as ticket stubs.
   Colours come from the page's own tokens (paper, ink, green), so it follows the theme switch. */
import { TICKET_STRIP_CSS } from "@/components/organisms/ticket-strip-styles";

export const BR_CSS = `
.br{--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.br a,.br button{touch-action:manipulation}
.br ::selection{background:rgb(var(--green-rgb) / .35)}
.br-main{padding:0 0 56px}
.br-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.br-head{display:grid;gap:8px;margin-bottom:22px}
.br-h1{font-size:clamp(28px,4vw,52px);line-height:1.02;letter-spacing:-.035em;font-weight:600;text-wrap:balance;max-width:16ch}
.br-lede{font-size:15.5px;line-height:1.5;color:var(--ink2);max-width:46ch}
@media(min-width:960px){.br-head{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);column-gap:12px;align-items:end;margin-bottom:28px}.br-lede{justify-self:start;padding-bottom:6px}}

/* headliner: house lights down. A dark stage, a spotlight that follows the pointer, one huge title and a programme index. The ticket notch in the corner holds the action. */
.br-hero-wrap{--peek:clamp(104px,16svh,150px);padding:8px 8px 0;height:calc(100svh - var(--peek))}
.br-hero{position:relative;height:100%;overflow:hidden;border-radius:28px;color:#fff;background:#050507;isolation:isolate;touch-action:pan-y;--mx:68%;--my:40%}
@media(min-width:960px){.br-hero{border-radius:36px}}
.br-stagebg{position:absolute;inset:0;z-index:-1}
.br-scene{position:absolute;inset:0;opacity:0;transition:opacity 1.4s var(--out)}
.br-scene[data-on="1"]{opacity:1}
.br-photo{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.04)}
.br-scene[data-on="1"] .br-photo{animation:br-ken 16s linear forwards}
@keyframes br-ken{from{transform:scale(1.04)}to{transform:scale(1.14) translate(-1.4%,-1%)}}
.br-photo[data-blank="1"]{background:radial-gradient(80% 80% at 80% 15%,color-mix(in srgb,var(--a) 70%,transparent),transparent 70%),radial-gradient(90% 90% at 5% 100%,color-mix(in srgb,var(--b) 65%,transparent),transparent 70%),#0a0a0d}
/* lights down everywhere except under the beam; the falloff has many stops so it stays smooth, with no visible ring */
.br-dark{position:absolute;inset:0;background:radial-gradient(circle clamp(380px,50vw,780px) at var(--mx) var(--my),rgb(0 0 0 / 0) 0,rgb(0 0 0 / .03) 22%,rgb(0 0 0 / .12) 40%,rgb(0 0 0 / .3) 58%,rgb(0 0 0 / .55) 76%,rgb(0 0 0 / .82) 100%),linear-gradient(180deg,rgb(0 0 0 / .5),transparent 26%)}
/* the pool of light: a warm core inside a wide soft glow, and a tiny hot centre */
.br-beam{position:absolute;inset:0;pointer-events:none;mix-blend-mode:soft-light;background:radial-gradient(circle 54px at var(--mx) var(--my),rgb(255 250 238 / .55),transparent 100%),radial-gradient(ellipse clamp(300px,34vw,540px) clamp(250px,28vw,450px) at var(--mx) var(--my),rgb(255 236 200 / .8) 0,rgb(255 226 180 / .5) 34%,rgb(255 214 160 / .22) 64%,transparent 100%),radial-gradient(circle clamp(480px,60vw,900px) at var(--mx) var(--my),rgb(255 220 170 / .26),transparent 72%)}
/* the bloom: light scattering where the beam lands */
.br-bloom{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(ellipse clamp(220px,26vw,420px) clamp(140px,16vw,260px) at var(--mx) calc(var(--my) + 6px),rgb(255 238 208 / .28) 0,rgb(255 228 190 / .12) 55%,transparent 100%)}
/* the underlay for the type: sits above the light and under the text, so the beam can never wash the words out */
.br-scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(0deg,rgb(0 0 0 / .86) 0,rgb(0 0 0 / .62) 30%,rgb(0 0 0 / .22) 56%,transparent 74%),linear-gradient(90deg,rgb(0 0 0 / .6) 0,rgb(0 0 0 / .3) 42%,transparent 70%)}
.br-grain{position:absolute;inset:0;pointer-events:none;opacity:.09;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E")}

.br-hero-in{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;gap:clamp(20px,4svh,44px);height:100%;padding:96px clamp(18px,3.6vw,60px) 98px}
@media(min-width:960px){.br-hero-in{padding-bottom:clamp(22px,3.6vw,40px);padding-right:clamp(18px,3.6vw,60px)}}

/* the title */
.br-title{display:grid;gap:clamp(10px,2svh,20px);max-width:min(100%,1100px)}
.br-eyebrow{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:15px;font-weight:500;color:rgb(255 255 255 / .85);opacity:0;animation:br-fade .8s var(--out) .05s forwards}
.br-eyebrow i,.br-hm i{width:4px;height:4px;border-radius:50%;background:rgb(255 255 255 / .55)}
.br-num{font-family:var(--font-mono-n),ui-monospace,monospace;font-size:13px;padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .35)}
@keyframes br-fade{to{opacity:1}}
.br-hl{margin:0;text-shadow:0 2px 36px rgb(0 0 0 / .4);/* long matchups step the headline down and widen its measure (--k and --mw come from the title length in BrowseStudio), so it holds to three lines and stays clear of the nav */
  font-size:clamp(calc(36px - (1 - var(--k,1)) * 18px),calc(min(7.2vw,13svh) * var(--k,1)),110px);line-height:.94;letter-spacing:-.055em;font-weight:500;text-wrap:balance;max-width:var(--mw,13ch)}
.br-w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em;margin-right:.2em}
.br-w>span{display:inline-block;transform:translateY(110%);animation:br-word .95s var(--out) forwards}
@keyframes br-word{to{transform:none}}
.br-hm{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:clamp(16px,1.5vw,21px);color:rgb(255 255 255 / .88);opacity:0;animation:br-fade .9s var(--out) .45s forwards}

/* programme index */
.br-foot{display:flex;align-items:flex-end;gap:clamp(12px,2vw,28px)}
@media(min-width:960px){.br-foot{padding-right:clamp(300px,25vw,380px)}}
.br-ix{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(8px,1.4vw,22px);flex:1;list-style:none;margin:0;padding:0}
.br-ixb{position:relative;display:grid;gap:3px;width:100%;padding:12px 0 0;border:0;border-top:1px solid rgb(255 255 255 / .28);background:none;color:#fff;font:inherit;text-align:left;cursor:pointer;opacity:.5;transition:opacity .4s var(--out)}
.br-ixb[data-on="1"]{opacity:1}
@media(hover:hover) and (pointer:fine){.br-ixb[data-on="0"]:hover{opacity:.85}}
.br-ixb:focus-visible{outline:2px solid #fff;outline-offset:4px}
.br-ixn{font-family:var(--font-mono-n),ui-monospace,monospace;font-size:13px;color:rgb(255 255 255 / .8)}
.br-ixt{font-size:14.5px;font-weight:600;letter-spacing:-.01em;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.br-ixd{font-size:13px;color:rgb(255 255 255 / .7)}
.br-ixp{position:absolute;left:0;top:-1px;height:2px;width:100%;background:#fff;transform-origin:left;transform:scaleX(0)}
.br-ixb[data-on="1"] .br-ixp{animation:br-fill linear forwards}
@keyframes br-fill{to{transform:scaleX(1)}}
@media(max-width:639px){.br-ixt,.br-ixd{display:none}.br-ixb{padding-top:10px}}
.br-arrows{display:none;gap:6px}
@media(min-width:960px){.br-arrows{display:flex}}

/* the notch: a stub cut into the stage corner with concave fillets, in the page colour, so the stage reads as a torn ticket */
.br-cut{position:absolute;right:0;bottom:0;z-index:3;display:flex;align-items:center;gap:16px;padding:14px 14px 14px 22px;border-radius:30px 0 0 0;background:var(--paper);color:var(--ink)}
@media(min-width:960px){.br-cut{gap:20px;padding:18px 18px 18px 28px;border-radius:36px 0 0 0}}
.br-cut::before,.br-cut::after{content:"";position:absolute;width:30px;height:30px;background:radial-gradient(circle at 0 0,transparent 29px,var(--paper) 29.5px)}
.br-cut::before{right:0;bottom:100%}
.br-cut::after{right:100%;bottom:0}
.br-cut-p{display:grid;line-height:1;justify-items:start;padding-right:16px;border-right:2px dashed rgb(var(--ink-rgb) / .2)}
.br-cut-p small{font-size:12px;color:var(--ink2)}
.br-cut-p b{margin-top:4px;font-size:clamp(24px,2.4vw,34px);font-weight:600;letter-spacing:-.04em;font-variant-numeric:tabular-nums;animation:br-fade .6s var(--out)}

/* the content below starts right after the hero: nothing overlaps it */
.br-sheet{padding-top:clamp(22px,4svh,40px)}
.br-sheet .n-wrap>.br-sec:first-child{margin-top:0}

/* sections */
.br-sec{margin-top:56px;scroll-margin-top:96px}
@media(min-width:960px){.br-sec{margin-top:64px}}
.br-sh{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:20px;padding-inline:4px}
.br-sh h2{font-size:clamp(22px,2.4vw,30px);font-weight:600;letter-spacing:-.03em;line-height:1.1}
.br-more{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:500;color:var(--ink2);transition:color .15s}
.br-more svg{width:14px;height:14px;transition:transform .25s var(--out)}
@media(hover:hover) and (pointer:fine){.br-more:hover{color:var(--ink)}.br-more:hover svg{transform:translate(2px,-2px)}}
.br-count{font-size:14px;color:var(--ink2);font-variant-numeric:tabular-nums}

/* teams and venues: a swipeable row. Snap scrolling, arrows that stop at the ends, soft fades where more is waiting. */
/* the tabs and the carousel controls share one row */
.br-orgbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
.br-rc{display:flex;align-items:center;gap:12px}
.br-rb{display:none;gap:6px}
@media(hover:hover) and (pointer:fine){.br-rb{display:flex}}
.br-rail{display:flex;gap:10px;list-style:none;margin:0 -16px;padding:2px 16px 8px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:16px;scrollbar-width:none;overscroll-behavior-x:contain;-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent);mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent)}
.br-rail[data-prev="0"]{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 24px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 24px),transparent)}
.br-rail[data-next="0"]{-webkit-mask-image:linear-gradient(90deg,transparent,#000 24px);mask-image:linear-gradient(90deg,transparent,#000 24px)}
.br-rail[data-prev="0"][data-next="0"]{-webkit-mask-image:none;mask-image:none}
.br-rail::-webkit-scrollbar{display:none}
.br-rail:focus-visible{outline:2px solid var(--ink);outline-offset:-2px;border-radius:24px}
@media(min-width:640px){.br-rail{margin-inline:-32px;padding-inline:32px;scroll-padding-inline:32px}}
/* the cards: logo or monogram top-left, a badge top-right, a label and the name below, a round arrow bottom-right. A team's own colour tints the corner softly. */
.br-tile{--t:var(--seat);position:relative;flex:none;scroll-snap-align:start;display:grid;align-content:space-between;gap:20px;width:clamp(248px,26vw,296px);height:184px;padding:16px;border-radius:26px;color:var(--ink);overflow:hidden;isolation:isolate;background:radial-gradient(150% 130% at 0 0,color-mix(in srgb,var(--t) 15%,transparent) 0%,color-mix(in srgb,var(--t) 9%,transparent) 25%,color-mix(in srgb,var(--t) 4%,transparent) 50%,color-mix(in srgb,var(--t) 1.5%,transparent) 75%,transparent 100%),var(--paper2);transition:transform .35s var(--land)}
@media(hover:hover) and (pointer:fine){.br-tile:hover{transform:translateY(-3px)}}
/* a rounded-square plate in a deep glass tint of the team's colour, with a faint ring and a small soft glow. A thin light halo on the artwork keeps dark marks readable. */
.br-vm{display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:color-mix(in srgb,var(--t) 28%,var(--paper));color:color-mix(in srgb,var(--t) 65%,var(--ink));box-shadow:0 0 24px 2px color-mix(in srgb,var(--t) 30%,transparent),0 0 56px 8px color-mix(in srgb,var(--t) 15%,transparent),inset 0 0 0 1px color-mix(in srgb,var(--t) 40%,transparent);font-size:18px;font-weight:600;letter-spacing:.02em;overflow:visible}
.br-vm img{width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 0 1px rgb(255 255 255 / .95)) drop-shadow(0 0 5px rgb(255 255 255 / .3))}
/* a venue is a photo, not a logo: it fills the whole mark, cropped to the rounded square */
.br-vm[data-photo="1"]{overflow:hidden}
.br-vm[data-photo="1"] img{width:100%;height:100%;object-fit:cover;filter:none}
.br-chip{position:absolute;right:14px;top:16px}

.br-tx{display:grid;gap:4px;padding-right:44px;min-width:0}
.br-tx small{font-size:13px;color:var(--ink2);font-variant-numeric:tabular-nums}
.br-tx h3{font-size:18px;font-weight:600;letter-spacing:-.02em;line-height:1.2;text-wrap:balance;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden}
/* the whole card is the link: a stretched pseudo-element, so the text stays selectable and screen readers hear one clear name */
.br-tile-a::after{content:"";position:absolute;inset:0;z-index:1;border-radius:inherit}
.br-tile-a:focus-visible{outline:none}
.br-tile-a:focus-visible::after{outline:2px solid var(--ink);outline-offset:-3px}
/* light theme: flat and clean. The team colour is a thin ring, not a gradient or a glow. */
:root[data-nt="light"] .br-tile{background:radial-gradient(150% 130% at 0 0,color-mix(in srgb,var(--t) 8%,transparent) 0%,color-mix(in srgb,var(--t) 4.5%,transparent) 25%,color-mix(in srgb,var(--t) 2%,transparent) 50%,transparent 80%),var(--paper2);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .07)}
:root[data-nt="light"] .br-vm{background:var(--paper);color:var(--ink);box-shadow:0 0 28px 4px color-mix(in srgb,var(--t) 14%,transparent),0 1px 2px rgb(0 0 0 / .06),inset 0 0 0 1.5px color-mix(in srgb,var(--t) 40%,transparent)}
:root[data-nt="light"] .br-vm img{filter:none}
@media(prefers-color-scheme:light){
  :root:not([data-nt="dark"]) .br-tile{background:radial-gradient(150% 130% at 0 0,color-mix(in srgb,var(--t) 8%,transparent) 0%,color-mix(in srgb,var(--t) 4.5%,transparent) 25%,color-mix(in srgb,var(--t) 2%,transparent) 50%,transparent 80%),var(--paper2);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .07)}
  :root:not([data-nt="dark"]) .br-vm{background:var(--paper);color:var(--ink);box-shadow:0 0 28px 4px color-mix(in srgb,var(--t) 14%,transparent),0 1px 2px rgb(0 0 0 / .06),inset 0 0 0 1.5px color-mix(in srgb,var(--t) 40%,transparent)}
  :root:not([data-nt="dark"]) .br-vm img{filter:none}
}
.br-go2{position:absolute;right:12px;bottom:12px;display:grid}

/* the finder: search, type and price in one panel. Only the layout is ours; the chips are the library's Tag group. */
.br-finder{display:grid;gap:12px;padding:12px;border-radius:28px;background:var(--paper2)}
@media(min-width:640px){.br-finder{padding:14px}}

/* events as an agenda: the month is a sticky rail on the left, each event a full row with a perforated price stub */
.br-mo{display:grid;gap:16px;margin-top:40px}
@media(min-width:960px){.br-mo{grid-template-columns:116px minmax(0,1fr);gap:24px;margin-top:56px}}
.br-mo-h{display:flex;align-items:baseline;gap:10px;padding-inline:4px}
.br-mo-h span:first-child{font-size:clamp(30px,3.4vw,46px);line-height:1;letter-spacing:-.045em;font-weight:500}
.br-mo-h small{font-size:14px;line-height:1.2;font-weight:600;color:var(--ink2)}
.br-mo-h small b{font-weight:inherit;font-variant-numeric:tabular-nums}
/* phone: the month pins as a slim frosted bar just under the floating nav (two rows now, with the section links), and the next month pushes it away */
@media(max-width:959px){
  .br-mo-h{position:sticky;top:108px;z-index:6;margin-top:-4px;padding:10px 14px;border-radius:16px;background:color-mix(in srgb,var(--paper) 82%,transparent);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .06)}
  .br-mo-h span:first-child{font-size:26px}
}
@media(min-width:960px){
  .br-mo-h{position:sticky;top:112px;align-self:start;flex-direction:column;gap:6px;padding-top:6px}
  /* a short rule ties the month to its count */
  .br-mo-h small::before{content:"";display:block;width:28px;height:2px;margin-bottom:7px;border-radius:2px;background:rgb(var(--ink-rgb) / .25)}
}
.br-ag{display:grid;gap:12px;list-style:none;margin:0;padding:0}
.br-ag li{animation:br-rise .55s var(--out) backwards;animation-delay:calc(var(--i) * 45ms)}
@keyframes br-rise{from{opacity:0;transform:translateY(14px)}}

${TICKET_STRIP_CSS}
/* the category in the tiles is plain text with its icon, not a badge */
.br-cat-t{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;line-height:1;color:var(--ink2)}
.br-et-t .br-cat-t{color:rgb(255 255 255 / .94);text-shadow:0 1px 2px rgb(0 0 0 / .5),0 1px 10px rgb(0 0 0 / .5)}
/* "From $18" on one line, under the status badge */
.br-pr{display:grid;justify-items:start;gap:4px;line-height:1}
.br-pr small{font-size:12px;color:var(--ink2)}
.br-pr b{font-size:22px;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums;transition:transform .35s var(--land)}
/* the switch between list and tiles */
.br-evtools{display:flex;align-items:center;gap:14px}

/* tiles: a portrait ticket per event. Title and chips sit on the poster; the stub below holds the price and the action; a notch is cut from each side at the perforation. */
.br-tg{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));list-style:none;margin:0;padding:0}
@media(max-width:559px){.br-tg{grid-template-columns:minmax(0,1fr)}}
.br-tg li{animation:br-rise .55s var(--out) backwards;animation-delay:calc(var(--i) * 45ms);filter:drop-shadow(0 12px 22px rgb(0 0 0 / .16)) drop-shadow(0 1px 3px rgb(0 0 0 / .2))}
.br-et{--sh:84px;--r:9px;position:relative;display:grid;grid-template-rows:minmax(0,1fr) var(--sh);aspect-ratio:3/4;border-radius:30px;background:var(--dark);color:white;isolation:isolate;transition:transform .45s var(--land);
  -webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);-webkit-mask-composite:source-in;
  mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--sh)),#0000 98%,#000),radial-gradient(circle var(--r) at 100% calc(100% - var(--sh)),#0000 98%,#000);mask-composite:intersect}
/* a hairline edge and the pointer light, above everything but the clicks */
.br-et::after{content:"";position:absolute;inset:0;z-index:3;border-radius:inherit;pointer-events:none;background:radial-gradient(260px circle at var(--px,50%) var(--py,50%),rgb(255 255 255 / .12),transparent 70%) 0 0/100% 100% no-repeat;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .09);opacity:1}
.br-et::after{background-color:transparent}
/* the poster */
.br-et-img{position:relative;display:grid;align-content:end;overflow:hidden;border-radius:30px 30px 0 0;color:white;background:#101012}
.br-et-ph{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.02);transition:transform .9s var(--out)}
.br-et-img[data-blank="1"] .br-et-ph{background:radial-gradient(110% 80% at 85% 8%,rgb(255 255 255 / .16),transparent 62%),radial-gradient(90% 70% at 0 100%,rgb(255 255 255 / .06),transparent 70%)}
.br-et-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0 / .4) 0%,rgb(0 0 0 / .04) 22%,rgb(0 0 0 / .32) 38%,rgb(0 0 0 / .68) 54%,rgb(0 0 0 / .88) 72%,rgb(0 0 0 / .96) 100%);box-shadow:inset 0 -36px 48px -24px rgb(0 0 0 / .6)}
.br-et-mono{position:absolute;left:50%;top:30%;translate:-50% -50%;font-size:46px;font-weight:600;letter-spacing:-.02em;color:rgb(255 255 255 / .9)}
/* the status sits straight on the photo: white type with a soft shadow keeps it readable */
.br-et-s{position:absolute;left:16px;top:16px;z-index:1;display:grid;color:white;text-shadow:0 1px 10px rgb(0 0 0 / .55)}
.br-et-dt{position:absolute;right:14px;top:14px;z-index:1;display:grid}
/* the tile is dark in both themes, so the date on it is white in both (the badge would otherwise take the theme's dark text in light mode) */
.br-et-dt [data-slot=badge]{color:#fff;text-shadow:0 1px 10px rgb(0 0 0 / .55)}
/* and its fill is dark glass in both themes, set through the badge's own colour tokens, so white type reads on a light photo too */
.br-et-dt{--h-default:rgb(0 0 0 / .5);--h-default-soft:rgb(0 0 0 / .5);--h-default-foreground:#fff;--h-default-soft-foreground:#fff}
.br-et-dt [data-slot=badge]{-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.br-et-t{position:relative;z-index:1;display:grid;justify-items:start;gap:8px;padding:0 20px 18px}
.br-et-t h4{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden;overflow-wrap:anywhere;font-size:19px;line-height:1.2;font-weight:600;letter-spacing:-.02em;text-wrap:balance;text-shadow:0 1px 2px rgb(0 0 0 / .5),0 2px 18px rgb(0 0 0 / .55)}
.br-et-v{font-size:13px;line-height:1.4;color:rgb(255 255 255 / .92);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-shadow:0 1px 2px rgb(0 0 0 / .5),0 1px 10px rgb(0 0 0 / .5)}
/* the whole tile is the link: a stretched pseudo-element on the title. The ring is drawn inside, because the mask would clip an outside outline. */
.br-et-a::after{content:"";position:absolute;inset:0;z-index:2;border-radius:30px}
.br-et-a:focus-visible{outline:none}
.br-et-a:focus-visible::after{box-shadow:inset 0 0 0 2px var(--ink)}
/* the stub */
.br-et-b{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 18px 0 22px;background:linear-gradient(180deg,rgb(0 0 0 / .5),rgb(0 0 0 / .2) 60%),#0a0a0b}
/* the perforation: a row of small round holes between the two notches */
.br-et-b::before{content:"";position:absolute;left:22px;right:22px;top:-2px;height:4px;background:radial-gradient(circle,rgb(255 255 255 / .38) 1px,transparent 1.5px) 0 0/8px 4px repeat-x}
.br-et-b .br-pr b{font-size:24px;letter-spacing:-.035em;color:white}
.br-et-b .br-pr small{color:rgb(255 255 255 / .62)}
.br-et-cta{position:relative;z-index:4;display:grid}
/* page links inherit their text colour, which beats the button's own foreground token: use the token so the label reads on its fill in both themes */
.br-et-cta [data-slot=button]{color:var(--button-fg)}
/* the tile stub is black in both themes, so its buttons are set for a dark surface through the button's own colour variables */
.br-et-cta [data-slot=button]{--button-fg:white;--button-bg-hover:rgb(255 255 255 / .14);--button-bg-pressed:rgb(255 255 255 / .2)}
@keyframes br-holes{to{background-position:8px 0}}
@media(hover:hover) and (pointer:fine){
  .br-et:hover{transform:translateY(-5px)}
  .br-et:hover .br-et-ph{transform:scale(1.08)}
  .br-et:hover .br-et-b::before{animation:br-holes .8s linear infinite}
}
.br-et:active{transform:scale(.99)}

:root[data-nt="light"] .br-tg li{filter:drop-shadow(0 12px 22px rgb(0 0 0 / .1)) drop-shadow(0 1px 3px rgb(0 0 0 / .12))}
@media(prefers-color-scheme:light){:root:not([data-nt="dark"]) .br-tg li{filter:drop-shadow(0 12px 22px rgb(0 0 0 / .1)) drop-shadow(0 1px 3px rgb(0 0 0 / .12))}}

.br-empty{display:grid;justify-items:center;gap:8px;padding:48px 24px;margin-top:32px;border-radius:28px;background:var(--paper2);text-align:center}
.br-empty strong{font-size:18px;font-weight:600;letter-spacing:-.02em}
.br-empty span{font-size:14px;color:var(--ink2);margin-bottom:6px}

@media(prefers-reduced-motion:reduce){.br-ag li,.br-eyebrow,.br-hm,.br-w>span,.br-photo,.br-cut-p b{animation:none!important}.br-eyebrow,.br-hm{opacity:1}.br-w>span{transform:none}.br-scene,.br-ixb,.br-pr b,.br-tile{transition:none}.br-et,.br-et::before{transition:none}.br-et:hover .br-et-b::before{animation:none}.br-et-ph{transition:none}.br-tg li{animation:none}.br-ixb[data-on="1"] .br-ixp{animation:none;transform:scaleX(1)}}
`;
