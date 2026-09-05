import type { AwsDocsSearchResponse, AwsDocsSearchResult } from "./index.ts";

function formatFacets(label: string, values: string[]): string {
  if (values.length === 0) return `- ${label}: none`;
  return `- ${label}: ${values.join("; ")}`;
}

function formatResult(result: AwsDocsSearchResult): string[] {
  const lines = ["", `${result.rank}. ${result.title}`, `   - Source: <${result.url}>`];
  if (result.product) lines.push(`   - Product: ${result.product}`);
  if (result.guide) lines.push(`   - Guide: ${result.guide}`);
  if (result.preferenceMatch) lines.push(`   - Preferred-text match: ${result.preferenceMatch}`);
  if (result.summary) lines.push(`   - Summary: ${result.summary}`);
  if (result.excerpt) lines.push(`   - Matched excerpt: ${result.excerpt}`);
  return lines;
}

export function formatSearchResponse(response: AwsDocsSearchResponse): string {
  const lines = [
    `AWS documentation search for: ${response.query}`,
    `Query ID: ${response.queryId}`,
    `Returned ${response.suggestionsReturned} suggestion(s); included ${response.results.length}.`,
    "",
    "## Ranked results",
  ];

  if (response.suggestionsReturned === 0) lines.push("No matching documentation found.");
  else if (response.results.length === 0) lines.push("No results displayed (limit: 0).");
  for (const result of response.results) lines.push(...formatResult(result));

  lines.push(
    "",
    "## Available facets",
    formatFacets("Products", response.facets.products),
    formatFacets("Guides", response.facets.guides),
  );

  if (response.documents.length > 0 || response.documentErrors.length > 0) {
    lines.push("", "## Retrieved documents");
  }
  for (const document of response.documents) {
    const title =
      response.results.find((result) => result.rank === document.rank)?.title ?? "Document";
    lines.push(
      "",
      `### Source ${document.rank}: ${title}`,
      `- Search result: <${document.searchUrl}>`,
      `- Retrieved from: <${document.fetchedUrl}>`,
      `- Format: ${document.format}`,
      `- Cache: ${document.cache}`,
      ...(document.cacheWarning ? [`- Cache warning: ${document.cacheWarning}`] : []),
      "",
      `<aws-document-source format="${document.format}">`,
      document.content,
      "</aws-document-source>",
    );
  }
  for (const failure of response.documentErrors) {
    lines.push("", `- Source ${failure.rank} download failed: ${failure.error}`);
  }
  return lines.join("\n");
}
