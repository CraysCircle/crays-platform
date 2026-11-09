import type { NextConfig } from "next";

const isolatedDistDir = process.env.CRAYS_NEXT_DIST_DIR?.trim();
if (isolatedDistDir &&
    !/^[.]?[a-zA-Z0-9][a-zA-Z0-9._-]{2,120}$/.test(isolatedDistDir)) {
  throw new Error("CRAYS_NEXT_DIST_DIR_INVALID");
}

const typescriptOnlyPageExtensions =
  process.env.CRAYS_TYPESCRIPT_PAGE_EXTENSIONS_ONLY === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  ...(process.env.CRAYS_PERFORMANCE_BUILD_SERIAL === "true" && process.env.NODE_ENV === "production" ? {experimental: {cpus: 1, webpackMemoryOptimizations: true, webpackBuildWorker: true}} : {}),
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
  // Deployment-only runtime transport; preserve all frozen Member source files.
  webpack: (config, {dev, webpack}) => {
    if (dev && config.cache && typeof config.cache === "object") {
      config.cache = {...config.cache, maxMemoryGenerations: 0};
    }
    const root = process.cwd();
    const integration = root + "/runtime-integration/member-original-read-api-source002";
    const replacement = require("./runtime-integration/member-original-read-api-source002/webpack-hook.cjs");
    config.plugins.push(replacement(webpack, root, integration));
    return config;
  },
  // Preserve the exact registered Member image URLs and original bytes on Vercel.
  async rewrites() {
    return {beforeFiles: [{"source":"/api/member-demo-media/member-demo-20261012-001-f97297fbc756.png","destination":"/__crays-member-media/member-demo-20261012-001-f97297fbc756.png"},{"source":"/api/member-demo-media/member-demo-20261012-002-ab884a9b9de6.png","destination":"/__crays-member-media/member-demo-20261012-002-ab884a9b9de6.png"},{"source":"/api/member-demo-media/member-demo-20261012-003-acbaede35fd1.png","destination":"/__crays-member-media/member-demo-20261012-003-acbaede35fd1.png"},{"source":"/api/member-demo-media/member-demo-20261012-004-e74303ceda98.png","destination":"/__crays-member-media/member-demo-20261012-004-e74303ceda98.png"},{"source":"/api/member-demo-media/member-demo-20261012-005-6e01dab80947.png","destination":"/__crays-member-media/member-demo-20261012-005-6e01dab80947.png"},{"source":"/api/member-demo-media/member-demo-20261012-006-e4ad398b81c9.png","destination":"/__crays-member-media/member-demo-20261012-006-e4ad398b81c9.png"},{"source":"/api/member-demo-media/member-demo-20261012-007-709df510dd17.png","destination":"/__crays-member-media/member-demo-20261012-007-709df510dd17.png"},{"source":"/api/member-demo-media/member-demo-20261012-008-1bf9c14f20ce.png","destination":"/__crays-member-media/member-demo-20261012-008-1bf9c14f20ce.png"},{"source":"/api/member-demo-media/member-demo-20261012-009-5983f6cb0c32.png","destination":"/__crays-member-media/member-demo-20261012-009-5983f6cb0c32.png"},{"source":"/api/member-demo-media/member-demo-20261012-010-fc26ac196476.png","destination":"/__crays-member-media/member-demo-20261012-010-fc26ac196476.png"},{"source":"/api/member-demo-media/member-demo-20261012-011-42e13582d097.png","destination":"/__crays-member-media/member-demo-20261012-011-42e13582d097.png"},{"source":"/api/member-demo-media/member-demo-20261012-012-5d89dbb826a1.png","destination":"/__crays-member-media/member-demo-20261012-012-5d89dbb826a1.png"},{"source":"/api/member-demo-media/member-demo-20261012-013-784999f70837.png","destination":"/__crays-member-media/member-demo-20261012-013-784999f70837.png"},{"source":"/api/member-demo-media/member-demo-20261012-014-53fc056509a7.png","destination":"/__crays-member-media/member-demo-20261012-014-53fc056509a7.png"},{"source":"/api/member-demo-media/member-demo-20261012-015-6b24e5c5d498.png","destination":"/__crays-member-media/member-demo-20261012-015-6b24e5c5d498.png"},{"source":"/api/member-demo-media/member-demo-20261012-016-72c052a0b04b.png","destination":"/__crays-member-media/member-demo-20261012-016-72c052a0b04b.png"},{"source":"/api/member-demo-media/member-demo-20261012-017-822323714f5b.png","destination":"/__crays-member-media/member-demo-20261012-017-822323714f5b.png"},{"source":"/api/member-demo-media/member-demo-20261012-018-e5db4ed9ed4b.png","destination":"/__crays-member-media/member-demo-20261012-018-e5db4ed9ed4b.png"},{"source":"/api/member-demo-media/member-demo-20261012-019-733526a2717c.png","destination":"/__crays-member-media/member-demo-20261012-019-733526a2717c.png"},{"source":"/api/member-demo-media/member-demo-20261012-020-c6b372aa3d64.png","destination":"/__crays-member-media/member-demo-20261012-020-c6b372aa3d64.png"},{"source":"/api/member-demo-media/member-demo-20261012-021-11b82a02f3f7.png","destination":"/__crays-member-media/member-demo-20261012-021-11b82a02f3f7.png"},{"source":"/api/member-demo-media/member-demo-20261012-022-1aec6267726c.png","destination":"/__crays-member-media/member-demo-20261012-022-1aec6267726c.png"},{"source":"/api/member-demo-media/member-demo-20261012-023-a0cfd36bfbd6.png","destination":"/__crays-member-media/member-demo-20261012-023-a0cfd36bfbd6.png"},{"source":"/api/member-demo-media/member-demo-20261012-024-ea5481def1d2.png","destination":"/__crays-member-media/member-demo-20261012-024-ea5481def1d2.png"},{"source":"/api/member-demo-media/member-demo-20261012-025-ffca8e9b5ebc.png","destination":"/__crays-member-media/member-demo-20261012-025-ffca8e9b5ebc.png"},{"source":"/api/member-demo-media/member-demo-20261012-026-f74c32fb7eef.png","destination":"/__crays-member-media/member-demo-20261012-026-f74c32fb7eef.png"},{"source":"/api/member-demo-media/member-demo-20261012-027-4854f3d04402.png","destination":"/__crays-member-media/member-demo-20261012-027-4854f3d04402.png"},{"source":"/api/member-demo-media/member-demo-20261012-028-ebba13c3582c.png","destination":"/__crays-member-media/member-demo-20261012-028-ebba13c3582c.png"},{"source":"/api/member-demo-media/member-demo-20261012-029-da4a6fa12422.png","destination":"/__crays-member-media/member-demo-20261012-029-da4a6fa12422.png"},{"source":"/api/member-demo-media/member-demo-20261012-030-5cc61b848aa7.png","destination":"/__crays-member-media/member-demo-20261012-030-5cc61b848aa7.png"},{"source":"/api/member-demo-media/member-demo-20261012-031-ce5d6860c8d7.png","destination":"/__crays-member-media/member-demo-20261012-031-ce5d6860c8d7.png"},{"source":"/api/member-demo-media/member-demo-20261012-032-7dc4bd392f50.png","destination":"/__crays-member-media/member-demo-20261012-032-7dc4bd392f50.png"},{"source":"/api/member-demo-media/member-demo-20261012-033-747edbba2e23.png","destination":"/__crays-member-media/member-demo-20261012-033-747edbba2e23.png"},{"source":"/api/member-demo-media/member-demo-20261012-034-08f4598a3451.png","destination":"/__crays-member-media/member-demo-20261012-034-08f4598a3451.png"},{"source":"/api/member-demo-media/member-demo-20261012-035-630591c96840.png","destination":"/__crays-member-media/member-demo-20261012-035-630591c96840.png"},{"source":"/api/member-demo-media/member-demo-20261012-036-e4b81cc3d1aa.png","destination":"/__crays-member-media/member-demo-20261012-036-e4b81cc3d1aa.png"},{"source":"/api/member-demo-media/member-demo-20261012-037-d84e263c1d34.png","destination":"/__crays-member-media/member-demo-20261012-037-d84e263c1d34.png"},{"source":"/api/member-demo-media/member-demo-20261012-038-495432426d29.png","destination":"/__crays-member-media/member-demo-20261012-038-495432426d29.png"},{"source":"/api/member-demo-media/member-demo-20261012-039-d3529df378b9.png","destination":"/__crays-member-media/member-demo-20261012-039-d3529df378b9.png"},{"source":"/api/member-demo-media/member-demo-20261012-040-ee72f722537f.png","destination":"/__crays-member-media/member-demo-20261012-040-ee72f722537f.png"},{"source":"/api/member-demo-media/member-demo-20261012-041-7924d8bd43b5.png","destination":"/__crays-member-media/member-demo-20261012-041-7924d8bd43b5.png"},{"source":"/api/member-demo-media/member-demo-20261012-042-1dec094fd706.png","destination":"/__crays-member-media/member-demo-20261012-042-1dec094fd706.png"},{"source":"/api/member-demo-media/member-demo-20261012-043-3ef6d9a8f31c.png","destination":"/__crays-member-media/member-demo-20261012-043-3ef6d9a8f31c.png"},{"source":"/api/member-demo-media/member-demo-20261012-044-8f3a40485f84.png","destination":"/__crays-member-media/member-demo-20261012-044-8f3a40485f84.png"},{"source":"/api/member-demo-media/member-demo-20261012-045-a143a1f17f04.png","destination":"/__crays-member-media/member-demo-20261012-045-a143a1f17f04.png"},{"source":"/api/member-demo-media/member-demo-20261012-046-6d6bb15b1c66.png","destination":"/__crays-member-media/member-demo-20261012-046-6d6bb15b1c66.png"},{"source":"/api/member-demo-media/member-demo-20261012-047-807da194b629.png","destination":"/__crays-member-media/member-demo-20261012-047-807da194b629.png"},{"source":"/api/member-demo-media/member-demo-20261012-048-5855a9c4e190.png","destination":"/__crays-member-media/member-demo-20261012-048-5855a9c4e190.png"},{"source":"/api/member-demo-media/member-demo-20261012-049-f3cee41de8fc.png","destination":"/__crays-member-media/member-demo-20261012-049-f3cee41de8fc.png"},{"source":"/api/member-demo-media/member-demo-20261012-050-85d5cffb282b.png","destination":"/__crays-member-media/member-demo-20261012-050-85d5cffb282b.png"},{"source":"/api/member-demo-media/member-demo-20261012-051-d274ab62a856.png","destination":"/__crays-member-media/member-demo-20261012-051-d274ab62a856.png"},{"source":"/api/member-demo-media/member-demo-20261012-052-7fe9616e7752.png","destination":"/__crays-member-media/member-demo-20261012-052-7fe9616e7752.png"},{"source":"/api/member-demo-media/member-demo-20261012-053-430ea88227f5.png","destination":"/__crays-member-media/member-demo-20261012-053-430ea88227f5.png"},{"source":"/api/member-demo-media/member-demo-20261012-054-0c4243a348fa.png","destination":"/__crays-member-media/member-demo-20261012-054-0c4243a348fa.png"},{"source":"/api/member-demo-media/member-demo-20261012-055-1dada878daaa.png","destination":"/__crays-member-media/member-demo-20261012-055-1dada878daaa.png"},{"source":"/api/member-demo-media/member-demo-20261012-056-ffeffd8a3a22.png","destination":"/__crays-member-media/member-demo-20261012-056-ffeffd8a3a22.png"},{"source":"/api/member-demo-media/member-demo-20261012-057-ffa675bc0e6f.png","destination":"/__crays-member-media/member-demo-20261012-057-ffa675bc0e6f.png"},{"source":"/api/member-demo-media/member-demo-20261012-058-d60752c0b043.png","destination":"/__crays-member-media/member-demo-20261012-058-d60752c0b043.png"},{"source":"/api/member-demo-media/member-demo-20261012-059-916613328c45.png","destination":"/__crays-member-media/member-demo-20261012-059-916613328c45.png"},{"source":"/api/member-demo-media/member-demo-20261012-060-3dac6bfba0fa.png","destination":"/__crays-member-media/member-demo-20261012-060-3dac6bfba0fa.png"},{"source":"/api/member-demo-media/member-demo-20261012-061-84d72fd12826.png","destination":"/__crays-member-media/member-demo-20261012-061-84d72fd12826.png"},{"source":"/api/member-demo-media/member-demo-20261012-062-439c50598ec9.png","destination":"/__crays-member-media/member-demo-20261012-062-439c50598ec9.png"},{"source":"/api/member-demo-media/member-demo-20261012-063-0fedcdbc1999.png","destination":"/__crays-member-media/member-demo-20261012-063-0fedcdbc1999.png"},{"source":"/api/member-demo-media/member-demo-20261012-064-708d86fb10c9.png","destination":"/__crays-member-media/member-demo-20261012-064-708d86fb10c9.png"},{"source":"/api/member-demo-media/member-demo-20261012-065-53c9ccedd97c.png","destination":"/__crays-member-media/member-demo-20261012-065-53c9ccedd97c.png"},{"source":"/api/member-demo-media/member-demo-20261012-066-f2b31bd5e1d3.png","destination":"/__crays-member-media/member-demo-20261012-066-f2b31bd5e1d3.png"},{"source":"/api/member-demo-media/member-demo-20261012-067-8d5a0ab2aabc.png","destination":"/__crays-member-media/member-demo-20261012-067-8d5a0ab2aabc.png"},{"source":"/api/member-demo-media/member-demo-20261012-068-de78134660de.png","destination":"/__crays-member-media/member-demo-20261012-068-de78134660de.png"},{"source":"/api/member-demo-media/member-demo-20261012-069-3f7753eb6884.png","destination":"/__crays-member-media/member-demo-20261012-069-3f7753eb6884.png"},{"source":"/api/member-demo-media/member-demo-20261012-070-2f31a883a0c6.png","destination":"/__crays-member-media/member-demo-20261012-070-2f31a883a0c6.png"},{"source":"/api/member-demo-media/member-demo-20261012-071-b9c6688245fe.png","destination":"/__crays-member-media/member-demo-20261012-071-b9c6688245fe.png"},{"source":"/api/member-demo-media/member-demo-20261012-072-3d566914e1de.png","destination":"/__crays-member-media/member-demo-20261012-072-3d566914e1de.png"},{"source":"/api/member-demo-media/member-demo-20261012-073-e111546d6d3c.png","destination":"/__crays-member-media/member-demo-20261012-073-e111546d6d3c.png"},{"source":"/api/member-demo-media/member-demo-20261012-074-c48cc4557f1c.png","destination":"/__crays-member-media/member-demo-20261012-074-c48cc4557f1c.png"},{"source":"/api/member-demo-media/member-demo-20261012-075-5f351ebfe851.png","destination":"/__crays-member-media/member-demo-20261012-075-5f351ebfe851.png"},{"source":"/api/member-demo-media/member-demo-20261012-076-3a7928b69d18.png","destination":"/__crays-member-media/member-demo-20261012-076-3a7928b69d18.png"},{"source":"/api/member-demo-media/member-demo-20261012-077-7286f2a68394.png","destination":"/__crays-member-media/member-demo-20261012-077-7286f2a68394.png"},{"source":"/api/member-demo-media/member-demo-20261012-078-2653970e24f7.png","destination":"/__crays-member-media/member-demo-20261012-078-2653970e24f7.png"},{"source":"/api/member-demo-media/member-demo-20261012-079-a900a29d3889.png","destination":"/__crays-member-media/member-demo-20261012-079-a900a29d3889.png"},{"source":"/api/member-demo-media/member-demo-20261012-080-45f67a54b459.png","destination":"/__crays-member-media/member-demo-20261012-080-45f67a54b459.png"},{"source":"/api/member-demo-media/member-demo-20261012-081-78c76dcaea4d.png","destination":"/__crays-member-media/member-demo-20261012-081-78c76dcaea4d.png"},{"source":"/api/member-demo-media/member-demo-20261012-082-37de9510eeb8.png","destination":"/__crays-member-media/member-demo-20261012-082-37de9510eeb8.png"},{"source":"/api/member-demo-media/member-demo-20261012-083-0f05703ac3d5.png","destination":"/__crays-member-media/member-demo-20261012-083-0f05703ac3d5.png"},{"source":"/api/member-demo-media/member-demo-20261012-084-69c287d92d68.png","destination":"/__crays-member-media/member-demo-20261012-084-69c287d92d68.png"},{"source":"/api/member-demo-media/member-demo-20261012-085-bd818be40b36.png","destination":"/__crays-member-media/member-demo-20261012-085-bd818be40b36.png"},{"source":"/api/member-demo-media/member-demo-20261012-086-ccbb597fe236.png","destination":"/__crays-member-media/member-demo-20261012-086-ccbb597fe236.png"},{"source":"/api/member-demo-media/member-demo-20261012-087-fafae8745177.png","destination":"/__crays-member-media/member-demo-20261012-087-fafae8745177.png"},{"source":"/api/member-demo-media/member-demo-20261012-088-af38089b5174.png","destination":"/__crays-member-media/member-demo-20261012-088-af38089b5174.png"},{"source":"/api/member-demo-media/member-demo-20261012-089-ea530c054c43.png","destination":"/__crays-member-media/member-demo-20261012-089-ea530c054c43.png"},{"source":"/api/member-demo-media/member-demo-20261012-090-39e47b0f44cd.png","destination":"/__crays-member-media/member-demo-20261012-090-39e47b0f44cd.png"},{"source":"/api/member-demo-media/member-demo-20261012-091-cf85e2d28a5c.png","destination":"/__crays-member-media/member-demo-20261012-091-cf85e2d28a5c.png"},{"source":"/api/member-demo-media/member-demo-20261012-092-e41049abaf82.png","destination":"/__crays-member-media/member-demo-20261012-092-e41049abaf82.png"},{"source":"/api/member-demo-media/member-demo-20261012-093-b48b3780d484.png","destination":"/__crays-member-media/member-demo-20261012-093-b48b3780d484.png"},{"source":"/api/member-demo-media/member-demo-20261012-094-f83a08e107fe.png","destination":"/__crays-member-media/member-demo-20261012-094-f83a08e107fe.png"},{"source":"/api/member-demo-media/member-demo-20261012-095-93230a1d6882.png","destination":"/__crays-member-media/member-demo-20261012-095-93230a1d6882.png"},{"source":"/api/member-demo-media/member-demo-20261012-096-e0ccb8fa9ff4.png","destination":"/__crays-member-media/member-demo-20261012-096-e0ccb8fa9ff4.png"},{"source":"/api/member-demo-media/member-demo-20261012-097-bc3d7bc168b2.png","destination":"/__crays-member-media/member-demo-20261012-097-bc3d7bc168b2.png"},{"source":"/api/member-demo-media/member-demo-20261012-098-033ee28b28ce.png","destination":"/__crays-member-media/member-demo-20261012-098-033ee28b28ce.png"},{"source":"/api/member-demo-media/member-demo-20261012-099-5dc9e9b0ff39.png","destination":"/__crays-member-media/member-demo-20261012-099-5dc9e9b0ff39.png"},{"source":"/api/member-demo-media/member-demo-20261012-100-95097351f791.png","destination":"/__crays-member-media/member-demo-20261012-100-95097351f791.png"}], afterFiles: [], fallback: []};
  },
  async redirects() {
    return [
      {source:"/auth/login",destination:"https://member.crays.world/auth/login",permanent:false},
      {source:"/auth/logout",destination:"https://member.crays.world/auth/logout",permanent:false},
      { source: "/auth/:path*", has: [{type: "host", value: "craysclub.com"}], destination: "https://www.craysclub.com/auth/:path*", permanent: true },
      { source: "/:locale(en|de|es|ca|fr|pt|it)/account", has: [{type: "host", value: "craysclub.com"}], destination: "https://www.craysclub.com/:locale/account", permanent: true },

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
