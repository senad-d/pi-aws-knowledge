export const DEFAULT_SUGGESTION = {
  textExcerptSuggestion: {
    title: "IAM least privilege",
    link: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
    summary: "Grant only required permissions.",
    suggestionBody: "Security best practices",
    context: [
      { key: "aws-docs-search-product", value: "AWS Identity and Access Management" },
      { key: "aws-docs-search-guide", value: "User Guide" },
    ],
  },
};

export function searchPayload(suggestions: unknown[] = [DEFAULT_SUGGESTION]): string {
  return JSON.stringify({
    queryId: "query-1",
    suggestions,
    facets: {
      "aws-docs-search-guide": ["User Guide"],
      "aws-docs-search-product": ["AWS Identity and Access Management"],
    },
  });
}

export function jsonResponse(body = searchPayload(), init?: ResponseInit): Response {
  return new Response(body, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
}
