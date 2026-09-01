import type { RecommendResult } from "../contracts.ts";
import type { RecommendInput } from "../schemas.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { ToolExecutionError } from "../contracts.ts";
import { throwIfAborted } from "../utils/errors.ts";

type RecommendServiceDeps = {
  adapter: FixtureAdapter;
};

function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  if (url.hostname.toLowerCase() !== "docs.aws.amazon.com") {
    throw new ToolExecutionError("invalid_url", "recommend only supports docs.aws.amazon.com URLs.");
  }
  return url.toString();
}

function extractServiceName(url: URL): string | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const serviceName = parts[0];
  if (!serviceName) return null;
  return serviceName.toLowerCase();
}

export function createRecommendService(deps: RecommendServiceDeps) {
  return {
    async recommend(input: RecommendInput, options: { signal?: AbortSignal } = {}): Promise<RecommendResult> {
      throwIfAborted(options.signal);

      const sourceUrl = normalizeUrl(input.url);
      const exact = deps.adapter.getRecommendationsByUrl(sourceUrl);
      if (exact.length > 0) {
        return {
          fixture_version: deps.adapter.fixtureVersion,
          source_url: sourceUrl,
          fallback_scope: "exact",
          recommendations: exact,
        };
      }

      const url = new URL(sourceUrl);
      const service = extractServiceName(url);
      const serviceFallback = service ? deps.adapter.getRecommendationsByService(service) : [];

      return {
        fixture_version: deps.adapter.fixtureVersion,
        source_url: sourceUrl,
        fallback_scope: serviceFallback.length > 0 ? "service" : "none",
        recommendations: serviceFallback,
      };
    },
  };
}
