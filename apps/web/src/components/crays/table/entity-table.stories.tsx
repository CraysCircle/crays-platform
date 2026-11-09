import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { EntityTable, type EntityTableRecord, type EntityTableStatus } from "@/components/crays/table/entity-table";
import { createDefaultEntityTableState, type EntityTableState } from "@/lib/query-state/entity-table-query";

type DealRow = EntityTableRecord & {
  id: string;
  candidate: string;
  stage: string;
  priority: string;
  blocker: string;
  updatedAt: string;
};

const rows: DealRow[] = [
  { id: "deal-1001", candidate: "Mara Klein", stage: "Bank package review", priority: "High", blocker: "Lender question", updatedAt: "2026-07-13" },
  { id: "deal-1002", candidate: "Jonas Weber", stage: "Location evidence", priority: "Medium", blocker: "Owner docs", updatedAt: "2026-07-12" },
  { id: "deal-1003", candidate: "Aylin Sari", stage: "Opening handoff", priority: "High", blocker: "Permit milestone", updatedAt: "2026-07-11" },
];

const columns: ColumnDef<DealRow, unknown>[] = [
  { accessorKey: "candidate", header: "Candidate", meta: { label: "Candidate" } },
  { accessorKey: "stage", header: "Stage", meta: { label: "Stage" } },
  { accessorKey: "priority", header: "Priority", meta: { label: "Priority" } },
  { accessorKey: "blocker", header: "Blocker", meta: { label: "Blocker" } },
  { accessorKey: "updatedAt", header: "Updated", meta: { label: "Updated" } },
];

function StatefulTable({
  data = rows,
  status,
}: {
  data?: DealRow[];
  status?: EntityTableStatus;
}) {
  const [tableState, setTableState] = useState<EntityTableState>(() => createDefaultEntityTableState({ pagination: { pageIndex: 0, pageSize: 10 } }));

  return (
    <EntityTable
      resourceLabel="Deal work queue"
      resourceDescription="Server-side filtering, sorting, pagination and selection for CRAYS resources."
      columns={columns}
      data={data}
      state={tableState}
      status={status}
      onStateChange={setTableState}
      pageInfo={{ pageIndex: tableState.pagination.pageIndex, pageSize: tableState.pagination.pageSize, total: 42, totalReliable: true, hasNextPage: true }}
      savedViews={[
        { id: "bank-ready", label: "Bank-ready cases", scope: "role" },
        { id: "blocked-openings", label: "Blocked openings", scope: "team" },
      ]}
      bulkActions={[
        { id: "assign-owner", label: "Assign owner" },
        { id: "stage-review", label: "Stage review" },
      ]}
    />
  );
}

const meta = {
  title: "CRAYS/Table/EntityTable",
  component: StatefulTable,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof StatefulTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const NoResults: Story = {
  args: {
    data: [],
  },
};

export const Permission: Story = {
  args: {
    data: [],
    status: {
      state: "permission",
      message: "The server denied this resource for the current role.",
    },
  },
};
