"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/templates/AppShell";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import MenuExperience, {
  decodeMenuParam,
} from "@/components/organisms/MenuExperience";
import { MENU_LOADER_MESSAGE } from "@/lib/loaderMessages";

function MenuPageInner() {
  const params = useParams<{
    organization_uuid: string;
    slug: string[];
  }>();
  const organizationUuid = params.organization_uuid;

  const slug = params.slug ?? [];
  const venueUuid =
    slug.length >= 2 ? decodeMenuParam(slug[0]) : undefined;
  const menuKey = slug.length >= 2 ? slug[1] : slug[0];

  // In-venue ordering is a Blocktickets surface: platform chrome and loader,
  // never the organization's branding.
  return (
    <AppShell variant="light" search={false}>
      <MenuExperience
        organizationUuid={organizationUuid}
        venueUuid={venueUuid}
        menuKey={menuKey}
      />
    </AppShell>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <BrandedLoader
          fallback="blocktickets"
          message={MENU_LOADER_MESSAGE}
        />
      }
    >
      <MenuPageInner />
    </Suspense>
  );
}
