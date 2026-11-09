import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { EntityForm } from "@/components/crays/forms/entity-form";
import type { ResourceCommandReceipt, ResourceFieldDescriptor } from "@/lib/resources";

const fields: ResourceFieldDescriptor[] = [
  {
    key: "candidateName",
    label: "Candidate name",
    type: "text",
    nullable: false,
    pii: "personal",
    public: false,
    listVisible: true,
    detailVisible: true,
    clientSelectable: true,
    filterOperators: ["contains", "eq"],
    sortable: true,
    readScopes: ["candidate"],
    updatePermission: "deals:update",
    source: { system: "crays-core" },
  },
  {
    key: "stage",
    label: "Stage",
    type: "text",
    nullable: false,
    pii: "business",
    public: false,
    listVisible: true,
    detailVisible: true,
    clientSelectable: true,
    filterOperators: ["eq"],
    sortable: true,
    readScopes: ["candidate"],
    updatePermission: "deals:update",
    source: { system: "crays-core" },
  },
  {
    key: "financingAmount",
    label: "Financing amount",
    type: "money",
    nullable: true,
    pii: "financial",
    public: false,
    listVisible: true,
    detailVisible: true,
    clientSelectable: true,
    filterOperators: ["gte", "lte"],
    sortable: true,
    readScopes: ["bank-package"],
    updatePermission: "bank-packages:create",
    source: { system: "crays-core" },
  },
  {
    key: "notes",
    label: "Review notes",
    type: "long-text",
    nullable: true,
    pii: "business",
    public: false,
    listVisible: false,
    detailVisible: true,
    clientSelectable: true,
    filterOperators: ["contains"],
    sortable: false,
    readScopes: ["deal"],
    updatePermission: "deals:update",
    source: { system: "crays-core" },
  },
];

function gatedReceipt(): ResourceCommandReceipt {
  return {
    status: "gated",
    commandId: "core_cmd_storybook_gated",
    resource: "deals",
    operation: "update",
    acceptedAt: new Date("2026-07-13T12:00:00.000Z").toISOString(),
    targetApplyEnabled: false,
    sourceWritesEnabled: false,
    syncApplyEnabled: false,
    auditRequired: true,
    message: "Command was validated but remains gated for controlled beta.",
    gate: { key: "OPEN_DEV_SYNC_APPLY", reason: "Apply is intentionally closed." },
  };
}

const meta = {
  title: "CRAYS/Forms/EntityForm",
  component: EntityForm,
  parameters: {
    layout: "padded",
  },
  args: {
    resource: "deals",
    resourceLabel: "Deal command",
    operation: "update",
    recordId: "deal-1001",
    expectedVersion: "v42",
    fields,
    initialValues: {
      candidateName: "Mara Klein",
      stage: "Bank package review",
      financingAmount: 245000,
      notes: "Waiting for lender question response.",
    },
    canSubmit: true,
    submitLabel: "Stage command",
    onSubmit: async () => gatedReceipt(),
  },
} satisfies Meta<typeof EntityForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Gated: Story = {
  args: {
    canSubmit: false,
    disabledReason: "This role can review the deal but cannot stage this command.",
    onSubmit: undefined,
  },
};
