/** Server-side storefront fetch for org routes (SSR loader branding). */
export type StorefrontPayload = {
  organization?: {
    name?: string;
    slug?: string;
    image?: unknown;
    primaryColor?: string;
    accentColor?: string;
    branding?: {
      enabled?: boolean;
      primaryColor?: string;
      buttonColor?: string;
      logo?: unknown;
      darkLogo?: unknown;
    } | null;
    [key: string]: unknown;
  } | null;
  venues?: unknown[];
  events?: unknown[];
  packages?: unknown[];
  flexPacks?: unknown[];
};

export async function fetchOrganizationStorefront(
  slug: string,
): Promise<StorefrontPayload | null> {
  const base = process.env.NEXT_PUBLIC_API;
  if (!base || process.env.NEXT_PUBLIC_DEMO === "true") return null;

  try {
    // Short revalidate keeps repeat visits instant (branded first paint, no loader)
    // while still picking up on-sale changes quickly.
    const res = await fetch(`${base}/organizations/storefront/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as StorefrontPayload;
  } catch {
    return null;
  }
}
