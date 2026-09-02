import assert from "node:assert/strict";
import test from "node:test";

import { searchAwsDocumentation } from "../src/index.ts";

void test("searches the live AWS endpoint and retrieves AWS-authored Markdown", {
  timeout: 60_000,
}, async () => {
  const response = await searchAwsDocumentation({
    query: "DynamoDB global secondary index",
    maxResults: 1,
    limit: 1,
    download: 1,
    noCache: true,
  });

  assert.equal(response.results.length, 1);
  assert.equal(new URL(response.results[0]?.url ?? "").hostname, "docs.aws.amazon.com");
  assert.equal(response.documents[0]?.format, "markdown");
  assert.match(response.documents[0]?.content ?? "", /global secondary index/i);
});
