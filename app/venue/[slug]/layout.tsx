import type { Metadata } from "next";
import { venuePageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return venuePageMetadata(slug);
}

export default function VenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
