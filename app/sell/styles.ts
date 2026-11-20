/* /sell: the box-office form beside a stadium that is built from your answers. It fits one screen on landing.
   Colours come from the page's own tokens (paper, ink, green), so it follows the theme switch. */
export const SL_CSS = `
.sl{--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1);-webkit-tap-highlight-color:transparent}
.sl a,.sl button{touch-action:manipulation}
.sl ::selection{background:rgb(var(--green-rgb) / .35)}
.sl-main{padding:80px 0 32px}
@media(min-width:960px){.sl-main{padding:96px 0 32px}}

/* the title: the headline on the left, what it means on the right */
.sl-head{display:grid;gap:8px;margin-bottom:22px}
.sl-h1{font-size:clamp(22px,2.2vw,30px);line-height:1.1;letter-spacing:-.03em;font-weight:600;text-wrap:balance}
.sl-lede{display:none;font-size:15.5px;line-height:1.5;color:var(--ink2)}
.sl-lede span{display:block}
@media(min-width:560px){.sl-lede{display:block}}
/* the headline breaks after "office" because the column is narrower than the whole line; on a phone it has the full width */
@media(min-width:960px){.sl-head{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);column-gap:12px;align-items:end;margin-bottom:24px}.sl-head>*{padding-inline:6px}.sl-h1{max-width:19ch}}

/* the studio: the stadium on one side, one question at a time on the other */
.sl-studio{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}
@media(min-width:960px){.sl-studio{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:12px;height:clamp(500px,calc(100svh - 236px),680px)}}
.sl-stage{position:relative;display:grid;place-items:center;border-radius:28px;background:var(--paper2);overflow:hidden;height:min(22svh,190px);padding:4px;grid-template:minmax(0,1fr)/minmax(0,1fr)}
@media(min-width:960px){.sl-stage{height:100%;padding:14px 14px 56px;border-radius:32px}}
.sl-pulse{width:100%;height:100%;display:grid;grid-template:minmax(0,1fr)/minmax(0,1fr);place-items:center;animation:sl-pulse .7s var(--out)}
@keyframes sl-pulse{0%{transform:scale(1)}35%{transform:scale(1.012)}100%{transform:scale(1)}}
.sl-arena{display:block;height:100%;width:auto;max-width:100%;overflow:visible;transform-origin:50% 9%;transition:transform .9s var(--out)}
/* typing the name: the camera pushes in on the banner so every letter is big */
.sl-pulse[data-zoom="1"] .sl-arena{transform:scale(1.75)}

/* what you have chosen so far */
.sl-chips-bar{display:none;position:absolute;left:14px;right:14px;bottom:14px;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0}
@media(min-width:960px){.sl-chips-bar{display:flex}}
.sl-chips-bar li{animation:sl-pop .5s var(--land)}
@keyframes sl-pop{from{opacity:0;transform:translateY(8px) scale(.92)}}

/* sections and seats */
.sl-p{fill:rgb(var(--ink-rgb) / .05);stroke:rgb(var(--ink-rgb) / .16);stroke-width:1.5;stroke-linejoin:round;transition:fill .6s var(--out) calc(var(--lo) * 38ms),stroke .6s var(--out) calc(var(--lo) * 38ms)}
.sl-sec[data-lit="1"] .sl-p{fill:rgb(var(--green-rgb) / .2);stroke:var(--green)}
.sl-d{fill:rgb(var(--ink-rgb) / .42);transform-box:fill-box;transform-origin:center;transition:opacity .45s var(--out) calc(var(--dk) * 14ms),transform .5s var(--land) calc(var(--dk) * 14ms),fill .5s var(--out)}
.sl-d[data-on="0"]{opacity:0;transform:scale(.3)}
.sl-sec[data-lit="1"] .sl-d{fill:var(--green)}
.sl-arena[data-open="1"] .sl-p{transition-delay:calc(var(--bi) * 45ms)}

/* details that arrive with your answers: floodlights, gates, suites, concourse */
.sl-conc{fill:rgb(var(--ink-rgb) / .025);stroke:rgb(var(--ink-rgb) / .12);stroke-width:1.5;stroke-dasharray:2 7;stroke-linecap:round}
.sl-gate{fill:rgb(var(--ink-rgb) / .24);transform-box:fill-box;transform-origin:center;transition:fill .5s var(--out) calc(var(--go) * 50ms),transform .5s var(--land) calc(var(--go) * 50ms)}
.sl-gate[data-on="1"]{fill:var(--seat)}
.sl-suite{fill:color-mix(in srgb,var(--h-purple) 45%,transparent);stroke:var(--h-purple);stroke-width:1.2;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;transition:opacity .4s var(--out) calc(var(--si) * 45ms),transform .5s var(--land) calc(var(--si) * 45ms)}
.sl-suite[data-on="0"]{opacity:0;transform:scale(.7)}
.sl-tw .mast{fill:var(--paper);stroke:rgb(var(--ink-rgb) / .3);stroke-width:1.5;transition:stroke .4s var(--out)}
.sl-tw .bulb{fill:rgb(var(--ink-rgb) / .25);transition:fill .4s var(--out)}
.sl-tw .beam{fill:color-mix(in srgb,var(--h-warning) 16%,transparent);opacity:0;transition:opacity .7s var(--out) calc(var(--ti) * 120ms)}
.sl-tw[data-on="1"] .mast{stroke:var(--h-warning)}
.sl-tw[data-on="1"] .bulb{fill:var(--h-warning)}
.sl-tw[data-on="1"] .beam{opacity:1}
.sl-rink *{fill:none;stroke:rgb(var(--ink-rgb) / .3);stroke-width:2;stroke-linecap:round}

/* the name over the bowl, no frame: the live preview of what you type */
.sl-sb .nm{fill:var(--ink);font-size:24px;font-weight:600;letter-spacing:-.02em;opacity:.45;transition:opacity .3s var(--out)}
.sl-sb[data-set="1"] .nm{opacity:1}
.sl-sb .ct{fill:var(--ink2);font-size:12.5px;font-weight:500}
.sl-sb .ct[data-set="1"]{fill:var(--ink)}

/* light theme: the pale colours get deeper shades so what is lit still stands out on white */
:root[data-nt="light"] .sl-sec[data-lit="1"] .sl-p{fill:rgb(var(--green-rgb) / .38);stroke:color-mix(in srgb,var(--green) 55%,#000)}
:root[data-nt="light"] .sl-sec[data-lit="1"] .sl-d{fill:color-mix(in srgb,var(--green) 48%,#000)}
:root[data-nt="light"] .sl-gate[data-on="1"]{fill:color-mix(in srgb,var(--seat) 85%,#000)}
:root[data-nt="light"] .sl-suite{fill:color-mix(in srgb,var(--h-purple) 55%,transparent);stroke:color-mix(in srgb,var(--h-purple) 85%,#000)}
:root[data-nt="light"] .sl-tw[data-on="1"] .bulb{fill:color-mix(in srgb,var(--h-warning) 85%,#000)}
:root[data-nt="light"] .sl-tw[data-on="1"] .mast{stroke:color-mix(in srgb,var(--h-warning) 85%,#000)}
:root[data-nt="light"] .sl-tw .beam{fill:color-mix(in srgb,var(--h-warning) 30%,transparent)}

/* the question panel */
.sl-panel{position:relative;display:flex;flex-direction:column;gap:18px;padding:20px 18px 18px;border-radius:28px;background:var(--paper);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .1)}
@media(min-width:960px){.sl-panel{gap:18px;padding:28px 32px 24px;border-radius:32px;height:100%;overflow:auto}}
.sl-q,.sl-done{display:flex;flex:1;flex-direction:column;gap:16px;animation:sl-in .4s var(--out)}
.sl-q[data-dir="b"]{animation-name:sl-in-b}
@keyframes sl-in{from{opacity:0;transform:translateY(10px)}}
@keyframes sl-in-b{from{opacity:0;transform:translateY(-8px)}}
.sl-q h2,.sl-done h2{font-size:clamp(20px,1.9vw,24px);line-height:1.15;letter-spacing:-.025em;font-weight:600;outline:none;text-wrap:balance}
.sl-help{font-size:14px;line-height:1.5;color:var(--ink2);max-width:46ch}
.sl-fields{display:grid;gap:18px}
.sl-vol{gap:36px}
@media(max-width:559px){.sl-hide-sm{display:none}}
.sl-opt{font-weight:400;color:var(--ink2)}


/* shorter laptop screens: tighter spacing so the busiest step still fits without scrolling */
@media(min-width:960px) and (max-height:760px){.sl-panel{gap:12px;padding:22px 28px 18px}.sl-q,.sl-done{gap:12px}.sl-fields{gap:12px}}

/* the big readout above a slider: you always see the number you are choosing (the library slider keeps its own label) */
.sl-big{display:flex;align-items:baseline;gap:10px;margin-bottom:16px}
.sl-num{display:block;font-size:clamp(28px,2.8vw,38px);font-weight:600;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums;animation:sl-tick .3s var(--out)}
@keyframes sl-tick{from{opacity:.4;transform:translateY(6px)}}
.sl-unit{font-size:16px;font-weight:500;color:color-mix(in srgb,var(--ink) 82%,var(--ink2))}

/* the people behind the reply */
/* on a phone the people only show once you have sent it: the form has to fit the screen */
@media(max-width:559px){.sl-panel>[data-slot=item]{display:none}}


/* actions */
.sl-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding-top:4px}
.sl-actions-done{margin-top:0}
.sl-done>[data-slot=item]{margin-top:auto}
.sl-go{display:flex;align-items:center;gap:12px;margin-left:auto}
.sl-enter{display:none;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2)}
@media(min-width:960px) and (hover:hover){.sl-enter{display:inline-flex}}
@media(max-width:559px){.sl-actions .sl-go{flex:1}.sl-actions .sl-go [data-slot=button]{flex:1}}

/* the confirmation: a ticket that prints out of a slot */
.sl-ticket{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;border-radius:20px;background:var(--paper2);animation:sl-print .9s var(--out) .25s backwards}
@keyframes sl-print{from{clip-path:inset(0 0 100% 0);transform:translateY(-12px)}to{clip-path:inset(0 0 0 0)}}
.sl-tmain{display:grid;align-content:center;gap:3px;padding:16px 18px}
.sl-tmain strong{font-size:clamp(18px,1.8vw,22px);font-weight:600;letter-spacing:-.025em;line-height:1.1;overflow-wrap:anywhere}
.sl-tmain span{font-size:13.5px;color:var(--ink2)}
.sl-tkind{font-weight:600;color:var(--ink)!important}
.sl-tstub{position:relative;display:grid;align-content:center;padding:14px 16px 14px 20px;border-left:2px dashed rgb(var(--ink-rgb) / .2)}
.sl-tstub::before,.sl-tstub::after{content:"";position:absolute;left:-11px;width:20px;height:20px;border-radius:50%;background:var(--paper)}
.sl-tstub::before{top:-10px}.sl-tstub::after{bottom:-10px}
.sl-tstub dl{display:grid;gap:6px}
.sl-tstub dt{font-size:11.5px;color:var(--ink2)}
.sl-tstub dd{font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums}
@media(max-width:559px){.sl-ticket{grid-template-columns:minmax(0,1fr)}.sl-tstub{border-left:0;border-top:2px dashed rgb(var(--ink-rgb) / .2)}.sl-tstub::before,.sl-tstub::after{top:-10px;bottom:auto;left:auto}.sl-tstub::before{left:-10px}.sl-tstub::after{right:-10px}.sl-tstub dl{grid-template-columns:repeat(auto-fit,minmax(100px,1fr))}}

@media(prefers-reduced-motion:reduce){.sl-pulse,.sl-q,.sl-done,.sl-ticket,.sl-chips-bar li,.sl-num{animation:none}.sl-p,.sl-d,.sl-arena,.sl-gate,.sl-suite,.sl-tw .beam{transition:none}}
`;
