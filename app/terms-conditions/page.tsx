import LegalDoc from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms & Conditions — blocktickets",
  description: "The terms that govern your use of Blocktickets.",
  path: "/terms-conditions/",
  ogHeadline: "Terms & Conditions",
  subtitle: "Legal",
});

export default function Page() {
  return <LegalDoc slug="terms" />;
}
