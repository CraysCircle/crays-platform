import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  EmptyState,
  ErrorState,
  InlineNotice,
  LoadingState,
  NoResultsState,
  PermissionState,
  SourceHealthState,
} from "@/components/crays/states/system-state";

const meta = {
  title: "CRAYS/States",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const CoreStates: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <LoadingState />
      <EmptyState />
      <NoResultsState />
      <ErrorState />
      <PermissionState />
      <SourceHealthState status="partial" />
    </div>
  ),
};

export const SourceHealth: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2">
      <SourceHealthState status="ready" />
      <SourceHealthState status="partial" />
      <SourceHealthState status="stale" />
      <SourceHealthState status="unavailable" />
    </div>
  ),
};

export const InlineNotices: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3">
      <InlineNotice
        title="Review mode"
        description="Visibility can be hinted in UI, but authority remains server-side."
        variant="info"
      />
      <InlineNotice
        title="Release gate closed"
        description="External sending, bank send, payment and apply flows remain blocked."
        variant="warning"
      />
      <InlineNotice
        title="Command rejected"
        description="The source returned a safe error and no applied state is claimed."
        variant="destructive"
      />
    </div>
  ),
};
