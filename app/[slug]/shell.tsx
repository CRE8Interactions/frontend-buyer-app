import { Geist } from "next/font/google";
import Nav from "../concept/Nav";
import PageGate from "@/components/molecules/PageGate";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { TM_CSS } from "./styles";
import { PG_CSS } from "./pages-styles";
import { onColor, PHOTO_FOCUS, type Team } from "./teams";

const sans = Geist({ subsets: ["latin"], display: "swap" });

/* The frame for every page a team storefront links to (season seats, flex packs, venues): the same Nav and Footer, and the same three
   theme properties as the storefront, so a team's colour carries through the whole trip. */
export default function TeamShell({ team, children, gate = "stage" }: { team: Team; children: React.ReactNode; gate?: "stage" | "season" | "none" }) {
  const theme = { "--t": team.color, "--on-t": team.onColor ?? onColor(team.color), "--photo": `url(${team.photo})`, "--photo-pos": PHOTO_FOCUS[team.slug] ?? "50% 50%" } as React.CSSProperties;
  return (
    <div className={`n tm pg ${sans.className}`} style={theme}>
      <style dangerouslySetInnerHTML={{ __html: CSS + TM_CSS + PG_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      {gate !== "none" && <PageGate variant={gate} />}
      <Nav variant="user" />
      <main className="tm-main">{children}</main>
      <Footer />
    </div>
  );
}
