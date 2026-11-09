import type { ReactNode } from "react";
import Link from "next/link";

import styles from "./franchise-header.module.css";

export type FranchiseHeaderSurface = "dark" | "light";

export type FranchiseHeaderProps = {
  brandControl: ReactNode;
  accountControl: ReactNode;
  associationControl: ReactNode;
  menuControl: ReactNode;
  surface?: FranchiseHeaderSurface;
};

export function FranchiseHeader({
  brandControl,
  accountControl,
  associationControl,
  menuControl,
  surface = "dark",
}: FranchiseHeaderProps) {
  return (
    <header className={styles.header} data-surface={surface}>
      <div className={styles.inner}>
        <div className={styles.brandSlot}>{brandControl}</div>
        <nav className={styles.actionRail} aria-label="Primary">
          <div className={styles.accountSlot}>{accountControl}</div>
          <div className={styles.associationSlot}>{associationControl}</div>
          <div className={styles.menuSlot}>{menuControl}</div>
        </nav>
      </div>
    </header>
  );
}

export function FranchiseHeaderBrand({
  surface = "dark",
}: {
  surface?: FranchiseHeaderSurface;
}) {
  const src =
    surface === "dark"
      ? "/assets/crays-logo-white.svg"
      : "/assets/images/crays-franchise/crays-logo-light.svg";

  // The approved local master keeps its measured natural aspect ratio.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.logo} src={src} alt="CRAYS" />;
}

export function FranchiseHeaderAccountLink() {
  return <Link href="/portal">LOG IN</Link>;
}

export function FranchiseHeaderAssociationLink() {
  return (
    <a
      href="https://www.crays.org/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="A MEMBER OF THE CRAYS ASSOCIATION (opens in a new tab)"
    >
      A MEMBER OF THE CRAYS ASSOCIATION
    </a>
  );
}
