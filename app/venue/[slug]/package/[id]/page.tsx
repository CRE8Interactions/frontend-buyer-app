import type { Metadata } from "next";
import PackageDetailClient from "@/components/organisms/PackageDetailClient";
import { packagePageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  return packagePageMetadata(id, `/venue/${slug}/package/${id}/`);
}

export default async function VenuePackagePage({ params }: Props) {
  const { slug, id } = await params;
  return (
    <PackageDetailClient
      key={id}
      packageId={id}
      backHref={`/venue/${slug}/`}
    />
  );
}
