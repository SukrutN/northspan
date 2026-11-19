import type { NextConfig } from "next";

// GitHub Pages serves the repo at /northspan. Local dev stays at the root.
const basePath = process.env.GITHUB_ACTIONS === "true" ? "/northspan" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
