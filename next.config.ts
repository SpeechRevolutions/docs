import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML/CSS export: the docs are served from S3 behind CloudFront, so there is no Node
  // server to run. "standalone" would emit one and silently never be used.
  output: "export",
  // S3 has no directory-index rewriting of its own, so emit `about/index.html` rather than
  // `about.html` and let CloudFront serve it at /about/.
  trailingSlash: true,
  images: { unoptimized: true }, // no Next image optimizer without a server
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
