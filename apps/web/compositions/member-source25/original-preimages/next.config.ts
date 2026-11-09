import type { NextConfig } from "next";

const isolatedDistDir = process.env.CRAYS_NEXT_DIST_DIR?.trim();
if (isolatedDistDir &&
    !/^[.]?[a-zA-Z0-9][a-zA-Z0-9._-]{2,120}$/.test(isolatedDistDir)) {
  throw new Error("CRAYS_NEXT_DIST_DIR_INVALID");
}

const typescriptOnlyPageExtensions =
  process.env.CRAYS_TYPESCRIPT_PAGE_EXTENSIONS_ONLY === "true";

const nextConfig: NextConfig = {
  // Native backend artifact only; retain the original SDK and complete routes.
  output: "standalone",
  outputFileTracingExcludes: {"/*": ["**/*.private", "**/*.private.json", "**/*.private.log"]},
  allowedDevOrigins: ["127.0.0.1"],
  ...(process.env.CRAYS_PERFORMANCE_BUILD_SERIAL === "true" && process.env.NODE_ENV === "production" ? {experimental: {cpus: 1, webpackMemoryOptimizations: true}} : {}),
  devIndicators: false,
  // Keep this large multilingual development preview within its owned memory budget.
  ...(process.env.NODE_ENV === "development" ? {
    onDemandEntries: { maxInactiveAge: 15_000, pagesBufferLength: 2 },
    experimental: { webpackMemoryOptimizations: true },
    webpack: (config, { dev }) => {
      if (dev && config.cache && typeof config.cache === "object") {
        config.cache = { ...config.cache, maxMemoryGenerations: 0 };
      }
      return config;
    },
  } : {}),
  async redirects() {
    return [
      { source: "/about", destination: "/en/about-us", permanent: true },
      { source: "/about-us", destination: "/en/about-us", permanent: true },
      { source: "/career", destination: "/en/school-jobs", permanent: true },
      { source: "/community", destination: "/en/community-life", permanent: true },
      { source: "/community-life", destination: "/en/community-life", permanent: true },
      { source: "/become-a-member", destination: "/en/become-a-member", permanent: true },
      { source: "/membership", destination: "/en/become-a-member", permanent: true },
      { source: "/hospitality", destination: "/en/hospitality", permanent: true },
      { source: "/lifestyle", destination: "/en/lifestyle", permanent: true },
      { source: "/contact", destination: "/en/contact", permanent: true },
      { source: "/events", destination: "/en/experiences", permanent: true },
      { source: "/experiences", destination: "/en/experiences", permanent: true },
      { source: "/forest-city", destination: "/en/discover", permanent: true },
      { source: "/discover", destination: "/en/discover", permanent: true },
      { source: "/families", destination: "/en/families", permanent: true },
      { source: "/teams", destination: "/en/teams", permanent: true },
      { source: "/school-jobs", destination: "/en/school-jobs", permanent: true },
      { source: "/brand-as-a-service", destination: "/en/brand-as-a-service", permanent: true },
      { source: "/legal", destination: "/en/legal", permanent: true },
      { source: "/legal/imprint", destination: "/en/legal/imprint", permanent: true },
      { source: "/legal/terms-and-conditions", destination: "/en/legal/terms-and-conditions", permanent: true },
      { source: "/legal/data-protection", destination: "/en/legal/data-protection", permanent: true },
      { source: "/legal/privacy-policy", destination: "/en/legal/privacy-policy", permanent: true },
      { source: "/imprint", destination: "/en/legal/imprint", permanent: true },
      { source: "/terms", destination: "/en/legal/terms-and-conditions", permanent: true },
      { source: "/terms-and-conditions", destination: "/en/legal/terms-and-conditions", permanent: true },
      { source: "/data-protection", destination: "/en/legal/data-protection", permanent: true },
      { source: "/privacy", destination: "/en/legal/privacy-policy", permanent: true },
      { source: "/privacy-policy", destination: "/en/legal/privacy-policy", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
  ...(isolatedDistDir ? {
    distDir: isolatedDistDir,
  } : {}),
  ...(typescriptOnlyPageExtensions ? {
    pageExtensions: ["ts", "tsx"],
  } : {}),
};

export default nextConfig;
