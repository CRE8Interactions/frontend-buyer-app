/* /login: the games waiting behind your account. Real upcoming games as ticket stubs drifting past (static, no images), with the sign-in at the centre.
   The stage is always dark like the browse headliner, so the nav reads at the top. */
export const LG_CSS = `
.lg{--out:cubic-bezier(.23,1,.32,1)}
.lg ::selection{background:rgb(var(--green-rgb) / .35)}
.lg-logo{position:absolute;top:clamp(24px,4vh,40px);left:50%;translate:-50% 0;display:block;z-index:2;border-radius:8px}
.lg-logo{display:grid!important}
.lg-logo img{grid-area:1/1;display:block;height:24px;width:auto}
.lg-logo-d{opacity:var(--logo-inv,1)}
.lg-logo-l{opacity:calc(1 - var(--logo-inv,1))}
.lg-logo:focus-visible{outline:2px solid var(--ink);outline-offset:6px}
.lg-wrap{min-height:100svh}
.lg-stage{position:relative;isolation:isolate;overflow:hidden;min-height:100svh;background:var(--paper);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:clamp(104px,15vh,140px) 20px 24px}
.lg-wall{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;-webkit-mask-image:radial-gradient(ellipse 52% 60% at 50% 50%,transparent 0,transparent 70%,#000 100%);mask-image:radial-gradient(ellipse 52% 60% at 50% 50%,transparent 0,transparent 70%,#000 100%)}
.lg-tilt{position:absolute;left:-20%;right:-20%;top:50%;transform:translateY(-50%) rotate(-7deg);display:grid;gap:16px}
.lg-row{display:flex;width:max-content;animation:lg-drift var(--dur) linear var(--off,0s) infinite;will-change:transform}
.lg-track{display:flex;gap:16px;padding-right:16px}
.lg-stub{display:flex;align-items:stretch;flex:none;width:340px;height:76px;border-radius:16px;background:var(--paper2);border:1px solid var(--line);opacity:.65;transition:border-color .7s var(--out),opacity .7s var(--out)}
.lg-date{display:grid;place-content:center;gap:2px;width:68px;border-right:2px dashed var(--line-2);text-align:center}
.lg-date i{font-style:normal;font-size:13px;color:var(--ink2)}
.lg-date b{font-size:24px;line-height:1;font-weight:600;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.lg-info{display:grid;align-content:center;gap:3px;padding:0 16px;min-width:0;text-align:left}
.lg-info strong{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lg-info small{font-size:13px;color:var(--ink2)}
.lg-stage[data-done="1"] .lg-stub{border-color:var(--green);opacity:1}
/* Chrome draws autofilled text with its own font size. Pin it to the size the library gives the field (lg 18px, md 16px on phones), so autofilled and typed text match */
.lg{--lg-field-fs:1.125rem}
.lg input:-webkit-autofill,.lg input:autofill{font-size:var(--lg-field-fs)!important}
@keyframes lg-drift{to{transform:translateX(-50%)}}
.lg-main{width:100%;max-width:400px;display:flex;flex-direction:column;align-items:center}
.lg-h1{font-size:clamp(40px,6.4vw,72px);line-height:.98;letter-spacing:-.04em;font-weight:600;text-wrap:balance}
.lg-sub{margin-top:14px;font-size:17px;line-height:1.5;color:var(--ink3);max-width:34ch;text-wrap:pretty}
.lg-title{font-size:var(--fs-title-lg);line-height:1.2;letter-spacing:-.02em;font-weight:600;text-align:center}
.lg-copy{margin-top:8px;font-size:15px;line-height:1.5;color:var(--ink2);text-wrap:pretty}
.lg-hint{margin-top:8px;font-size:13px;line-height:1.4;color:var(--ink2)}
.lg-ghost{position:absolute;inset:0;display:flex;align-items:center;overflow:hidden;white-space:pre;pointer-events:none;color:var(--ink2);opacity:.75;text-align:left}
.lg-accept{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center}
.lg-accept-key{display:none}
@media(hover:hover) and (pointer:fine){.lg-accept-key{display:flex}.lg-accept-btn{display:none!important}}
.lg-ghost-s{pointer-events:auto;cursor:pointer}
.lg-suggest{display:grid;gap:2px;margin-top:10px;padding:12px 14px;border-radius:12px;border:1px solid var(--line-2);background:var(--paper2);text-align:left}
.lg-suggest-q{font-size:13px;line-height:1.4;color:var(--ink2)}
.lg-suggest-a{font-size:15px;line-height:1.5;font-weight:500;color:var(--ink);overflow-wrap:anywhere}
.lg-suggest-a em{font-style:normal;font-weight:600;color:var(--green-ink);white-space:nowrap}
.lg-suggest-actions{display:flex;gap:8px;margin-top:10px}
.lg-suggest-actions>*{flex:1}
.lg-err{margin-top:8px;font-size:13px;color:var(--danger)}
.lg-or{display:flex;align-items:center;gap:12px;margin:14px 0;font-size:13px;color:var(--ink2)}
.lg-or::before,.lg-or::after{content:"";height:1px;flex:1;background:var(--line)}
.lg-grid{display:grid;gap:14px;grid-template-columns:1fr}
.lg-verified{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;border:1px solid var(--line);background:var(--paper2);font-size:15px}
.lg-verified span{color:var(--ink2)}
.lg-verified b{font-weight:500;min-width:0}
.lg-verified i{font-style:normal;font-size:13px;color:var(--green-ink)}
.lg-center{display:flex;justify-content:center;margin-top:12px}
.lg-bottom{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:14px;padding-top:24px}
.lg-foot{position:relative;background:var(--paper);padding:6px 16px;border-radius:999px;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 16px}
.lg .phone-input .PhoneInputInput{color:var(--ink)}
.lg-in{animation:lg-in .6s var(--out) both}
@keyframes lg-in{from{opacity:0;transform:translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
.lg-form{width:100%;margin-top:clamp(28px,5vh,44px);text-align:left;transition:opacity .4s var(--out),transform .6s var(--out)}
.lg-done{display:grid;justify-items:center;gap:18px;text-align:center}
/* phones: no box. The same fade-out gradient as desktop keeps the cards from running behind the headline and the form */
@media(max-width:639px){
  .lg-stage{padding-inline:16px}
  .lg-sub{font-size:15px;max-width:32ch}
  .lg{--lg-field-fs:1rem}
  .lg-wall{opacity:.6;-webkit-mask-image:radial-gradient(ellipse 100% 40% at 50% 40%,transparent 0,transparent 66%,#000 100%);mask-image:radial-gradient(ellipse 100% 40% at 50% 40%,transparent 0,transparent 66%,#000 100%)}
}
@media(prefers-reduced-motion:reduce){.lg-in{animation:none}.lg-row{animation:none}}
`;
