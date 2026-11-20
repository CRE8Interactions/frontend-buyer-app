import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { pageMetadata } from "@/lib/seo";
import Nav from "../concept/Nav";
import Reveal from "../concept/Reveal";
import CubesCta from "../concept/CubesCta";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { OS_CSS } from "./styles";
import Button from "@/components/atoms/Button";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Lineup, { type Person } from "./Lineup";
import Story from "./Story";
import ThemeInit from "./ThemeInit";

const sans = Geist({ subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = pageMetadata({
  title: "Our Story — blocktickets",
  description:
    "blocktickets is a sports-first ticketing platform built for leagues, teams, and venues.",
  path: "/our-story/",
  image: "/our-story-hero.jpg",
  ogHeadline: "Our Story",
  subtitle: "Built for leagues, teams, and venues",
  cta: "Learn More",
});

/* the browser bar takes the page's top colour in each scheme (the 8px frame around the dark sheet is the page background) */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
  ],
};

const FOUNDERS = [
  { name: "Harrison Cogan", role: "CEO · Co-Founder", img: "/people/harrison-cogan.jpg", c: "var(--green)", bio: "Leads growth, partnerships, and commercial strategy across pro and college sports." },
  { name: "Chaz Haskins", role: "CTO · Co-Founder", img: "/people/chaz-haskins.jpg", c: "var(--seat)", bio: "Oversees product and engineering, building the technology that powers blocktickets." },
];

/* the rest of the team, in the order they were already listed */
const TEAM: Person[] = [
  { name: "Amia Dion Defreitas", role: "Full Stack Engineer", g: "build" },
  { name: "Andre De Moya", role: "Operations Lead", g: "ops" },
  { name: "Brent Arnold", role: "VP, Business Development", g: "grow" },
  { name: "Charles Krensky", role: "Senior Manager, Growth and Partnerships", g: "grow" },
  { name: "Jaime Convery", role: "Front-end Developer", g: "build" },
  { name: "Mel Morris", role: "Product Manager", g: "build" },
  { name: "Michael Van Hise", role: "Client On-Boarding and Success", g: "ops" },
  { name: "Travis W Gandy", role: "Full Stack Engineer", g: "build" },
];

const Arrow = () => <ArrowRight weight="bold" aria-hidden />;

export default function OurStoryPage() {
  return (
    <div className={`n os ${sans.className}`} style={{ ["--font-mono-n" as string]: mono.style.fontFamily }}>
      <style dangerouslySetInnerHTML={{ __html: CSS + OS_CSS }} />
      <ThemeInit />
      <Nav />

      <Story />

      {/* 04 THE TEAM */}
      <section id="team" data-chapter="The team" className="n-sec os-sec">
        <div className="n-wrap">
          <Reveal className="os-intro">
            <h2 className="os-h2">Meet the founders behind blocktickets.</h2>
            <div className="os-intro-copy">
              <p>We started blocktickets because sports organizations deserved a better option. Every partnership is an opportunity to help teams keep more revenue, own their fan relationships, and build something that lasts.</p>
            </div>
          </Reveal>
          <div className="os-fnd">
            {FOUNDERS.map((f, i) => (
              <Reveal key={f.name} delay={i * 100} className="os-f">
                <div className="os-ph" style={{ ["--c" as string]: f.c }}>
                  <div className="os-ph-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.img} alt={f.name} decoding="async" />
                  </div>
                </div>
                <div style={{ ["--c" as string]: f.c }}>
                  <div className="os-fh"><b>{f.name}</b><i>{f.role.split(" · ")[0]}</i></div>
                  <span className="os-fs">{f.role.split(" · ")[1]}</span>
                  <p className="os-bio">{f.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="os-roster">
            <h3 className="os-h3-light">The starting lineup.</h3>
            <Lineup people={TEAM} />
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="demo" className="n-final">
        <CubesCta>
          <Reveal className="cb-copy">
            <h2>Ready to <span>build bigger?</span></h2>
            <p>Schedule a discovery call and we’ll show you the entire platform.</p>
            <Button href="/sell" size="md">Schedule a discovery call <Arrow /></Button>
          </Reveal>
        </CubesCta>
      </section>

      <Footer />
    </div>
  );
}
