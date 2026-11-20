/* /our-story: one pinned story. A small arena seen from above (ten blocks of seats around a rink, which is what
   blocktickets sells control of) stays on screen while the text scrolls past, and changes state with each passage:
   empty, two worlds, the bridge, listen, build, grow, then one picture for each belief. The states are CSS
   transitions switched by an IntersectionObserver (Story.tsx), so they behave the same on a phone and can be
   interrupted at any moment. Built from the brand design system: dark sheet, frosted glass, the highlighter, seat dots.
   The team chapter after it is a normal page. */
export const OS_CSS = `
.os{--land:cubic-bezier(.34,1.3,.64,1)}
/* touch: no grey tap flash (the controls have their own press state), no 300ms wait on taps, filter chips are controls so they are not selectable */
.os{-webkit-tap-highlight-color:transparent;--foreground:var(--ink);--background:var(--paper)}
.os a,.os button,.os .os-hl{touch-action:manipulation}
.os [data-slot=button]{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.os-hl:active{background:rgb(255 255 255 / .34)}
.os-num{font-weight:700;letter-spacing:-.06em;line-height:.9;font-variant-numeric:tabular-nums;color:rgb(var(--ink-rgb) / .09);user-select:none}
.os-mark{font-style:normal;color:inherit;padding-inline:.06em;margin-inline:-.06em;background:linear-gradient(transparent 62%,rgb(var(--green-rgb) / .55) 0) 0 0/0% 100% no-repeat;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.os-mark{transition:background-size .8s var(--ease)}
.os-step.on .os-mark{background-size:100% 100%;transition-delay:.35s}
.n-rv.in .os-mark{animation:os-sweep .9s var(--ease) .4s forwards}
@keyframes os-sweep{to{background-size:100% 100%}}

/* the story sheet: dark in both themes, so the nav reads it as a dark hero */
.os-story{padding:8px}
.os-sheet-dark{position:relative;display:grid;grid-template-columns:minmax(0,1fr);border-radius:36px;background:var(--dark);color:#fff;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .08)}
@media(min-width:960px){.os-sheet-dark{grid-template-columns:minmax(0,1.24fr) minmax(0,.76fr);column-gap:clamp(28px,3.5vw,56px);padding:0 clamp(28px,4vw,56px) 0 clamp(20px,2vw,32px)}}
.os-sheet-dark .os-mark{background-image:linear-gradient(transparent 62%,rgb(var(--green-rgb) / .42) 0)}

/* The ice. The opening photograph is not a card beside the text: it is clipped to the rink of the arena itself (inside the
   SVG), with the giant arena drawn around it. Scrolling pulls the camera back from the puck until the photograph is only the
   rink and the whole venue is in frame. */
.os-world{transform-origin:320px 240px;transform-box:view-box}
.os-stage[data-sc="photo"] .os-world{transform:scale(3.2)}
.os-hero-img{transition:opacity .4s var(--ease)}
.os-rps{pointer-events:none}
/* the puck: two thin rings leave it, one after the other, slow and soft; the puck itself stays uncovered */
.os-puck-ring{fill:none;stroke:var(--green);stroke-width:1.5;vector-effect:non-scaling-stroke;opacity:0;transform-box:fill-box;transform-origin:center}
.os-stage[data-s="1"][data-sc="photo"] .os-puck-ring{animation:os-sonar 3.2s cubic-bezier(.25,.6,.35,1) 1.2s infinite}
.os-stage[data-s="1"][data-sc="photo"] .os-puck-ring:nth-child(2){animation-delay:2.8s}
@keyframes os-sonar{0%{opacity:.85;transform:scale(1)}70%{opacity:.12}100%{opacity:0;transform:scale(2.6)}}
.os-photo-cap{font-size:4.4px;letter-spacing:.01em;pointer-events:none}
.os-cap-a{fill:#fff;font-weight:600}
.os-cap-b{fill:rgb(255 255 255 / .62)}
/* the hero state: the blocks around the ice are an outline you can see the photograph through; the ripple lights them in turn */
.os-stage[data-s="1"] .os-b:not(.os-o) path{fill:rgb(255 255 255 / .025);stroke:rgb(255 255 255 / .2)}
.os-stage[data-s="1"][data-sc="photo"] .os-dot{fill:rgb(255 255 255 / .16)}
.os-stage[data-sc="photo"] .os-rink line,.os-stage[data-sc="photo"] .os-rink circle{opacity:0}
.os-stage[data-sc="photo"] .os-field{fill:none;stroke:rgb(255 255 255 / .55)}
@media(min-width:960px){
  /* the arena runs under the text column too, so the text sits above the stage here (on a phone the stage is a panel above the text) */
  .os .os-stage{z-index:1}
  .os .os-steps{z-index:2}
  .os-sheet-dark{clip-path:inset(0 round 36px)}
}
.os-scrim{display:none;pointer-events:none}
@media(min-width:960px){.os-scrim{display:block;position:absolute;top:-84px;bottom:-24px;left:-4%;right:-66%;background:linear-gradient(180deg,color-mix(in srgb,var(--dark) 88%,transparent),transparent 20%),linear-gradient(90deg,transparent 50%,color-mix(in srgb,var(--dark) 78%,transparent) 63%,color-mix(in srgb,var(--dark) 94%,transparent) 100%)}}

/* the headline: the two lines come in from either side and meet, and the full stop is the puck, sliding in on a trail */
.os-story.intro .os-opening.on .os-h1 span:first-child{animation:os-fo-l .9s var(--ease) .05s backwards}
.os-story.intro .os-opening.on .os-h1 span:last-child{animation:os-fo-r .9s var(--ease) .15s backwards}
@keyframes os-fo-l{from{opacity:0;transform:translateX(-34px)}}
@keyframes os-fo-r{from{opacity:0;transform:translateX(34px)}}
.os-stop{position:relative;display:inline-block;width:.2em;height:.2em;margin-left:.07em;border-radius:50%;background:var(--green);box-shadow:0 0 0 .07em rgb(var(--green-rgb) / .3)}
.os-stop::before{content:"";position:absolute;right:100%;top:10%;height:80%;width:3.4em;border-radius:99px;background:linear-gradient(90deg,transparent,rgb(var(--green-rgb) / .7));transform-origin:right;transform:scaleX(0)}
.os-story.intro .os-opening.on .os-stop{animation:os-slide 1s cubic-bezier(.16,1,.3,1) .45s backwards}
.os-story.intro .os-opening.on .os-stop::before{animation:os-trail 1s cubic-bezier(.16,1,.3,1) .45s backwards}
@keyframes os-slide{from{opacity:0;transform:translateX(-7em) scaleX(1.6)}30%{opacity:1}}
@keyframes os-trail{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@media(prefers-reduced-motion:reduce){.os-puck-ring,.os-opening.on .os-h1 span,.os-opening.on .os-stop,.os-opening.on .os-stop::before{animation:none}}

/* the stage: sticky, so the arena stays while the words change */
.os-stage{position:sticky;top:0;align-self:start;z-index:2;display:grid;grid-template-rows:minmax(0,1fr);height:min(100svh,880px);padding:84px 20px 16px;background:var(--dark);border-radius:36px 36px 0 0}
@media(min-width:960px){.os-stage{height:100svh;padding:84px 0 24px;border-radius:0;background:none}}
.os-stage-in{position:relative;display:grid;grid-template:minmax(0,1fr)/minmax(0,1fr);place-items:center;min-height:0;isolation:isolate}
.os-arena{width:100%;height:100%;max-height:100%;overflow:visible}
.os-rink .os-field{fill:rgb(255 255 255 / .05);stroke:rgb(255 255 255 / .22);stroke-width:2;transition:stroke .6s var(--ease),fill .6s var(--ease)}
.os-rink line,.os-rink circle{fill:none;stroke:rgb(255 255 255 / .14);stroke-width:1.5;transition:opacity .5s var(--ease)}
.os-emblem{fill:#fff;opacity:0;transition:opacity .7s var(--ease) .2s,fill .8s var(--ease)}
.os-b{transform-box:fill-box;transform-origin:center;transition:transform .8s var(--land) calc(var(--bi) * 60ms),opacity .6s var(--ease)}
.os-b path{fill:rgb(255 255 255 / .04);stroke:rgb(255 255 255 / .16);stroke-width:1.5;stroke-linejoin:round;transition:fill .7s var(--ease) calc(var(--bi) * 80ms),stroke .6s var(--ease)}
.os-dot{fill:rgb(255 255 255 / .2);transform-box:fill-box;transform-origin:center;transition:fill .6s var(--ease),opacity .6s var(--ease),transform .5s var(--land)}
.os-dot[data-h]{fill:var(--green)}
.os-o{opacity:0;transform:scale(.93)}
.os-tag{position:absolute;display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 14px;border-radius:99px;background:rgb(255 255 255 / .12);-webkit-backdrop-filter:blur(18px) saturate(1.7);backdrop-filter:blur(18px) saturate(1.7);box-shadow:inset 0 0 0 1px rgb(255 255 255 / .24);font-size:13px;font-weight:500;color:#fff;opacity:0;transform:translateY(8px);transition:opacity .5s var(--ease),transform .5s var(--ease);pointer-events:none}
.os-tag i{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 3px rgb(var(--green-rgb) / .3)}
.t-e{left:4%;top:16%}.t-b{right:4%;top:16%}.t-g{left:50%;top:0;margin-left:-62px}.t-r{left:50%;top:0;margin-left:-70px}
.os-cap{flex:none;min-width:150px;font-family:var(--font-mono-n),ui-monospace,monospace;font-size:12.5px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:rgb(255 255 255 / .7)}

/* the states */
.os-stage.intro .os-b:not(.os-o){animation:os-in .8s var(--land) calc(var(--bi) * 90ms) backwards}
@keyframes os-in{from{opacity:0;transform:translateY(16px) scale(.96)}}
/* 2 two worlds: enterprise heavy on the left, budget sparse on the right, the gap left open top and bottom */
/* scroll-driven: --sp (0 to 1) is set from the scroll position by Story.tsx, so the worlds leave the arena exactly as fast as you scroll */
.os-stage[data-s="2"] .os-b[data-k="e"],.os-stage[data-s="2"] .os-b[data-k="b"]{transition:opacity .6s var(--ease)}
.os-stage[data-s="2"] .os-b[data-k="e"] path,.os-stage[data-s="2"] .os-b[data-k="b"] path,.os-stage[data-s="2"] .os-b[data-k="e"] .os-dot,.os-stage[data-s="2"] .os-b[data-k="b"] .os-dot{transition:none}
.os-stage[data-s="2"] .os-b[data-k="e"]{transform:translateX(calc(-22px * var(--sp,0)))}
.os-stage[data-s="2"] .os-b[data-k="b"]{transform:translateX(calc(22px * var(--sp,0))) scale(calc(1 - .1 * var(--sp,0)))}
.os-stage[data-s="2"] .os-b[data-k="e"] path{fill:rgb(255 255 255 / calc(.04 + .08 * var(--sp,0)));stroke:rgb(255 255 255 / calc(.16 + .18 * var(--sp,0)))}
.os-stage[data-s="2"] .os-b[data-k="e"] .os-dot{fill:rgb(255 255 255 / calc(.2 + .6 * var(--sp,0)))}
.os-stage[data-s="2"] .os-b[data-k="b"] .os-dot{fill:rgb(255 255 255 / calc(.2 + .1 * var(--sp,0)))}
.os-stage[data-s="2"] .os-b[data-k="b"] .os-dot:nth-child(2n){opacity:calc(1 - .92 * var(--sp,0))}
.os-stage[data-s="2"] .os-b[data-k="g"]{opacity:.6}
.os-stage[data-s="2"] .os-b[data-k="g"] path{stroke-dasharray:6 7;stroke:rgb(255 255 255 / .42)}
.os-stage[data-s="2"] .os-b[data-k="g"] .os-dot{opacity:0}
.os-stage[data-s="2"] .t-e,.os-stage[data-s="2"] .t-b,.os-stage[data-s="3"] .t-e,.os-stage[data-s="3"] .t-b{opacity:1;transform:none}
/* 3 the bridge lands in the gap */
.os-stage:is([data-s="3"],[data-s="3b"]) .os-b[data-k="e"] path{fill:rgb(255 255 255 / .1);stroke:rgb(255 255 255 / .3)}
.os-stage:is([data-s="3"],[data-s="3b"]) .os-b[data-k="e"] .os-dot{fill:rgb(255 255 255 / .7)}
.os-stage:is([data-s="3"],[data-s="3b"]) .os-b[data-k="b"] .os-dot{fill:rgb(255 255 255 / .35)}
.os-stage:is([data-s="3"],[data-s="3b"]) .os-b[data-k="g"] path{fill:var(--green);stroke:var(--green)}
.os-stage:is([data-s="3"],[data-s="3b"]) .os-b[data-k="g"] .os-dot{fill:var(--navy);opacity:.8}
.os-stage[data-dir="f"][data-s="3"] .os-b[data-k="g"]:not(.os-o){animation:os-bridge .8s cubic-bezier(.45,0,.25,1) calc(var(--bi) * 40ms + 120ms)}
@keyframes os-bridge{0%,100%{transform:none}40%{transform:translateY(-16px) scale(1.1)}}
.os-stage:is([data-s="3"],[data-s="3b"]) .os-rink .os-field{stroke:rgb(var(--green-rgb) / .6)}
.os-stage[data-s="3"] .t-g{opacity:1;transform:none}
/* 3b built block by block, with our partners: the venue is put together one section at a time, each lifted into place in turn,
   and each lands with a partner on it: a small avatar on its outer edge, in the colours the listening step uses for voices. */
.os-stage[data-dir="f"][data-s="3b"] .os-b:not(.os-o){animation:os-place .7s cubic-bezier(.45,0,.25,1) calc(.1s + var(--bi) * .15s)}
/* each block starts from where it already is, lifts, and settles back in its turn: no jump to a different pose first */
@keyframes os-place{0%,100%{transform:none}38%{transform:translateY(-13px) scale(1.08)}}
/* scrolling back: no staggered waiting, the state just returns */
.os-stage[data-dir="b"] .os-pin,.os-stage[data-dir="b"] .os-dot,.os-stage[data-dir="b"] .os-fx-p,.os-stage[data-dir="b"] .os-fx-l,.os-stage[data-dir="b"] .gl,.os-stage[data-dir="b"] .os-pr-chip,.os-stage[data-dir="b"] .os-pr-ln,.os-stage[data-dir="b"] .os-pr-person,.os-stage[data-dir="b"] .os-pr-no{transition-delay:0s!important}
.os-pin{stroke:rgb(255 255 255 / .9);stroke-width:1.4;opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(.2);transition:opacity .3s var(--ease),transform .4s var(--ease)}
.os-stage[data-s="3b"] .os-pin{opacity:1;transform:none;transition:opacity .3s var(--ease) calc(.4s + var(--bi) * .15s),transform .6s var(--land) calc(.4s + var(--bi) * .15s)}
/* 6 grow: the house fills, then a second ring grows around it, in green */
.os-stage[data-s="6"] .os-b:not(.os-o) path{fill:#f2f2f0;stroke:#f2f2f0}
.os-stage[data-s="6"] .os-b:not(.os-o) .os-dot{fill:rgb(11 11 12 / .45)}
.os-stage[data-s="6"] .os-o{opacity:1;transform:none;transition-delay:calc(var(--bi) * 70ms + 500ms)}
.os-stage[data-s="6"] .os-o path{fill:rgb(var(--green-rgb) / .16);stroke:rgb(var(--green-rgb) / .7)}
.os-stage[data-s="6"] .os-o .os-dot{fill:var(--green)}
.os-stage[data-s="6"] .os-b:not(.os-o){transition-delay:calc(var(--bi) * 50ms)}
.os-stage[data-s="3b"] .os-emblem,.os-stage[data-s="3"] .os-emblem,.os-stage[data-s="5"] .os-emblem,.os-stage[data-s="6"] .os-emblem{opacity:.95}
.os-stage[data-s="6"] .os-emblem{fill:var(--green)}
/* the arena stays on stage for every message it can show; the one message it cannot show (people) morphs it away and back */
/* 4 listen: partners speak from outside, the sound travels in through the seats and reaches the rink, which listens */
.os-voices,.os-listen{opacity:0;transition:opacity .5s var(--ease)}
.os-stage[data-s="4"] .os-voices,.os-stage[data-s="4"] .os-listen{opacity:1}
.os-vw{fill:none;stroke:rgb(255 255 255 / .6);stroke-width:2;transform-box:fill-box;transform-origin:center;opacity:0}
.os-stage[data-s="4"][data-dir="b"] .os-vw,.os-stage[data-s="4"][data-dir="b"] .os-hear{opacity:0}
.os-stage[data-dir="f"][data-s="4"] .os-vw{animation:os-voice 1.6s var(--ease) calc(var(--v) * .35s + var(--w) * .4s + .2s) 2 both}
@keyframes os-voice{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(4.6)}}
.os-stage[data-s="4"] .os-dot{fill:rgb(255 255 255 / .62);transition-delay:calc(var(--dr) * 1ms)}
.os-stage[data-dir="f"][data-s="4"] .os-dot{animation:os-ping2 1s var(--ease) calc(var(--dr) * 1ms) both}
@keyframes os-ping2{0%{transform:scale(1)}40%{transform:scale(1.6)}100%{transform:scale(1)}}
.os-stage[data-s="4"] .os-b:not(.os-o) path{stroke:rgb(255 255 255 / .3)}
.os-hear{fill:none;stroke:var(--green);stroke-width:3;transform-box:fill-box;transform-origin:center;opacity:0}
.os-stage[data-dir="f"][data-s="4"] .os-hear{animation:os-hear 1.3s var(--ease) 1.6s 2 both}
@keyframes os-hear{0%{opacity:.9;transform:scale(.8)}100%{opacity:0;transform:scale(1.9)}}
.os-bar2{fill:rgb(255 255 255 / .85);transform-box:fill-box;transform-origin:center;transform:scaleY(.25)}
.os-stage[data-dir="f"][data-s="4"] .os-bar2{animation:os-eq .9s ease-in-out calc(1.4s + var(--k) * .06s) 3 both}
@keyframes os-eq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(var(--h))}}
.os-stage[data-s="4"] .os-emblem{opacity:0}
/* 5 build with purpose: only the sections that solve something fill in; the rest are left empty on purpose */
.os-stage[data-s="5"] .os-b[data-p] path{fill:rgb(255 255 255 / .16);stroke:rgb(255 255 255 / .4)}
.os-stage[data-s="5"] .os-b[data-p] .os-dot{fill:rgb(255 255 255 / .7)}
.os-stage[data-s="5"] .os-b:not([data-p]):not(.os-o) path{stroke-dasharray:6 7;stroke:rgb(255 255 255 / .2);fill:rgb(255 255 255 / .02)}
.os-stage[data-s="5"] .os-b:not([data-p]):not(.os-o) .os-dot{opacity:.2}
/* 7 fans: the whole venue sits inside your organization's ring, and you hold the key. Each of your fans carries their data
   with them, as a small ticket. The platform stays outside: it tries to reach in and the lock holds. */
.os-stage[data-s="7"] .os-b path{fill:rgb(255 255 255 / .03);stroke:rgb(255 255 255 / .12)}
.os-stage[data-s="7"] .os-dot{fill:rgb(255 255 255 / .14)}
.os-stage[data-s="7"] .os-dot[data-y]{fill:var(--green);transform:scale(1.2)}
.os-stage[data-s="7"] .os-o{opacity:1;transform:none}
.os-own{fill:none;stroke:var(--green);stroke-width:3;stroke-dasharray:8 10;opacity:0;transition:opacity .4s var(--ease)}
.os-stage[data-s="7"] .os-own{opacity:.9}
.os-stage[data-dir="f"][data-s="7"] .os-own{animation:os-ring 1.6s var(--ease) .5s backwards}
@keyframes os-ring{from{stroke-dasharray:0 3000}}
.gl{fill:var(--green);transform-box:fill-box;transform-origin:center;opacity:0}
.gl path{fill:var(--green);stroke:none}
.gl .gl-p{fill:none;stroke:var(--navy);stroke-width:1.3;stroke-dasharray:1.8 1.8}
.os-stage[data-s="7"] .gl{opacity:1}
.os-stage[data-dir="f"][data-s="7"] .gl{animation:os-gl .6s var(--land) calc(.3s + var(--i) * .22s) backwards}
@keyframes os-gl{from{opacity:0;transform:translateY(10px) scale(.4)}}
.os-ppk{fill:rgb(255 255 255 / .6);opacity:0}
.os-stage[data-dir="f"][data-s="7"] .os-ppk{animation:os-ppk 1.8s ease-in-out 2.2s 2 both}
@keyframes os-ppk{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}50%{opacity:1;transform:translate(-52px,-23px)}70%{opacity:1;transform:translate(-44px,-19px)}100%{opacity:0;transform:translate(26px,10px)}}
/* 9 shared: one improvement reaches every section, one after another */
.os-stage[data-s="9"] .os-b path{fill:rgb(255 255 255 / .07);stroke:rgb(var(--green-rgb) / .5)}
.os-stage[data-s="9"] .os-dot{fill:rgb(var(--green-rgb) / .75);transition-delay:calc(var(--d3) * 1ms)}
.os-stage[data-dir="f"][data-s="9"] .os-dot{animation:os-ping2 1.1s var(--ease) calc(var(--d3) * 1ms) both}
.os-stage[data-s="9"] .os-o{opacity:1;transform:none}
.os-stage[data-s="9"] .os-emblem{opacity:.95;fill:var(--green)}
/* the scenes: the arena is one picture; each of the messages that is not about the venue gets a picture of its own */
.os-arena{transform-origin:50% 50%;transition:opacity .6s var(--ease),transform .7s var(--ease),filter .6s var(--ease),visibility .6s}
.os-tag{transition:opacity .5s var(--ease),transform .5s var(--ease)}
.os-stage:not([data-sc="arena"]) .os-arena{opacity:0;transform:scale(.72);filter:blur(6px)}
.os-stage[data-sc="photo"] .os-arena{opacity:1;transform:none;filter:none;transition:none}
.os-stage:not([data-sc="arena"]) .os-tag{opacity:0!important}
/* listening: four voices, one listener. Each voice sends a line of sound in across the seats to the rink, one after another. */
.os-vl{stroke:var(--green);stroke-width:1.8;stroke-dasharray:2 9;stroke-linecap:round;opacity:0}
.os-stage[data-dir="f"][data-s="4"] .os-vl{animation:os-vline 1.5s ease-out calc(var(--v) * .6s + .3s) 2}
@keyframes os-vline{0%{opacity:0;stroke-dashoffset:0}12%{opacity:.9}100%{opacity:0;stroke-dashoffset:-46}}

/* fans: everything below is drawn inside the arena, so it stays in frame at any size */
.os-fx-t,.os-fx-l{opacity:0;transition:opacity .5s var(--ease)}
.os-stage[data-s="7"] .os-fx-t{opacity:1}
.os-stage[data-s="7"] .os-fx-p{opacity:.9;transition-delay:1.2s}
.os-stage[data-s="7"] .os-fx-l{opacity:1;transition-delay:1.4s}
.os-fx-t rect{fill:rgb(31 31 36 / .92);stroke:rgb(255 255 255 / .3);stroke-width:1}
.os-fx-t text,.os-pr-chip text,.os-pr-no text{font-size:11px;font-weight:500;fill:#fff;dominant-baseline:central}
.os-fx-t .os-fx-i{fill:none;stroke:var(--green);stroke-width:1.4;stroke-linecap:round}
.os-fx-t .os-fx-g{fill:var(--green)}
.os-fx-t circle:not(.os-fx-i):not(.os-fx-g){fill:rgb(255 255 255 / .5)}
.os-fx-p rect{fill:none;stroke-dasharray:3 3}.os-fx-p text{fill:rgb(255 255 255 / .7)}
.os-fx-l circle{fill:var(--green)}.os-fx-l rect{fill:var(--navy)}.os-fx-l path{fill:none;stroke:var(--navy);stroke-width:1.5;stroke-linecap:round}

/* a partner: the person sits on the rink; lines go from them to the three things they know, each drawn on the map: the venue's
   outline, the season (every section in turn), the goals (a target around the rink) */
.os-pr{opacity:0;transition:opacity .4s var(--ease)}
.os-stage[data-s="8"] .os-pr{opacity:1}
.os-pr-ring{fill:none;stroke:rgb(255 255 255 / .42);stroke-width:1.4;stroke-dasharray:3 7}
.os-pr-tg{fill:none;stroke:var(--green);stroke-width:1.5;opacity:0;transform-box:fill-box;transform-origin:center;transform:scale(1.5);transition:opacity .6s var(--ease),transform .8s var(--ease) calc(.7s + var(--r,0) * .15s)}
.os-stage[data-s="8"] .os-pr-tg{opacity:.7;transform:none;transition-delay:calc(.7s + var(--r,0) * .15s)}
.os-pr-ln{fill:none;stroke:rgb(var(--green-rgb) / .7);stroke-width:1.5;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset .8s var(--ease)}
.os-stage[data-s="8"] .os-pr-ln{stroke-dashoffset:0;transition-delay:calc(.5s + var(--i) * .25s)}
.os-pr-person{transform-box:fill-box;transform-origin:center;transform:scale(.5);opacity:0;transition:transform .6s var(--land),opacity .3s var(--ease)}
.os-stage[data-s="8"] .os-pr-person{transform:none;opacity:1;transition-delay:.2s}
.os-pr-chip{opacity:0;transition:opacity .45s var(--ease)}
.os-stage[data-s="8"] .os-pr-chip{opacity:1;transition-delay:calc(.45s + var(--i) * .25s)}
.os-pr-chip rect{fill:rgb(31 31 36 / .94);stroke:rgb(255 255 255 / .3);stroke-width:1}
.os-pr-chip circle{fill:var(--green)}
.os-pr-b{font-weight:600!important}
.os-pr-no{opacity:0;transition:opacity .5s var(--ease)}
.os-stage[data-s="8"] .os-pr-no{opacity:1;transition-delay:.3s}
.os-pr-no text{fill:rgb(255 255 255 / .5);text-decoration:line-through;font-size:10.5px}
.os-stage[data-dir="f"][data-s="8"] .os-b path{animation:pn-sec 1s ease-in-out calc(1.6s + var(--bi) * .08s) 1}
/* the arena answers each thing they know, in order: the rink (venue), every section (season), the green seats (goals) */
.os-stage[data-s="8"] .os-b path{fill:rgb(255 255 255 / .04);stroke:rgb(255 255 255 / .14)}
.os-stage[data-s="8"] .os-dot{fill:rgb(255 255 255 / .2)}
.os-stage[data-s="8"] .os-o{opacity:1;transform:none}
@keyframes pn-sec{0%,100%{fill:rgb(255 255 255 / .04)}50%{fill:rgb(255 255 255 / .22)}}
/* words in the text that name a part of the picture light that part */
.os-stage[data-hl="e"] .os-b[data-k="e"] path,.os-stage[data-hl="b"] .os-b[data-k="b"] path{fill:rgb(255 255 255 / .22);stroke:rgb(255 255 255 / .8)}
.os-stage[data-hl="e"] .os-b[data-k="e"] .os-dot,.os-stage[data-hl="b"] .os-b[data-k="b"] .os-dot{fill:#fff;opacity:1}
.os-stage[data-hl="g"] .os-b[data-k="g"]{opacity:1}
.os-stage[data-hl="g"] .os-b[data-k="g"] path{stroke:var(--green);stroke-dasharray:6 7;fill:rgb(var(--green-rgb) / .12)}
.os-stage[data-hl="e"] .os-b:not([data-k="e"]),.os-stage[data-hl="b"] .os-b:not([data-k="b"]),.os-stage[data-hl="g"] .os-b:not([data-k="g"]){opacity:.3}
.os-hl{padding:1px 8px 2px;margin:0 -2px;border-radius:8px;background:rgb(255 255 255 / .14);box-shadow:inset 0 -2px 0 rgb(255 255 255 / .7);color:#fff;cursor:pointer;transition:background-color .2s var(--ease),box-shadow .2s var(--ease)}
.os-hl:focus-visible{outline:2px solid #fff;outline-offset:3px}
@media(hover:hover) and (pointer:fine){.os-hl:hover{background:rgb(255 255 255 / .26);box-shadow:inset 0 -2px 0 var(--green)}}
.os-hint{display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.4;color:rgb(255 255 255 / .6)}
.os-hint svg{width:16px;height:16px}

/* the text: one passage at a time, the one in the middle of the screen at full strength */
.os-steps{position:relative;z-index:1;padding:0 20px 8vh}
@media(min-width:960px){.os-steps{padding:0}}
.os-step{display:grid;align-content:center;justify-items:start;gap:20px;min-height:100svh;padding:40px 0;opacity:.14;transition:opacity .6s var(--ease)}
.os-step.on,.os-steps:not(:has(.on)) .os-opening{opacity:1}
@media(min-width:960px){.os-opening{padding:96px 0 40px}}
.os-h1{font-size:clamp(38px,4.3vw,84px);line-height:1.02;letter-spacing:-.04em;font-weight:600;color:#fff;text-wrap:balance}
.os-h1 span{display:block}
.os-h1 span:first-child{color:rgb(255 255 255 / .72)}
.os-h2{max-width:16ch;font-size:clamp(32px,4.2vw,56px);line-height:1.06;letter-spacing:-.03em;font-weight:600;text-wrap:balance;color:#fff}
.os-lede{max-width:42ch;font-size:clamp(18px,1.5vw,21px);line-height:1.5;color:rgb(255 255 255 / .92);text-wrap:pretty}
.os-sub{max-width:44ch;font-size:var(--fs-body-lg);line-height:1.55;color:rgb(255 255 255 / .62);text-wrap:pretty}
.os-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:14px}
.os-bt-s{display:none}
/* phones: native scroll, nothing pinned but the arena. The arena fills the width of the screen in the upper half; the passages are plain text
   below it and slide up under its soft lower edge. The passage crossing the lower third is the one at full strength, the arena changes
   to match it, and a row of ten ticks at the foot of the arena says how far through the story you are. Buttons use the shipped lg size (48px). */
.os-prog{display:none}
@media(max-width:959px){
.os-sheet-dark{clip-path:inset(0 round 36px)}
.os-stage,.os-steps{grid-area:auto}
.os-stage{height:min(50svh,480px);padding:72px 12px 22px;overflow:visible}
.os-stage-in{overflow:clip}
.os-stage::after{content:"";position:absolute;left:0;right:0;top:100%;height:40px;background:linear-gradient(var(--dark),transparent);pointer-events:none}
.os-prog{position:absolute;left:24px;right:24px;bottom:10px;z-index:2;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px}
.os-prog i{height:3px;border-radius:2px;background:rgb(255 255 255 / .16);transition:background-color .35s var(--ease)}
.os-prog i.on{background:var(--green)}
.os-steps{padding:0 24px 16svh}
.os-step{align-content:start;justify-items:start;gap:14px;min-height:60svh;padding:26px 0 0;opacity:.26}
.os-opening{min-height:64svh;padding-top:18px;gap:14px}
.os-h1{font-size:clamp(33px,9.4vw,46px);line-height:1.03}
.os-h2{max-width:none;font-size:clamp(32px,9vw,44px);line-height:1.05;letter-spacing:-.034em}
.os-lede{max-width:none;font-size:18px;line-height:1.45}
.os-opening .os-lede{font-size:17px;line-height:1.42}
.os-sub{max-width:none;font-size:16px;line-height:1.5}
.os-actions{flex-wrap:nowrap;gap:10px;width:100%;margin-top:6px}
.os .os-actions [data-slot=button]{flex:1 1 0;min-width:0;white-space:nowrap}
.os .os-actions [data-slot=button]:first-child{flex-grow:1.3}
.os-bt-l{display:none}
.os-bt-s{display:inline}
.os-hint{font-size:14px;color:rgb(255 255 255 / .55)}
.os-hl{padding:2px 0;margin:0;border-radius:0;background:none;box-shadow:none;color:#fff;text-decoration:underline;text-decoration-color:rgb(255 255 255 / .5);text-decoration-thickness:1.5px;text-underline-offset:4px}
.os-hl:active{background:rgb(255 255 255 / .14)}
}
.os-step.on{opacity:1}
/* the dark sheet is dark in both themes: pin the tokens inside it so buttons and text read the same in light */
.os-sheet-dark{--ink:#f2f2f0;--ink-rgb:242 242 240;--paper:#0b0b0c;--on-ink:#0b0b0c;--foreground:#f2f2f0;--background:#0b0b0c}

/* the team chapter and the rest of the page sit on the page's own colours */
.os-sec{padding:clamp(56px,8vw,104px) 0}
.os-intro{display:grid;gap:18px;max-width:1040px}
.os-intro .os-ch{color:var(--ink);margin-bottom:2px}
.os-intro .os-h2{color:var(--ink);max-width:20ch}
.os-intro-copy{display:grid;gap:14px;max-width:62ch;font-size:var(--fs-body-lg);line-height:1.55;color:var(--ink2)}
@media(min-width:960px){.os-intro{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);column-gap:clamp(40px,6vw,88px);align-items:end;max-width:none}.os-intro .os-ch{grid-column:1/-1}.os-intro-copy{margin-bottom:6px}}
.os-h3-light{font-size:clamp(24px,2.6vw,36px);line-height:1.1;letter-spacing:-.03em;font-weight:600}
/* 04 the team: founders on offset colour blocks (green / blue) with a glass plate, kept compact; the second block sits lower */
.os-fnd{display:grid;grid-template-columns:minmax(0,1fr);gap:40px;margin-top:clamp(32px,5vw,56px);max-width:920px}
@media(min-width:760px){.os-fnd{grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(32px,5vw,64px);align-items:start}.os-f:nth-child(2){margin-top:clamp(32px,5vw,64px)}}
.os-f{display:grid;gap:18px;align-content:start;max-width:400px}
.os-ph{position:relative;aspect-ratio:4/4.5;margin:0 var(--o,16px) var(--o,16px) 0;--c:var(--ink)}
.os-ph::before{content:"";position:absolute;inset:0;border-radius:30px;background:var(--c)}
.os-ph::after{content:"";position:absolute;inset:0;border-radius:30px;background:repeating-linear-gradient(135deg,rgb(0 0 0 / .1) 0 2px,transparent 2px 10px);transform:translate(var(--o,16px),var(--o,16px))}
.os-f.in .os-ph::before,.os-f.in .os-ph::after{animation:os-offset .8s var(--land) .4s forwards}
@keyframes os-offset{to{transform:translate(var(--o,16px),var(--o,16px))}}
.os-ph-img{position:relative;z-index:1;height:100%;overflow:hidden;border-radius:30px;background:#000}
.os-ph-img img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 20%}
.os-fh{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px}
.os-fh b{font-size:clamp(22px,2vw,28px);font-weight:600;letter-spacing:-.025em;line-height:1.1}
.os-fh i{padding:5px 12px;border-radius:99px;background:color-mix(in srgb,var(--c) 62%,#000);color:#fff;font-style:normal;font-family:var(--font-mono-n),ui-monospace,monospace;font-size:12px;font-weight:700;letter-spacing:.06em}
.os-fs{display:block;margin-top:6px;font-family:var(--font-mono-n),ui-monospace,monospace;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2)}
.os-bio{margin-top:8px;max-width:38ch;font-size:var(--fs-body);line-height:1.5;color:var(--ink2)}
/* phones: each founder is a row (photo left, name and line right) so both fit on one screen; the filter chips are one swipeable row instead of three wrapped ones */
@media(max-width:759px){
.os-fnd{gap:28px}
.os-f{grid-template-columns:128px minmax(0,1fr);column-gap:16px;align-items:start;max-width:none;--o:10px}
.os-ph{aspect-ratio:4/5}
.os-ph::before,.os-ph::after,.os-ph-img{border-radius:20px}
.os-fh b{font-size:22px}
.os-bio{font-size:15px;max-width:none}
.os-lineup .os-chips{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;margin-inline:-16px;padding-inline:16px;scrollbar-width:none}
.os-lineup .os-chips::-webkit-scrollbar{display:none}
.os-lineup .os-chips>*{flex:none;scroll-snap-align:start}
}
.os-roster{margin-top:clamp(56px,8vw,96px)}
.os-lineup{margin-top:22px}
.os-chips{display:flex;flex-wrap:wrap;gap:8px}
.os-cnt{font-size:12px;font-weight:500;opacity:.6}
/* the jersey rack: shirts hang back-out on a rail, sway, lift when pointed at and turn around on a tap */
.os-tip{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:14px;line-height:1.4;color:var(--ink2)}
.os-tip svg{width:16px;height:16px}
.os-rack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:44px 10px;margin-top:26px}
@media(min-width:760px){.os-rack{grid-template-columns:repeat(4,minmax(0,1fr));gap:56px 20px}}
.os-jersey{position:relative;display:grid;justify-items:center;align-content:start;gap:14px;padding-top:26px;transition:opacity .4s var(--ease),filter .4s var(--ease)}
.os-jersey.dim{opacity:.22;filter:saturate(.4)}
.os-jersey::before{content:"";position:absolute;left:-6px;right:-6px;top:0;height:7px;border-radius:4px;background:linear-gradient(rgb(var(--ink-rgb) / .28),rgb(var(--ink-rgb) / .12))}
.os-jersey::after{content:"";position:absolute;left:50%;top:7px;width:3px;height:19px;margin-left:-1.5px;border-radius:2px;background:rgb(var(--ink-rgb) / .4)}
.os-jb{all:unset;box-sizing:border-box;display:block;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border-radius:16px}
.os-jb:focus-visible{outline:2px solid var(--ink);outline-offset:6px}
.os-jv{display:block;width:clamp(120px,36vw,156px);transform-origin:50% 0;transition:transform .5s var(--land);perspective:900px}
@media(min-width:760px){.os-jv{width:clamp(118px,12vw,164px)}}
.os-jb:active .os-jv{transform:scale(.95);transition-duration:.12s}
.os-sw{display:block;perspective:900px;transform-origin:50% 0;animation:os-sway 5.6s ease-in-out calc(var(--j) * -.8s) infinite}
@keyframes os-sway{0%,100%{transform:rotate(-2deg) rotateY(-9deg)}50%{transform:rotate(2deg) rotateY(9deg)}}
.os-fl{display:grid;transform-style:preserve-3d;transition:transform .8s var(--land)}
.os-face{grid-area:1/1;display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.os-front{transform:rotateY(180deg)}
.os-jersey.turned .os-fl{transform:rotateY(180deg)}
.os-face svg{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 10px 14px rgb(0 0 0 / .18))}
.os-jv .body{fill:var(--c);stroke:rgb(var(--ink-rgb) / .2);stroke-width:1.5;stroke-linejoin:round}
.os-jv .pat .hoop{fill:none;stroke:var(--tr);stroke-width:7;opacity:.9}
.os-jv .pat .hoop.thin{stroke-width:2.5;opacity:.5}
.os-jv .pat .sash{fill:none;stroke:var(--tr);stroke-width:5;opacity:.95}
.os-jv .pat .sash.thin{stroke-width:2;opacity:.6}
.os-jv .pat .pin{fill:none;stroke:var(--cc);stroke-width:2.4;opacity:.22}
.os-jv .cuff{fill:none;stroke:var(--tr);stroke-width:5;stroke-linecap:round}
.os-jv .stripe{fill:none;stroke:var(--cc);stroke-width:3;opacity:.5}
.os-jv .collar{fill:none;stroke:var(--tr);stroke-width:4;stroke-linecap:round}
.os-jv .em{fill:var(--cc);opacity:.95}
.os-jv .shade{fill:url(#jr-shade);pointer-events:none}
.os-jv .nm{fill:var(--cc);font-size:12px;font-weight:700;letter-spacing:.04em;filter:drop-shadow(0 .8px 0 rgb(0 0 0 / .32)) drop-shadow(0 -.5px 0 rgb(255 255 255 / .22))}
.os-jv .nm.sm{font-size:10px}
.os-jv .no{fill:var(--cc);font-size:50px;font-weight:700;letter-spacing:-.04em;font-variant-numeric:tabular-nums;filter:drop-shadow(0 1.4px 0 rgb(0 0 0 / .34)) drop-shadow(0 -.8px 0 rgb(255 255 255 / .22))}
.os-jersey.g-build{--c:var(--paper3);--cc:var(--ink);--tr:var(--seat)}
.os-jersey.g-grow{--c:var(--ink);--cc:var(--on-ink);--tr:rgb(var(--on-ink-rgb,255 255 255) / .22)}
.os-jersey.g-ops{--c:var(--seat);--cc:#fff;--tr:#fff}
.os-jersey.g-grow{--tr:var(--seat)}
/* the empty jersey: outline only, waiting on the last peg */
.os-open{--c:transparent;--cc:var(--ink2);--tr:rgb(var(--ink-rgb) / .35)}
.os-open .os-jv .body{stroke:rgb(var(--ink-rgb) / .4);stroke-width:2;stroke-dasharray:5 5}
.os-open .os-jv .stripe{opacity:.2}
.os-open .os-jv .no{opacity:.6}
.os-open .os-plate-j b{color:var(--ink)}
.os-plate-j{display:grid;gap:3px;text-align:center}
.os-plate-j b{font-size:var(--fs-body-lg);font-weight:600;letter-spacing:-.02em;line-height:1.2}
.os-plate-j span{font-size:var(--fs-body-sm);line-height:1.3;color:var(--ink2);max-width:22ch;justify-self:center}
/* hung one after another when the rack comes into view and again whenever a chip re-hangs it */
.n-rv.in .os-jv{animation:os-hang 1s var(--land) calc(var(--j) * 90ms + .15s) backwards}
@keyframes os-hang{from{opacity:0;transform:translateY(-70px) rotate(-12deg)}}
.os-jersey.lit .os-jv{animation:os-hang 1s var(--land) calc(var(--j) * 90ms + .15s) backwards,os-hop .7s var(--land) calc(var(--j) * 90ms + 1s)}
@keyframes os-hop{35%{transform:translateY(-14px) scale(1.06)}}
@media(hover:hover) and (pointer:fine){.os-jb:hover .os-jv{transform:translateY(-8px) scale(1.05)}.os-jb:hover .os-sw{animation-duration:2.4s}.os-jb:active:hover .os-jv{transform:scale(.95)}}
@media(prefers-reduced-motion:reduce){.os-step.on .os-mark,.n-rv.in .os-mark{background-size:100% 100%!important;animation:none!important}.os-stage.ready .os-b,.os-stage .os-b,.os-stage .os-dot{animation:none!important}.os-b,.os-dot,.os-b rect,.os-tag{transition:none}.n-rv.in .os-jv,.os-sw,.os-jersey.lit .os-jv{animation:none!important}.os-fl{transition-duration:.01s}.os-ph::before,.os-ph::after{transform:translate(16px,16px);animation:none!important}}
`;
