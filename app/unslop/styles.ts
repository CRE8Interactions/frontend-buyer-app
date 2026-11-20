/* Landing page styles, scoped under .u.
   Tokens: field var(--paper), raised #0A2747, text #F5F7FA / #BCBFCC / #9DA2B3,
   hairline rgba(255,255,255,.1), accent var(--green) (actions, live and selected states only).
   Spacing on a 4px grid. Weights 400 / 500 / 600. */
export const CSS = `
.u{--bg:var(--paper);--raised:#0A2747;--tile:#06203c;--t1:#F5F7FA;--t2:#BCBFCC;--t3:#9DA2B3;--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.16);--acc:var(--green);
  --ease:cubic-bezier(.2,.7,.2,1);background:var(--bg);color:var(--t1);font-feature-settings:"cv11","ss03";}
.u *{box-sizing:border-box}
.u b{font-weight:500;color:var(--t1)}
.u-mono{font-family:var(--font-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:0}
.u-wrap{width:100%;max-width:1200px;margin-inline:auto;padding-inline:24px}
@media(min-width:1024px){.u-wrap{padding-inline:40px}}
.u-sec{border-top:1px solid var(--line);padding-block:96px}
@media(max-width:720px){.u-sec{padding-block:72px}}
.u-meta{font-family:var(--font-mono),ui-monospace,monospace;font-size:13px;line-height:20px;color:var(--t3);margin:0 0 20px}

/* type */
.u-display{font-size:clamp(44px,6.6vw,84px);line-height:1.04;letter-spacing:-.035em;font-weight:500;margin:0;max-width:16ch}
.u-display em{font-style:normal;color:var(--acc)}
.u-display-sm{font-size:clamp(32px,4.4vw,56px);max-width:24ch;line-height:1.1;letter-spacing:-.03em;color:var(--t3)}
.u-h2{font-size:clamp(24px,2.9vw,36px);line-height:1.2;letter-spacing:-.025em;font-weight:500;color:var(--t3);margin:0;max-width:36ch}
.u-h2 b,.u-display-sm b{color:var(--t1)}
.u-h3{font-size:20px;line-height:28px;letter-spacing:-.01em;font-weight:500;color:var(--t1);margin:0 0 8px}
.u-h3 b{color:var(--t1);font-weight:600}
.u-lede{font-size:clamp(18px,1.6vw,20px);line-height:1.55;color:var(--t2);margin:24px 0 0;max-width:46ch}
.u-body{font-size:16px;line-height:24px;color:var(--t3);margin:0;max-width:52ch}

/* actions */
.u-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;margin-top:32px}
.u-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:8px;font-size:15px;font-weight:500;text-decoration:none;transition:background-color .15s var(--ease),color .15s var(--ease),border-color .15s var(--ease)}
.u-btn:focus-visible,.u-link:focus-visible,.u-case:focus-visible,.u-news:focus-visible{outline:2px solid var(--t1);outline-offset:3px}
.u-btn-primary{background:var(--acc);color:var(--paper)}
.u-btn-primary:hover{background:#b9ef93}
.u-btn-quiet{color:var(--t1);border:1px solid var(--line2)}
.u-btn-quiet:hover{background:rgba(255,255,255,.06)}
.u-link{display:inline-flex;align-items:center;gap:6px;margin-top:24px;font-size:15px;font-weight:500;color:var(--t2);text-decoration:none;transition:color .15s var(--ease)}
.u-link:hover{color:var(--t1)}
.u-link i,.u-news i{font-style:normal}
.u-note{font-size:15px;color:var(--t3)}
.u-mt{margin-top:32px}

/* hero */
.u-hero{position:relative;overflow:hidden;padding-top:72px;min-height:calc(100svh - 70px)}
.u-hero-bg{position:absolute;inset:0;z-index:0}
.u-hero-bg img,.u-hero-bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 22%}
.u-hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb, var(--paper) 92%, transparent) 0%,color-mix(in srgb, var(--paper) 62%, transparent) 48%,color-mix(in srgb, var(--paper) 35%, transparent) 100%),linear-gradient(to bottom,color-mix(in srgb, var(--paper) 20%, transparent) 0%,color-mix(in srgb, var(--paper) 0%, transparent) 40%,var(--paper) 100%)}
.u-hero-copy,.u-hero-view{position:relative;z-index:1}
.u-news{display:inline-flex;align-items:center;gap:8px;margin-bottom:28px;font-size:14px;color:var(--t2);text-decoration:none}
.u-news span{color:var(--t1);font-weight:500}
.u-news:hover{color:var(--t1)}
.u-hero-view{margin-top:56px;height:360px;overflow:hidden}
@media(prefers-reduced-motion:reduce){.u-video{display:none}.u *{transition:none!important}}

/* product window */
.u-win{border:1px solid var(--line2);border-bottom:0;border-radius:16px 16px 0 0;background:rgba(6,32,60,.92);box-shadow:0 -1px 0 rgba(255,255,255,.04) inset}
.u-win-bar{display:flex;align-items:center;gap:16px;padding:12px 20px;border-bottom:1px solid var(--line);font-size:13px;color:var(--t3)}
.u-win-bar .u-mono{color:var(--t1)}
.u-win-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.u-live{display:inline-flex;align-items:center;gap:8px;color:var(--t2)}
.u-live i{width:8px;height:8px;border-radius:2px;background:var(--acc)}
.u-win-body{padding:24px 20px}
.u-win-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:24px}
@media(max-width:720px){.u-win-kpis{grid-template-columns:repeat(2,1fr);gap:16px}.u-hero-view{height:320px}}

/* kpis */
.u-kpi{display:flex;flex-direction:column;gap:4px}
.u-kv{font-size:28px;line-height:32px;font-weight:500;letter-spacing:-.025em;font-variant-numeric:tabular-nums;color:var(--t1)}
.u-kl{font-size:13px;line-height:20px;color:var(--t3)}

/* tables */
.u-table{width:100%;border-collapse:collapse;font-size:15px}
.u-table th{font-weight:400;font-size:13px;color:var(--t3);text-align:left;padding:8px 12px 8px 0;border-bottom:1px solid var(--line)}
.u-table td{padding:12px 12px 12px 0;border-bottom:1px solid var(--line);color:var(--t2);vertical-align:middle}
.u-table td:first-child{color:var(--t1)}
.u-table .r{text-align:right;padding-right:0}
.u-table tfoot td{border-bottom:0;color:var(--t3)}
.u-total{color:var(--t1)!important}
.u-table-sm td{padding:8px 12px 8px 0}
.u-fill{display:inline-block;vertical-align:middle;width:min(160px,100%);height:4px;border-radius:2px;background:var(--line)}
.u-fill i{display:block;height:100%;border-radius:2px;background:var(--t2)}
.u-pct{margin-left:12px;font-size:13px;color:var(--t3)}
.u-table-sm th:nth-child(4),.u-table-sm td:nth-child(4){padding-left:32px;white-space:nowrap}
.u-table-sm .u-fill{width:min(120px,50%)}
@media(max-width:720px){.u-table-sm th:nth-child(3),.u-table-sm td:nth-child(3){display:none}.u-fill{width:56px}.u-table{font-size:14px}}

/* partners */
.u-logos{list-style:none;margin:56px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-left:1px solid var(--line)}
.u-logos li{display:flex;align-items:center;justify-content:center;height:96px;padding:20px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff}
.u-logos img{max-height:48px;max-width:150px;width:auto;object-fit:contain}
@media(max-width:720px){.u-logos{grid-template-columns:repeat(2,1fr)}}
.u-tags{display:flex;flex-wrap:wrap;gap:8px 24px;margin:24px 0 0;font-family:var(--font-mono),ui-monospace,monospace;font-size:13px;color:var(--t3)}

/* value + cards */
.u-split{display:grid;gap:48px;align-items:start}
@media(min-width:960px){.u-split{grid-template-columns:7fr 5fr;gap:80px}}
.u-panel,.u-card{border:1px solid var(--line);border-radius:16px;background:var(--raised)}
.u-panel{padding:32px}
.u-checks{list-style:none;margin:24px 0 0;padding:0;display:grid;gap:12px}
.u-checks li{display:flex;gap:12px;font-size:16px;line-height:24px;color:var(--t2)}
.u-checks i{flex:none;width:6px;height:6px;margin-top:9px;border-radius:1px;background:var(--t3)}
.u-grid{display:grid;gap:16px;margin-top:56px}
@media(min-width:960px){.u-grid{grid-template-columns:repeat(6,1fr)}.u-c4{grid-column:span 4}.u-c2{grid-column:span 2}.u-c6{grid-column:span 6}.u-r2{grid-row:span 2}}
.u-card{padding:28px;display:flex;flex-direction:column;transition:border-color .15s var(--ease)}
.u-card:hover{border-color:var(--line2)}
.u-card .u-meta{margin-bottom:12px}
.u-wide{display:grid;gap:32px;align-items:center}
@media(min-width:960px){.u-wide{grid-template-columns:1fr 360px}}
.u-seats{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;margin-bottom:28px}
.u-seats i{height:20px;border-radius:3px;background:rgba(255,255,255,.22)}
.u-seats i.tk{background:rgba(255,255,255,.07)}
.u-seats i.sel{background:var(--acc)}
.u-ren{border:1px solid var(--line);border-radius:12px;background:var(--bg);padding:20px}
.u-ren small{display:block;margin-top:2px;font-size:13px;color:var(--t3);font-weight:400}
.u-ren .u-mono{font-size:13px;color:var(--t2)}
.u-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:14px;color:var(--t3)}
.u-bar{height:4px;margin-top:12px;border-radius:2px;background:var(--line);overflow:hidden}
.u-bar i{display:block;height:100%;border-radius:2px;background:var(--t2)}

/* outcomes: ticket stub with perforated dividers */
.u-stub{display:grid;margin:56px 0 0;border:1px solid var(--line);border-radius:16px;background:var(--raised)}
@media(min-width:960px){.u-stub{grid-template-columns:repeat(4,1fr)}}
@media(min-width:600px) and (max-width:959px){.u-stub{grid-template-columns:repeat(2,1fr)}}
.u-stub-cell{position:relative;padding:32px 28px;margin:0}
.u-stub-cell+.u-stub-cell{border-top:1px dashed var(--line2)}
@media(min-width:600px){.u-stub-cell+.u-stub-cell{border-top:0;border-left:1px dashed var(--line2)}
  .u-stub-cell+.u-stub-cell::before,.u-stub-cell+.u-stub-cell::after{content:"";position:absolute;left:-8px;width:15px;height:15px;border-radius:50%;background:var(--bg);border:1px solid var(--line)}
  .u-stub-cell+.u-stub-cell::before{top:-8px}.u-stub-cell+.u-stub-cell::after{bottom:-8px}}
@media(min-width:600px) and (max-width:959px){.u-stub-cell:nth-child(3){border-left:0;border-top:1px dashed var(--line2)}.u-stub-cell:nth-child(3)::before,.u-stub-cell:nth-child(3)::after{display:none}}
.u-num{font-size:clamp(40px,4.4vw,56px);line-height:1;font-weight:500;letter-spacing:-.04em;font-variant-numeric:tabular-nums;margin:0;color:var(--t1)}
.u-stat-l{font-size:16px;font-weight:500;color:var(--t1);margin:20px 0 8px}
.u-stat-d{font-size:15px;line-height:22px;color:var(--t3);margin:0}

/* engine */
.u-steps{list-style:none;margin:64px 0 0;padding:0;border-top:1px solid var(--line)}
.u-step{display:grid;gap:32px;padding:48px 0;border-bottom:1px solid var(--line)}
@media(min-width:960px){.u-step{grid-template-columns:4fr 8fr;gap:64px}}
.u-step-d{min-width:0}
.u-step-d .u-row{margin-bottom:16px}
.u-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:20px}
@media(max-width:720px){.u-kpis{grid-template-columns:1fr}}
.u-ticks{list-style:none;margin:24px 0 0;padding:0;display:grid;gap:8px;font-size:15px;color:var(--t2)}
.u-ticks li{display:flex;gap:12px}
.u-ticks li::before{content:"";flex:none;width:6px;height:6px;margin-top:9px;border-radius:1px;background:var(--t3)}
.u-chart{display:flex;align-items:flex-end;gap:12px;height:220px;margin-top:8px;padding-top:24px;border-bottom:1px solid var(--line)}
.u-col{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px;position:relative}
.u-col i{display:block;width:100%;border-radius:4px 4px 0 0;background:rgba(255,255,255,.22)}
.u-col i.hot{background:var(--acc)}
.u-val{font-size:12px;color:var(--t3)}
.u-lab{position:absolute;bottom:-28px;font-size:12px;color:var(--t3)}
.u-chart+*{margin-top:0}
.u-step:nth-child(2) .u-step-d{padding-bottom:28px}
.u-split-row{margin-bottom:24px}
.u-split-row .u-row{margin-bottom:8px}
.u-split-row .u-row b{font-weight:400;color:var(--t1);font-size:14px}
.u-bar2{height:8px;margin-bottom:4px;border-radius:2px;background:var(--line)}
.u-bar2 i{display:block;height:100%;border-radius:2px}
.u-bar2 i.a,.u-legend i.a{background:rgba(255,255,255,.34)}
.u-bar2 i.b,.u-legend i.b{background:var(--acc)}
.u-legend{display:flex;gap:24px;margin:0;font-size:13px;color:var(--t3)}
.u-legend span{display:inline-flex;align-items:center;gap:8px}
.u-legend i{width:10px;height:10px;border-radius:2px}

/* why switch */
.u-list{list-style:none;margin:56px 0 0;padding:0;border-top:1px solid var(--line)}
.u-list li{display:grid;gap:8px 32px;padding:32px 0;border-bottom:1px solid var(--line)}
@media(min-width:960px){.u-list li{grid-template-columns:64px 5fr 5fr;align-items:baseline}.u-list .u-h3{margin:0}}
.u-idx{font-size:13px;color:var(--t3)}

/* cases */
.u-cases{display:grid;gap:40px 24px;margin-top:56px}
@media(min-width:720px){.u-cases{grid-template-columns:repeat(2,1fr)}}
.u-case{display:block;text-decoration:none}
.u-case-img{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;margin-bottom:20px;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--tile)}
.u-case-img .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .4s var(--ease)}
.u-case-img::after{content:"";position:absolute;inset:0;background:radial-gradient(125% 125% at 50% 45%,color-mix(in srgb, var(--paper) 42%, transparent),color-mix(in srgb, var(--paper) 76%, transparent))}
.u-case-img .lg{position:relative;z-index:1;max-height:96px;max-width:56%;width:auto;object-fit:contain}
.u-case:hover .bg{transform:scale(1.02)}
.u-case .u-link{margin-top:16px}
.u-case:hover .u-link{color:var(--t1)}

/* testimonials */
.u-quotes{display:grid;gap:0;margin-top:8px;border-top:1px solid var(--line)}
@media(min-width:840px){.u-quotes{grid-template-columns:repeat(2,1fr)}.u-quote:nth-child(odd){border-right:1px solid var(--line);padding-right:48px}.u-quote:nth-child(even){padding-left:48px}}
.u-quote{margin:0;padding:40px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;justify-content:space-between;gap:32px}
.u-quote blockquote{margin:0;font-size:clamp(20px,2vw,24px);line-height:1.4;letter-spacing:-.015em;color:var(--t3)}
.u-quote blockquote b{color:var(--t1)}
.u-quote figcaption{display:flex;align-items:center;gap:16px}
.u-quote img{width:48px;height:48px;border-radius:50%;object-fit:cover}
.u-quote figcaption span{display:flex;flex-direction:column;gap:2px;font-size:15px}
.u-quote small{font-size:14px;color:var(--t3)}

/* cta */
.u-cta{padding-block:120px}
`;
