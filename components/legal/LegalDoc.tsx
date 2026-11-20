import Link from "next/link";
import { Geist } from "next/font/google";
import Nav from "@/app/concept/Nav";
import Footer from "@/app/concept/Footer";
import { CSS } from "@/app/concept/styles";
import Button from "@/components/atoms/Button";
import { policies, type PolicyBlock } from "@/lib/policies-data";
import { LEGAL_CSS } from "./legal-styles";
import LegalRail from "./LegalRail";
import LegalSwitch from "./LegalSwitch";

const sans = Geist({ subsets: ["latin"], display: "swap" });

const ROUTES: Record<string, string> = {
  purchase: "/purchase-policy",
  terms: "/terms-conditions",
  privacy: "/privacy-policy",
  disclaimer: "/disclaimer",
  cookies: "/cookies-policy",
};

type Section = { id: string; title: string; blocks: PolicyBlock[] };

/* ids come from the heading text and are made unique within one document */
function build(blocks: PolicyBlock[]) {
  const lead: PolicyBlock[] = [];
  const sections: Section[] = [];
  const seen = new Set<string>();
  for (const b of blocks) {
    if (b.type === "h2") {
      let id = b.text.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
      while (seen.has(id)) id += "-2";
      seen.add(id);
      sections.push({ id, title: b.text, blocks: [] });
    } else if (sections.length) sections[sections.length - 1].blocks.push(b);
    else lead.push(b);
  }
  return { lead, sections };
}

/* consecutive list items become one <ul>; every paragraph and list gets an id so the timeline can point at it */
type Item = { kind: "h3" | "p" | "ul"; id?: string; text?: string; items?: string[] };
function group(sid: string, blocks: PolicyBlock[]): Item[] {
  const out: Item[] = [];
  let k = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "li") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].type === "li") items.push(blocks[i++].text);
      i--;
      out.push({ kind: "ul", id: `${sid}__${k++}`, items });
    } else if (b.type === "h3") out.push({ kind: "h3", text: b.text });
    else out.push({ kind: "p", id: `${sid}__${k++}`, text: b.text });
  }
  return out;
}

function Blocks({ sid, blocks }: { sid: string; blocks: PolicyBlock[] }) {
  return (
    <>
      {group(sid, blocks).map((it, i) =>
        it.kind === "ul" ? <ul key={i} id={it.id} className="lg-ul">{it.items!.map((t, k) => <li key={k}>{t}</li>)}</ul>
        : it.kind === "h3" ? <h3 key={i} className="lg-h3">{it.text}</h3>
        : <p key={i} id={it.id} className="lg-p">{it.text}</p>
      )}
    </>
  );
}

const pad = (n: number) => String(n + 1).padStart(2, "0");

export default function LegalDoc({ slug }: { slug: string }) {
  const doc = policies.find((d) => d.slug === slug) ?? policies[0];
  const { lead, sections } = build(doc.blocks);

  return (
    <div className={`n lg ${sans.className}`} style={{ ["--font-mono-n" as string]: sans.style.fontFamily }}>
      <style dangerouslySetInnerHTML={{ __html: CSS + LEGAL_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <Nav />

      <main className="lg-body">
        <div className="n-wrap">
          <header className="lg-hd">
            <h1 className="lg-h1">{doc.title}<i>.</i></h1>
            <div className="lg-meta">
              <span>Last updated {doc.updated}</span>
              <LegalSwitch current={doc.slug} docs={policies.map((d) => ({ slug: d.slug, title: d.title, href: ROUTES[d.slug] }))} />
            </div>
          </header>

          <div className="lg-grid">
            <aside className="lg-rail">
              <LegalRail sections={sections.map((x) => {
                const text = x.blocks.map((b) => b.text).join(" ");
                const paras = group(x.id, x.blocks).filter((it) => it.id).map((it) => {
                  const t = it.text ?? it.items!.join(" ");
                  return { id: it.id!, len: t.length, snip: t.slice(0, 90) };
                });
                return { id: x.id, title: x.title, text, len: text.length, paras };
              })} />
            </aside>

            <article className="lg-prose">
              {lead.length > 0 && <div className="lg-lead">{lead.map((b, i) => <p key={i} style={i ? { marginTop: 14 } : undefined}>{b.text}</p>)}</div>}
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="lg-sec" tabIndex={-1}>
                  <h2 className="lg-h2"><span>{pad(i)}</span>{s.title}</h2>
                  <Blocks sid={s.id} blocks={s.blocks} />
                </section>
              ))}
              <div className="lg-ask">
                <div><b>Questions about this document?</b><p>Write to us and a person will answer.</p></div>
                <Button href="mailto:help@blocktickets.xyz" variant="secondary" size="md">help@blocktickets.xyz</Button>
              </div>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
