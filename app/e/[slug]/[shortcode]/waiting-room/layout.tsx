import type { Metadata } from "next";
import { waitingRoomPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; shortcode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, shortcode } = await params;
  return waitingRoomPageMetadata(slug, shortcode);
}

export default function WaitingRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
