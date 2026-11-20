import { Geist } from "next/font/google";
import PageGate from "@/components/molecules/PageGate";
import Nav from "../concept/Nav";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { SR_CSS } from "./styles";
import SearchStudio from "./SearchStudio";

const sans = Geist({ subsets: ["latin"], display: "swap" });

/* /search: every match for a query, on the same live index as the search palette. The query comes from the URL so a results page can be shared. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ query?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.query) ? sp.query[0] : sp.query;
  return (
    <div className={`n sr ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS + SR_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <PageGate variant="search" />
      <Nav variant="user" />
      <main className="sr-main">
        <SearchStudio initial={(raw ?? "").trim()} />
      </main>
      <Footer />
    </div>
  );
}
