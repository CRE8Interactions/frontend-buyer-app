import LegalDoc from "@/components/legal/LegalDoc";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Purchase Policy — blocktickets",
  description: "How buying, fees, delivery and refunds work on Blocktickets.",
  path: "/purchase-policy/",
  ogHeadline: "Purchase Policy",
  subtitle: "Legal",
});

export default function Page() {
  return <LegalDoc slug="purchase" />;
}
