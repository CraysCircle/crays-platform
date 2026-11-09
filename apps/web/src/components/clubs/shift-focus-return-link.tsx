"use client";

import { useSearchParams } from "next/navigation";

export function ShiftFocusReturnLink({ className }: { className: string }) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.delete("focus");
  const query = params.toString();
  return (
    <a
      href={`/en/clubs/operations${query ? `?${query}` : ""}#clubs-today-queue-title`}
      className={`inline-flex min-h-11 items-center ${className}`}
    >
      Return to Today
    </a>
  );
}
