"use client";

import { useCallback, useId, useState, useSyncExternalStore, type ReactNode, type CSSProperties } from "react";
import { closestCenter, closestCorners, getFirstCollision, pointerWithin, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type CollisionDetection, type Announcements } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {useLayoutEditing} from "./webLayoutEditing";
import { DotsSixVertical as GripVertical, ArrowCounterClockwise as RotateCcw } from "@phosphor-icons/react";

/** Presentation-only, browser-local preferences. Never persist content, URLs or guest records. */
export function reconcileBlockOrder(ids: readonly string[], saved: unknown): string[] {
  const allowed = new Set(ids);
  const stored = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && allowed.has(id)) : [];
  return [...new Set([...stored, ...ids])];
}
export function moveBlock(ids: readonly string[], from: string, to: string): string[] {
  const result = [...ids], old = result.indexOf(from), next = result.indexOf(to);
  if (old < 0 || next < 0 || old === next) return result;
  result.splice(old, 1); result.splice(next, 0, from); return result;
}
function listen(notify: () => void) {
  window.addEventListener("storage", notify); window.addEventListener("crays:layout-order", notify);
  return () => { window.removeEventListener("storage", notify); window.removeEventListener("crays:layout-order", notify); };
}
type Block = { id: string; label: string; content: ReactNode; className?: string; style?: CSSProperties };
/** Announce the visible label and selection, never a technical ID or an unconfirmed save. */
export function createLayoutAnnouncements(blocks: readonly Pick<Block, "id" | "label">[]): Announcements {
  const labels = new Map(blocks.map(block => [block.id, block.label]));
  const label = (id: string | number) => labels.get(String(id)) ?? "Item";
  return {
    onDragStart: ({ active }) => `${label(active.id)} picked up.`,
    onDragOver: ({ active, over }) => over ? `${label(active.id)} over ${label(over.id)}.` : `${label(active.id)} is outside an allowed position. Release to cancel.`,
    onDragEnd: ({ active, over }) => !over ? `Move of ${label(active.id)} cancelled. Order unchanged.`
      : active.id === over.id ? `${label(active.id)} kept in the same position.`
      : `New position selected for ${label(active.id)} over ${label(over.id)}. Check save status for confirmation.`,
    onDragCancel: ({ active }) => `Move of ${label(active.id)} cancelled. Order unchanged.`,
  };
}

const control = "inline-flex min-h-8 items-center justify-center gap-1 rounded border border-current/20 px-2 text-xs focus-visible:outline-2 focus-visible:outline-teal-500 disabled:opacity-40";
// Pointer drops outside registered blocks cancel; keyboard movement uses center geometry.
const layoutCollision: CollisionDetection = args => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

/** Keep the original sortable keyboard target selection, then align centers for
 * the existing closestCenter collision strategy. Edge offsets can leave a wide
 * panel closer to its own old center than to the narrower target panel. */
const centeredSortableKeyboardCoordinates: typeof sortableKeyboardCoordinates = (event, args) => {
  const fallback = sortableKeyboardCoordinates(event, args);
  if (!fallback || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) return fallback;
  const {active,over,collisionRect,droppableContainers,droppableRects} = args.context;
  if (!active || !collisionRect) return fallback;
  const candidates = droppableContainers.getEnabled().filter(entry => {
    if (entry.disabled || entry.id === active.id) return false;
    const rect = droppableRects.get(entry.id);
    if (!rect) return false;
    return event.code === 'ArrowRight' ? rect.left > collisionRect.left
      : event.code === 'ArrowLeft' ? rect.left < collisionRect.left
      : event.code === 'ArrowDown' ? rect.top > collisionRect.top
      : rect.top < collisionRect.top;
  });
  const collisions = closestCorners({active,collisionRect,droppableRects,droppableContainers:candidates,pointerCoordinates:null});
  let targetId = getFirstCollision(collisions,'id');
  if (targetId === over?.id && collisions.length > 1) targetId = collisions[1].id;
  if (targetId === undefined || targetId === null) return fallback;
  const target = droppableContainers.get(targetId), rect = droppableRects.get(targetId);
  if (!target?.node.current || !rect) return fallback;
  if (active.data.current?.sortable?.containerId !== target.data.current?.sortable?.containerId) return fallback;
  return {x:rect.left + (rect.width-collisionRect.width)/2,y:rect.top + (rect.height-collisionRect.height)/2};
};

function SortableBlock({ block, compact, dark, disabled = false }: { block: Block; compact: boolean; dark: boolean; disabled?: boolean }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver, attributes, listeners } = useSortable({ id: block.id, disabled });
  return <div ref={setNodeRef} data-layout-block={block.id} className={"web-sortable-block " + (block.className ?? "")}
    style={{ ...block.style, transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 30 : undefined, opacity: isDragging ? 0.7 : 1, ...(isDragging || isOver ? { outline: "2px solid #007b80", outlineOffset: 2 } : {}) }}>
    <button ref={setActivatorNodeRef} data-layout-grip type="button" disabled={disabled} {...attributes} {...listeners} aria-label={"Move " + block.label}
      title="Drag to reorder. Keyboard: Space, arrow keys, Space to drop; Escape to cancel."
      className={"web-sortable-grip " + (compact ? "compact " : "") + (dark ? "dark" : "")}><GripVertical className="size-4" aria-hidden /></button>
    {block.content}
  </div>;
}
const noListen = () => () => {};
const emptyStore = () => "";
type ControlledOrder = { order: readonly string[]; changed: boolean; disabled?: boolean; onChange: (order: string[]) => void; onReset: () => void };
export function ClubSortableRegion({ id, label, blocks, className = "space-y-3", compact = false, render, wrapperClassName = "", controlled }: {
  id: string; label: string; blocks: readonly Block[]; className?: string; compact?: boolean;
  render?: (blocks: readonly ReactNode[]) => ReactNode;
  wrapperClassName?: string; controlled?: ControlledOrder;
}) {
  const editing=useLayoutEditing(),disabled=!editing||controlled?.disabled;
  const key = "crays.layout-order.v1:" + id;
  const instance = useId();
  const [notice, setNotice] = useState("");
  const read = useCallback(() => { try { return window.localStorage.getItem(key) ?? ""; } catch { return ""; } }, [key]);
  const raw = useSyncExternalStore(controlled ? noListen : listen, controlled ? emptyStore : read, emptyStore);
  let saved: unknown = null; try { saved = raw.length < 16384 ? JSON.parse(raw || "null") : null; } catch { /* Corrupt preferences fall back to the registered default. */ }
  const ids = reconcileBlockOrder(blocks.map(block => block.id), controlled?.order ?? saved);
  const byId = new Map(blocks.map(block => [block.id, block]));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: centeredSortableKeyboardCoordinates }));
  function persist(order: string[] | null) {
    if(disabled)return;
    if (controlled) {
      if (controlled.disabled) return;
      if (order) controlled.onChange(order); else controlled.onReset();
      return;
    }
    try {
      if (order) window.localStorage.setItem(key, JSON.stringify(order)); else window.localStorage.removeItem(key);
      window.dispatchEvent(new Event("crays:layout-order")); setNotice(order ? "Order saved in this browser." : "Default order restored.");
    } catch { setNotice("Could not save the order in this browser. The previous order is unchanged."); }
  }
  function drop(event: DragEndEvent) { if (event.over && event.active.id !== event.over.id) persist(moveBlock(ids, String(event.active.id), String(event.over.id))); }
  return <section aria-label={label + " layout"} className={"web-sortable-region " + wrapperClassName}>
    {(controlled ? controlled.changed : Boolean(raw)) && <button disabled={disabled} type="button" aria-label={"Reset " + label + " order"} title="Restore default order" className={control + " web-order-reset"} onClick={() => persist(null)}><RotateCcw className="size-3" aria-hidden /><span className="sr-only">Reset order</span></button>}
    <DndContext id={instance} sensors={sensors} collisionDetection={layoutCollision} onDragEnd={drop} accessibility={{ announcements:createLayoutAnnouncements(blocks),screenReaderInstructions:{ draggable:"To move an item, focus its Move button and press Space. Use arrow keys, then Space to drop. Escape cancels. Only items in this list can be reordered." } }}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {render ? render(ids.map(blockId => <SortableBlock key={blockId} block={byId.get(blockId)!} compact={compact} dark={id.startsWith("navigation:")} disabled={disabled} />)) : <div className={className}>{ids.map(blockId => <SortableBlock key={blockId} block={byId.get(blockId)!} compact={compact} dark={id.startsWith("navigation:")} disabled={disabled} />)}</div>}
      </SortableContext>
    </DndContext>
    <p role="status" className="sr-only">{notice}</p>
  </section>;
}
