import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import { GET } from "./route";

const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];
const raptorsLogo = raptorsEvent.organization.image.url;

describe("GET /api/receipt-logo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the organization logo from an allowed host", async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(png, { headers: { "Content-Type": "image/png" } })),
    );
    const src = encodeURIComponent(`http://localhost:1337${raptorsLogo}`);
    const res = await GET(
      new NextRequest(`http://localhost:3000/api/receipt-logo?src=${src}`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/image\//);
    expect(new Uint8Array(await res.arrayBuffer())[0]).toBe(0x89);
  });

  it("rejects a logo url that is not an allowed image host", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/receipt-logo?src=https://evil.example/logo.png",
      ),
    );
    expect(res.status).toBe(400);
  });
});
