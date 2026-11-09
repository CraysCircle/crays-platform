"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import styles from "./franchise-fullscreen-menu.module.css";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export type FranchiseFullscreenMenuProps = {
  open: boolean;
  onClose: () => void;
  brandControl: ReactNode;
  accountControl: ReactNode;
  associationControl: ReactNode;
  menuControl: ReactNode;
  ecosystemRail: ReactNode;
  pagePanel: ReactNode;
  initialFocusRef: RefObject<HTMLElement | null>;
  returnFocusRef: RefObject<HTMLElement | null>;
  backgroundRef: RefObject<HTMLElement | null>;
};

export function FranchiseFullscreenMenu({
  open,
  onClose,
  brandControl,
  accountControl,
  associationControl,
  menuControl,
  ecosystemRail,
  pagePanel,
  initialFocusRef,
  returnFocusRef,
  backgroundRef,
}: FranchiseFullscreenMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const openRef = useRef(open);
  const returnFocusFrameRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    openRef.current = open;
    if (open && returnFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(returnFocusFrameRef.current);
      returnFocusFrameRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const background = backgroundRef?.current;
    const returnFocusTarget = returnFocusRef?.current;
    const previousBackgroundInert = background?.hasAttribute("inert");
    const previousBackgroundAriaHidden = background?.getAttribute("aria-hidden");

    document.body.style.overflow = "hidden";
    if (background) {
      background.setAttribute("inert", "");
      background.setAttribute("aria-hidden", "true");
    }

    const focusInitialControl = window.requestAnimationFrame(() => {
      const firstFocusable =
        initialFocusRef.current ??
        overlayRef.current?.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        overlayRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
          [],
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0 &&
          !element.closest('[hidden], [inert], [aria-hidden="true"]'),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusInitialControl);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (background) {
        if (!previousBackgroundInert) {
          background.removeAttribute("inert");
        }
        const backgroundAriaHidden = previousBackgroundAriaHidden;
        if (backgroundAriaHidden == null) {
          background.removeAttribute("aria-hidden");
        } else {
          background.setAttribute("aria-hidden", backgroundAriaHidden);
        }
      }
      returnFocusFrameRef.current = window.requestAnimationFrame(() => {
        returnFocusFrameRef.current = null;
        if (!openRef.current) {
          returnFocusTarget?.focus();
        }
      });
    };
  }, [backgroundRef, initialFocusRef, open, returnFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      id="crays-franchise-menu"
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="CRAYS.pro menu"
    >
      <header className={styles.openHeader}>
        <div className={styles.brandSlot}>{brandControl}</div>
        <nav className={styles.actionRail} aria-label="Primary">
          <div className={styles.accountSlot}>{accountControl}</div>
          <div className={styles.associationSlot}>{associationControl}</div>
          <div className={styles.menuSlot}>{menuControl}</div>
        </nav>
      </header>
      <div className={styles.composition}>
        {/* The decorative source is an approved local vector and is not LCP content. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.brandField}
          src="/assets/crays-mark.svg"
          alt=""
          aria-hidden="true"
          width={450}
          height={515}
        />
        <nav className={styles.ecosystemRail} aria-label="CRAYS ecosystem">
          {ecosystemRail}
        </nav>
        <nav className={styles.pagePanel} aria-label="CRAYS.pro pages">
          <p className={styles.panelEyebrow}>MENU</p>
          <div className={styles.panelContent}>{pagePanel}</div>
        </nav>
      </div>
    </div>
  );
}
