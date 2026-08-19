import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import MarketingPage from "@/components/templates/MarketingPage";
import PageHero from "@/components/organisms/PageHero";
import Section from "@/components/molecules/Section";
import SectionHeader from "@/components/molecules/SectionHeader";
import CtaPanel from "@/components/molecules/CtaPanel";
import Eyebrow from "@/components/atoms/Eyebrow";
import Reveal from "@/components/atoms/Reveal";
import { ArrowRight } from "@/components/atoms/icons";
import { STUDIES, getStudy, type Block } from "../cases";
import { fitBrandedTitle, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return STUDIES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getStudy(slug);
  if (!s) {
    return pageMetadata({
      title: "Case Study | Blocktickets",
      description: "See how teams and venues grow with Blocktickets.",
      path: `/case-study/${slug}/`,
    });
  }
  return pageMetadata({
    title: fitBrandedTitle(`${s.team} Case Study`),
    description: s.sub,
    path: `/case-study/${s.slug}/`,
    image: s.img,
    type: "article",
    ogHeadline: s.team,
    subtitle: "Case study",
    cta: "Read Story",
  });
}

function OutcomeSection({ block }: { block: Block }) {
  return (
    <Section overflowHidden={false}>
      <Reveal>
        <SectionHeader eyebrow={block.eyebrow} title={block.title} titleMax="680px" lede={block.sub} ledeMax="640px" />
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {block.items.map((it, i) => (
          <Reveal key={it.t} delay={i * 70} className="card p-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#a6e773]/12 text-[22px]">{it.icon}</span>
            <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-white">{it.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[#9DA2B3]">{it.d}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getStudy(slug);
  if (!s) notFound();

  return (
    <MarketingPage>
      {/* ===== HERO ===== */}
      <PageHero
        img={s.img}
        wash={0.46}
        radial="ellipse 80% 75% at 30% 74%"
        radialOpacity={0.5}
        fadeMid="50%"
        fadeEnd="96%"
        className="flex min-h-[640px] flex-col overflow-hidden lg:min-h-[700px]"
      >
        <div className="container-x flex flex-1 flex-col pt-28 pb-14 lg:pt-32">
          <Link href="/#previews" className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/85 transition-colors hover:text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.85)]">
            <span className="rotate-180"><ArrowRight className="h-4 w-4" /></span> Case studies
          </Link>

          {/* content bottom-anchored so every hero is the same height */}
          <div className="mt-auto pt-12">
            <div className="flex items-end justify-between gap-8">
              <Reveal>
                <Eyebrow className="text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.8)]">{s.eyebrow}</Eyebrow>
                <h1 className="mt-4 max-w-[820px] text-[clamp(36px,5.4vw,68px)] font-semibold leading-[1.04] tracking-[-0.025em] text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">{s.title}</h1>
                <p className="mt-6 max-w-[600px] text-[clamp(15px,1.5vw,18px)] leading-relaxed text-white/85 [text-shadow:0_1px_14px_rgba(0,0,0,0.7)]">{s.sub}</p>
              </Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logo} alt={s.team} className="mb-1 hidden h-16 w-auto max-w-[180px] object-contain drop-shadow-lg lg:block" />
            </div>

            <div className="mt-9 flex flex-wrap items-end gap-x-12 gap-y-5 border-t border-white/10 pt-7">
              {s.meta.map((m) => (
                <div key={m.k}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9DA2B3]">{m.k}</div>
                  <div className="mt-1 text-[15px] font-medium text-white">{m.v}</div>
                </div>
              ))}
              {s.metrics?.map((m) => (
                <div key={m.label} className="max-w-[260px] sm:ml-auto">
                  <div className="text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.03em] text-[#a6e773]">{m.val}</div>
                  <div className="mt-2 text-[12px] leading-relaxed text-[#9DA2B3]">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageHero>

      {/* ===== CHALLENGE → SOLUTION ===== */}
      <Section overflowHidden={false}>
        <Reveal>
          <SectionHeader eyebrow="Challenge → Solution" title={s.challengeTitle} titleMax="680px" lede={s.challengeIntro} ledeMax="640px" />
        </Reveal>
        <div className="mt-12 space-y-4">
          {s.beforeAfter.map((p, i) => (
            <Reveal key={i} delay={i * 50} className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9DA2B3]">Before</span>
                <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-white">{p.before.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9DA2B3]">{p.before.d}</p>
              </div>
              <div className="mx-auto hidden h-9 w-9 items-center justify-center rounded-full bg-[#a6e773]/15 text-[#a6e773] md:flex">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-[#a6e773]/30 bg-[#a6e773]/[0.06] p-6">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a6e773]">After</span>
                <h3 className="mt-3 text-[18px] font-semibold tracking-tight text-white">{p.after.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9DA2B3]">{p.after.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ===== FANS (optional) ===== */}
      {s.fans && <OutcomeSection block={s.fans} />}

      {/* ===== WHY (NM State) or OUTCOME ===== */}
      {s.why ? (
        <Section overflowHidden={false}>
          <Reveal>
            <SectionHeader eyebrow="Why Blocktickets" title={s.why.title} titleMax="680px" lede={s.why.intro} ledeMax="640px" />
          </Reveal>
          <div className="mt-12 space-y-4">
            {s.why.items.map((it) => (
              <Reveal key={it.n} className="card grid gap-5 p-7 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
                <span className="text-[20px] font-semibold tabular-nums text-[#a6e773]">{it.n}</span>
                <div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-white">{it.t}</h3>
                  <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-[#9DA2B3]">{it.d}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[#9DA2B3]">{it.from}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#a6e773]" />
                  <span className="rounded-full bg-[#a6e773]/15 px-3 py-1 text-[#a6e773]">{it.to}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      ) : (
        <OutcomeSection block={s.outcome} />
      )}

      {/* ===== QUOTES ===== */}
      <Section overflowHidden={false}>
        {s.quotes.length > 1 ? (
          <div className="mx-auto grid max-w-[1000px] gap-5 md:grid-cols-2">
            {s.quotes.map((q) => (
              <Reveal key={q.name} className="card flex h-full flex-col p-8 lg:p-9">
                <svg viewBox="0 0 32 24" className="h-7 w-7 text-[#a6e773]" fill="currentColor" aria-hidden>
                  <path d="M0 24V12.8C0 5.73 4.8 1.07 13.6 0l1.2 4.27c-4.27 1.06-6.4 3.46-6.93 6.66H13.6V24H0Zm17.6 0V12.8C17.6 5.73 22.4 1.07 31.2 0l1.2 4.27c-4.27 1.06-6.4 3.46-6.93 6.66H31.2V24H17.6Z" />
                </svg>
                <blockquote className="mt-5 flex-1 text-[clamp(16px,1.5vw,19px)] font-medium leading-relaxed text-white/90">
                  {q.q}
                </blockquote>
                <div className="mt-7 flex items-center gap-3.5 border-t border-white/10 pt-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a6e773] text-[14px] font-semibold text-[#051B35]">
                    {q.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-white">{q.name}</div>
                    <div className="text-[12px] leading-snug text-[#9DA2B3]">{q.role}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-[860px] text-center">
            {s.quotes.map((q) => (
              <Reveal key={q.name}>
                <blockquote className="mx-auto max-w-[760px] text-[clamp(20px,2.4vw,30px)] font-medium leading-snug tracking-tight text-white">
                  &ldquo;{q.q}&rdquo;
                </blockquote>
                <p className="mt-6 text-[14px]">
                  <span className="font-semibold text-white">{q.name}</span>
                  <span className="text-[#9DA2B3]"> · {q.role}</span>
                </p>
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      {/* ===== ROLLOUT (NM State) ===== */}
      {s.rollout && (
        <Section overflowHidden={false}>
          <Reveal>
            <SectionHeader eyebrow="Rollout" title={s.rollout.title} titleMax="680px" lede={s.rollout.intro} ledeMax="640px" />
          </Reveal>
          <ol className="relative mt-14 max-w-3xl">
            <span className="pointer-events-none absolute bottom-0 left-4 top-2 w-px -translate-x-1/2 bg-gradient-to-b from-[#a6e773]/50 via-white/10 to-transparent" />
            {s.rollout.items.map((it, i) => (
              <Reveal key={it.when} delay={i * 50} as="li" className="relative grid grid-cols-[auto_1fr] gap-x-6 pb-10 last:pb-0">
                <span className="relative z-10 mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-semibold tabular-nums text-[#a6e773]">{i + 1}</span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a6e773]">{it.when}</div>
                  <h3 className="mt-1 text-[19px] font-semibold tracking-tight text-white">{it.t}</h3>
                  <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-[#9DA2B3]">{it.d}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Section>
      )}

      {/* ===== CTA ===== */}
      <Section overflowHidden={false} pad="py-20 lg:py-28">
        <CtaPanel
          size="md"
          tint="radial"
          note={s.cta.note}
          eyebrow={s.cta.eyebrow}
          title={s.cta.title}
          sub={s.cta.sub}
          action={{ href: "/sell", label: "Schedule a discovery call" }}
        />
      </Section>
    </MarketingPage>
  );
}
