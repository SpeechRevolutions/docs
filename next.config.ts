import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `next build` emits `out/`, which is uploaded to S3 and served by
  // CloudFront. No Node server, so no route handlers and no runtime rendering.
  output: "export",
  // CloudFront resolves `/guides/timestamps/` to `/guides/timestamps/index.html`, so emit
  // directory-style output rather than sibling `.html` files.
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
