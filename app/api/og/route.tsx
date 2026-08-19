import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 630;

const ALLOWED_HOST_SUFFIXES = [
  "digitaloceanspaces.com",
  "amazonaws.com",
  "cloudfront.net",
  "blocktickets.xyz",
  "ondigitalocean.app",
  "localhost",
  "127.0.0.1",
];

function siteHosts(): string[] {
  const hosts: string[] = [];
  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]) {
    if (!raw) continue;
    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      hosts.push(new URL(withProtocol).hostname.toLowerCase());
    } catch {
      // ignore invalid env values
    }
  }
  return hosts;
}

function isAllowedImageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (siteHosts().includes(host)) return true;
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function clamp(value: string, max: number) {
  const trimmed = value.trim().replace(/\u2026/g, "...");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
}

async function loadArtworkDataUrl(raw: string): Promise<string | null> {
  if (!raw || !isAllowedImageUrl(raw)) return null;
  try {
    const res = await fetch(raw, {
      // Artwork is public CDN media; cache briefly for repeated OG scrapes.
      next: { revalidate: 300 },
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // Keep payloads reasonable for ImageResponse.
    if (buffer.byteLength > 4_500_000) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function OgCard({
  title,
  subtitle,
  cta,
  domain,
  imageSrc,
}: {
  title: string;
  subtitle: string;
  cta: string;
  domain: string;
  imageSrc: string | null;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#F4F5F7",
        padding: 36,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FFFFFF",
          borderRadius: 28,
          overflow: "hidden",
          border: "1px solid #E6E8EE",
        }}
      >
        <div
          style={{
            width: 520,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111827",
          }}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              width={520}
              height={558}
              style={{
                width: 520,
                height: 558,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Blocktickets
              </div>
              <div style={{ fontSize: 20, color: "#9CA3AF" }}>
                Sports-first ticketing
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "48px 48px 44px 44px",
            width: 608,
            background: "#FFFFFF",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                background: "#EEF0F4",
                color: "#4B5563",
                fontSize: 22,
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: 999,
                marginBottom: 28,
                width: "auto",
              }}
            >
              {domain}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: title.length > 48 ? 40 : 46,
                fontWeight: 800,
                lineHeight: 1.15,
                color: "#0B1220",
                marginBottom: subtitle ? 14 : 0,
              }}
            >
              {title}
            </div>

            {subtitle ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#6B7280",
                  fontWeight: 500,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              background: "#0B1220",
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: 700,
              padding: "16px 28px",
              borderRadius: 14,
              width: "auto",
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = clamp(searchParams.get("title") || "Blocktickets", 90);
  const subtitle = clamp(searchParams.get("subtitle") || "", 60);
  const cta = clamp(searchParams.get("cta") || "Buy Tickets", 24);
  const domain = clamp(
    searchParams.get("domain") || request.nextUrl.host || "blocktickets.xyz",
    48,
  ).replace(/^www\./, "");
  const rawImage = searchParams.get("image") || "";

  try {
    const imageSrc = await loadArtworkDataUrl(rawImage);

    return new ImageResponse(
      (
        <OgCard
          title={title}
          subtitle={subtitle}
          cta={cta}
          domain={domain}
          imageSrc={imageSrc}
        />
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("[og] failed to render card", error);

    // Always return a valid image so scrapers don't report "URL did not return an image".
    return new ImageResponse(
      (
        <OgCard
          title={title}
          subtitle={subtitle}
          cta={cta}
          domain={domain}
          imageSrc={null}
        />
      ),
      {
        width: WIDTH,
        height: HEIGHT,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }
}
