import type { ResourceFieldDescriptor } from "@/lib/resources";

export function FieldDisplay({
  field,
  value,
}: {
  field: ResourceFieldDescriptor;
  value: unknown;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not set</span>;
  }

  if (field.type === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }

  if (field.type === "money" && typeof value === "number") {
    return <span>{new Intl.NumberFormat("en", { style: "currency", currency: "EUR" }).format(value)}</span>;
  }

  if ((field.type === "date" || field.type === "datetime") && typeof value === "string") {
    const date = new Date(value);
    return <span>{Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en")}</span>;
  }

  if (typeof value === "object") {
    return <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{JSON.stringify(value)}</code>;
  }

  return <span>{String(value)}</span>;
}
