import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic fan-app routes need a Node server (not static export).
  trailingSlash: true,
  // The /concept page is the landing page: "/" serves it (beforeFiles, so it wins over app/page.tsx) and the old
  // /concept address redirects to "/" so there is one canonical URL.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/concept" },
        ...(process.env.NODE_ENV === "development"
          ? [{ source: "/brand/:asset*", destination: "/api/brand-preview/:asset*" }]
          : []),
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [{ source: "/concept", destination: "/", permanent: false }];
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
