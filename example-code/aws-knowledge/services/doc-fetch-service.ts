import type { ReadDocumentationResult } from "../contracts.ts";
import type { ReadDocumentationInput } from "../schemas.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { DEFAULT_READ_MAX_LENGTH } from "../constants.ts";
import { ToolExecutionError } from "../contracts.ts";
import { rowError, throwIfAborted } from "../utils/errors.ts";
import { validateAwsDocUrl } from "../utils/url-policy.ts";

type DocFetchServiceDeps = {
  adapter: FixtureAdapter;
};

export function createDocFetchService(deps: DocFetchServiceDeps) {
  return {
    async readDocumentation(
      input: ReadDocumentationInput,
      options: { signal?: AbortSignal } = {},
    ): Promise<ReadDocumentationResult> {
      throwIfAborted(options.signal);

      if (!Array.isArray(input.requests) || input.requests.length === 0) {
        throw new ToolExecutionError("validation_error", "requests must contain at least one item.");
      }

      const rows = input.requests.map((request: ReadDocumentationInput["requests"][number]) => {
        const requestUrl = request.url;

        try {
          const validatedUrl = validateAwsDocUrl(requestUrl);
          const page = deps.adapter.getReadPageByUrl(validatedUrl.toString());
          if (!page) {
            throw new ToolExecutionError("not_found", `No fixture documentation page found for URL: ${requestUrl}`);
          }

          const startIndex = request.start_index ?? 0;
          if (!Number.isInteger(startIndex) || startIndex < 0) {
            throw new ToolExecutionError("validation_error", "start_index must be an integer >= 0.");
          }

          const maxLength = request.max_length ?? DEFAULT_READ_MAX_LENGTH;
          if (!Number.isInteger(maxLength) || maxLength <= 0) {
            throw new ToolExecutionError("validation_error", "max_length must be an integer >= 1.");
          }

          const fullContent = page.content;
          const totalLength = fullContent.length;
          const chunk = fullContent.slice(startIndex, startIndex + maxLength);
          const endIndex = startIndex + chunk.length;

          return {
            status: "SUCCESS" as const,
            url: requestUrl,
            title: page.title,
            content: chunk,
            total_length: totalLength,
            start_index: startIndex,
            end_index: endIndex,
            truncated: endIndex < totalLength,
            redirected_url: page.redirected_url,
          };
        } catch (error) {
          return rowError(requestUrl, error);
        }
      });

      return {
        fixture_version: deps.adapter.fixtureVersion,
        rows,
      };
    },
  };
}
