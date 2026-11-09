export const postBlock110PerformancePhase = {
  label: "Post Block 110 Performance and Load-Time Optimization",
  reason:
    "The platform is functionally broader after Blocks 91-110, but load time and interaction latency are now a primary product risk.",
  proposedBlocks: [
    { block: 111, label: "Performance Baseline & Budgets", outcome: "Measure route TTFB, LCP, hydration cost, JS payload, DB query time and API latency." },
    { block: 112, label: "Server Fetch / RSC Consolidation", outcome: "Remove duplicate client fetches and push initial data into server-rendered route payloads." },
    { block: 113, label: "Bundle & Client Boundary Reduction", outcome: "Split large use-client islands, lazy-load heavy tables/boards and reduce shipped JS." },
    { block: 114, label: "Database Query Index and Pagination Audit", outcome: "Profile Neon/Postgres queries, add missing indexes and enforce bounded pagination." },
    { block: 115, label: "Cache and Revalidation Contract", outcome: "Define route-level cache, tag revalidation and no-store only where required." },
    { block: 116, label: "Table/Board Virtualization", outcome: "Keep large CRM/project datasets fast without rendering thousands of DOM rows." },
    { block: 117, label: "Asset/Image/Font Optimization", outcome: "Reduce image, logo, icon and font load cost on public and workspace pages." },
    { block: 118, label: "API Waterfall Elimination", outcome: "Batch dashboard/workspace API calls and remove avoidable serial waits." },
    { block: 119, label: "Production Observability for Speed", outcome: "Track slow routes, cold starts, DB pool pressure and client Web Vitals." },
    { block: 120, label: "Performance Release Gate", outcome: "Block release if measured budgets regress on the top user journeys." },
  ],
  hardBudgets: {
    publicLcpMs: 2500,
    workspaceLcpMs: 3500,
    initialJsKbTarget: 350,
    apiP95MsTarget: 800,
    duplicateInitialFetchesAllowed: 0,
  },
} as const;
