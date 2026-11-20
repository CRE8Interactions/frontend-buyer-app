import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { pageMetadata } from "@/lib/seo";
import Nav from "../concept/Nav";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { SL_CSS } from "./styles";
import SellStudio from "./SellStudio";

const sans = Geist({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = pageMetadata({
  title: "Sell with us — blocktickets",
  description: "Put your box office on blocktickets. Tell us about your venue, team or festival and we will schedule a discovery call within one business day.",
  path: "/sell/",
  image: "/our-story-hero.jpg",
  ogHeadline: "Sell with us",
  subtitle: "Put your box office on blocktickets",
  cta: "Get started",
});

export default function SellPage() {
  return (
    <div className={`n sl ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + SL_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <Nav />
      <main className="sl-main">
        <div className="n-wrap">
          <div className="sl-head">
            <h1 className="sl-h1">Put your box office on blocktickets</h1>
            <p className="sl-lede"><span>Four quick steps and your stadium is built.</span> <span>We reply within one business day to set up a discovery call.</span></p>
          </div>
          <SellStudio />
        </div>
      </main>
      <Footer />
    </div>
  );
}
