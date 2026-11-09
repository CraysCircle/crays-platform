"use client";

import * as React from "react";
import {useLayoutEditing} from "./webLayoutEditing";
import { DotsSixVertical as GripVertical } from "@phosphor-icons/react";
const cn = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(" ");

type ResizeColumnSession = { original: number | undefined; start: number; x: number; pointer: number | null };

export type ResizeAxis = "x" | "y";

/** Shared interaction controller; the caller remains the sole sizing state. */
export function createColumnResizeSession(access: {
  axis?: ResizeAxis;
  size: () => number;
  stored: () => number | undefined;
  write: (value: number | undefined, restoredSize?: number) => void;
  bounds: () => { min: number; max: number };
}) {
  let session: ResizeColumnSession | null = null;
  const clamp = (value: number) => {
    const { min, max } = access.bounds();
    return Math.min(max, Math.max(min, value));
  };
  return {
    active: () => session !== null,
    pointer: () => session?.pointer ?? null,
    begin(pointer: number | null, x = 0) {
      if (session) return false;
      session = { original: access.stored(), start: access.size(), x, pointer };
      return true;
    },
    move(pointer: number, x: number) {
      if (session?.pointer !== pointer || !Number.isFinite(x)) return;
      access.write(clamp(session.start + x - session.x));
    },
    key(key: string, shift = false) {
      const decrease = access.axis === "y" ? "ArrowUp" : "ArrowLeft";
      const increase = access.axis === "y" ? "ArrowDown" : "ArrowRight";
      if (![decrease, increase, "Home", "End"].includes(key)) return false;
      if (session?.pointer !== null && session !== null) return false;
      if (!session) this.begin(null);
      const { min, max } = access.bounds();
      access.write(clamp(key === "Home" ? min : key === "End" ? max : access.size() + (key === decrease ? -1 : 1) * (shift ? 32 : 8)));
      return true;
    },
    finish(cancel: boolean) {
      const previous = session;
      session = null;
      if (cancel && previous) access.write(previous.original, previous.start);
    },
  };
}

export function ColumnResizeGrip({ label, size, stored, min, max, onSize, onReset, accessibleLabel, ariaControls, ariaDescribedBy, className, cancelToken, axis = "x", persistenceHint = "Temporary for this session.", onCommit, disabled: disabledProp = false }: {
  axis?: ResizeAxis; persistenceHint?: string; onCommit?: () => void; disabled?: boolean;
  accessibleLabel?: string; ariaControls?: string; ariaDescribedBy?: string; className?: string; cancelToken?: string | number;
  label: string; size: number; stored: number | undefined; min: number; max: number;
  onSize: (value: number | undefined) => void; onReset: () => void;
}) {
  const editing=useLayoutEditing(),disabled=disabledProp||!editing;
  const latest = React.useRef({ size, stored, min, max, onSize, onCommit });
  const [active, setActive] = React.useState(false);
  // This factory stores callbacks only; it never invokes them during render. Ref reads occur in handlers/effects.
  // eslint-disable-next-line react-hooks/refs
  const controller = React.useMemo(() => createColumnResizeSession({
    axis,
    size: () => latest.current.size,
    stored: () => latest.current.stored,
    bounds: () => ({ min: latest.current.min, max: latest.current.max }),
    write: (value, restoredSize) => {
      latest.current.stored = value;
      // Keep rapid keyboard events consistent before the controlled parent rerenders.
      if (restoredSize !== undefined || value !== undefined) latest.current.size = restoredSize ?? value!;
      latest.current.onSize(value);
    },
  }), [axis]);
  const captured = React.useRef<HTMLButtonElement | null>(null);
  const finish = React.useCallback((cancel: boolean) => {
    const committed = controller.active() && !cancel;
    const id = controller.pointer();
    const element = captured.current;
    captured.current = null;
    controller.finish(cancel);
    if (id !== null && element?.hasPointerCapture(id)) element.releasePointerCapture(id);
    setActive(false);
    if (committed) latest.current.onCommit?.();
  }, [controller, setActive]);
  React.useLayoutEffect(()=>{if(disabled)finish(true);},[disabled,finish]);
  const previousToken = React.useRef(cancelToken);
  React.useLayoutEffect(() => {
    if (previousToken.current !== cancelToken) { finish(true); previousToken.current = cancelToken; }
  }, [cancelToken, finish]);
  React.useLayoutEffect(() => { latest.current = { size, stored, min, max, onSize, onCommit }; });
  React.useEffect(() => {
    const blur = () => finish(true);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && controller.active()) { event.preventDefault(); event.stopPropagation(); finish(true); }
    };
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", escape, true);
      const id = controller.pointer();
      const element = captured.current;
      captured.current = null;
      controller.finish(true);
      if (id !== null && element?.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
  }, [controller, finish]);
  return <button type="button" disabled={disabled} role="separator" aria-orientation={axis === "x" ? "vertical" : "horizontal"}
    aria-label={accessibleLabel ?? ("Resize " + label + (axis === "x" ? " column" : " height"))} aria-controls={ariaControls} aria-describedby={ariaDescribedBy} aria-valuemin={min} aria-valuemax={max} aria-valuenow={size} aria-valuetext={Math.round(size) + " pixels"}
    title={`Drag or use arrow keys to resize. Escape cancels. Double-click resets. ${persistenceHint}`}
    onPointerDown={event => {
      if (!event.isPrimary || event.button !== 0 || controller.pointer() !== null) return;
      event.preventDefault(); event.stopPropagation(); event.currentTarget.focus();
      controller.finish(false);
      if (!controller.begin(event.pointerId, axis === "x" ? event.clientX : event.clientY)) return;
      try { event.currentTarget.setPointerCapture(event.pointerId); captured.current = event.currentTarget; setActive(true); }
      catch { finish(true); }
    }}
    onPointerMove={event => { if (controller.pointer() === event.pointerId) { event.preventDefault(); event.stopPropagation(); controller.move(event.pointerId, axis === "x" ? event.clientX : event.clientY); } }}
    onPointerUp={event => { if (controller.pointer() === event.pointerId) { event.preventDefault(); event.stopPropagation(); controller.move(event.pointerId, axis === "x" ? event.clientX : event.clientY); finish(false); } }}
    onPointerCancel={event => { if (controller.pointer() === event.pointerId) finish(true); }}
    onLostPointerCapture={event => { if (controller.pointer() === event.pointerId) finish(true); }}
    onBlur={() => finish(controller.pointer() !== null)}
    onKeyDown={event => {
      if ((event.altKey || event.ctrlKey || event.metaKey) && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(true); return; }
      if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); finish(false); return; }
      if (controller.key(event.key, event.shiftKey)) { event.preventDefault(); event.stopPropagation(); setActive(true); }
    }}
    onClick={event => { event.preventDefault(); event.stopPropagation(); }}
    onDoubleClick={event => { event.preventDefault(); event.stopPropagation(); finish(true); onReset(); }}
    className={cn(className ?? (axis === "x" ? "absolute right-0 top-1/2 inline-flex h-8 w-3 -translate-y-1/2 touch-none cursor-col-resize items-center justify-center rounded-sm text-foreground hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring" : "absolute bottom-0 left-1/2 inline-flex h-3 w-8 -translate-x-1/2 touch-none cursor-row-resize items-center justify-center rounded-sm text-foreground hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring"), active && "bg-primary/10 text-primary")}
  ><GripVertical className={cn("size-3", axis === "y" && "rotate-90")} aria-hidden="true" /></button>;
}

