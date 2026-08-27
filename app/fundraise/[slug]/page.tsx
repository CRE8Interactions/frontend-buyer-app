import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { FundraisingCampaignClient } from "@/components/organisms/FundraisingCampaignClient";
import { FUNDRAISER_LOADER_MESSAGE } from "@/lib/loaderMessages";
import { fundraiserPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ organizationUUID?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const { organizationUUID } = await searchParams;
  return fundraiserPageMetadata(slug, `/fundraise/${slug}/`, {
    organizationUUID,
  });
}

function FundraiseInner({
  campaignSlug,
  organizationUUID,
}: {
  campaignSlug: string;
  organizationUUID?: string;
}) {
  return (
    <FundraisingCampaignClient
      campaignSlug={campaignSlug}
      organizationUUID={organizationUUID}
    />
  );
}

export default async function FundraiseSlugPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { organizationUUID } = await searchParams;

  return (
    <Suspense
      fallback={
        <BrandedLoader
          fallback="blocktickets"
          message={FUNDRAISER_LOADER_MESSAGE}
        />
      }
    >
      <FundraiseInner
        campaignSlug={slug}
        organizationUUID={organizationUUID}
      />
    </Suspense>
  );
}
