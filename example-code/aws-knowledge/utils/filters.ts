import { ToolExecutionError } from "../contracts.ts";

export type ParsedAvailabilityFilter = {
  key: "contains" | "service" | "id";
  value: string;
};

const ALLOWED_FILTER_KEYS = new Set(["contains", "service", "id"]);

export function parseAvailabilityFilters(filters: string[] | undefined): ParsedAvailabilityFilter[] {
  if (!filters || filters.length === 0) {
    return [];
  }

  const parsed: ParsedAvailabilityFilter[] = [];

  for (const raw of filters) {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new ToolExecutionError("validation_error", "filters entries must be non-empty.");
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) {
      throw new ToolExecutionError(
        "validation_error",
        `Invalid filter format: ${trimmed}. Use key:value (for example contains:lambda).`,
      );
    }

    const key = trimmed.slice(0, separatorIndex).trim().toLowerCase();
    const value = trimmed.slice(separatorIndex + 1).trim().toLowerCase();

    if (!ALLOWED_FILTER_KEYS.has(key)) {
      throw new ToolExecutionError("validation_error", `Unsupported filter key: ${key}`);
    }

    if (!value) {
      throw new ToolExecutionError("validation_error", `Filter value cannot be empty: ${trimmed}`);
    }

    parsed.push({ key: key as ParsedAvailabilityFilter["key"], value });
  }

  return parsed;
}

export function filterHash(filters: ParsedAvailabilityFilter[]): string {
  if (filters.length === 0) return "none";
  return filters.map((filter) => `${filter.key}:${filter.value}`).join("|");
}
