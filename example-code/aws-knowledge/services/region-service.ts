import type { ListRegionsResult } from "../contracts.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { throwIfAborted } from "../utils/errors.ts";

type RegionServiceDeps = {
  adapter: FixtureAdapter;
};

export function createRegionService(deps: RegionServiceDeps) {
  return {
    async listRegions(options: { signal?: AbortSignal } = {}): Promise<ListRegionsResult> {
      throwIfAborted(options.signal);
      return {
        fixture_version: deps.adapter.fixtureVersion,
        regions: deps.adapter.getRegions(),
      };
    },
  };
}
