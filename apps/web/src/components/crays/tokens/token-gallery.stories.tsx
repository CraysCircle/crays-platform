import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const swatches = [
  ["Canvas", "background", "--background"],
  ["Surface", "card", "--card"],
  ["Primary", "primary", "--primary"],
  ["Secondary", "secondary", "--secondary"],
  ["Accent", "accent", "--accent-ui"],
  ["Success", "success", "--success"],
  ["Warning", "warning", "--warning"],
  ["Info", "info", "--info"],
  ["Danger", "destructive", "--destructive"],
] as const;

const density = [
  ["Compact control", "var(--crays-control-height-compact)"],
  ["Default control", "var(--crays-control-height-default)"],
  ["Comfortable control", "var(--crays-control-height-comfortable)"],
  ["Compact table row", "var(--crays-table-row-height-compact)"],
  ["Default table row", "var(--crays-table-row-height-default)"],
] as const;

const meta = {
  title: "CRAYS/Tokens",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Foundation: Story = {
  render: () => (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold">Semantic color tokens</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map(([label, token, cssVar]) => (
            <div
              key={token}
              className="rounded-md border border-border bg-card p-3"
            >
              <div
                className="mb-3 h-12 rounded-sm border border-border"
                style={{ background: `var(${cssVar})` }}
              />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium">{label}</span>
                <code className="font-mono text-muted-foreground">
                  {`--color-${token}`}
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold">Density aliases</h2>
        <div className="grid gap-3">
          {density.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[12rem_1fr_auto] items-center gap-3 text-xs"
            >
              <span className="font-medium">{label}</span>
              <div
                className="rounded-sm border border-border bg-secondary"
                style={{ height: value }}
              />
              <code className="font-mono text-muted-foreground">{value}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
