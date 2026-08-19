import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RESERVED_ORG_SLUGS } from "@/lib/helpers";
import { organizationPageMetadata } from "@/lib/seo";
import { fetchOrganizationStorefront } from "@/lib/server/storefront";
import ClientProfile, {
  type StorefrontInitialData,
} from "@/components/organisms/ClientProfile";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_ORG_SLUGS.has(slug.toLowerCase())) {
    return { title: "Not Found" };
  }
  return organizationPageMetadata(slug);
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_ORG_SLUGS.has(slug.toLowerCase())) {
    notFound();
  }
  const initialData = await fetchOrganizationStorefront(slug);
  return (
    <ClientProfile
      key={slug}
      slug={slug}
      initialData={initialData as StorefrontInitialData}
    />
  );
}
