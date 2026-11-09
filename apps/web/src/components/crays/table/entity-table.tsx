"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Filter,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type Updater,
} from "@tanstack/react-table";

import { EmptyState, ErrorState, LoadingState, NoResultsState, PermissionState } from "@/components/crays/states/system-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ResourceFilter, ResourceFilterOperator } from "@/lib/resources";
import { cn } from "@/lib/utils";
import {
  createDefaultEntityTableState,
  entityTableStateToResourceQuery,
  hasActiveEntityTableQuery,
  type EntityTableDensity,
  type EntityTableState,
} from "@/lib/query-state/entity-table-query";

export type EntityTableRecord = {
  id?: string | number;
  [key: string]: unknown;
};

export type EntityTableSavedView = {
  id: string;
  label: string;
  scope: "private" | "role" | "team" | "organization";
};

export type EntityTableBulkAction = {
  id: string;
  label: string;
  disabled?: boolean;
  reason?: string;
};

export type EntityTablePageInfo = {
  pageIndex: number;
  pageSize: number;
  total?: number;
  totalReliable: boolean;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  nextCursor?: string;
  previousCursor?: string;
};

export type EntityTableStatus =
  | { state: "ready" }
  | { state: "loading"; message?: string }
  | { state: "empty"; message?: string }
  | { state: "error"; message?: string; retryLabel?: string }
  | { state: "permission"; message?: string; actionLabel?: string };

export type EntityTableProps<TData extends EntityTableRecord> = {
  resourceLabel: string;
  resourceDescription?: string;
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  state?: EntityTableState;
  status?: EntityTableStatus;
  pageInfo?: EntityTablePageInfo;
  savedViews?: EntityTableSavedView[];
  bulkActions?: EntityTableBulkAction[];
  getRowId?: (row: TData, index: number) => string;
  onStateChange?: (state: EntityTableState) => void;
  onRowOpen?: (row: TData) => void;
  onSavedViewSelect?: (viewId: string) => void;
  onSaveView?: (query: ReturnType<typeof entityTableStateToResourceQuery>) => void;
  onBulkAction?: (actionId: string, selectedRowIds: string[]) => void;
  onRetry?: () => void;
};

const filterOperators: ResourceFilterOperator[] = ["eq", "neq", "contains", "startsWith", "in", "gt", "gte", "lt", "lte", "isNull"];

function applyUpdater<T>(value: T, updater: Updater<T>) {
  return typeof updater === "function" ? (updater as (old: T) => T)(value) : updater;
}

function columnLabel<TData extends EntityTableRecord>(column: ColumnDef<TData, unknown>, fallback: string) {
  const meta = column.meta as { label?: string } | undefined;
  if (meta?.label) return meta.label;
  if (typeof column.header === "string") return column.header;
  return fallback;
}

function densityClass(density: EntityTableDensity) {
  if (density === "compact") return "text-xs [&_td]:py-2 [&_th]:py-2";
  if (density === "comfortable") return "text-sm [&_td]:py-4 [&_th]:py-4";
  return "text-sm [&_td]:py-3 [&_th]:py-3";
}

function selectedIds(rowSelection: EntityTableState["rowSelection"]) {
  return Object.entries(rowSelection)
    .filter(([, selected]) => selected)
    .map(([id]) => id);
}

export function EntityTable<TData extends EntityTableRecord>({
  resourceLabel,
  resourceDescription,
  columns,
  data,
  state: controlledState,
  status = { state: "ready" },
  pageInfo,
  savedViews = [],
  bulkActions = [],
  getRowId,
  onStateChange,
  onRowOpen,
  onSavedViewSelect,
  onSaveView,
  onBulkAction,
  onRetry,
}: EntityTableProps<TData>) {
  const [internalState, setInternalState] = React.useState<EntityTableState>(() => createDefaultEntityTableState());
  const state = controlledState ?? internalState;
  const [filterField, setFilterField] = React.useState("");
  const [filterOperator, setFilterOperator] = React.useState<ResourceFilterOperator>("contains");
  const [filterValue, setFilterValue] = React.useState("");

  const commitState = React.useCallback(
    (nextState: EntityTableState) => {
      if (onStateChange) {
        onStateChange(nextState);
        return;
      }

      setInternalState(nextState);
    },
    [onStateChange],
  );

  const updateState = React.useCallback(
    (patch: Partial<EntityTableState>) => {
      commitState({ ...state, ...patch });
    },
    [commitState, state],
  );

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: "__select",
      enableHiding: false,
      header: ({ table }) => (
        <input
          aria-label="Select all rows"
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          ref={(input) => {
            if (input) input.indeterminate = table.getIsSomeRowsSelected();
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="size-4 rounded border-border"
        />
      ),
      cell: ({ row }) => (
        <input
          aria-label={`Select row ${row.id}`}
          type="checkbox"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          ref={(input) => {
            if (input) input.indeterminate = row.getIsSomeSelected();
          }}
          onChange={row.getToggleSelectedHandler()}
          className="size-4 rounded border-border"
        />
      ),
    }),
    [],
  );

  const tableColumns = React.useMemo(() => [selectionColumn, ...columns], [columns, selectionColumn]);

  // TanStack Table intentionally exposes table handlers; keep that client-only surface isolated in this leaf grid.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    pageCount: pageInfo?.totalReliable && pageInfo.total !== undefined ? Math.ceil(pageInfo.total / state.pagination.pageSize) : -1,
    getRowId: getRowId ?? ((row, index) => String(row.id ?? index)),
    state: {
      sorting: state.sorting,
      pagination: state.pagination,
      columnVisibility: state.columnVisibility,
      rowSelection: state.rowSelection,
    },
    onSortingChange: ((updater) => updateState({ sorting: applyUpdater(state.sorting, updater), pagination: { ...state.pagination, pageIndex: 0 } })) as OnChangeFn<typeof state.sorting>,
    onPaginationChange: ((updater) => updateState({ pagination: applyUpdater(state.pagination, updater) })) as OnChangeFn<typeof state.pagination>,
    onColumnVisibilityChange: ((updater) => updateState({ columnVisibility: applyUpdater(state.columnVisibility, updater) })) as OnChangeFn<typeof state.columnVisibility>,
    onRowSelectionChange: ((updater) => updateState({ rowSelection: applyUpdater(state.rowSelection, updater) })) as OnChangeFn<typeof state.rowSelection>,
  });

  const selectableColumns = React.useMemo(() => table.getAllLeafColumns().filter((column) => column.id !== "__select"), [table]);
  const filterableColumns = React.useMemo(
    () =>
      selectableColumns.map((column) => ({
        id: column.id,
        label: columnLabel(column.columnDef, column.id),
      })),
    [selectableColumns],
  );
  const activeSelectedIds = React.useMemo(() => selectedIds(state.rowSelection), [state.rowSelection]);
  const activeQuery = hasActiveEntityTableQuery(state);
  const visibleFields = React.useMemo(() => selectableColumns.filter((column) => column.getIsVisible()).map((column) => column.id), [selectableColumns]);
  const activeFilterField = filterField || filterableColumns[0]?.id || "";

  function addFilter() {
    if (!activeFilterField) return;
    const nextFilter: ResourceFilter = {
      field: activeFilterField,
      operator: filterOperator,
      value: filterOperator === "isNull" ? undefined : filterValue,
    };
    updateState({ filters: [...state.filters, nextFilter], pagination: { ...state.pagination, pageIndex: 0 } });
    setFilterValue("");
  }

  function removeFilter(index: number) {
    updateState({
      filters: state.filters.filter((_, currentIndex) => currentIndex !== index),
      pagination: { ...state.pagination, pageIndex: 0 },
    });
  }

  function resetTable() {
    commitState(createDefaultEntityTableState({
      pagination: { pageIndex: 0, pageSize: state.pagination.pageSize },
      density: state.density,
    }));
  }

  function renderState() {
    if (status.state === "loading") {
      return <LoadingState title={`Loading ${resourceLabel}`} description={status.message ?? "CRAYS is resolving the server-authoritative resource view."} />;
    }

    if (status.state === "permission") {
      return <PermissionState title={`${resourceLabel} requires permission`} description={status.message ?? "The server denied this resource for the current role or scope."} action={{ label: status.actionLabel ?? "Open work queue", href: "/dashboard?view=work-queue" }} />;
    }

    if (status.state === "error") {
      return <ErrorState title={`${resourceLabel} is unavailable`} description={status.message ?? "The resource request failed safely. No source write or apply was attempted."} action={{ label: status.retryLabel ?? "Retry safely", onClick: onRetry, disabled: !onRetry }} />;
    }

    if (!data.length && activeQuery) {
      return <NoResultsState title={`No ${resourceLabel.toLowerCase()} match this view`} description="The resource exists, but the current search, filters or saved view returned no rows." action={{ label: "Reset filters", onClick: resetTable }} />;
    }

    if (!data.length || status.state === "empty") {
      return <EmptyState title={`No ${resourceLabel.toLowerCase()} yet`} description={status.state === "empty" ? status.message : "There is no server-authoritative row for this resource view yet."} action={{ label: "Open work queue", href: "/dashboard?view=work-queue" }} />;
    }

    return null;
  }

  const stateElement = renderState();

  return (
    <section className="rounded-[16px] border border-border bg-card text-card-foreground shadow-sm">
      <div className="space-y-4 border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{resourceLabel}</h2>
              <Badge variant={status.state === "ready" ? "success" : status.state === "error" ? "danger" : "secondary"}>{status.state}</Badge>
            </div>
            {resourceDescription ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{resourceDescription}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savedViews.length ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                View
                <select
                  value={state.savedViewId ?? ""}
                  onChange={(event) => {
                    updateState({ savedViewId: event.target.value || undefined, pagination: { ...state.pagination, pageIndex: 0 } });
                    if (event.target.value) onSavedViewSelect?.(event.target.value);
                  }}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Current view</option>
                  {savedViews.map((view) => (
                    <option key={view.id} value={view.id}>{view.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {onSaveView ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onSaveView(entityTableStateToResourceQuery(state, visibleFields))}>
                <Save className="size-4" aria-hidden="true" />
                Save view
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
          <label className="relative block h-10 self-start">
            <span className="sr-only">Search {resourceLabel}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={state.search}
              onChange={(event) => updateState({ search: event.target.value, pagination: { ...state.pagination, pageIndex: 0 } })}
              placeholder={`Search ${resourceLabel}`}
              className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none ring-ring transition focus:ring-2"
            />
          </label>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="size-4" aria-hidden="true" />
              Filter
            </span>
            <select value={activeFilterField} onChange={(event) => setFilterField(event.target.value)} className="h-10 min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-sm">
              {filterableColumns.map((column) => (
                <option key={column.id} value={column.id}>{column.label}</option>
              ))}
            </select>
            <select value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as ResourceFilterOperator)} className="h-10 min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-sm">
              {filterOperators.map((operator) => (
                <option key={operator} value={operator}>{operator}</option>
              ))}
            </select>
            {filterOperator !== "isNull" ? (
              <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} placeholder="Value" className="h-10 min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-sm" />
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={addFilter}>Add filter</Button>
            <Button type="button" variant="quiet" size="sm" onClick={resetTable}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {state.filters.map((filter, index) => (
              <button key={`${filter.field}-${filter.operator}-${index}`} type="button" onClick={() => removeFilter(index)} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
                {filter.field} {filter.operator}{filter.value !== undefined ? ` ${String(filter.value)}` : ""}
                <X className="size-3" aria-hidden="true" />
              </button>
            ))}
            {!state.filters.length ? <span className="text-xs text-muted-foreground">No field filters active</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 text-sm font-medium">
                <Columns3 className="size-4" aria-hidden="true" />
                Columns
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border bg-popover p-3 shadow-lg">
                {selectableColumns.map((column) => (
                  <label key={column.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} className="size-4" />
                    {column.columnDef.meta ? columnLabel(column.columnDef, column.id) : column.id}
                  </label>
                ))}
              </div>
            </details>
            <div className="inline-flex rounded-md border border-border p-1" aria-label="Table density">
              {(["compact", "default", "comfortable"] as EntityTableDensity[]).map((density) => (
                <button key={density} type="button" onClick={() => updateState({ density })} className={cn("rounded px-2 py-1 text-xs font-medium", state.density === density ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                  {density}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeSelectedIds.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-3">
          <p className="text-sm font-medium">{activeSelectedIds.length} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions.map((action) => (
              <Button key={action.id} type="button" variant="outline" size="sm" disabled={action.disabled} title={action.reason} onClick={() => onBulkAction?.(action.id, activeSelectedIds)}>
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {stateElement ? (
        <div className="p-4">{stateElement}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className={cn("w-full border-collapse", densityClass(state.density))}>
              <thead className="bg-secondary/60">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="border-b border-border px-4 text-left font-semibold text-muted-foreground">
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            disabled={!header.column.getCanSort()}
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-2 text-left"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? <ArrowUp className="size-3" aria-hidden="true" /> : null}
                            {header.column.getIsSorted() === "desc" ? <ArrowDown className="size-3" aria-hidden="true" /> : null}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 transition hover:bg-secondary/40">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 align-middle">
                        {cell.column.id === "__select" ? (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        ) : onRowOpen ? (
                          <button type="button" onClick={() => onRowOpen(row.original)} className="w-full text-left">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </button>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span>
                Page {state.pagination.pageIndex + 1}
                {pageInfo?.totalReliable && pageInfo.total !== undefined ? ` of ${Math.max(Math.ceil(pageInfo.total / state.pagination.pageSize), 1)}` : " · total unknown"}
              </span>
              {pageInfo?.nextCursor ? <Badge variant="outline">next cursor ready</Badge> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={state.pagination.pageIndex === 0 && !pageInfo?.hasPreviousPage} onClick={() => updateState({ pagination: { ...state.pagination, pageIndex: Math.max(state.pagination.pageIndex - 1, 0) } })}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Previous
              </Button>
              <select
                value={state.pagination.pageSize}
                onChange={(event) => updateState({ pagination: { pageIndex: 0, pageSize: Number(event.target.value) } })}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size} rows</option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageInfo?.totalReliable && pageInfo.total !== undefined ? state.pagination.pageIndex + 1 >= Math.ceil(pageInfo.total / state.pagination.pageSize) : pageInfo?.hasNextPage === false}
                onClick={() => updateState({ pagination: { ...state.pagination, pageIndex: state.pagination.pageIndex + 1 } })}
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
