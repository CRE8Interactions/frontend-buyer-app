const ALLOWED_HOST_SUFFIXES = [
  "digitaloceanspaces.com",
  "amazonaws.com",
  "cloudfront.net",
  "localhost",
  "127.0.0.1",
  "blocktickets.net",
];

function extraAllowedHosts() {
  try {
    const api = process.env.NEXT_PUBLIC_API;
    if (!api) return [];
    return [new URL(api).hostname.toLowerCase()];
  } catch {
    return [];
  }
}

/** Turn a relative or protocol-relative logo path into an absolute URL. */
export function resolveReceiptLogoSrc(
  raw: string | null | undefined,
  origin: string,
): string | null {
  const value = String(raw || "").trim();
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) {
    return value || null;
  }
  try {
    return new URL(value, origin).href;
  } catch {
    return null;
  }
}

export function isAllowedReceiptLogoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return [...ALLOWED_HOST_SUFFIXES, ...extraAllowedHosts()].some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

/** Same-origin proxy so the receipt PDF can load Strapi/CDN logos. */
export function receiptLogoProxyPath(src: string, origin: string): string {
  const absolute = resolveReceiptLogoSrc(src, origin) || src;
  return `/api/receipt-logo?src=${encodeURIComponent(absolute)}`;
}
