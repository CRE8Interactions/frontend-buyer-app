import LegalDoc from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Cookies Policy — blocktickets",
  description: "The cookies Blocktickets uses and how to control them.",
  path: "/cookies-policy/",
  ogHeadline: "Cookies Policy",
  subtitle: "Legal",
});

export default function Page() {
  return <LegalDoc slug="cookies" />;
}
