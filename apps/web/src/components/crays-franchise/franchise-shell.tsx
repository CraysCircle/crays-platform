import type { ReactNode } from "react";

import { LegacyHeader } from "./franchise-site-interactive";
import styles from "./franchise-site.module.css";

type FranchiseShellProps = {
  readonly children: ReactNode;
  readonly overlayHeader?: boolean;
};

export function FranchiseShell({
  children,
  overlayHeader = false,
}: FranchiseShellProps) {
  return (
    <div className={overlayHeader ? styles.approvedHome : undefined}>
      <LegacyHeader />
      {children}
    </div>
  );
}
