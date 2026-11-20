/* The ticket page for one game (/e/<slug>/<code>/tickets): the front door is a stage with the matchup and one real, die-cut ticket you fill in.
   It borrows the storefront's stage (the .tm-hero layers and the .tm-hl headline from app/[slug]/styles.ts) and adds the parts that are new here:
   the sport's playing surface drawn in perspective, the ticket with its perforated stub, the countdown and the game-day timeline.
   Colour comes from tokens only. --t is the organisation's own colour, --o the opponent's (third-party brand colours, as on the storefront). */

export const EV_CSS = `
.ev{--land:cubic-bezier(.34,1.3,.64,1);--out:cubic-bezier(.23,1,.32,1)}
.ev-wrap{padding:8px 8px 0}
/* the storefront stage, but as tall as its content needs (a phone has more to show than one screen holds) */
.ev-stage.tm-hero{height:auto;min-height:max(620px,calc(100svh - clamp(96px,14svh,140px)))}
.ev-in{position:relative;z-index:2;display:grid;gap:clamp(20px,3vw,40px);align-content:end;min-height:inherit;padding:clamp(92px,12svh,112px) clamp(18px,3.6vw,60px) clamp(22px,3.6vw,40px)}
@media(min-width:960px){.ev-in{grid-template-columns:minmax(0,1fr) minmax(360px,430px);align-items:center}}

/* the playing surface: line art, drawn once as the page opens, lying on the floor of the stage in perspective */
.ev-floor{position:absolute;left:50%;bottom:-10%;z-index:0;width:min(170%,2200px);translate:-50% 0;pointer-events:none;opacity:.28;transform:perspective(900px) rotateX(58deg) translate(calc(var(--mx) * -1.6%),calc(var(--my) * 1.4%));transform-origin:50% 100%;-webkit-mask-image:linear-gradient(0deg,#000 30%,transparent 92%);mask-image:linear-gradient(0deg,#000 30%,transparent 92%)}
.ev-floor svg{display:block;width:100%;height:auto;overflow:visible}
.ev-floor path,.ev-floor circle,.ev-floor rect,.ev-floor line{fill:none;stroke:var(--on-photo);stroke-width:.55;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:ev-draw 2.4s var(--out) .15s forwards}
.ev-floor .ev-hot{stroke:var(--t2);stroke-width:.8}
@keyframes ev-draw{to{stroke-dashoffset:0}}

/* the two crests, set down like trading cards; they lean toward the pointer */
.ev-sides{display:flex;align-items:center;gap:clamp(8px,1.6vw,22px);--cw:clamp(96px,min(16vw,22svh),230px);padding-bottom:clamp(2px,1.4svh,16px)}
.ev-cr{position:relative;width:var(--cw);flex:none}
.ev-cr img,.ev-cr .tm-mono{display:block;width:100%;height:auto;aspect-ratio:1;border-radius:clamp(12px,1.6vw,24px);box-shadow:0 0 0 clamp(3px,.4vw,6px) var(--on-photo),0 24px 50px color-mix(in srgb,var(--shade) 55%,transparent)}
.ev-cr img{object-fit:cover;background:var(--on-photo)}
/* a side with no crest of its own is its initials on its colour (the storefront's rule for this lives inside its own crest wrapper, so it is repeated here) */
.ev-cr .tm-mono{display:grid;place-items:center;background:linear-gradient(160deg,var(--o,var(--ink3)),color-mix(in srgb,var(--o,var(--ink3)) 55%,var(--shade)));color:var(--on-photo);font-size:calc(var(--cw) * .36);font-weight:600;letter-spacing:-.05em}
.ev-home{transform:translate(calc(var(--mx) * 14px + var(--c) * 1.6vw),calc(var(--my) * 8px)) rotate(calc(-6deg + var(--c) * 6deg));animation:tm-in2 .9s var(--land) backwards}
.ev-away{transform:translate(calc(var(--mx) * 14px - var(--c) * 1.6vw),calc(var(--my) * -8px)) rotate(calc(6deg - var(--c) * 6deg));animation:tm-in .9s var(--land) .08s backwards}
.ev-sides .tm-vs{position:static;translate:none;scale:calc(1 + var(--c) * .14);flex:none}
.ev-solo{--cw:clamp(110px,min(18vw,24svh),260px)}

.ev-copy{display:grid;gap:clamp(12px,2svh,22px);min-width:0}
.ev-copy .tm-hl{max-width:var(--mw,13ch)}
.ev-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:clamp(16px,1.35vw,19px);font-weight:500;color:color-mix(in srgb,var(--on-photo) 90%,transparent);opacity:0;animation:tm-fade .8s var(--out) .45s forwards}
.ev-meta i{width:4px;height:4px;border-radius:50%;background:color-mix(in srgb,var(--on-photo) 55%,transparent)}
@media(max-width:639px){.ev-meta i{display:none}}

/* the countdown to the start */
.ev-cd{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 22px;opacity:0;animation:tm-fade .8s var(--out) .6s forwards}
.ev-cd-l{display:grid;gap:3px;font-size:15px;line-height:1.2;color:color-mix(in srgb,var(--on-photo) 84%,transparent)}
.ev-cd-l b{font-size:clamp(18px,1.5vw,21px);font-weight:600;color:var(--on-photo);letter-spacing:-.01em}
.ev-cd-t{display:flex;gap:clamp(12px,1.6vw,22px)}
.ev-cd-t span{display:grid;justify-items:start;gap:3px;font-size:14px;line-height:1;color:color-mix(in srgb,var(--on-photo) 82%,transparent)}
.ev-cd-t b{font-size:clamp(28px,3.4vw,46px);font-weight:500;letter-spacing:-.045em;line-height:1;color:var(--on-photo);font-variant-numeric:tabular-nums}

/* the ticket */
.ev-tkw{position:relative;width:100%;max-width:430px;justify-self:end;filter:drop-shadow(0 26px 40px color-mix(in srgb,var(--shade) 40%,transparent));opacity:0;animation:ev-tk-in 1s var(--land) .35s forwards;transform:translate(calc(var(--mx) * -8px),calc(var(--my) * -5px))}
@media(max-width:959px){.ev-tkw{justify-self:center;max-width:560px}}
@keyframes ev-tk-in{from{opacity:0;translate:0 60px;scale:.94}to{opacity:1;translate:0 0;scale:1}}
.ev-ghost{position:absolute;inset:0;border-radius:28px;background:var(--paper2);box-shadow:inset 0 0 0 1px rgb(var(--ink-rgb) / .1);transform-origin:50% 100%}
.ev-tk{position:relative;display:grid;border-radius:28px;background:var(--paper);color:var(--ink);--stub:112px;--r:15px}
@media(min-width:960px){.ev-tk{-webkit-mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--stub)),#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle var(--r) at 100% calc(100% - var(--stub)),#0000 97%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle var(--r) at 0 calc(100% - var(--stub)),#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle var(--r) at 100% calc(100% - var(--stub)),#0000 97%,#000) right/51% 100% no-repeat}}
.ev-tk-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 24px 0}
.ev-adm{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:600;letter-spacing:-.02em;line-height:1.15}
.ev-adm img{width:42px;height:42px;padding:3px;border-radius:10px;background:var(--paper2);object-fit:contain}
.ev-adm small{display:block;margin-top:2px;font-size:14px;font-weight:400;letter-spacing:0;color:var(--ink2)}
.ev-kind{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px;border-radius:999px;background:var(--paper2);font-size:15px;font-weight:600;color:var(--ink);white-space:nowrap}

.ev-party{display:grid;gap:6px;padding:20px 24px 0}
.ev-party>p{margin:0;font-size:17px;font-weight:600;letter-spacing:-.015em;color:var(--ink)}
.ev-n{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ev-big{font-size:clamp(72px,9vw,104px);font-weight:500;letter-spacing:-.07em;line-height:.9;font-variant-numeric:tabular-nums;color:var(--ink)}
.ev-seats{display:flex;gap:5px;padding:14px 24px 0}
.ev-seats i{position:relative;flex:1;max-width:44px;height:30px;border-radius:9px 9px 6px 6px;background:rgb(var(--ink-rgb) / .09);transition:background-color .35s var(--out),transform .5s var(--land)}
.ev-seats i::after{content:"";position:absolute;left:12%;right:12%;bottom:-5px;height:4px;border-radius:0 0 4px 4px;background:inherit}
.ev-seats i[data-on="1"]{background:var(--t);transform:translateY(-4px)}
@media(prefers-reduced-motion:reduce){.ev-seats i{transition:none}}

.ev-lad{display:grid;gap:8px;padding:20px 24px 22px}
.ev-lad-h{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:16px;font-weight:500;color:var(--ink)}
.ev-lad-h b{font-size:18px;font-weight:600;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums}
.ev-lad ol{display:flex;align-items:flex-end;gap:8px;margin:0;padding:0;list-style:none}
.ev-lad li{flex:1;display:grid;gap:5px;justify-items:stretch;text-align:center;font-size:14px;font-weight:500;color:var(--ink2);font-variant-numeric:tabular-nums}
.ev-lad li span{display:block;height:var(--h);min-height:8px;border-radius:7px;background:color-mix(in srgb,var(--t) calc(30% + var(--k) * 70%),var(--paper2));transform-origin:bottom;animation:ev-bar .7s var(--land) backwards;animation-delay:calc(.9s + var(--i) * .07s)}
@keyframes ev-bar{from{transform:scaleY(.2);opacity:0}}

.ev-perf{position:relative;height:0;margin:0 22px;border-top:2px dashed rgb(var(--ink-rgb) / .2)}
.ev-perf svg{position:absolute;left:-2px;top:-9px;width:16px;height:16px;padding:0 2px;background:var(--paper);color:var(--ink3)}
.ev-stub{display:flex;align-items:center;justify-content:space-between;gap:14px;height:var(--stub);padding:0 18px 0 24px}
.ev-stub-p{display:grid;gap:3px;line-height:1}
.ev-stub-p small{font-size:15px;font-weight:500;color:var(--ink2)}
.ev-stub-p b{font-size:38px;font-weight:600;letter-spacing:-.04em;font-variant-numeric:tabular-nums}

/* below the stage: game day */
.ev-day{--g:clamp(18px,3.6vw,60px);max-width:1440px;margin-inline:auto;padding:clamp(36px,6vw,72px) clamp(18px,3.6vw,60px) clamp(56px,8vw,96px)}
@media(max-width:959px){.ev-day{padding-bottom:calc(120px + env(safe-area-inset-bottom))}}
.ev-h2{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:4px 16px;margin:0 0 clamp(18px,3vw,32px);padding-inline:4px;font-size:clamp(28px,3.4vw,44px);font-weight:500;letter-spacing:-.045em;line-height:1.05}
.ev-h2 small{font-size:17px;font-weight:500;letter-spacing:0;color:var(--ink2);font-variant-numeric:tabular-nums}

/* game night: the venue photograph is the stage; the facts are die-cut mini tickets pinned on it */
.nt-wrap{position:relative}
.nt-stage{position:relative;display:flex;flex-direction:column;justify-content:flex-end;min-height:clamp(480px,46vw,600px);border-radius:36px;overflow:hidden;isolation:isolate;color:var(--on-photo);background:var(--photo-bg)}
.nt-bg{position:absolute;inset:0;z-index:-1}
.nt-bg img{display:block;width:100%;height:100%;object-fit:cover;transform:scale(1.04);transition:transform 1.4s var(--out)}
@media(hover:hover) and (pointer:fine){.nt-stage:hover .nt-bg img{transform:scale(1.09)}}
.nt-flat{position:absolute;inset:0;background:linear-gradient(160deg,color-mix(in srgb,var(--t) 88%,transparent),color-mix(in srgb,var(--t) 55%,var(--shade) 30%))}
.nt-bg .ev-floor{opacity:.34;bottom:-6%}
.nt-scrim{position:absolute;inset:0;background:linear-gradient(0deg,color-mix(in srgb,var(--shade) 92%,transparent) 0,color-mix(in srgb,var(--shade) 55%,transparent) 38%,transparent 72%),linear-gradient(90deg,color-mix(in srgb,var(--shade) 42%,transparent),transparent 60%)}
.nt-main{display:grid;gap:10px;justify-items:start;padding:clamp(22px,3.6vw,48px);max-width:min(100%,820px)}
.nt-head,.nt-body{display:contents}
.nt-k{margin:0;font-size:16px;font-weight:500;color:color-mix(in srgb,var(--on-photo) 86%,transparent)}
.nt-name{margin:0;font-size:clamp(34px,5.6vw,76px);font-weight:500;letter-spacing:-.055em;line-height:.94;text-wrap:balance;text-shadow:0 2px 30px color-mix(in srgb,var(--shade) 45%,transparent)}
.nt-addr{display:flex;align-items:flex-start;gap:8px;margin:0;font-size:clamp(16px,1.45vw,19px);line-height:1.4;font-weight:500;color:color-mix(in srgb,var(--on-photo) 92%,transparent)}
.nt-addr svg{flex:none;margin-top:3px}
.nt-addr em{font-style:normal;color:color-mix(in srgb,var(--on-photo) 70%,transparent)}
.nt-go{margin-top:6px}

/* the route: doors to the start, with a puck that moves as the time does */
.nt-route{position:relative;display:grid;grid-template-columns:auto minmax(60px,1fr) auto;align-items:center;gap:6px 16px;width:min(100%,640px);margin-top:clamp(10px,2vw,22px);padding:12px 20px;border-radius:999px;background:color-mix(in srgb,var(--shade) 42%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--on-photo) 16%,transparent)}
.nt-route p{display:grid;gap:3px;margin:0;font-size:14px;line-height:1.1;color:color-mix(in srgb,var(--on-photo) 82%,transparent)}
.nt-route p:last-of-type{text-align:right}
.nt-route b{font-size:20px;font-weight:600;letter-spacing:-.025em;color:var(--on-photo);font-variant-numeric:tabular-nums}
.nt-track{position:relative;height:4px;border-radius:4px;background:color-mix(in srgb,var(--on-photo) 26%,transparent)}
.nt-track::before{content:"";position:absolute;left:0;top:0;height:100%;width:calc(var(--p) * 100%);border-radius:4px;background:var(--on-photo);transition:width 1s var(--out)}
.nt-track::after{content:"";position:absolute;top:50%;left:calc(var(--p) * 100%);width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--t2);box-shadow:0 0 0 3px var(--on-photo),0 0 22px var(--t2);transition:left 1s var(--out)}
.nt-live{position:absolute;left:50%;top:-11px;translate:-50% 0;padding:3px 11px;border-radius:999px;background:var(--on-photo);color:var(--photo-bg);font-size:14px;font-style:normal;font-weight:600;white-space:nowrap}

/* the facts as mini tickets: a tinted stub with the icon, a perforation, then the words */
.nt-tags{display:grid;gap:12px;margin:0;padding:0;list-style:none}
.nt-tag{display:grid;grid-template-columns:62px 1fr;align-items:stretch;border-radius:18px;background:var(--paper);color:var(--ink);filter:drop-shadow(0 14px 22px color-mix(in srgb,var(--shade) 32%,transparent));-webkit-mask:radial-gradient(circle 9px at 62px 0,#0000 97%,#000) top/100% 51% no-repeat,radial-gradient(circle 9px at 62px 100%,#0000 97%,#000) bottom/100% 51% no-repeat;mask:radial-gradient(circle 9px at 62px 0,#0000 97%,#000) top/100% 51% no-repeat,radial-gradient(circle 9px at 62px 100%,#0000 97%,#000) bottom/100% 51% no-repeat}
.nt-ic{display:grid;place-items:center;border-radius:18px 0 0 18px;background:color-mix(in srgb,var(--t) 14%,var(--paper));color:var(--t);font-size:26px}
.nt-tx{display:grid;gap:2px;align-content:center;padding:14px 16px 14px 18px;border-left:2px dashed rgb(var(--ink-rgb) / .18)}
.nt-tx b{font-size:19px;font-weight:600;letter-spacing:-.025em;line-height:1.15}
.nt-tx small{font-size:15px;line-height:1.35;color:var(--ink2)}
@media(min-width:960px){
.nt-tags{position:absolute;right:clamp(18px,2.6vw,36px);top:clamp(18px,2.6vw,36px);width:min(340px,30%);z-index:2}
}

/* phones: the first screen is the title, the date and the ticket, and nothing else. The stage is a full screen tall with its content sitting at the bottom, so there is open
   colour above it (under the navigation) and room around every part; everything that only decorates steps aside, tap targets are generous, and the sticky bar only appears once
   the ticket's own button has scrolled away. Spacing steps are 8, 16, 24, 32 and 56. */
@media(max-width:959px){
.ev-stage.tm-hero{min-height:calc(100svh - 16px)}
.ev-in{gap:clamp(14px,3svh,32px);align-content:end;padding:clamp(84px,13svh,120px) 24px clamp(16px,3svh,32px)}
.ev-copy{gap:clamp(8px,1.5svh,12px)}
.ev-meta-venue,.ev-meta i,.ev-cd,.ev-lad{display:none}
.ev-sides{--cw:clamp(52px,min(24vw,9.5svh),104px);gap:10px;padding-bottom:clamp(2px,1.4svh,12px)}
.ev-sides .tm-vs{width:clamp(28px,4.6svh,36px);font-size:13px}
.ev-solo{--cw:clamp(56px,min(26vw,10.5svh),112px)}
.ev-copy .tm-eyebrow{display:none}
.ev-copy .tm-hl{font-size:clamp(26px,min(10vw,5.3svh),46px);line-height:1;letter-spacing:-.05em;max-width:none}
.ev-meta{font-size:clamp(15px,2.2svh,17px);gap:2px 10px}
.ev-tkw{max-width:none;justify-self:stretch}
.ev-tk-top,.ev-seats,.ev-lad ol,.ev-perf{display:none}
.ev-party{gap:clamp(8px,2svh,16px);padding:clamp(16px,2.8svh,24px) 24px clamp(14px,2.6svh,24px)}
.ev-big{font-size:clamp(44px,8svh,64px)}
.ev-stub{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:clamp(10px,2svh,16px);height:auto;padding:clamp(12px,2.4svh,20px) 20px clamp(12px,2.4svh,20px) 24px;border-top:2px dashed rgb(var(--ink-rgb) / .16)}
.ev-stub-p b{font-size:clamp(24px,3.8svh,30px)}
.ev-stub>button{flex:1 1 140px}
@media(max-height:620px){.ev-sides{display:none}}
.ev-day{padding-top:56px}
.ev-h2{font-size:30px;margin-bottom:24px}
/* game night on a phone: a short photograph with only the venue's name on it, then everything else on paper (address, directions, the two times as tiles, the facts as a quiet list) */
.nt-stage{display:grid;grid-template-columns:minmax(0,1fr);min-height:0;overflow:visible;border-radius:0;background:none;color:var(--ink)}
.nt-bg{position:relative;grid-area:1/1;inset:auto;z-index:0;height:clamp(230px,64vw,300px);border-radius:28px;overflow:hidden}
.nt-scrim{background:linear-gradient(0deg,color-mix(in srgb,var(--shade) 88%,transparent) 0,color-mix(in srgb,var(--shade) 40%,transparent) 48%,transparent 78%)}
.nt-main{display:contents}
.nt-head{display:grid;gap:6px;grid-area:1/1;align-self:end;z-index:1;padding:20px 22px;color:var(--on-photo)}
.nt-k{font-size:15px}
.nt-name{font-size:clamp(30px,9.4vw,40px)}
.nt-body{display:grid;grid-area:2/1;gap:16px;padding:20px 4px 0;color:var(--ink)}
.nt-addr,.nt-addr em{color:var(--ink2);font-size:16px;font-weight:500}
.nt-addr svg{color:var(--t)}
.nt-go{margin:0}
.nt-go>a{width:100%}
.nt-route{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;margin:0;padding:0;border-radius:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.nt-route p,.nt-route p:last-of-type{display:grid;align-content:center;gap:2px;padding:14px 16px;border-radius:18px;background:var(--paper2);font-size:14px;text-align:left;color:var(--ink2)}
.nt-route b{font-size:22px;letter-spacing:-.03em;color:var(--ink)}
.nt-track{display:none}
.nt-live{position:static;translate:none;order:-1;grid-column:1/-1;display:flex;align-items:center;gap:9px;padding:0;background:none;color:var(--ink);font-size:16px}
.nt-live::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 0 4px color-mix(in srgb,var(--t) 22%,transparent)}
.nt-tags{display:grid;gap:0;overflow:visible;margin:12px 0 0;padding:0;scroll-snap-type:none;position:static}
.nt-tag{display:grid;grid-template-columns:44px 1fr;gap:14px;width:auto;padding:16px 4px;border-top:1px solid rgb(var(--ink-rgb) / .1);border-radius:0;background:none;filter:none;-webkit-mask:none;mask:none;transform:none!important}
.nt-ic{width:44px;height:44px;border-radius:14px;background:var(--paper2);font-size:22px}
.nt-tx{padding:0;border-left:0}
.nt-tx b{font-size:17px}
.nt-tx small{font-size:15px}
.ev .pg-bar{transition:transform .4s var(--out),opacity .3s}
.ev .pg-bar[data-show="0"]{transform:translateY(160%);opacity:0;pointer-events:none}
}
@media(max-width:959px) and (prefers-reduced-motion:reduce){.ev .pg-bar{transition:none}}

/* the sticky buy bar: price in title size, the line under it a readable caption */
.ev .pg-bar b{font-size:21px}
.ev .pg-bar small{font-size:14px}

/* the page is still, and nothing is waiting, when motion is off */
@media(prefers-reduced-motion:reduce){.ev-floor path,.ev-floor circle,.ev-floor rect,.ev-floor line{animation:none;stroke-dashoffset:0}.ev-tkw,.ev-cd,.ev-meta{animation:none;opacity:1}.ev-lad li span{animation:none}}
`;
