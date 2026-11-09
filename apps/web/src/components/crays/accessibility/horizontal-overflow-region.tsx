"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type OverflowPosition = "none" | "start" | "middle" | "end";

function overflowPosition(region: HTMLDivElement): OverflowPosition {
  const maximum = Math.max(region.scrollWidth - region.clientWidth, 0);
  if (maximum <= 1) return "none";
  if (region.scrollLeft <= 1) return "start";
  if (region.scrollLeft >= maximum - 1) return "end";
  return "middle";
}

const overflowCopy = {
  start: "More columns continue to the right.",
  middle: "More columns continue in both directions.",
  end: "Earlier columns continue to the left.",
} as const;

export function HorizontalOverflowRegion({
  label,
  children,
  className,
  cueClassName,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  cueClassName?: string;
}) {
  const regionRef = React.useRef<HTMLDivElement>(null);
  const hintId = React.useId();
  const [position, setPosition] = React.useState<OverflowPosition>("none");

  React.useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setPosition(overflowPosition(region)),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(region);
    if (region.firstElementChild instanceof HTMLElement) {
      observer.observe(region.firstElementChild);
    }
    region.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      region.removeEventListener("scroll", update);
    };
  }, [children]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || position === "none") return;
    const region = event.currentTarget;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      region.scrollBy({ left: 80, behavior: "auto" });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      region.scrollBy({ left: -80, behavior: "auto" });
    } else if (event.key === "Home") {
      event.preventDefault();
      region.scrollTo({ left: 0, behavior: "auto" });
    } else if (event.key === "End") {
      event.preventDefault();
      region.scrollTo({
        left: region.scrollWidth - region.clientWidth,
        behavior: "auto",
      });
    }
  }

  const copy = position === "none" ? null : overflowCopy[position];

  return (
    <div className="min-w-0">
      {copy ? (
        <p
          id={hintId}
          className={cn(
            "flex min-h-11 flex-wrap items-center gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground",
            cueClassName,
          )}
        >
          {position === "start" ? (
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          ) : position === "end" ? (
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowLeftRight className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span>{copy}</span>
        </p>
      ) : null}
      <div
        ref={regionRef}
        className={cn("min-w-0 overflow-x-auto", className)}
        role="region"
        aria-label={label}
        aria-describedby={copy ? hintId : undefined}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
