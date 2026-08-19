import type { Metadata } from "next";
import FlexPackDetailClient from "@/components/organisms/FlexPackDetailClient";
import { flexPackPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; uuid: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, uuid } = await params;
  return flexPackPageMetadata(uuid, `/venue/${slug}/flex-pack/${uuid}/`);
}

export default async function VenueFlexPackPage({ params }: Props) {
  const { slug, uuid } = await params;
  return (
    <FlexPackDetailClient
      key={uuid}
      uuid={uuid}
      backHref={`/venue/${slug}/`}
    />
  );
}
