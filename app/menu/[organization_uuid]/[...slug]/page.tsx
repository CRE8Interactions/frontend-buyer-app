"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import PageLoader from "@/components/molecules/PageLoader";
import MenuExperience, {
  decodeMenuParam,
} from "@/components/organisms/MenuExperience";

function MenuPageInner() {
  const params = useParams<{
    organization_uuid: string;
    slug: string[];
  }>();

  const slug = params.slug ?? [];
  const venueUuid =
    slug.length >= 2 ? decodeMenuParam(slug[0]) : undefined;
  const menuKey = slug.length >= 2 ? slug[1] : slug[0];

  return (
    <MenuExperience
      organizationUuid={params.organization_uuid}
      venueUuid={venueUuid}
      menuKey={menuKey}
    />
  );
}

export default function MenuPage() {
  return (
    <AppShell hideHeader search={false}>
      <Suspense
        fallback={<PageLoader label="Loading menu" className="min-h-[40vh]" />}
      >
        <MenuPageInner />
      </Suspense>
    </AppShell>
  );
}
