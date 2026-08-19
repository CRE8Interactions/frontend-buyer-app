import type { Metadata } from "next";
import MarketingPage from "@/components/templates/MarketingPage";
import PageHero from "@/components/organisms/PageHero";
import BlockStack from "@/components/organisms/BlockStack";
import Section from "@/components/molecules/Section";
import SectionHeader from "@/components/molecules/SectionHeader";
import CtaPanel from "@/components/molecules/CtaPanel";
import Glow from "@/components/atoms/Glow";
import Eyebrow from "@/components/atoms/Eyebrow";
import BlockMarker from "@/components/atoms/BlockMarker";
import Reveal from "@/components/atoms/Reveal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Story — Blocktickets",
  description:
    "Blocktickets is a sports-first ticketing platform built for leagues, teams, and venues.",
  path: "/our-story/",
  image: "/our-story-hero.jpg",
  ogHeadline: "Our Story",
  subtitle: "Built for leagues, teams, and venues",
  cta: "Learn More",
});

const BELIEFS = [
  { t: "Your fans, your data.", d: "Every ticket purchase, attendance record, and fan interaction belongs to your organization. Not the platform." },
  { t: "A partner, not a help desk.", d: "When you need support, you talk to someone who knows your venue, your season, and your goals. Not a chatbot. Not a ticket queue." },
  { t: "Success should be shared.", d: "When one organization solves a problem, everyone on the platform benefits from the improvement." },
];

const STEPS = [
  { t: "We listen first.", d: "Every partnership starts with understanding how an organization operates and where they want to go." },
  { t: "We build with purpose.", d: "We focus on solving real challenges, not chasing trends or adding features for the sake of it." },
  { t: "We grow together.", d: "As our partners evolve, so does the platform. Improvements built for one organization often benefit others." },
];

const FOUNDERS = [
  {
    name: "Harrison Cogan",
    role: "CEO · Co-Founder",
    img: "/people/harrison-cogan.jpg",
    bio: "Leads growth, partnerships, and commercial strategy across pro and college sports.",
  },
  {
    name: "Chaz Haskins",
    role: "CTO · Co-Founder",
    img: "/people/chaz-haskins.jpg",
    bio: "Oversees product and engineering, building the technology that powers blocktickets.",
  },
];

/** The broader Blocktickets team (shown under the founders). */
const TEAM: { name: string; role: string; img?: string }[] = [
  { name: "Amia Dion Defreitas", role: "Full Stack Engineer" },
  { name: "Andre De Moya", role: "Operations Lead" },
  { name: "Brent Arnold", role: "VP, Business Development" },
  { name: "Charles Krensky", role: "Senior Manager, Growth and Partnerships" },
  { name: "Jaime Convery", role: "Front-end Developer" },
  { name: "Mel Morris", role: "Product Manager" },
  { name: "Michael Van Hise", role: "Client On-Boarding and Success" },
  { name: "Travis W Gandy", role: "Full Stack Engineer" },
];

const TEAM_TINTS = [
  { bg: "rgba(166,231,115,0.16)", ink: "#c7ef9f" },
  { bg: "rgba(120,150,230,0.20)", ink: "#b9c9f5" },
  { bg: "rgba(230,190,120,0.18)", ink: "#f0d69a" },
  { bg: "rgba(190,140,230,0.18)", ink: "#d6b6f0" },
];

const initialsOf = (n: string) => {
  const w = n.split(" ").filter(Boolean);
  return ((w[0]?.[0] || "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

// TODO: point this at the real careers page / job board when available.

export default function OurStoryPage() {
  return (
    <MarketingPage>
      {/* hero */}
      <PageHero img="/our-story-hero.jpg" imgPosition="center 42%" wash={0.38} radial="ellipse 85% 68% at 50% 46%" radialOpacity={0.42} fadeMid="72%" fadeEnd="100%">
        <div className="container-x w-full py-16">
          <Reveal>
            <Eyebrow>Our story</Eyebrow>
            <h1 className="mt-5 max-w-[860px] text-[clamp(36px,5.4vw,68px)] font-semibold leading-[1.04] tracking-[-0.025em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]">
              Sports organizations deserved a <span className="text-[#a6e773]">better option</span>.
            </h1>
            <p className="mt-6 max-w-[640px] text-[clamp(15px,1.5vw,18px)] font-medium leading-relaxed text-[#EDEFF7] [text-shadow:0_1px_16px_rgba(0,0,0,0.6)]">
              We started blocktickets after seeing teams stuck between expensive enterprise platforms and budget
              systems that couldn&rsquo;t support modern operations. We knew there had to be a better option.
            </p>
          </Reveal>
        </div>
      </PageHero>

      {/* why we exist */}
      <Section borderTop={false} className="border-b border-white/10" pad="grid gap-10 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-24"
        glow={<Glow className="-right-40 top-1/4 h-[440px] w-[440px]" opacity={0.16} />}>
        <Reveal>
          <h2 className="h2 max-w-[420px]">Why we exist.</h2>
        </Reveal>
        <Reveal delay={80} className="space-y-6 text-[clamp(17px,1.6vw,21px)] leading-relaxed text-[#9DA2B3]">
          <p>
            <span className="font-semibold text-white">The legacy platforms weren&rsquo;t built for modern sports
              organizations.</span>{" "}
            Growing organizations were forced to choose between enterprise software they couldn&rsquo;t justify and
            budget systems that couldn&rsquo;t keep up. The gap between those two worlds kept getting bigger.
          </p>
          <p>
            <span className="font-semibold text-white">So we built Blocktickets.</span> A platform designed specifically
            for sports organizations. Combining enterprise capabilities, transparent pricing, and hands-on support
            in one place.
          </p>
        </Reveal>
      </Section>

      {/* built block by block */}
      <Section borderTop={false} className="border-b border-white/10"
        glow={<Glow className="-left-44 bottom-0 h-[460px] w-[460px]" />}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <SectionHeader
              eyebrow="How we build"
              title="Built block by block, with our partners."
              titleMax="640px"
            />
            <div className="lede mt-4 max-w-[680px] space-y-4">
              <p>Since day one, Blocktickets has been built alongside the organizations that use it.</p>
              <p>
                Every improvement comes from understanding their challenges, listening to their feedback, and helping
                them grow.
              </p>
              <p className="font-medium text-white">That&rsquo;s how Blocktickets is built. Block by block.</p>
            </div>
          </Reveal>
          <Reveal delay={120} className="hidden justify-center lg:flex">
            <BlockStack />
          </Reveal>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.t} delay={i * 70} className="card p-7 transition-colors hover:border-[#a6e773]/40">
              <div className="text-[clamp(28px,3vw,40px)] font-semibold leading-none tracking-[-0.03em] text-white/30">0{i + 1}</div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em] text-white">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#9DA2B3]">{s.d}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* what we believe */}
      <Section borderTop={false} className="border-b border-white/10" overflowHidden={false}>
        <Reveal>
          <h2 className="h2 max-w-[520px]">What we believe.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-5">
          {/* marquee belief */}
          <Reveal className="relative flex flex-col justify-center overflow-hidden rounded-[22px] border border-white/10 p-8 sm:p-10 lg:col-span-3">
            <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(56,116,224,0.10), transparent 55%)" }} />
            <span className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#3874E0]/15 blur-3xl" />
            <BlockMarker className="relative" />
            <h3 className="relative mt-6 text-[clamp(28px,3.2vw,42px)] font-semibold leading-tight tracking-[-0.02em] text-white">{BELIEFS[0].t}</h3>
            <p className="relative mt-5 max-w-[500px] text-[clamp(18px,1.9vw,24px)] font-medium leading-relaxed text-[#9DA2B3]">{BELIEFS[0].d}</p>
          </Reveal>

          {/* supporting beliefs */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            {BELIEFS.slice(1).map((b, i) => (
              <Reveal key={b.t} delay={(i + 1) * 80} className="card flex-1 p-7">
                <BlockMarker size="sm" />
                <h3 className="mt-5 text-[19px] font-semibold leading-snug tracking-[-0.015em] text-white">{b.t}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-[#9DA2B3]">{b.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* team */}
      <Section borderTop={false} className="border-b border-white/10"
        glow={<Glow className="-right-40 bottom-0 h-[440px] w-[440px]" opacity={0.14} />}>
        <Reveal>
          <SectionHeader
            eyebrow="Leadership"
            title="Meet the founders behind Blocktickets."
            titleMax="640px"
          />
          <div className="lede mt-4 max-w-[680px] space-y-4">
            <p>We started Blocktickets because sports organizations deserved a better option.</p>
            <p>
              Every partnership is an opportunity to help teams keep more revenue, own their fan relationships, and
              build something that lasts.
            </p>
          </div>
        </Reveal>

        {/* founders */}
        <div className="mt-12 space-y-12 border-t border-white/10 pt-12">
          {FOUNDERS.map((p, i) => (
            <Reveal key={p.name} delay={i * 80} className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt={p.name} className="h-[150px] w-[150px] shrink-0 rounded-2xl border border-white/10 object-cover" />
              <div>
                <h3 className="text-[clamp(26px,2.6vw,34px)] font-semibold leading-tight tracking-[-0.02em] text-white">{p.name}</h3>
                <div className="mt-2 text-[12.5px] font-bold uppercase tracking-[0.18em] text-[#9DA2B3]">{p.role}</div>
                <p className="mt-3 max-w-[560px] text-[clamp(16px,1.6vw,20px)] leading-relaxed text-[#BCBFCC]">{p.bio}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* team */}
        <Reveal delay={80} className="mt-12 border-t border-white/10 pt-12">
          <h3 className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-[#9DA2B3]">The team</h3>
          <div className="mt-8 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.02]">
            <div className="grid sm:grid-cols-2">
              {TEAM.map((p, i) => {
                const t = TEAM_TINTS[i % TEAM_TINTS.length];
                return (
                  <div key={p.name} className="flex items-center gap-4 border-t border-white/10 p-6 [&:nth-child(-n+1)]:border-t-0 sm:odd:border-r sm:[&:nth-child(-n+2)]:border-t-0">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-[16px] font-semibold" style={{ background: t.bg, color: t.ink }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.img ? <img src={p.img} alt={p.name} className="h-full w-full object-cover" /> : initialsOf(p.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[17px] font-semibold leading-tight text-white">{p.name}</div>
                      {p.role && <div className="mt-1 text-[13px] leading-snug text-[#9DA2B3]">{p.role}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* closing CTA */}
      <Section overflowHidden={false}>
        <CtaPanel
          size="md"
          title="Ready to build bigger?"
          sub={"Schedule a discovery call and we’ll show you the entire platform."}
          action={{ href: "/sell", label: "Schedule a discovery call" }}
        />
      </Section>
    </MarketingPage>
  );
}
