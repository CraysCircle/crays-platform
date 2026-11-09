"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
} from "react";
import { Menu, X } from "lucide-react";

import styles from "./franchise-header.module.css";

export type FranchiseHeaderMenuButtonProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controlsId?: string;
};

export const FranchiseHeaderMenuButton = forwardRef<
  HTMLButtonElement,
  FranchiseHeaderMenuButtonProps
>(function FranchiseHeaderMenuButton(
  {
    open,
    onOpenChange,
    controlsId = "crays-franchise-menu",
  },
  forwardedRef,
) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(forwardedRef, () => buttonRef.current!, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Escape" || !open) {
      return;
    }

    event.preventDefault();
    onOpenChange(false);
    buttonRef.current?.focus();
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.menuButton}
      data-state={open ? "open" : "closed"}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={() => onOpenChange(!open)}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.menuButtonLabel}>{open ? "CLOSE" : "MENU"}</span>
      {open ? (
        <X
          className={styles.menuButtonCloseIcon}
          strokeWidth={1}
          aria-hidden="true"
        />
      ) : (
        <Menu
          className={styles.menuButtonOpenIcon}
          strokeWidth={1}
          aria-hidden="true"
        />
      )}
    </button>
  );
});
