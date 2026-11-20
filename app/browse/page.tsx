import { Geist } from "next/font/google";
import PageGate from "@/components/molecules/PageGate";
import Nav from "../concept/Nav";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { BR_CSS } from "./styles";
import BrowseStudio from "./BrowseStudio";

const sans = Geist({ subsets: ["latin"], display: "swap" });

export default function BrowsePage() {
  return (
    <div className={`n br ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + BR_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <PageGate variant="browse" />
      <Nav variant="user" />
      <main className="br-main">
        <BrowseStudio />
      </main>
      <Footer />
    </div>
  );
}
