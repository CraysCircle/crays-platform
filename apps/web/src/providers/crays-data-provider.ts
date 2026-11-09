"use client";

import type {
  BaseKey,
  BaseRecord,
  CreateParams,
  CrudFilter,
  CrudSort,
  CustomParams,
  DataProvider,
  DeleteOneParams,
  GetManyParams,
  GetListParams,
  GetOneParams,
  HttpError,
  LogicalFilter,
  UpdateParams,
} from "@refinedev/core";
import { queryCraysResource, sendCraysCommand } from "@/providers/crays-bff-client";
import type { ResourceFilterOperator, ResourceQuery, ResourceSortDirection } from "@/lib/resources";

const operatorMap: Partial<Record<LogicalFilter["operator"], ResourceFilterOperator>> = {
  eq: "eq",
  ne: "neq",
  in: "in",
  contains: "contains",
  startswith: "startsWith",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  null: "isNull",
};

function refineError(message: string, statusCode = 422): HttpError {
  return { message, statusCode };
}

function isLogicalFilter(filter: CrudFilter): filter is LogicalFilter {
  return "field" in filter;
}

function mapFilters(filters: CrudFilter[] | undefined) {
  return (filters ?? []).map((filter) => {
    if (!isLogicalFilter(filter)) {
      throw refineError("Nested conditional filters are not part of the Block 75 CRAYS query contract yet.");
    }

    const operator = operatorMap[filter.operator];
    if (!operator) {
      throw refineError(`Filter operator ${filter.operator} is not supported by the CRAYS resource contract.`);
    }

    return {
      field: filter.field,
      operator,
      value: operator === "isNull" ? undefined : filter.value,
    };
  });
}

function mapSorters(sorters: CrudSort[] | undefined) {
  return (sorters ?? []).map((sorter) => ({
    field: sorter.field,
    direction: sorter.order as ResourceSortDirection,
  }));
}

function metaArray(meta: GetListParams["meta"], key: string) {
  const value = meta?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function metaString(meta: GetListParams["meta"], key: string) {
  const value = meta?.[key];
  return typeof value === "string" ? value : undefined;
}

function queryString(query: unknown) {
  if (!query || typeof query !== "object" || Array.isArray(query)) return "";

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") params.set(key, value);
    if (typeof value === "number" || typeof value === "boolean") params.set(key, String(value));
  }

  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

function toResourceQuery(params: GetListParams): ResourceQuery {
  const pageSize = params.pagination?.pageSize ?? 25;
  const currentPage = params.pagination?.currentPage ?? 1;

  return {
    filters: mapFilters(params.filters),
    sort: mapSorters(params.sorters),
    page: {
      limit: pageSize,
      offset: Math.max(currentPage - 1, 0) * pageSize,
    },
    fields: metaArray(params.meta, "fields"),
    search: metaString(params.meta, "search"),
    viewId: metaString(params.meta, "viewId"),
  };
}

function idempotencyKey(resource: string, operation: string, id?: BaseKey) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `crays-${resource}-${operation}-${id ?? "new"}-${random}`;
}

export function createCraysDataProvider(): DataProvider {
  return {
    getApiUrl: () => "/api/crays",

    async getList<TData extends BaseRecord = BaseRecord>(params: GetListParams) {
      const result = await queryCraysResource<TData>({
        resource: params.resource,
        query: toResourceQuery(params),
      });

      return {
        data: result.data,
        total: result.total,
        pageInfo: result.pageInfo,
        craysStatus: result.status,
        craysMessage: result.message,
      };
    },

    async getOne<TData extends BaseRecord = BaseRecord>({ resource, id }: GetOneParams) {
      const result = await queryCraysResource<TData>({
        resource,
        id,
      });
      const record = result.data[0];

      if (!record) {
        throw refineError(`CRAYS resource ${resource} did not return record ${id}.`, 404);
      }

      return { data: record };
    },

    async getMany<TData extends BaseRecord = BaseRecord>({ resource, ids }: GetManyParams) {
      const records = await Promise.all(
        ids.map(async (id) => {
          const result = await queryCraysResource<TData>({ resource, id });
          return result.data[0];
        }),
      );

      return { data: records.filter(Boolean) as TData[] };
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({ resource, variables }: CreateParams<TVariables>) {
      const command = await sendCraysCommand<TData>({
        resource,
        operation: "create",
        changes: variables,
        idempotencyKey: idempotencyKey(resource, "create"),
      });

      return { data: command.receipt as TData };
    },

    async update<TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({ resource, id, variables }: UpdateParams<TVariables>) {
      const command = await sendCraysCommand<TData>({
        resource,
        id: String(id),
        operation: "update",
        changes: variables,
        idempotencyKey: idempotencyKey(resource, "update", id),
      });

      return { data: command.receipt as TData };
    },

    async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = Record<string, unknown>>({ resource, id, variables }: DeleteOneParams<TVariables>) {
      const command = await sendCraysCommand<TData>({
        resource,
        id: String(id),
        operation: "archive",
        changes: variables ?? { archived: true },
        idempotencyKey: idempotencyKey(resource, "archive", id),
      });

      return { data: command.receipt as TData };
    },

    async custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>({ url, method, query, payload }: CustomParams<TQuery, TPayload>) {
      if (!url.startsWith("/api/crays/")) {
        throw refineError("Custom provider calls are restricted to CRAYS BFF routes.", 403);
      }

      const search = queryString(query);
      const response = await fetch(`${url}${search}`, {
        method: method.toUpperCase(),
        cache: "no-store",
        credentials: "same-origin",
        headers: payload ? { "content-type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw refineError(`CRAYS custom call failed with HTTP ${response.status}.`, response.status);
      }

      return { data: (await response.json()) as TData };
    },
  };
}
