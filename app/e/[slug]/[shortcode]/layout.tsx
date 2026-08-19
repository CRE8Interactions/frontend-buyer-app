import type { Metadata } from "next";
import { eventPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; shortcode: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, shortcode } = await params;
  return eventPageMetadata(slug, shortcode, `/e/${slug}/${shortcode}/`);
}

export default function EventShortcodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
