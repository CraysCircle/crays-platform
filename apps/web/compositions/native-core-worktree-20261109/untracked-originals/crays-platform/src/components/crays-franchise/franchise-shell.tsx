"use client";

import {
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";

import { FranchiseFooter } from "./franchise-footer";
import {
  FranchiseFullscreenMenu,
} from "./franchise-fullscreen-menu";
import {
  FranchiseHeader,
  FranchiseHeaderAccountLink,
  FranchiseHeaderAssociationLink,
  FranchiseHeaderBrand,
} from "./franchise-header";
import { FranchiseHeaderMenuButton } from "./franchise-header-menu-button";
import {
  FranchiseEcosystemRail,
  FranchisePagePanel,
} from "./franchise-menu-content";
import styles from "./franchise-shell.module.css";

const menuId = "crays-franchise-menu";

function BrandLink({ surface }: { surface: "dark" | "light" }) {
  return (
    <Link className={styles.brandLink} href="/" aria-label="CRAYS.pro home">
      <FranchiseHeaderBrand surface={surface} />
    </Link>
  );
}

export function FranchiseShell({
  children,
  overlayHeader = false,
}: {
  children: ReactNode;
  overlayHeader?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const openMenuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={styles.shell}>
      <div ref={backgroundRef} className={styles.background}>
        <div
          className={`${styles.closedHeaderPlane} ${
            overlayHeader ? styles.closedHeaderPlaneOverlay : ""
          }`}
        >
          <FranchiseHeader
            brandControl={<BrandLink surface="dark" />}
            accountControl={<FranchiseHeaderAccountLink />}
            associationControl={<FranchiseHeaderAssociationLink />}
            menuControl={
              <FranchiseHeaderMenuButton
                ref={openMenuButtonRef}
                open={menuOpen}
                onOpenChange={setMenuOpen}
                controlsId={menuId}
              />
            }
          />
        </div>
        <main className={styles.main}>{children}</main>
        <FranchiseFooter />
      </div>

      <FranchiseFullscreenMenu
        open={menuOpen}
        onClose={closeMenu}
        brandControl={<BrandLink surface="light" />}
        accountControl={<FranchiseHeaderAccountLink />}
        associationControl={<FranchiseHeaderAssociationLink />}
        menuControl={
          <FranchiseHeaderMenuButton
            ref={closeMenuButtonRef}
            open
            onOpenChange={setMenuOpen}
            controlsId={menuId}
          />
        }
        ecosystemRail={<FranchiseEcosystemRail />}
        pagePanel={<FranchisePagePanel onInternalNavigate={closeMenu} />}
        initialFocusRef={closeMenuButtonRef}
        returnFocusRef={openMenuButtonRef}
        backgroundRef={backgroundRef}
      />
    </div>
  );
}
