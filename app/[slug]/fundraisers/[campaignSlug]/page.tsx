import type { Metadata } from "next";
import { FundraisingCampaignClient } from "@/components/organisms/FundraisingCampaignClient";
import { fundraiserPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string; campaignSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, campaignSlug } = await params;
  return fundraiserPageMetadata(campaignSlug, `/${slug}/fundraisers/${campaignSlug}/`, {
    organizationSlug: slug,
  });
}

export default async function OrgFundraiserPage({ params }: Props) {
  const { slug, campaignSlug } = await params;

  return (
    <FundraisingCampaignClient
      campaignSlug={campaignSlug}
      organizationSlug={slug}
    />
  );
}
