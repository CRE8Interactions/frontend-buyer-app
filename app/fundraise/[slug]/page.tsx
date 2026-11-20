import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/components/templates/AppShell";
import PageSkeleton from "@/components/molecules/PageSkeleton";
import { FundraisingCampaignClient } from "@/components/organisms/FundraisingCampaignClient";
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
    <AppShell search={false}>
      <Suspense
        fallback={<PageSkeleton variant="detail" label="Loading fundraiser" className="min-h-[40vh]" />}
      >
        <FundraiseInner
          campaignSlug={slug}
          organizationUUID={organizationUUID}
        />
      </Suspense>
    </AppShell>
  );
}
