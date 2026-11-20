import LegalDoc from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy — blocktickets",
  description: "What Blocktickets collects, why, and the choices you have.",
  path: "/privacy-policy/",
  ogHeadline: "Privacy Policy",
  subtitle: "Legal",
});

export default function Page() {
  return <LegalDoc slug="privacy" />;
}
