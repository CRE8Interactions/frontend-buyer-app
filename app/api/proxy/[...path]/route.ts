import type { NextRequest } from "next/server";

/* A same-origin door to the backend, for hosted previews.
   Why: the backend answers a browser's pre-check (CORS) in full only for the addresses it knows (localhost). From any other address a JSON POST such as the seat
   availability call is refused by the browser ("content-type is not allowed"), and the seat map shows "not available". The page's server can talk to the backend
   freely, so with NEXT_PUBLIC_API_PROXY=/api/proxy the browser calls this route instead and the server forwards the request.
   It is off unless that variable is set (404), it only ever forwards to the backend named in NEXT_PUBLIC_API, and it passes through only the headers the backend
   uses. Nothing is stored. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET = () => (process.env.NEXT_PUBLIC_API || "").replace(/\/+$/, "");
const FORWARD = ["content-type", "authorization", "accept", "x-queue-session-id", "x-waiting-room-token", "idempotency-key"];

async function forward(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!process.env.NEXT_PUBLIC_API_PROXY || !/^https?:\/\//.test(TARGET())) return new Response("Not found", { status: 404 });
  const { path } = await ctx.params;
  if (!path.length || path.some((s) => s === "." || s === ".." || s.includes("\\"))) return new Response("Bad request", { status: 400 });

  const url = `${TARGET()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const h of FORWARD) { const v = req.headers.get(h); if (v) headers.set(h, v); }
  const hasBody = !["GET", "HEAD"].includes(req.method);

  try {
    const res = await fetch(url, { method: req.method, headers, body: hasBody ? await req.arrayBuffer() : undefined, redirect: "manual", cache: "no-store" });
    const out = new Headers();
    const type = res.headers.get("content-type");
    if (type) out.set("content-type", type);
    out.set("cache-control", "no-store");
    return new Response(res.body, { status: res.status, headers: out });
  } catch {
    return new Response("Bad gateway", { status: 502, headers: { "cache-control": "no-store" } });
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
