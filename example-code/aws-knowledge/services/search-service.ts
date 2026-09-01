import type { SearchDocumentationResult } from "../contracts.ts";
import type { AwsKnowledgeMode } from "../config.ts";
import type { SearchDocumentationInput } from "../schemas.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { DEFAULT_SEARCH_LIMIT } from "../constants.ts";
import { ToolExecutionError } from "../contracts.ts";
import { throwIfAborted } from "../utils/errors.ts";
import { normalizeTopics } from "../utils/topics.ts";

type SearchServiceDeps = {
  adapter: FixtureAdapter;
  mode: AwsKnowledgeMode;
};

function tokenize(value: string): string[] {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function scoreRow(row: { title: string; context: string; topics: string[] }, phraseTokens: string[]): number {
  const text = `${row.title} ${row.context}`.toLowerCase();
  let score = 0;

  for (const token of phraseTokens) {
    if (text.includes(token)) score += 2;
    if (row.topics.some((topic) => topic.toLowerCase().includes(token))) score += 1;
  }

  return score;
}

export function createSearchService(deps: SearchServiceDeps) {
  return {
    async searchDocumentation(
      input: SearchDocumentationInput,
      options: { signal?: AbortSignal } = {},
    ): Promise<SearchDocumentationResult> {
      throwIfAborted(options.signal);

      const searchPhrase = input.search_phrase?.trim();
      if (!searchPhrase) {
        throw new ToolExecutionError("validation_error", "search_phrase must be a non-empty string.");
      }

      const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new ToolExecutionError("validation_error", "limit must be an integer >= 1.");
      }

      const { normalized: normalizedTopics, dropped } = normalizeTopics(input.topics, deps.mode);
      const phraseTokens = tokenize(searchPhrase);
      const rows = deps.adapter.getSearchRows();

      const filtered = rows.filter((row) => {
        if (normalizedTopics.length === 0) return true;
        return row.topics.some((topic) => normalizedTopics.includes(topic));
      });

      const ranked = filtered
        .map((row) => ({ row, score: scoreRow(row, phraseTokens) }))
        .filter((entry) => entry.score > 0 || normalizedTopics.length > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.row.url.localeCompare(b.row.url);
        })
        .slice(0, limit)
        .map((entry, index) => ({
          rank_order: index + 1,
          url: entry.row.url,
          title: entry.row.title,
          context: entry.row.context,
          sop_name: entry.row.sop_name,
        }));

      return {
        fixture_version: deps.adapter.fixtureVersion,
        mode: deps.mode,
        normalized_topics: normalizedTopics,
        dropped_topics: dropped,
        results: ranked,
      };
    },
  };
}
