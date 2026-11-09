import type { NextConfig } from "next";

const isolatedDistDir = process.env.CRAYS_NEXT_DIST_DIR?.trim();
const brokerOnlyRuntime = process.env.CRAYS_NOSTR_BROKER_ONLY_MODE === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  experimental: {
    webpackMemoryOptimizations: process.env.CRAYS_FAST_LOCAL_COMPILE !== "1",
  },
  ...(brokerOnlyRuntime ? {
    skipProxyUrlNormalize: true,
    skipTrailingSlashRedirect: true,
  } : {}),
  ...(isolatedDistDir ? { distDir: isolatedDistDir } : {}),
};

export default nextConfig;
