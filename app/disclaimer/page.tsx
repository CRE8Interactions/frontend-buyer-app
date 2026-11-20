import LegalDoc from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Disclaimer — blocktickets",
  description: "Limits on what Blocktickets is responsible for.",
  path: "/disclaimer/",
  ogHeadline: "Disclaimer",
  subtitle: "Legal",
});

export default function Page() {
  return <LegalDoc slug="disclaimer" />;
}
