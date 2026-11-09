"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Send } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";

import { CommandReceipt } from "@/components/crays/forms/command-receipt";
import { FieldEditor } from "@/components/crays/forms/field-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  createResourceCommandEnvelope,
  createResourceFormSchema,
  normalizeResourceFormValues,
  type ResourceFormOperation,
  type ResourceFormValues,
} from "@/lib/forms/resource-form-schema";
import type { ResourceCommandEnvelope, ResourceCommandReceipt, ResourceFieldDescriptor, ResourceKey } from "@/lib/resources";

export type EntityFormSubmitContext = {
  envelope: ResourceCommandEnvelope<ResourceFormValues>;
  values: ResourceFormValues;
};

export type EntityFormProps = {
  resource: ResourceKey;
  resourceLabel: string;
  operation: ResourceFormOperation;
  fields: ResourceFieldDescriptor[];
  initialValues?: ResourceFormValues;
  recordId?: string;
  expectedVersion?: string;
  canSubmit: boolean;
  disabledReason?: string;
  submitLabel?: string;
  onSubmit?: (context: EntityFormSubmitContext) => Promise<ResourceCommandReceipt> | ResourceCommandReceipt;
};

function initialFieldValues(fields: ResourceFieldDescriptor[], initialValues: ResourceFormValues) {
  return fields.reduce<ResourceFormValues>((current, field) => {
    current[field.key] = initialValues[field.key] ?? (field.type === "boolean" ? false : "");
    return current;
  }, {});
}

export function EntityForm({
  resource,
  resourceLabel,
  operation,
  fields,
  initialValues = {},
  recordId,
  expectedVersion,
  canSubmit,
  disabledReason,
  submitLabel,
  onSubmit,
}: EntityFormProps) {
  const schema = React.useMemo(() => createResourceFormSchema(fields), [fields]);
  const defaultValues = React.useMemo(() => initialFieldValues(fields, initialValues), [fields, initialValues]);
  const [receipt, setReceipt] = React.useState<ResourceCommandReceipt | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const submitDisabled = !canSubmit || !onSubmit;

  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<Record<string, unknown>>({
    defaultValues,
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async (values) => {
    if (submitDisabled) return;

    setSubmissionError(null);
    const normalized = normalizeResourceFormValues(fields, values);
    const envelope = createResourceCommandEnvelope({
      resource,
      operation,
      id: recordId,
      expectedVersion,
      values: normalized,
    });

    try {
      const nextReceipt = await onSubmit({ envelope, values: normalized });
      setReceipt(nextReceipt);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "The command failed before CRAYS returned a receipt.");
    }
  });

  return (
    <form onSubmit={submit} className="rounded-[16px] border border-border bg-card text-card-foreground shadow-sm">
      <div className="space-y-2 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{resourceLabel}</h2>
          <Badge variant={canSubmit ? "success" : "warning"}>{canSubmit ? "action available" : "action gated"}</Badge>
          {isDirty ? <Badge variant="info">unsaved changes</Badge> : <Badge variant="secondary">clean</Badge>}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Validates fields locally, submits a CRAYS command envelope and waits for a server receipt before claiming an outcome.
        </p>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {fields.map((field) => (
          <FieldEditor key={field.key} field={field} register={register} error={errors[field.key]} disabled={isSubmitting || submitDisabled} />
        ))}
      </div>

      {disabledReason ? <p className="px-4 pb-2 text-sm text-muted-foreground">{disabledReason}</p> : null}
      {submissionError ? <p className="px-4 pb-2 text-sm font-medium text-destructive">{submissionError}</p> : null}

      <Separator />

      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Resource: {resource} · Operation: {operation}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => reset(defaultValues)} disabled={isSubmitting || !isDirty}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
          <Button type="submit" disabled={isSubmitting || submitDisabled || !isDirty} title={submitDisabled ? disabledReason ?? "No permitted command handler is available." : undefined}>
            <Send className="size-4" aria-hidden="true" />
            {submitLabel ?? "Submit command"}
          </Button>
        </div>
      </div>

      {receipt ? (
        <div className="border-t border-border p-4">
          <CommandReceipt receipt={receipt} />
        </div>
      ) : null}
    </form>
  );
}
