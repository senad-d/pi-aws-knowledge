import type { GetRegionalAvailabilityResult } from "../contracts.ts";
import type { AwsKnowledgeConfig } from "../config.ts";
import type { GetRegionalAvailabilityInput } from "../schemas.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { MAX_AVAILABILITY_REGIONS } from "../constants.ts";
import { ToolExecutionError } from "../contracts.ts";
import { throwIfAborted } from "../utils/errors.ts";
import { filterHash, parseAvailabilityFilters, type ParsedAvailabilityFilter } from "../utils/filters.ts";
import { decodePaginationToken, encodePaginationToken } from "../utils/pagination.ts";

type AvailabilityServiceDeps = {
  adapter: FixtureAdapter;
  config: Pick<AwsKnowledgeConfig, "paginationSecret" | "availabilityPageSize">;
};

type AvailabilityFixtureItem = ReturnType<FixtureAdapter["getAvailabilityItems"]>[number];

function normalizeRegionId(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueRegions(regions: string[]): string[] {
  const output: string[] = [];
  for (const region of regions.map(normalizeRegionId)) {
    if (!region) continue;
    if (!output.includes(region)) output.push(region);
  }
  return output;
}

function ensureResourceType(value: string): "product" | "api" | "cfn" {
  if (value === "product" || value === "api" || value === "cfn") {
    return value;
  }
  throw new ToolExecutionError("validation_error", `Unsupported resource_type: ${value}`);
}

function resourceMatchesFilters(item: AvailabilityFixtureItem, filters: ParsedAvailabilityFilter[]): boolean {
  if (filters.length === 0) return true;

  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  const service = item.service?.toLowerCase() ?? "";

  return filters.every((filter) => {
    switch (filter.key) {
      case "contains":
        return id.includes(filter.value) || name.includes(filter.value) || service.includes(filter.value);
      case "service":
        return service.includes(filter.value) || id.includes(filter.value);
      case "id":
        return id === filter.value || id.includes(filter.value);
      default:
        return false;
    }
  });
}

function buildRegionRows(
  regionId: string,
  entries: AvailabilityFixtureItem[],
): Array<{ id: string; name: string; status: string }> {
  return entries
    .map((entry) => {
      const status = entry.statuses[regionId];
      if (!status) return null;
      return {
        id: entry.id,
        name: entry.name,
        status,
      };
    })
    .filter((entry): entry is { id: string; name: string; status: string } => entry !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function createAvailabilityService(deps: AvailabilityServiceDeps) {
  return {
    async getRegionalAvailability(
      input: GetRegionalAvailabilityInput,
      options: { signal?: AbortSignal } = {},
    ): Promise<GetRegionalAvailabilityResult> {
      throwIfAborted(options.signal);

      const resourceType = ensureResourceType(input.resource_type);
      if (input.region && input.regions) {
        throw new ToolExecutionError("validation_error", "Use either region or regions, not both.");
      }

      if (input.regions !== undefined && input.regions.length === 0) {
        throw new ToolExecutionError(
          "validation_error",
          "regions must contain at least one region when provided.",
        );
      }

      if (input.regions && input.regions.length > MAX_AVAILABILITY_REGIONS) {
        throw new ToolExecutionError(
          "validation_error",
          `regions supports at most ${MAX_AVAILABILITY_REGIONS} entries.`,
        );
      }

      const allKnownRegions = deps.adapter.getRegions().map((item) => item.region_id);
      const selectedRegions = uniqueRegions(
        input.regions && input.regions.length > 0
          ? input.regions
          : input.region
            ? [input.region]
            : allKnownRegions,
      );

      if (selectedRegions.length === 0) {
        throw new ToolExecutionError("validation_error", "At least one region must be selected.");
      }

      const parsedFilters = parseAvailabilityFilters(input.filters);
      if (selectedRegions.length > 1 && parsedFilters.length === 0) {
        throw new ToolExecutionError("validation_error", "Multi-region queries require at least one filter.");
      }

      const tokenFilterHash = filterHash(parsedFilters);
      const isSingleRegionNoFilter = selectedRegions.length === 1 && parsedFilters.length === 0;

      if (!isSingleRegionNoFilter && input.next_token) {
        throw new ToolExecutionError(
          "validation_error",
          "next_token is only supported for single-region queries without filters.",
        );
      }

      const entries = deps.adapter
        .getAvailabilityItems(resourceType)
        .filter((entry) => resourceMatchesFilters(entry, parsedFilters));

      let nextToken: string | undefined;

      if (isSingleRegionNoFilter) {
        const regionId = selectedRegions[0];
        if (!regionId) {
          throw new ToolExecutionError("validation_error", "At least one region must be selected.");
        }
        const regionRows = buildRegionRows(regionId, entries);

        let offset = 0;
        if (input.next_token) {
          const decoded = decodePaginationToken(input.next_token, deps.config.paginationSecret);
          if (decoded.t !== resourceType || decoded.r !== regionId || decoded.f !== tokenFilterHash) {
            throw new ToolExecutionError("validation_error", "next_token does not match the current query.");
          }
          offset = decoded.o;
        }

        const pageSize = Math.max(1, deps.config.availabilityPageSize);
        const pagedRows = regionRows.slice(offset, offset + pageSize);
        const nextOffset = offset + pagedRows.length;

        if (nextOffset < regionRows.length) {
          nextToken = encodePaginationToken(
            {
              r: regionId,
              t: resourceType,
              o: nextOffset,
              f: tokenFilterHash,
            },
            deps.config.paginationSecret,
          );
        }

        return {
          fixture_version: deps.adapter.fixtureVersion,
          resource_type: resourceType,
          regions: selectedRegions,
          filters: input.filters ?? [],
          results: [
            {
              region_id: regionId,
              resources: pagedRows,
            },
          ],
          next_token: nextToken,
        };
      }

      const results = selectedRegions
        .slice()
        .sort((a, b) => a.localeCompare(b))
        .map((regionId) => ({
          region_id: regionId,
          resources: buildRegionRows(regionId, entries),
        }));

      return {
        fixture_version: deps.adapter.fixtureVersion,
        resource_type: resourceType,
        regions: selectedRegions,
        filters: input.filters ?? [],
        results,
      };
    },
  };
}
