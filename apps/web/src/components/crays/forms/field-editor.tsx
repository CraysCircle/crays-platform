"use client";

import type { UseFormRegister } from "react-hook-form";

import type { ResourceFieldDescriptor } from "@/lib/resources";
import { cn } from "@/lib/utils";

type FieldEditorProps = {
  field: ResourceFieldDescriptor;
  register: UseFormRegister<Record<string, unknown>>;
  error?: { message?: string };
  disabled?: boolean;
};

const inputClassName =
  "min-h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

export function FieldEditor({ field, register, error, disabled }: FieldEditorProps) {
  const describedBy = error ? `${field.key}-error` : `${field.key}-hint`;
  const registration = register(field.key);

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-foreground">{field.label}</span>
      {field.type === "long-text" ? (
        <textarea
          {...registration}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          rows={4}
          className={cn(inputClassName, "resize-y")}
        />
      ) : field.type === "boolean" ? (
        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input {...registration} aria-describedby={describedBy} aria-invalid={Boolean(error)} disabled={disabled} type="checkbox" className="size-4" />
          Enabled
        </span>
      ) : field.type === "date" ? (
        <input {...registration} aria-describedby={describedBy} aria-invalid={Boolean(error)} disabled={disabled} type="date" className={inputClassName} />
      ) : field.type === "datetime" ? (
        <input {...registration} aria-describedby={describedBy} aria-invalid={Boolean(error)} disabled={disabled} type="datetime-local" className={inputClassName} />
      ) : field.type === "number" || field.type === "money" ? (
        <input {...registration} aria-describedby={describedBy} aria-invalid={Boolean(error)} disabled={disabled} type="number" step="any" className={inputClassName} />
      ) : (
        <input {...registration} aria-describedby={describedBy} aria-invalid={Boolean(error)} disabled={disabled} type="text" className={inputClassName} />
      )}
      {error ? (
        <span id={`${field.key}-error`} className="text-xs font-medium text-destructive">
          {error.message ?? "Invalid value"}
        </span>
      ) : (
        <span id={`${field.key}-hint`} className="text-xs text-muted-foreground">
          {field.type}
          {field.nullable ? " · optional" : " · required"}
        </span>
      )}
    </label>
  );
}
