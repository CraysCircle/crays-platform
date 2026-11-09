import {
  AlertCircle,
  Ban,
  CheckCircle2,
  CloudOff,
  FilterX,
  Inbox,
  Loader2,
  Lock,
  RefreshCw,
} from "lucide-react";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StateAction = {
  label: string;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
};

type SystemStateProps = {
  title: string;
  description?: string;
  action?: StateAction;
  icon?: React.ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
};

const toneToBadgeVariant = {
  neutral: "secondary",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
} as const;

function SystemState({
  title,
  description,
  action,
  icon,
  tone = "neutral",
  className,
}: SystemStateProps) {
  return (
    <section
      className={cn(
        "flex min-h-40 flex-col items-start justify-center gap-4 rounded-md border border-border bg-card p-5 text-card-foreground",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          {icon ?? <Inbox className="size-4" aria-hidden="true" />}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-5">{title}</h3>
            <Badge variant={toneToBadgeVariant[tone]}>{tone}</Badge>
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        action.href ? (
          <Button asChild variant="outline" size="sm">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={action.disabled ?? !action.onClick}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </section>
  );
}

function LoadingState({
  title = "Loading workspace data",
  description = "The current structure is preserved while the server resolves the authoritative view.",
}: Partial<Pick<SystemStateProps, "title" | "description">>) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-11/12" />
        <Skeleton className="h-10 w-4/5" />
      </div>
    </section>
  );
}

function EmptyState(props: Partial<SystemStateProps>) {
  return (
    <SystemState
      title="No records yet"
      description="There is no authoritative CRAYS record for this view."
      icon={<Inbox className="size-4" aria-hidden="true" />}
      {...props}
    />
  );
}

function NoResultsState(props: Partial<SystemStateProps>) {
  return (
    <SystemState
      title="No matching results"
      description="The resource exists, but the current filters did not return records."
      icon={<FilterX className="size-4" aria-hidden="true" />}
      action={{ label: "Reset filters" }}
      {...props}
    />
  );
}

function ErrorState(props: Partial<SystemStateProps>) {
  return (
    <SystemState
      title="View unavailable"
      description="The request failed safely. Retry when permitted or use the correlation ID from the server response."
      icon={<AlertCircle className="size-4" aria-hidden="true" />}
      tone="danger"
      action={{ label: "Retry" }}
      {...props}
    />
  );
}

function PermissionState(props: Partial<SystemStateProps>) {
  return (
    <SystemState
      title="Permission required"
      description="This action or view is outside the server-resolved scope for the current user."
      icon={<Lock className="size-4" aria-hidden="true" />}
      tone="warning"
      {...props}
    />
  );
}

function SourceHealthState({
  status = "partial",
  ...props
}: Partial<SystemStateProps> & {
  status?: "ready" | "partial" | "stale" | "unavailable";
}) {
  const config = {
    ready: {
      title: "Source ready",
      description: "The backing source responded within the expected freshness window.",
      icon: <CheckCircle2 className="size-4" aria-hidden="true" />,
      tone: "success" as const,
    },
    partial: {
      title: "Partial source data",
      description: "Some source fields or records are unavailable; CRAYS is showing the safe subset.",
      icon: <RefreshCw className="size-4" aria-hidden="true" />,
      tone: "warning" as const,
    },
    stale: {
      title: "Source data is stale",
      description: "The last successful source snapshot is older than the current freshness target.",
      icon: <CloudOff className="size-4" aria-hidden="true" />,
      tone: "warning" as const,
    },
    unavailable: {
      title: "Source unavailable",
      description: "The source is unavailable. No mutation can be claimed as applied.",
      icon: <Ban className="size-4" aria-hidden="true" />,
      tone: "danger" as const,
    },
  }[status];

  return <SystemState {...config} {...props} />;
}

function InlineNotice({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description?: string;
  variant?: "default" | "info" | "warning" | "destructive";
}) {
  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      {description ? <AlertDescription>{description}</AlertDescription> : null}
    </Alert>
  );
}

export {
  EmptyState,
  ErrorState,
  InlineNotice,
  LoadingState,
  NoResultsState,
  PermissionState,
  SourceHealthState,
  SystemState,
};
