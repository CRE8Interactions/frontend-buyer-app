"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RailPara = { id: string; len: number; snip: string };
export type RailSection = { id: string; title: string; text: string; len: number; paras: RailPara[] };

const pad = (n: number) => String(n + 1).padStart(2, "0");

/* Left rail + jump/search dialog.
   The spine is one group per section, split into one piece per paragraph, each as tall as its text is long; the paragraph you are in fills as you read it.
   Scroll work writes to the segments' --p directly (no React render per frame). The same dialog is the phone's section menu. */
export default function LegalRail({ sections }: { sections: RailSection[] }) {
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const dlg = useRef<HTMLDialogElement>(null);
  const segs = useRef<(HTMLElement | null)[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const clearHit = useRef<number>(0);

  const total = useMemo(() => sections.reduce((a, s) => a + s.len, 0) || 1, [sections]);

  // scroll: which section, and how far through it
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id));
    let raf = 0, last = -1;
    const run = () => {
      raf = 0;
      const line = window.innerHeight * 0.3;
      let idx = 0;
      els.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= line) idx = i; });
      els.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = i < idx ? 1 : i > idx ? 0 : Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height)));
        segs.current[i]?.style.setProperty("--p", p.toFixed(3));
      });
      if (idx !== last) { last = idx; setCur(idx); els.forEach((el, i) => { if (el) { if (i === idx) el.setAttribute("data-live", ""); else el.removeAttribute("data-live"); } }); }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [sections]);

  // keep the current label inside the rail's own scroll area (moves the rail only, never the page)
  useEffect(() => {
    const el = segs.current[cur];
    const box = el?.closest<HTMLElement>(".lg-segs");
    if (!el || !box) return;
    const top = el.offsetTop - box.offsetTop, bottom = top + el.offsetHeight;
    if (top < box.scrollTop) box.scrollTop = top - 8;
    else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight + 8;
  }, [cur]);

  // labels that do not fit in two lines get the full title in a chip on hover
  useEffect(() => {
    const mark = () => segs.current.forEach((a) => { const b = a?.querySelector("b"); if (a && b) { if (b.scrollHeight > b.clientHeight + 1) a.setAttribute("data-cut", ""); else a.removeAttribute("data-cut"); } });
    mark();
    window.addEventListener("resize", mark);
    return () => window.removeEventListener("resize", mark);
  }, [sections]);

  // dialog open/close
  const show = useCallback(() => { setQ(""); setActive(0); setOpen(true); }, []);
  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); requestAnimationFrame(() => input.current?.focus()); }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) { e.preventDefault(); show(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return sections.map((s, i) => ({ s, i, snip: "" }));
    const out: { s: RailSection; i: number; snip: string }[] = [];
    sections.forEach((s, i) => {
      const inTitle = s.title.toLowerCase().includes(term);
      const at = s.text.toLowerCase().indexOf(term);
      if (!inTitle && at < 0) return;
      let snip = "";
      if (at >= 0) {
        const a = Math.max(0, at - 48), b = Math.min(s.text.length, at + term.length + 80);
        snip = (a > 0 ? "…" : "") + s.text.slice(a, b) + (b < s.text.length ? "…" : "");
      }
      out.push({ s, i, snip });
    });
    return out;
  }, [sections, term]);

  useEffect(() => setActive(0), [term]);

  const highlight = (id: string, needle: string) => {
    const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    if (!H || !reg || !needle) return;
    const root = document.getElementById(id);
    if (!root) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.textContent || "").toLowerCase();
      for (let at = t.indexOf(needle); at >= 0; at = t.indexOf(needle, at + needle.length)) {
        const r = new Range(); r.setStart(n, at); r.setEnd(n, at + needle.length); ranges.push(r);
      }
    }
    reg.set("lg-hit", new H(...ranges));
    window.clearTimeout(clearHit.current);
    clearHit.current = window.setTimeout(() => reg.delete("lg-hit"), 8000);
  };

  /* Own eased scroll: one curve for every jump, cancelled the moment the reader scrolls or presses a key.
     (The native smooth scroll was getting cut off when the dialog closed and handed focus back.) */
  const anim = useRef(0);
  const scrollTo = (el: HTMLElement) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clear = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const to = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - clear));
    const from = window.scrollY;
    cancelAnimationFrame(anim.current);
    if (reduce || Math.abs(to - from) < 4) { window.scrollTo(0, to); return; }
    const dur = Math.min(900, Math.max(450, Math.abs(to - from) * 0.35));
    const t0 = performance.now();
    const stop = () => { cancelAnimationFrame(anim.current); cleanup(); };
    const cleanup = () => { window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); window.removeEventListener("keydown", stop); };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4); // ease-out quart
      window.scrollTo(0, from + (to - from) * e);
      if (t < 1) anim.current = requestAnimationFrame(step); else cleanup();
    };
    anim.current = requestAnimationFrame(step);
  };

  const go = (id: string, needle = "") => {
    const d = dlg.current;
    if (d?.open) d.close();
    setOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    // wait a frame so the dialog is fully gone before the page moves
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      scrollTo(el);
      history.replaceState(null, "", `#${id}`);
      if (needle) highlight(id, needle);
    });
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].s.id, term); }
  };
  useEffect(() => {
    document.getElementById(`lg-r-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const s = sections[cur];
  return (
    <>
      {/* desktop spine */}
      <div className="lg-spine">
        <div className="lg-now">
          <span className="lg-count"><b>{pad(cur)}</b> / {String(sections.length).padStart(2, "0")}</span>
        </div>
        <ol className="lg-segs" aria-label="Sections">
          {sections.map((x, i) => (
            <li key={x.id}>
              <a ref={(el) => { segs.current[i] = el; }} href={`#${x.id}`} className="lg-seg" data-on={i === cur ? "1" : undefined} data-next={i > cur ? "1" : undefined} aria-current={i === cur ? "location" : undefined} aria-label={`${pad(i)} ${x.title}`}
                 onClick={(e) => { e.preventDefault(); go(x.id); }}>
                <i /><b>{x.title}</b><em>{x.title}</em>
              </a>
            </li>
          ))}
        </ol>
        <button type="button" className="lg-find" onClick={show}>
          <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden><path d="M229.66 218.34l-50.07-50.06a88.11 88.11 0 10-11.31 11.31l50.06 50.07a8 8 0 0011.32-11.32zM40 112a72 72 0 1172 72 72.08 72.08 0 01-72-72z" /></svg>
          Search this document <kbd>⌘K</kbd>
        </button>
      </div>

      {/* phone: one bar that opens the same dialog */}
      <button type="button" className="lg-bar" onClick={show}>
        <span><b>{pad(cur)}</b> {s?.title}</span>
        <em>Search</em>
      </button>

      <dialog ref={dlg} className="lg-dlg" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === dlg.current) setOpen(false); }} aria-label="Jump to a section or search this document">
        <div className="lg-dlg-in">
          <input ref={input} className="lg-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey} placeholder="Search this document" aria-label="Search this document" autoComplete="off" spellCheck={false} />
          <ul className="lg-res" role="listbox">
            {results.length === 0 && <li className="lg-none">Nothing matches “{q}”.</li>}
            {results.map((r, k) => (
              <li key={r.s.id} id={`lg-r-${k}`} role="option" aria-selected={k === active}>
                <button type="button" data-on={k === active ? "1" : undefined} onMouseMove={() => setActive(k)} onClick={() => go(r.s.id, term)}>
                  <span className="lg-r-n">{pad(r.i)}</span>
                  <span className="lg-r-b">
                    <span className="lg-r-t">{r.s.title}</span>
                    {r.snip && <span className="lg-r-s">{snippet(r.snip, term)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="lg-hint"><span>↑↓ to move</span><span>Enter to go</span><span>Esc to close</span></p>
        </div>
      </dialog>
    </>
  );
}

function snippet(text: string, term: string) {
  const i = text.toLowerCase().indexOf(term);
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + term.length)}</mark>{text.slice(i + term.length)}</>;
}
