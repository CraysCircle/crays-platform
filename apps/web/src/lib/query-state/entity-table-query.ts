import type { PaginationState, RowSelectionState, SortingState, VisibilityState } from "@tanstack/react-table";
import type { ResourceFilter, ResourceQuery } from "@/lib/resources";

export type EntityTableDensity = "compact" | "default" | "comfortable";

export type EntityTableState = {
  search: string;
  filters: ResourceFilter[];
  sorting: SortingState;
  pagination: PaginationState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  density: EntityTableDensity;
  savedViewId?: string;
};

export function createDefaultEntityTableState(input: Partial<EntityTableState> = {}): EntityTableState {
  return {
    search: "",
    filters: [],
    sorting: [],
    pagination: {
      pageIndex: 0,
      pageSize: 25,
    },
    columnVisibility: {},
    rowSelection: {},
    density: "default",
    ...input,
  };
}

export function entityTableStateToResourceQuery(state: EntityTableState, fields: string[] = []): ResourceQuery {
  return {
    search: state.search || undefined,
    filters: state.filters,
    sort: state.sorting.map((sort) => ({
      field: sort.id,
      direction: sort.desc ? "desc" : "asc",
    })),
    page: {
      limit: state.pagination.pageSize,
      offset: state.pagination.pageIndex * state.pagination.pageSize,
    },
    fields: fields.length ? fields : undefined,
    viewId: state.savedViewId,
  };
}

export function hasActiveEntityTableQuery(state: EntityTableState) {
  return Boolean(state.search || state.filters.length || state.sorting.length || state.savedViewId);
}
