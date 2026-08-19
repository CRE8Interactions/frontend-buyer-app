import type { Metadata } from "next";
import AccessPassDetailClient from "@/components/organisms/AccessPassDetailClient";
import { accessPassPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; uuid: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, uuid } = await params;
  return accessPassPageMetadata(uuid, `/${slug}/access-pass/${uuid}/`);
}

export default async function OrgAccessPassPage({ params }: Props) {
  const { slug, uuid } = await params;
  return (
    <AccessPassDetailClient
      key={uuid}
      uuid={uuid}
      backHref={`/${slug}/`}
    />
  );
}
