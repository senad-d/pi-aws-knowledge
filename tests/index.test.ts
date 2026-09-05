import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import extension, {
  createAwsDocsSearchTool,
  defaultAwsDocsCacheDirectory,
  searchAwsDocumentation,
  type AwsDocsSearchInput,
} from "../src/index.ts";

import { DEFAULT_SUGGESTION, jsonResponse, searchPayload } from "./helpers.ts";

void test("exports a Pi extension factory", () => {
  assert.equal(typeof extension, "function");
});

void test("uses the requested global Pi cache directory by default", () => {
  assert.equal(defaultAwsDocsCacheDirectory({}), join(homedir(), ".pi", ".aws-docs"));
});

void test("resolves configured cache directories", () => {
  assert.equal(defaultAwsDocsCacheDirectory({ AWS_DOCS_CACHE_DIR: "~" }), homedir());
  assert.equal(
    defaultAwsDocsCacheDirectory({ AWS_DOCS_CACHE_DIR: "~/custom-cache" }),
    join(homedir(), "custom-cache"),
  );
  assert.equal(
    defaultAwsDocsCacheDirectory({ AWS_DOCS_CACHE_DIR: "relative-cache" }),
    join(process.cwd(), "relative-cache"),
  );
});

void test("registers the AWS documentation tool", () => {
  let registeredName = "";
  extension({
    registerTool(tool) {
      registeredName = tool.name;
    },
  } as ExtensionAPI);

  assert.equal(registeredName, "aws_docs_search");
});

void test("searches with AWS facets and prioritizes preferred results", async () => {
  let requestUrl = "";
  let requestBody: unknown;
  const fetcher = (input: string | URL, init?: RequestInit): Promise<Response> => {
    requestUrl = input.toString();
    const body = init?.body;
    if (typeof body !== "string") assert.fail("request body must be a string");
    requestBody = JSON.parse(body) as unknown;
    return Promise.resolve(
      jsonResponse(
        searchPayload([
          {
            textExcerptSuggestion: {
              title: "General IAM guidance",
              link: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
              summary: "Use roles where possible.",
              suggestionBody: "IAM overview",
              context: [],
            },
          },
          DEFAULT_SUGGESTION,
        ]),
      ),
    );
  };

  const response = await searchAwsDocumentation(
    {
      query: "IAM permissions",
      product: "AWS Identity and Access Management",
      guide: "User Guide",
      prefer: "least privilege",
      maxResults: 25,
      limit: 2,
      session: "session value",
    },
    fetcher,
  );

  assert.equal(requestUrl, "https://proxy.search.docs.aws.com/search?session=session+value");
  assert.deepEqual(requestBody, {
    textQuery: { input: "IAM permissions" },
    contextAttributes: [
      { key: "domain", value: "docs.aws.amazon.com" },
      {
        key: "aws-docs-search-product",
        value: "AWS Identity and Access Management",
      },
      { key: "aws-docs-search-guide", value: "User Guide" },
    ],
    acceptSuggestionBody: "RawText",
    locales: ["en_us"],
    maxResults: 25,
  });
  assert.equal(response.results[0]?.title, "IAM least privilege");
  assert.equal(response.results[0]?.endpointRank, 2);
  assert.equal(response.results[0]?.preferenceMatch, "title");
});

void test("retries a transient AWS search failure", async () => {
  let requests = 0;
  const fetcher = (): Promise<Response> => {
    requests += 1;
    return Promise.resolve(
      requests === 1
        ? jsonResponse(JSON.stringify({ message: "try again" }), {
            status: 503,
            headers: { "retry-after": "0" },
          })
        : jsonResponse(),
    );
  };

  const response = await searchAwsDocumentation({ query: "IAM" }, fetcher);

  assert.equal(requests, 2);
  assert.equal(response.results[0]?.title, "IAM least privilege");
});

void test("reports a non-retryable HTTP error", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse(JSON.stringify({ message: "invalid request" }), { status: 400 }));

  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher),
    /HTTP 400: invalid request/,
  );
});

void test("honors cancellation before starting a request", async () => {
  let requests = 0;
  const fetcher = (): Promise<Response> => {
    requests += 1;
    return Promise.resolve(jsonResponse());
  };
  const controller = new AbortController();
  controller.abort(new Error("cancelled by test"));

  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher, controller.signal),
    /cancelled by test/,
  );
  assert.equal(requests, 0);
});

void test("rejects non-AWS documentation links", async () => {
  const externalSuggestion = {
    textExcerptSuggestion: {
      ...DEFAULT_SUGGESTION.textExcerptSuggestion,
      link: "https://example.com/untrusted.html",
    },
  };
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse(searchPayload([externalSuggestion])));

  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher),
    /link must use an AWS docs host/,
  );
});

void test("returns an empty result set", async () => {
  const fetcher = (): Promise<Response> => Promise.resolve(jsonResponse(searchPayload([])));

  const response = await searchAwsDocumentation({ query: "no matches" }, fetcher);

  assert.deepEqual(response.results, []);
  assert.equal(response.suggestionsReturned, 0);
});

void test("downloads AWS-authored Markdown for a ranked result", async () => {
  const fetchedUrls: string[] = [];
  const fetcher = (input: string | URL): Promise<Response> => {
    const url = input.toString();
    fetchedUrls.push(url);
    if (url === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse());
    }
    if (url.endsWith("best-practices.md")) {
      return Promise.resolve(
        new Response("# IAM best practices\n\nUse least privilege.", {
          status: 200,
          headers: { "content-type": "text/markdown; charset=utf-8" },
        }),
      );
    }
    assert.fail(`unexpected URL: ${url}`);
  };

  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );

  assert.equal(response.documents[0]?.format, "markdown");
  assert.match(response.documents[0]?.content ?? "", /Use least privilege/);
  assert.deepEqual(fetchedUrls, [
    "https://proxy.search.docs.aws.com/search",
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.md",
  ]);
});

void test("falls back to HTML when AWS-authored Markdown is unavailable", async () => {
  const fetcher = (input: string | URL): Promise<Response> => {
    const url = input.toString();
    if (url === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse());
    }
    if (url.endsWith("best-practices.md")) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }
    return Promise.resolve(
      new Response("<html><body>IAM best practices</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
  };

  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );

  assert.equal(response.documents[0]?.format, "html");
  assert.match(response.documents[0]?.content ?? "", /IAM best practices/);
});

void test("reuses a fresh document from the disk cache", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pi-aws-cache-test-"));
  let searchRequests = 0;
  let documentRequests = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      searchRequests += 1;
      return Promise.resolve(jsonResponse());
    }
    documentRequests += 1;
    return Promise.resolve(
      new Response("# Cached IAM documentation", {
        status: 200,
        headers: { "content-type": "text/markdown" },
      }),
    );
  };

  try {
    const first = await searchAwsDocumentation(
      { query: "IAM", download: 1, cacheTtlSeconds: 3600 },
      fetcher,
      undefined,
      cacheDirectory,
    );
    const second = await searchAwsDocumentation(
      { query: "IAM", download: 1, cacheTtlSeconds: 3600 },
      fetcher,
      undefined,
      cacheDirectory,
    );

    assert.equal(first.documents[0]?.cache, "miss");
    assert.equal(second.documents[0]?.cache, "hit");
    assert.equal(searchRequests, 2);
    assert.equal(documentRequests, 1);
  } finally {
    await rm(cacheDirectory, { recursive: true });
  }
});

void test("rejects an unexpected AWS search response", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse(JSON.stringify({ queryId: "query-1", suggestions: {} })));

  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher),
    /unexpected AWS documentation search response/,
  );
});

const INVALID_INPUTS: Array<[string, Partial<AwsDocsSearchInput>, RegExp]> = [
  ["whitespace query", { query: "   " }, /query must contain non-whitespace text/],
  ["zero maxResults", { maxResults: 0 }, /maxResults must be an integer/],
  ["excessive maxResults", { maxResults: 101 }, /maxResults must be an integer/],
  ["fractional maxResults", { maxResults: 1.5 }, /maxResults must be an integer/],
  ["negative limit", { limit: -1 }, /limit must be an integer/],
  ["excessive limit", { limit: 101 }, /limit must be an integer/],
  ["fractional limit", { limit: 1.5 }, /limit must be an integer/],
  ["negative download", { download: -1 }, /download must be an integer/],
  ["excessive download", { download: 11 }, /download must be an integer/],
  ["fractional download", { download: 1.5 }, /download must be an integer/],
  ["negative cache TTL", { cacheTtlSeconds: -1 }, /cacheTtlSeconds must be an integer/],
  ["excessive cache TTL", { cacheTtlSeconds: 31_536_001 }, /cacheTtlSeconds must be an integer/],
  ["fractional cache TTL", { cacheTtlSeconds: 1.5 }, /cacheTtlSeconds must be an integer/],
  ["unsupported locale", { locale: "en_gb" as "en_us" }, /unsupported locale: en_gb/],
];

for (const [name, invalid, expected] of INVALID_INPUTS) {
  void test(`rejects ${name}`, async () => {
    let requests = 0;
    const fetcher = (): Promise<Response> => {
      requests += 1;
      return Promise.resolve(jsonResponse());
    };

    await assert.rejects(searchAwsDocumentation({ query: "IAM", ...invalid }, fetcher), expected);
    assert.equal(requests, 0);
  });
}

void test("forwards identity and locale while retaining request defaults", async () => {
  let requestBody: Record<string, unknown> = {};
  const fetcher = (_input: string | URL, init?: RequestInit): Promise<Response> => {
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, { "content-type": "application/json" });
    if (typeof init?.body !== "string") assert.fail("request body must be a string");
    requestBody = JSON.parse(init.body) as Record<string, unknown>;
    return Promise.resolve(jsonResponse());
  };

  await searchAwsDocumentation({ query: "IAM", identity: "caller", locale: "fr_fr" }, fetcher);

  assert.equal(requestBody.identityID, "caller");
  assert.deepEqual(requestBody.locales, ["fr_fr"]);
  assert.equal(requestBody.maxResults, 100);
});

void test("normalizes optional metadata and ranks metadata matches before unmatched results", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(
      jsonResponse(
        searchPayload([
          {
            textExcerptSuggestion: {
              title: "Unmatched",
              link: "https://docs.aws.com/first",
              summary: null,
              suggestionBody: "Other guidance",
              context: [{ key: "ignored", value: "value" }],
              isCitable: "unknown",
              sourceCreatedAt: Number.NaN,
            },
          },
          {
            textExcerptSuggestion: {
              title: "Matched in metadata",
              link: "https://docs.aws.amazon.com/second",
              suggestionBody: "Least privilege guidance",
              context: [null, { key: "aws-docs-search-product", value: 7 }],
              isCitable: true,
              sourceCreatedAt: 10,
              sourceUpdatedAt: 20,
            },
          },
        ]),
      ),
    );

  const response = await searchAwsDocumentation(
    { query: "IAM", prefer: "least privilege" },
    fetcher,
  );

  assert.deepEqual(
    response.results.map((result) => [result.title, result.preferenceMatch, result.endpointRank]),
    [
      ["Matched in metadata", "metadata", 2],
      ["Unmatched", null, 1],
    ],
  );
  assert.deepEqual(response.results[0], {
    rank: 1,
    endpointRank: 2,
    preferenceMatch: "metadata",
    title: "Matched in metadata",
    url: "https://docs.aws.amazon.com/second",
    summary: "",
    excerpt: "Least privilege guidance",
    product: null,
    guide: null,
    isCitable: true,
    sourceCreatedAt: 10,
    sourceUpdatedAt: 20,
  });
  assert.equal(response.results[1]?.isCitable, null);
  assert.equal(response.results[1]?.sourceCreatedAt, null);
});

const INVALID_RESPONSES: Array<[string, unknown, RegExp | { name: string; message: RegExp }]> = [
  ["a non-object suggestion", null, /invalid suggestion/],
  ["a missing suggestion payload", {}, /invalid suggestion/],
  [
    "a non-string title",
    { textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, title: 1 } },
    { name: "TypeError", message: /title must be a string/ },
  ],
  [
    "a malformed link",
    { textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, link: "not a URL" } },
    /link must be a URL/,
  ],
  [
    "a non-string summary",
    { textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, summary: 1 } },
    { name: "TypeError", message: /summary must be a string or null/ },
  ],
  [
    "a non-string excerpt",
    {
      textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, suggestionBody: null },
    },
    /suggestionBody must be a string/,
  ],
  [
    "non-array context",
    { textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, context: {} } },
    { name: "TypeError", message: /context must be an array/ },
  ],
];

for (const [name, suggestion, expected] of INVALID_RESPONSES) {
  void test(`rejects ${name} in the AWS response`, async () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(jsonResponse(searchPayload([suggestion])));

    await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), expected);
  });
}

void test("rejects malformed response-level fields", async () => {
  const payloads = [
    { suggestions: [], facets: {} },
    {
      queryId: "query-1",
      suggestions: [],
      facets: { "aws-docs-search-product": null, "aws-docs-search-guide": [] },
    },
    {
      queryId: "query-1",
      suggestions: [],
      facets: { "aws-docs-search-product": [], "aws-docs-search-guide": [1] },
    },
  ];

  for (const payload of payloads) {
    const fetcher = (): Promise<Response> => Promise.resolve(jsonResponse(JSON.stringify(payload)));
    await assert.rejects(
      searchAwsDocumentation({ query: "IAM" }, fetcher),
      /unexpected AWS documentation search response/,
    );
  }
});

void test("rejects a non-JSON search response", async () => {
  const fetcher = (): Promise<Response> => Promise.resolve(jsonResponse("not json"));

  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher),
    /returned non-JSON HTTP 200/,
  );
});

void test("reports an HTTP error without an upstream message", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse(JSON.stringify({ message: 400 }), { status: 400 }));

  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /returned HTTP 400$/);
});

void test("retries a thrown network error", async () => {
  let requests = 0;
  const fetcher = (): Promise<Response> => {
    requests += 1;
    if (requests === 1) throw new Error("temporary network failure");
    return Promise.resolve(jsonResponse());
  };

  const response = await searchAwsDocumentation({ query: "IAM" }, fetcher);

  assert.equal(requests, 2);
  assert.equal(response.queryId, "query-1");
});

void test("honors an HTTP-date Retry-After value", async () => {
  let requests = 0;
  const fetcher = (): Promise<Response> => {
    requests += 1;
    if (requests === 1) {
      return Promise.resolve(
        jsonResponse("{}", {
          status: 503,
          headers: { "retry-after": new Date(0).toUTCString() },
        }),
      );
    }
    return Promise.resolve(jsonResponse());
  };

  await searchAwsDocumentation({ query: "IAM" }, fetcher);
  assert.equal(requests, 2);
});

void test("returns the final retryable response after three attempts", async () => {
  let requests = 0;
  const fetcher = (): Promise<Response> => {
    requests += 1;
    return Promise.resolve(jsonResponse("{}", { status: 503, headers: { "retry-after": "0" } }));
  };

  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /returned HTTP 503/);
  assert.equal(requests, 3);
});

void test("rejects a declared oversized search response", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse("{}", { headers: { "content-length": "2097153" } }));

  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /2\.0MB limit/);
});

void test("rejects a streamed oversized search response", async () => {
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse("x".repeat(2 * 1024 * 1024 + 1)));

  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /2\.0MB limit/);
});

void test("downloads a direct document URL and removes its fragment", async () => {
  const suggestion = {
    textExcerptSuggestion: {
      ...DEFAULT_SUGGESTION.textExcerptSuggestion,
      link: "https://docs.aws.amazon.com/guide/page#section",
    },
  };
  const fetchedUrls: string[] = [];
  const fetcher = (input: string | URL): Promise<Response> => {
    fetchedUrls.push(input.toString());
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse(searchPayload([suggestion])));
    }
    return Promise.resolve(
      new Response("<p>Direct HTML</p>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
  };

  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );

  assert.equal(response.documents[0]?.fetchedUrl, "https://docs.aws.amazon.com/guide/page");
  assert.deepEqual(fetchedUrls, [
    "https://proxy.search.docs.aws.com/search",
    "https://docs.aws.amazon.com/guide/page",
  ]);
});

void test("records an unsupported document response without losing search results", async () => {
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse());
    }
    return Promise.resolve(new Response("unsupported", { status: 200 }));
  };

  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );

  assert.equal(response.results.length, 1);
  assert.deepEqual(response.documents, []);
  assert.match(response.documentErrors[0]?.error ?? "", /unsupported content type/);
});

void test("refreshes the cache when its TTL is zero", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pi-aws-zero-ttl-test-"));
  let documentRequests = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse());
    }
    documentRequests += 1;
    return Promise.resolve(
      new Response(`# request ${documentRequests}`, {
        headers: { "content-type": "text/markdown" },
      }),
    );
  };

  try {
    const input = { query: "IAM", download: 1, cacheTtlSeconds: 0 } as const;
    const first = await searchAwsDocumentation(input, fetcher, undefined, cacheDirectory);
    const second = await searchAwsDocumentation(input, fetcher, undefined, cacheDirectory);

    assert.equal(first.documents[0]?.cache, "miss");
    assert.equal(second.documents[0]?.cache, "miss");
    assert.equal(documentRequests, 2);
  } finally {
    await rm(cacheDirectory, { recursive: true });
  }
});

void test("formats complete non-truncated tool output", async (t) => {
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(jsonResponse());
    }
    return Promise.resolve(
      new Response("# Retrieved document", { headers: { "content-type": "text/markdown" } }),
    );
  };
  const tool = createAwsDocsSearchTool(fetcher);

  const result = await tool.execute(
    "tool-call",
    { query: "IAM", download: 1, noCache: true },
    undefined,
    undefined,
    {} as ExtensionContext,
  );
  const { fullOutputPath } = result.details;
  assert.ok(fullOutputPath);
  t.after(() => rm(dirname(fullOutputPath), { recursive: true, force: true }));
  const content = result.content[0];
  if (content?.type !== "text") assert.fail("tool result must contain text");

  assert.match(content.text, /1\. IAM least privilege/);
  assert.match(content.text, /Product: AWS Identity and Access Management/);
  assert.match(content.text, /### Source 1: IAM least privilege/);
  assert.match(content.text, /<aws-document-source format="markdown">/);
  assert.doesNotMatch(content.text, /Output truncated/);
});

void test("formats empty facets and document failures", async () => {
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search") {
      return Promise.resolve(
        jsonResponse(
          JSON.stringify({
            queryId: "query-1",
            suggestions: [DEFAULT_SUGGESTION],
            facets: {
              "aws-docs-search-guide": [],
              "aws-docs-search-product": [],
            },
          }),
        ),
      );
    }
    return Promise.resolve(new Response("missing", { status: 404 }));
  };
  const tool = createAwsDocsSearchTool(fetcher);

  const result = await tool.execute(
    "tool-call",
    { query: "IAM", download: 1, noCache: true },
    undefined,
    undefined,
    {} as ExtensionContext,
  );
  const content = result.content[0];
  if (content?.type !== "text") assert.fail("tool result must contain text");

  assert.match(content.text, /Products: none/);
  assert.match(content.text, /Guides: none/);
  assert.match(content.text, /Source 1 download failed/);
});

void test("formats an empty result set", async () => {
  const fetcher = (): Promise<Response> => Promise.resolve(jsonResponse(searchPayload([])));
  const tool = createAwsDocsSearchTool(fetcher);

  const result = await tool.execute(
    "tool-call",
    { query: "none" },
    undefined,
    undefined,
    {} as ExtensionContext,
  );
  const content = result.content[0];
  if (content?.type !== "text") assert.fail("tool result must contain text");
  assert.match(content.text, /No matching documentation found/);
});

void test("truncates oversized tool output and saves the full result", async () => {
  const oversizedSuggestion = {
    textExcerptSuggestion: {
      ...DEFAULT_SUGGESTION.textExcerptSuggestion,
      suggestionBody: `start-${"x".repeat(60_000)}-end`,
    },
  };
  const fetcher = (): Promise<Response> =>
    Promise.resolve(jsonResponse(searchPayload([oversizedSuggestion])));
  const tool = createAwsDocsSearchTool(fetcher);

  const result = await tool.execute(
    "tool-call",
    { query: "IAM" },
    undefined,
    undefined,
    {} as ExtensionContext,
  );
  const content = result.content[0];
  assert.equal(content?.type, "text");
  if (content?.type !== "text") assert.fail("tool result must contain text");
  assert.match(content.text, /Output truncated/);

  const details = result.details as { fullOutputPath?: string };
  assert.ok(details.fullOutputPath);
  assert.match(await readFile(details.fullOutputPath, "utf8"), /-end/);
  await rm(dirname(details.fullOutputPath), { recursive: true });
});

function redirectResponse(status: number, location: string | null, cancel: () => void): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(Uint8Array.of(0));
    },
    pull(controller) {
      controller.close();
    },
    cancel,
  });
  return new Response(body, { status, headers: location === null ? {} : { location } });
}

void test("blocks unsafe document redirects before requesting the destination", async () => {
  const locations = [
    "http://127.0.0.1:8765/internal",
    "http://docs.aws.amazon.com/insecure",
    "https://example.com/external",
    "//docs.aws.amazon.com.example.com/spoofed",
    "https://proxy.search.docs.aws.com/search",
    "https://docs.aws.amazon.com@evil.example/credentials",
    "https://user:password@docs.aws.amazon.com/private",
    "https://docs.aws.amazon.com:8443/other-port",
    "file:///etc/passwd",
    "https://[invalid",
    null,
  ];
  for (const location of locations) {
    const requests: Array<[string, RequestInit["redirect"]]> = [];
    let cancelled = 0;
    const fetcher = (input: string | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      requests.push([url, init?.redirect]);
      if (url.startsWith("https://proxy.search.docs.aws.com/")) {
        return Promise.resolve(jsonResponse());
      }
      if (!url.includes("/redirected/")) {
        const path = `/redirected/page.${url.endsWith(".md") ? "md" : "html"}`;
        return Promise.resolve(new Response(null, { status: 302, headers: { location: path } }));
      }
      return Promise.resolve(
        redirectResponse(307, location, () => {
          cancelled += 1;
        }),
      );
    };
    const response = await searchAwsDocumentation(
      { query: "IAM", download: 1, noCache: true },
      fetcher,
    );
    assert.deepEqual(
      requests,
      [
        ["https://proxy.search.docs.aws.com/search", "manual"],
        ["https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.md", "manual"],
        ["https://docs.aws.amazon.com/redirected/page.md", "manual"],
        [DEFAULT_SUGGESTION.textExcerptSuggestion.link, "manual"],
        ["https://docs.aws.amazon.com/redirected/page.html", "manual"],
      ],
      String(location),
    );
    assert.equal(cancelled, 2);
    assert.deepEqual(response.documents, []);
    assert.equal(response.documentErrors.length, 1);
    assert.match(
      response.documentErrors[0]?.error ?? "",
      /AWS docs host|link must be a URL|redirect.*Location/,
    );
  }
});

void test("follows AWS document redirects and caches the final validated URL", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pi-aws-redirect-test-"));
  try {
    for (const status of [301, 302, 303, 307, 308]) {
      const requests: string[] = [];
      const fetcher = (input: string | URL): Promise<Response> => {
        const url = input.toString();
        requests.push(url);
        if (url === "https://proxy.search.docs.aws.com/search")
          return Promise.resolve(jsonResponse());
        if (url.endsWith("best-practices.md")) {
          return Promise.resolve(
            new Response(null, {
              status,
              headers: { location: "./moved.md?locale=en_us#section" },
            }),
          );
        }
        if (url.includes("/moved.md")) {
          return Promise.resolve(
            new Response(null, {
              status,
              headers: { location: "//docs.aws.com:443/final.md?locale=en_us#section" },
            }),
          );
        }
        return Promise.resolve(
          new Response("# Final AWS source", {
            headers: { "content-type": "text/markdown" },
          }),
        );
      };
      const first = await searchAwsDocumentation(
        { query: "IAM", download: 1, cacheTtlSeconds: 0 },
        fetcher,
        undefined,
        cacheDirectory,
      );
      const second = await searchAwsDocumentation(
        { query: "IAM", download: 1 },
        fetcher,
        undefined,
        cacheDirectory,
      );
      assert.deepEqual(requests, [
        "https://proxy.search.docs.aws.com/search",
        "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.md",
        "https://docs.aws.amazon.com/IAM/latest/UserGuide/moved.md?locale=en_us",
        "https://docs.aws.com/final.md?locale=en_us",
        "https://proxy.search.docs.aws.com/search",
      ]);
      assert.equal(first.documents[0]?.cache, "miss");
      assert.equal(first.documents[0]?.fetchedUrl, "https://docs.aws.com/final.md?locale=en_us");
      assert.equal(first.documents[0]?.searchUrl, DEFAULT_SUGGESTION.textExcerptSuggestion.link);
      assert.deepEqual(second.documents, [{ ...first.documents[0], cache: "hit" }]);
    }
  } finally {
    await rm(cacheDirectory, { recursive: true });
  }
});

void test("records the final URL when the HTML fallback redirects", async () => {
  const fetcher = (input: string | URL): Promise<Response> => {
    const url = input.toString();
    if (url === "https://proxy.search.docs.aws.com/search") return Promise.resolve(jsonResponse());
    if (url.endsWith(".md")) return Promise.resolve(new Response(null, { status: 404 }));
    if (url.endsWith("best-practices.html")) {
      return Promise.resolve(
        new Response(null, { status: 302, headers: { location: "/final.html" } }),
      );
    }
    return Promise.resolve(
      new Response("<p>Final AWS source</p>", {
        headers: { "content-type": "text/html" },
      }),
    );
  };
  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );
  assert.equal(response.documents[0]?.fetchedUrl, "https://docs.aws.amazon.com/final.html");
  assert.equal(response.documents[0]?.format, "html");
});

void test("bounds document redirect loops without retrying policy failures", async () => {
  let documentRequests = 0;
  let cancelled = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search")
      return Promise.resolve(jsonResponse());
    documentRequests += 1;
    return Promise.resolve(
      redirectResponse(302, input.toString(), () => {
        cancelled += 1;
      }),
    );
  };
  const response = await searchAwsDocumentation(
    { query: "IAM", download: 1, noCache: true },
    fetcher,
  );
  assert.equal(documentRequests, 12); // Original + five hops, for Markdown and HTML.
  assert.equal(cancelled, documentRequests);
  assert.deepEqual(response.documents, []);
  assert.match(response.documentErrors[0]?.error ?? "", /exceeded 5 redirects/);
});

void test("rejects search redirects without forwarding POST inputs", async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    for (const location of [
      "/other-search",
      "http://127.0.0.1/internal",
      "https://docs.aws.com/page",
    ]) {
      const requests: Array<[string, RequestInit["redirect"]]> = [];
      let cancelled = 0;
      const fetcher = (input: string | URL, init?: RequestInit): Promise<Response> => {
        requests.push([input.toString(), init?.redirect]);
        return Promise.resolve(
          redirectResponse(status, location, () => {
            cancelled += 1;
          }),
        );
      };
      await assert.rejects(
        searchAwsDocumentation(
          { query: "IAM", identity: "test-identity", session: "test-session" },
          fetcher,
        ),
        /AWS documentation search redirects are not allowed/,
      );
      assert.deepEqual(requests, [
        ["https://proxy.search.docs.aws.com/search?session=test-session", "manual"],
      ]);
      assert.equal(cancelled, 1);
    }
  }
});

void test("refetches cache entries written before redirect validation", async () => {
  const cacheDirectory = await mkdtemp(join(tmpdir(), "pi-aws-legacy-cache-test-"));
  let documentRequests = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    if (input.toString() === "https://proxy.search.docs.aws.com/search")
      return Promise.resolve(jsonResponse());
    documentRequests += 1;
    return Promise.resolve(
      new Response(`# request ${documentRequests}`, {
        headers: { "content-type": "text/markdown" },
      }),
    );
  };
  try {
    const input = { query: "IAM", download: 1 };
    await searchAwsDocumentation(input, fetcher, undefined, cacheDirectory);
    const [entry] = await readdir(cacheDirectory);
    assert.ok(entry);
    const path = join(cacheDirectory, entry, "metadata.json");
    const metadata = JSON.parse(await readFile(path, "utf8")) as { version: number };
    metadata.version = 1;
    await writeFile(path, JSON.stringify(metadata));
    const response = await searchAwsDocumentation(input, fetcher, undefined, cacheDirectory);
    assert.equal(documentRequests, 2);
    assert.equal(response.documents[0]?.cache, "miss");
    assert.equal(response.documents[0]?.content, "# request 2");
  } finally {
    await rm(cacheDirectory, { recursive: true });
  }
});
