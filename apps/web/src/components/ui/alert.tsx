import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full gap-2 rounded-md border px-4 py-3 text-sm [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-[color:color-mix(in_srgb,var(--info)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--info)_10%,transparent)] text-foreground",
        warning:
          "border-[color:color-mix(in_srgb,var(--warning)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_12%,transparent)] text-foreground",
        destructive:
          "border-[color:color-mix(in_srgb,var(--destructive)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--destructive)_10%,transparent)] text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="status"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium leading-none tracking-normal", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
