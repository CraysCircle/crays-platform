import type { NormalizedResourceQuery, ResourceDescriptor } from "@/lib/resources/types";

export type SourcePagination =
  | {
      kind: "core-offset";
      offset: number;
      limit: number;
      totalMayBeReliable: boolean;
    }
  | {
      kind: "core-cursor";
      cursor: string | null;
      limit: number;
      totalMayBeReliable: false;
    }
  | {
      kind: "plane-cursor";
      cursor: string | null;
      per_page: number;
      totalMayBeReliable: false;
    }
  | {
      kind: "frappe-offset";
      limit_start: number;
      limit_page_length: number;
      totalMayBeReliable: false;
    }
  | {
      kind: "twenty-discovery-required";
      limit: number;
      cursor: string | null;
      totalMayBeReliable: false;
      reason: string;
    };

export function toSourcePagination(descriptor: ResourceDescriptor, query: NormalizedResourceQuery): SourcePagination {
  const limit = query.page.limit;
  const cursor = query.page.cursor ?? null;
  const offset = query.page.offset ?? 0;

  if (descriptor.pagination.mode === "core-offset") {
    return {
      kind: "core-offset",
      offset,
      limit,
      totalMayBeReliable: descriptor.pagination.totalReliable,
    };
  }

  if (descriptor.pagination.mode === "core-cursor") {
    return {
      kind: "core-cursor",
      cursor,
      limit,
      totalMayBeReliable: false,
    };
  }

  if (descriptor.pagination.mode === "plane-cursor") {
    return {
      kind: "plane-cursor",
      cursor,
      per_page: limit,
      totalMayBeReliable: false,
    };
  }

  if (descriptor.pagination.mode === "frappe-offset") {
    return {
      kind: "frappe-offset",
      limit_start: offset,
      limit_page_length: limit,
      totalMayBeReliable: false,
    };
  }

  return {
    kind: "twenty-discovery-required",
    limit,
    cursor,
    totalMayBeReliable: false,
    reason: "Twenty pagination and filter dialect must be verified from deployed workspace metadata before adapter translation.",
  };
}
