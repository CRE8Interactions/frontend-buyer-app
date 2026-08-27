"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { getPublicOrganizationBranding } from "@/lib/api";
import {
  brandingToTicketingTheme,
  type BrandingOrganization,
  type TicketingTheme,
} from "@/lib/branding";
import {
  cacheOrgBranding,
  getCachedOrgBranding,
  getCachedOrgBrandingByUuid,
  type CachedBranding,
} from "@/lib/orgBrandingCache";

function orgFromCache(cached: CachedBranding | null): BrandingOrganization | null {
  if (!cached?.primaryColor) return null;
  return {
    slug: cached.slug || undefined,
    uuid: cached.uuid || undefined,
    name: cached.name || undefined,
    branding: {
      enabled: true,
      primaryColor: cached.primaryColor,
      logo: cached.logoSrc ? { url: cached.logoSrc } : undefined,
    },
    image: cached.logoSrc ? { url: cached.logoSrc } : undefined,
  };
}

function storefrontOrganization(data: unknown): BrandingOrganization | null {
  const payload = data as { organization?: BrandingOrganization | null };
  return payload?.organization || null;
}

/**
 * Resolve org branding from a passed org, slug/UUID cache, or a storefront fetch.
 * Falls back to the Blocktickets navy theme when nothing is known.
 */
export default function useOrgBranding({
  slug,
  uuid,
  organization,
}: {
  slug?: string;
  uuid?: string;
  organization?: BrandingOrganization | null;
} = {}): { organization: BrandingOrganization | null; theme: TicketingTheme } {
  // sessionStorage is client-only, so the cache is read after the hydrating
  // render matches the server. A layout effect gets it in before the browser
  // paints, so a cached tenant loader never blinks through an empty frame.
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => setHydrated(true), []);

  const cached = useMemo(() => {
    if (!hydrated) return null;
    if (slug) return getCachedOrgBranding(slug);
    if (uuid) return getCachedOrgBrandingByUuid(uuid);
    return null;
  }, [hydrated, slug, uuid]);

  const [fetched, setFetched] = useState<BrandingOrganization | null>(null);

  useEffect(() => {
    if (organization) {
      cacheOrgBranding(
        uuid && !organization.uuid ? { ...organization, uuid } : organization,
      );
      return;
    }
    if (!hydrated || cached || (!slug && !uuid)) return;
    let cancelled = false;
    getPublicOrganizationBranding(slug || uuid || "")
      .then((res) => {
        if (cancelled) return;
        const org = storefrontOrganization(res?.data);
        if (!org) return;
        const withIds: BrandingOrganization = {
          ...org,
          uuid: org.uuid || uuid,
          slug: org.slug || slug,
        };
        cacheOrgBranding(withIds);
        setFetched(withIds);
      })
      .catch(() => {
        /* keep the platform theme */
      });
    return () => {
      cancelled = true;
    };
  }, [cached, hydrated, organization, slug, uuid]);

  const resolved =
    organization || fetched || orgFromCache(cached);

  const theme = brandingToTicketingTheme(null, resolved);
  return { organization: resolved, theme };
}
