import { NextRequest, NextResponse } from "next/server";
import {
  isAllowedReceiptLogoUrl,
  resolveReceiptLogoSrc,
} from "@/lib/receiptLogo";

export const runtime = "nodejs";

/** Proxies an org logo so the receipt PDF can inline it without CORS. */
export async function GET(req: NextRequest) {
  const src = resolveReceiptLogoSrc(
    req.nextUrl.searchParams.get("src"),
    req.nextUrl.origin,
  );
  if (!src || src.startsWith("data:") || !isAllowedReceiptLogoUrl(src)) {
    return NextResponse.json({ error: "Invalid image url" }, { status: 400 });
  }

  try {
    const res = await fetch(src, {
      headers: { Accept: "image/*,image/svg+xml" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
    }

    const bytes = await res.arrayBuffer();
    const type = res.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  }
}
