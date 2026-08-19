import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic fan-app routes need a Node server (not static export).
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Dynamic pages default to 0s in the client cache, so every back/forward
    // navigation refetches the RSC payload and flashes the loading boundary.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
};

export default nextConfig;
