import { imageUrl, type ApiImage } from "@/lib/helpers";

export type OrgBranding = {
  enabled?: boolean;
  primaryColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  logo?: ApiImage;
  darkLogo?: ApiImage;
};

export type BrandingOrganization = {
  name?: string;
  slug?: string;
  website?: string;
  url?: string;
  primaryColor?: string;
  accentColor?: string;
  brandColor?: string;
  logoUrl?: string;
  image?: ApiImage;
  logo?: ApiImage;
  branding?: OrgBranding | null;
};

export type BrandingEvent = {
  branding?: OrgBranding | null;
  organization?: BrandingOrganization | null;
  image?: ApiImage;
};

export type TicketingTheme = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  buttonColor: string;
  buttonTextColor: string;
  logoSrc: string;
  brandLogoSrc: string;
};

export const BLOCKTICKETS_NAVY = "#051b35";
export const BLOCKTICKETS_GREEN = "#a6e773";
export const BLOCKTICKETS_LOGO = "/blocktickets-emblem-navy.svg";
export const BLOCKTICKETS_LOCKUP = "/blocktickets-logo.svg";

function mediaUrl(media?: ApiImage | null): string | null {
  if (!media) return null;
  if (typeof media === "string") return media;
  return (
    media.url ||
    media.formats?.small?.url ||
    media.formats?.thumbnail?.url ||
    null
  );
}

function isUsableBranding(branding?: OrgBranding | null): boolean {
  return Boolean(
    branding &&
      branding.enabled !== false &&
      (branding.primaryColor ||
        branding.buttonColor ||
        mediaUrl(branding.logo) ||
        mediaUrl(branding.darkLogo)),
  );
}

/** Event branding wins when explicitly usable; otherwise fall back to org branding. */
export function getActiveBranding(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
): OrgBranding | null {
  const eventBranding = event?.branding;
  const orgBranding = organization?.branding;
  if (isUsableBranding(eventBranding)) return eventBranding ?? null;
  if (isUsableBranding(orgBranding)) return orgBranding ?? null;
  return orgBranding || eventBranding || null;
}

export function resolvePrimaryColor(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
): string {
  const branding = getActiveBranding(event, organization);
  if (branding?.primaryColor) return branding.primaryColor;
  return (
    organization?.primaryColor ||
    organization?.accentColor ||
    organization?.brandColor ||
    BLOCKTICKETS_NAVY
  );
}

export function resolveButtonColor(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
  fallbackAccent?: string,
): string {
  const branding = getActiveBranding(event, organization);
  return (
    branding?.buttonColor ||
    branding?.primaryColor ||
    fallbackAccent ||
    resolvePrimaryColor(event, organization)
  );
}

export function resolveButtonTextColor(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
): string {
  const branding = getActiveBranding(event, organization);
  return branding?.buttonTextColor || "#FFFFFF";
}

/** Branding logo → org image → darkLogo. */
export function resolveBrandLogo(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
): string | null {
  const branding = getActiveBranding(event, organization);
  return (
    mediaUrl(branding?.logo) ||
    mediaUrl(event?.branding?.logo) ||
    mediaUrl(organization?.branding?.logo) ||
    mediaUrl(organization?.image) ||
    mediaUrl(organization?.logo) ||
    organization?.logoUrl ||
    mediaUrl(branding?.darkLogo) ||
    null
  );
}

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexColor(hex: string): [number, number, number] | null {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3) {
    return [
      parseInt(raw[0] + raw[0], 16),
      parseInt(raw[1] + raw[1], 16),
      parseInt(raw[2] + raw[2], 16),
    ];
  }
  if (raw.length === 6) {
    return [
      parseInt(raw.slice(0, 2), 16),
      parseInt(raw.slice(2, 4), 16),
      parseInt(raw.slice(4, 6), 16),
    ];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((c) => clampByte(c).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(hex: string, target: string, amount: number) {
  const base = parseHexColor(hex);
  const end = parseHexColor(target);
  if (!base || !end) return hex;
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    base[0] + (end[0] - base[0]) * t,
    base[1] + (end[1] - base[1]) * t,
    base[2] + (end[2] - base[2]) * t,
  );
}

function darkenHex(hex: string, amount = 0.18) {
  return mixHex(hex, "#000000", amount);
}

function lightenHex(hex: string, amount = 0.88) {
  return mixHex(hex, "#ffffff", amount);
}

export function brandingToTicketingTheme(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
  eventPosterSrc?: string | null,
): TicketingTheme {
  const accent = resolvePrimaryColor(event, organization);
  const buttonColor = resolveButtonColor(event, organization, accent);
  const brandLogo = resolveBrandLogo(event, organization);
  const logoSrc =
    eventPosterSrc ||
    brandLogo ||
    mediaUrl(event?.image) ||
    BLOCKTICKETS_LOGO;

  return {
    accent,
    accentDark: darkenHex(accent),
    accentSoft: lightenHex(accent),
    buttonColor,
    buttonTextColor: resolveButtonTextColor(event, organization),
    logoSrc: imageUrl(logoSrc, BLOCKTICKETS_LOGO),
    brandLogoSrc: imageUrl(brandLogo, BLOCKTICKETS_LOGO),
  };
}

export function brandingCssVars(
  event?: BrandingEvent | null,
  organization: BrandingOrganization | null | undefined = event?.organization,
) {
  const accent = resolvePrimaryColor(event, organization);
  return {
    "--spp-accent": accent,
    "--spp-button": resolveButtonColor(event, organization, accent),
    "--spp-button-text": resolveButtonTextColor(event, organization),
  } as Record<string, string>;
}
