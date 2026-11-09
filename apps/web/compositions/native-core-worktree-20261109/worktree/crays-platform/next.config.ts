import type { NextConfig } from "next";
import path from "node:path";

// Personal-account and Chuck runtime modules live alongside crays-platform.
const repositoryRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  turbopack: { root: repositoryRoot },
  outputFileTracingRoot: repositoryRoot,
};

export default nextConfig;
