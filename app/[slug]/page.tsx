import type { Metadata } from "next";
import PageGate from "@/components/molecules/PageGate";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";
import { RESERVED_ORG_SLUGS } from "@/lib/helpers";
import { organizationPageMetadata } from "@/lib/seo";
import Nav from "../concept/Nav";
import Footer from "../concept/Footer";
import { CSS } from "../concept/styles";
import { TM_CSS } from "./styles";
import TeamStudio from "./TeamStudio";
import { loadTeam } from "./live-team";
import { onColor, PHOTO_FOCUS } from "./teams";

const sans = Geist({ subsets: ["latin"], display: "swap" });

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_ORG_SLUGS.has(slug.toLowerCase())) {
    return { title: "Not Found" };
  }
  return organizationPageMetadata(slug);
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_ORG_SLUGS.has(slug.toLowerCase())) {
    notFound();
  }
  const team = await loadTeam(slug);
  if (!team) notFound();
  /* the team colour, the text that sits on it and the stage photo are the only per-team styling: three custom properties on the wrapper */
  const theme = { "--t": team.color, "--on-t": team.onColor ?? onColor(team.color), "--photo": `url(${team.photo})`, "--photo-pos": PHOTO_FOCUS[team.slug] ?? "50% 50%" } as React.CSSProperties;
  return (
    <div className={`n tm ${sans.className}`} style={theme}>
      <style dangerouslySetInnerHTML={{ __html: CSS + TM_CSS }} />
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('concept-theme');if(t==='light'||t==='dark')document.documentElement.dataset.nt=t}catch(e){}" }} />
      <PageGate variant="stage" />
      <Nav variant="user" />
      <main className="tm-main">
        <TeamStudio key={slug} team={team} />
      </main>
      <Footer />
    </div>
  );
}
