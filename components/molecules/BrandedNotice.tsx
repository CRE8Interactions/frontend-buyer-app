"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import InAppBackLink from "@/components/molecules/InAppBackLink";
import { BrandedLoader } from "@/components/molecules/RouteLoader";
import { getOrganizationsOnSale } from "@/lib/api";
import {
  BLOCKTICKETS_LOGO,
  BLOCKTICKETS_NAVY,
  type BrandingOrganization,
} from "@/lib/branding";
import {
  cacheOrgBranding,
  getCachedBrandingForPath,
  type CachedBranding,
} from "@/lib/orgBrandingCache";

export type NoticeBranding = {
  primaryColor?: string | null;
  logoSrc?: string | null;
  name?: string | null;
  slug?: string | null;
};

const NAVY = "#051b35";

type NoticeOrganization = BrandingOrganization & {
  upcomingEvents?: Array<{
    seoUrl?: string;
    slug?: string;
    shortCode?: string;
    shortcode?: string;
  }>;
};

type BrandingLookup = {
  branding: CachedBranding | null;
  resolving: boolean;
};

function organizationsFromResponse(data: unknown): NoticeOrganization[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? ((data as { data?: unknown; results?: unknown }).data ??
        (data as { results?: unknown }).results)
      : null;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const value = row as {
      id?: string | number;
      attributes?: NoticeOrganization;
    } & NoticeOrganization;
    return value.attributes ? { id: value.id, ...value.attributes } : value;
  });
}

function organizationForEventPath(
  organizations: NoticeOrganization[],
  pathname: string,
) {
  const match = pathname.match(/^\/e\/([^/]+)\/([^/]+)/i);
  if (!match) return null;
  const [, eventSlug, shortcode] = match.map((part) => part.toLowerCase());

  const exact = organizations.find((organization) =>
    (organization.upcomingEvents || []).some((event) => {
      const slug = (event.seoUrl || event.slug || "").toLowerCase();
      const code = (event.shortCode || event.shortcode || "").toLowerCase();
      return slug === eventSlug && code === shortcode;
    }),
  );
  if (exact) return exact;

  // Event SEO slugs commonly begin with the owning organization slug.
  // Longest first avoids choosing a shorter overlapping team slug.
  return (
    [...organizations]
      .filter((organization) => {
        const slug = organization.slug?.toLowerCase();
        return slug && (eventSlug === slug || eventSlug.startsWith(`${slug}-`));
      })
      .sort((a, b) => (b.slug?.length || 0) - (a.slug?.length || 0))[0] || null
  );
}

/**
 * Dead-end screen (event missing, nothing on sale) painted in the tenant's
 * colours. When the page never resolved an organization we fall back to the
 * branding cached for this route, so a 404 still looks like the team the
 * shopper came from instead of a bare Blocktickets slab.
 */
export default function BrandedNotice({
  title,
  message,
  branding,
}: {
  title: string;
  message: string;
  branding?: NoticeBranding | null;
}) {
  const pathname = usePathname() || "";
  const pageColor = branding?.primaryColor || null;
  const [lookup, setLookup] = useState<BrandingLookup>({
    branding: null,
    resolving: true,
  });

  // sessionStorage and the org list are client-only, so the notice would paint
  // Blocktickets navy first. Stay on the loader until the tenant is known.
  useLayoutEffect(() => {
    let active = true;
    const known = pageColor ? null : getCachedBrandingForPath(pathname);
    const lookupOrg = !pageColor && !known && /^\/e\//i.test(pathname);

    setLookup({ branding: known, resolving: lookupOrg });
    if (!lookupOrg) return;

    getOrganizationsOnSale()
      .then((response) => {
        if (!active) return;
        const organization = organizationForEventPath(
          organizationsFromResponse(response.data),
          pathname,
        );
        setLookup({
          branding: cacheOrgBranding(organization),
          resolving: false,
        });
      })
      .catch(() => {
        // Keep the Blocktickets fallback when branding cannot be resolved.
        if (active) setLookup({ branding: null, resolving: false });
      });
    return () => {
      active = false;
    };
  }, [pathname, pageColor]);

  const resolved: NoticeBranding | null = pageColor
    ? (branding ?? null)
    : lookup.branding;

  if (lookup.resolving) {
    return <BrandedLoader branding={lookup.branding} fallback="none" />;
  }

  const accent = resolved?.primaryColor || BLOCKTICKETS_NAVY;
  const logoSrc = resolved?.logoSrc || BLOCKTICKETS_LOGO;
  const orgName = resolved?.name || "";
  const orgHref = resolved?.slug ? `/${resolved.slug}/` : null;

  return (
    <div
      style={{
        background: "#f7f8fc",
        color: NAVY,
        minHeight: "100vh",
        fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <header style={{ background: accent }}>
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <InAppBackLink
            href={orgHref || "/browse/"}
            aria-label="Go back"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 19, height: 19 }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </InAppBackLink>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
              boxSizing: "border-box",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={orgName}
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>
          {orgName ? (
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "#fff",
              }}
            >
              {orgName}
            </span>
          ) : null}
        </div>
      </header>

      <div
        style={{
          maxWidth: 560,
          margin: "0 auto",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(5,27,53,0.08)",
            borderRadius: 18,
            padding: "40px 28px",
            boxShadow: "0 10px 40px rgba(5,27,53,0.06)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 15,
              lineHeight: 1.5,
              color: "rgba(5,27,53,0.62)",
            }}
          >
            {message}
          </p>
          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {orgHref ? (
              <Link
                href={orgHref}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  background: accent,
                  borderRadius: 999,
                  padding: "12px 22px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {orgName ? `See ${orgName} events` : "See all events"}
              </Link>
            ) : null}
            <Link
              href="/browse/"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: orgHref ? NAVY : "#fff",
                background: orgHref ? "#fff" : accent,
                border: orgHref ? "1px solid rgba(5,27,53,0.14)" : "none",
                borderRadius: 999,
                padding: "12px 22px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Browse events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
