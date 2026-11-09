import { AlertCircle, CheckCircle2, Clock, Lock, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ResourceCommandReceipt } from "@/lib/resources";

const receiptTone = {
  accepted: "success",
  queued: "info",
  gated: "warning",
  validation_failed: "danger",
  forbidden: "danger",
  conflicted: "warning",
  source_unavailable: "danger",
} as const;

function receiptIcon(status: ResourceCommandReceipt["status"]) {
  if (status === "accepted") return <CheckCircle2 className="size-4" aria-hidden="true" />;
  if (status === "queued") return <Clock className="size-4" aria-hidden="true" />;
  if (status === "gated" || status === "forbidden") return <Lock className="size-4" aria-hidden="true" />;
  if (status === "conflicted") return <RefreshCw className="size-4" aria-hidden="true" />;
  return <AlertCircle className="size-4" aria-hidden="true" />;
}

export function CommandReceipt({ receipt }: { receipt: ResourceCommandReceipt }) {
  return (
    <Alert variant={receipt.status === "accepted" || receipt.status === "queued" ? "info" : receipt.status === "gated" || receipt.status === "conflicted" ? "warning" : "destructive"}>
      <AlertTitle className="flex flex-wrap items-center gap-2">
        {receiptIcon(receipt.status)}
        Command {receipt.status.replaceAll("_", " ")}
        <Badge variant={receiptTone[receipt.status]}>{receipt.operation}</Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 grid gap-2 text-sm">
          <p>{receipt.message}</p>
          <p className="text-muted-foreground">
            Command ID: <code>{receipt.commandId}</code> · accepted {new Date(receipt.acceptedAt).toLocaleString("en")}
          </p>
          {receipt.gate ? <p>Gate: {receipt.gate.key} — {receipt.gate.reason}</p> : null}
          {receipt.conflict ? <p>Conflict: expected {receipt.conflict.expectedVersion ?? "unknown"}, actual {receipt.conflict.actualVersion ?? "unknown"}.</p> : null}
          {receipt.fieldErrors?.length ? (
            <ul className="list-inside list-disc">
              {receipt.fieldErrors.map((fieldError) => (
                <li key={`${fieldError.field}-${fieldError.message}`}>
                  {fieldError.field}: {fieldError.message}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-muted-foreground">
            Source writes: {receipt.sourceWritesEnabled ? "enabled" : "closed"} · Sync apply: {receipt.syncApplyEnabled ? "enabled" : "closed"} · Target apply: {receipt.targetApplyEnabled ? "enabled" : "closed"}
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
