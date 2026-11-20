import { Geist } from "next/font/google";
import Nav from "../../concept/Nav";
import { CSS } from "../../concept/styles";
import SmsTickets from "@/components/organisms/SmsTickets";

export const metadata = {
  title: "Your tickets | Blocktickets",
};

const sans = Geist({ subsets: ["latin"], display: "swap" });

/* The page behind a ticket text message. Public: no sign-in. Demo tokens: expired, missing, slow. */
export default async function SmsTicketsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className={`n ${sans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <Nav variant="user" login={false} search={false} sticky={false} />
      <SmsTickets token={token} />
    </div>
  );
}
