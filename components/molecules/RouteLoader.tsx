"use client";

import { useLayoutEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import BrandLoader from "@/components/molecules/BrandLoader";
import {
  isPlatformLoaderPath,
  resolveLoaderBrandingForRender,
  type CachedBranding,
} from "@/lib/orgBrandingCache";
import {
  LOADER_MESSAGE,
  loaderMessageForPath,
} from "@/lib/loaderMessages";

export { LOADER_MESSAGE };

export type LoaderBranding = {
  primaryColor?: string | null;
  logoSrc?: string | null;
  name?: string | null;
};

function hasTenantBranding(
  branding?: LoaderBranding | null,
): branding is LoaderBranding & { primaryColor: string } {
  return Boolean(
    branding?.primaryColor && (branding.logoSrc || branding.name),
  );
}

function dismissBootLoader() {
  if (typeof document === "undefined") return;
  document.getElementById("bt-boot-loader")?.remove();
}

/**
 * Tenant loading screen when an org is known. Platform routes (home, browse,
 * Our Story) fall back to the Blocktickets spinner. Other shopper routes stay
 * empty rather than flashing the wrong team.
 */
export function BrandedLoader({
  branding,
  fallback = "none",
  embedded = false,
  message,
}: {
  branding?: LoaderBranding | null;
  fallback?: "none" | "blocktickets";
  embedded?: boolean;
  message?: string;
}) {
  const showPlatform = fallback === "blocktickets" && !hasTenantBranding(branding);
  const caption = message || LOADER_MESSAGE;

  useLayoutEffect(() => {
    dismissBootLoader();
  }, [branding, showPlatform]);

  if (hasTenantBranding(branding)) {
    return (
      <BrandLoader
        variant="tenant"
        accent={branding.primaryColor}
        logoSrc={branding.logoSrc || undefined}
        name={branding.name || undefined}
        message={caption}
        poweredBy={false}
        embedded={embedded}
      />
    );
  }

  if (showPlatform) {
    return (
      <BrandLoader
        variant="blocktickets"
        message={caption}
        embedded={embedded}
      />
    );
  }

  return null;
}

/**
 * Loading screen for the current route. Pass `branding` once a page has
 * resolved its own; otherwise the session cache / branding cookie supplies it
 * when it matches this org, event, or venue — never the previous team.
 */
export default function RouteLoader({
  branding,
  lastCookie,
}: {
  branding?: LoaderBranding | null;
  lastCookie?: CachedBranding | null;
}) {
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();
  const platform = isPlatformLoaderPath(pathname || "");
  const [allowClientCache, setAllowClientCache] = useState(false);

  useLayoutEffect(() => {
    setAllowClientCache(true);
  }, []);

  const resolved = resolveLoaderBrandingForRender(pathname || "", {
    branding,
    lastCookie,
    params: { slug: params?.slug },
    allowClientCache,
  });

  return (
    <BrandedLoader
      branding={resolved}
      fallback={platform ? "blocktickets" : "none"}
      message={loaderMessageForPath(pathname || "")}
    />
  );
}
