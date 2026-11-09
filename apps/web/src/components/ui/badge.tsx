import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium tabular-nums",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        success:
          "border-[color:color-mix(in_srgb,var(--success)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--accent-strong)]",
        warning:
          "border-[color:color-mix(in_srgb,var(--warning)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--warning)_13%,transparent)] text-[var(--warning)]",
        danger:
          "border-[color:color-mix(in_srgb,var(--destructive)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--destructive)_12%,transparent)] text-[var(--destructive)]",
        info: "border-[color:color-mix(in_srgb,var(--info)_34%,transparent)] bg-[color:color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
