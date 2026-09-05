import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";

import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  SessionManager,
  truncateHead,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

import {
  createAwsDocsSearchTool,
  searchAwsDocumentation,
  type AwsDocsSearchInput,
  type Fetcher,
} from "../src/index.ts";
import { DEFAULT_SUGGESTION, jsonResponse, searchPayload } from "./helpers.ts";

const SEARCH_URL = "https://proxy.search.docs.aws.com/search";
const INPUT = { query: "IAM", download: 1, noCache: true };

async function execute(t: TestContext, fetcher: Fetcher, input: AwsDocsSearchInput = INPUT) {
  const result = await createAwsDocsSearchTool(fetcher).execute(
    "output-test",
    input,
    undefined,
    undefined,
    {} as ExtensionContext,
  );
  const details = result.details;
  const { fullOutputPath } = details;
  if (fullOutputPath)
    t.after(() => fs.rm(dirname(fullOutputPath), { recursive: true, force: true }));
  return { ...result, details };
}

for (const truncated of [false, true]) {
  void test(`keeps ${truncated ? "truncated" : "non-truncated"} document details metadata-only and saves complete output`, async (t) => {
    for (const format of ["markdown", "html"]) {
      for (const body of truncated
        ? [`${"BODY_BYTE_LIMIT 線🦄 ".repeat(4)}\n`.repeat(1000), "BODY_LINE_LIMIT\n".repeat(2100)]
        : ["", "Full source: 線🦄\nLast line"]) {
        const fetcher: Fetcher = (input) => {
          const url = input.toString();
          if (url === SEARCH_URL) return Promise.resolve(jsonResponse());
          if (format === "html" && url.endsWith(".md"))
            return Promise.resolve(new Response(null, { status: 404 }));
          return Promise.resolve(
            new Response(body, { headers: { "content-type": `text/${format}; charset=utf-8` } }),
          );
        };
        const result = await execute(t, fetcher);
        const { details } = result;
        assert.equal(details.documents.length, 1);
        assert.equal(Object.hasOwn(details.documents[0]!, "content"), false);
        assert.deepEqual(details.documents[0], {
          rank: 1,
          searchUrl: DEFAULT_SUGGESTION.textExcerptSuggestion.link,
          fetchedUrl: DEFAULT_SUGGESTION.textExcerptSuggestion.link.replace(
            /\.html$/,
            format === "markdown" ? ".md" : ".html",
          ),
          format,
          contentType: `text/${format}; charset=utf-8`,
          cache: "disabled",
        });
        assert.deepEqual(details.documentErrors, []);
        assert.ok(details.fullOutputPath);
        const full = await fs.readFile(details.fullOutputPath, "utf8");
        assert.ok(
          full.includes(
            `<aws-document-source format="${format}">\n${body}\n</aws-document-source>`,
          ),
        );
        assert.ok(full.endsWith("</aws-document-source>"));
        const text = result.content[0];
        assert.ok(text?.type === "text");
        assert.ok(text.text.includes(`Full output: ${details.fullOutputPath}`));
        const { content, ...metadata } = truncateHead(full);
        assert.equal(metadata.truncated, truncated);
        assert.ok(text.text.startsWith(content));
        if (truncated) {
          assert.deepEqual(details.truncation, metadata);
          assert.equal(
            metadata.truncatedBy,
            body.startsWith("BODY_BYTE_LIMIT") ? "bytes" : "lines",
          );
          assert.equal(Object.hasOwn(details.truncation, "content"), false);
          assert.match(text.text, /Output truncated/);
          assert.ok(metadata.outputBytes <= DEFAULT_MAX_BYTES);
          assert.ok(metadata.outputLines <= DEFAULT_MAX_LINES);
        } else {
          assert.equal(details.truncation, undefined);
          assert.doesNotMatch(text.text, /Output truncated/);
        }
        assert.ok(Buffer.byteLength(JSON.stringify(details)) < 4096);
      }
    }
  });
}

void test("session persistence and reload retain metadata, not MiB-sized document bodies", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-output-session-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const sizes: number[] = [];
  for (const bytes of [1024 * 1024, 5 * 1024 * 1024]) {
    const body = `BODY_ONLY_START${"x".repeat(bytes - 64)}BODY_ONLY_END`;
    const fetcher: Fetcher = (input) =>
      Promise.resolve(
        input.toString() === SEARCH_URL
          ? jsonResponse()
          : new Response(body, { headers: { "content-type": "text/markdown" } }),
      );
    // The standalone API still exposes the full body and does not add tool-only fields.
    const response = await searchAwsDocumentation(INPUT, fetcher);
    assert.equal(response.documents[0]?.content, body);
    assert.equal(Object.hasOwn(response, "fullOutputPath"), false);
    const result = await execute(t, fetcher);
    const manager = SessionManager.create(directory, directory);
    manager.appendMessage({
      role: "assistant",
      content: [{ type: "toolCall", id: "output-test", name: "aws_docs_search", arguments: INPUT }],
      api: "test",
      provider: "test",
      model: "test",
      stopReason: "toolUse",
      timestamp: 0,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
    });
    const id = manager.appendMessage({
      role: "toolResult",
      toolCallId: "output-test",
      toolName: "aws_docs_search",
      ...result,
      isError: false,
      timestamp: 0,
    });
    const path = manager.getSessionFile();
    assert.ok(path);
    const persisted = await fs.readFile(path, "utf8");
    assert.ok(Buffer.byteLength(persisted) < 8192, "session must not contain the oversized body");
    assert.doesNotMatch(persisted, /BODY_ONLY_START|BODY_ONLY_END/);
    sizes.push(Buffer.byteLength(JSON.stringify(result.details)));
    const entry = SessionManager.open(path, directory).getEntry(id);
    assert.ok(entry?.type === "message" && entry.message.role === "toolResult");
    assert.deepEqual(entry.message.details, result.details);
    const restored = entry.message.details;
    assert.ok(restored.fullOutputPath);
    assert.ok((await fs.readFile(restored.fullOutputPath, "utf8")).includes(body));
  }
  assert.ok(Math.abs(sizes[1]! - sizes[0]!) < 100, "only path/counter sizes may change");
});

void test("ten maximum-sized documents remain accessible without bloating tool details", async (t) => {
  const body = "x".repeat(5 * 1024 * 1024);
  const suggestions = Array.from({ length: 10 }, (_, index) => ({
    textExcerptSuggestion: {
      ...DEFAULT_SUGGESTION.textExcerptSuggestion,
      link: `https://docs.aws.com/source-${index + 1}.html`,
    },
  }));
  let requests = 0;
  const fetcher: Fetcher = (input) => {
    requests += 1;
    return Promise.resolve(
      input.toString() === SEARCH_URL
        ? jsonResponse(searchPayload(suggestions))
        : new Response(body, { headers: { "content-type": "text/markdown" } }),
    );
  };
  const result = await execute(t, fetcher, { ...INPUT, download: 10 });
  assert.equal(requests, 11);
  assert.equal(result.details.documents.length, 10);
  assert.ok(Buffer.byteLength(JSON.stringify(result.details)) < 16 * 1024);
  assert.deepEqual(
    result.details.documents.map((document) => document.rank),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.ok(result.details.fullOutputPath);
  const full = await fs.readFile(result.details.fullOutputPath, "utf8");
  assert.equal(full.split(body).length - 1, 10);
  assert.ok(full.endsWith("</aws-document-source>"));
});

void test("search-only and failed-download details stay intact without creating output files", async (t) => {
  for (const download of [0, 1]) {
    const fetcher: Fetcher = (input) =>
      Promise.resolve(
        input.toString() === SEARCH_URL ? jsonResponse() : new Response(null, { status: 404 }),
      );
    const input = { ...INPUT, download };
    const result = await execute(t, fetcher, input);
    assert.equal(result.details.fullOutputPath, undefined);
    assert.deepEqual(result.details, await searchAwsDocumentation(input, fetcher));
    assert.equal(result.details.documentErrors.length, download);
  }
});

void test("distinguishes hidden suggestions from no matches and downloads only included results", async (t) => {
  for (const count of [0, 3]) {
    for (const limit of [0, 1]) {
      const suggestions = Array.from({ length: count }, (_, index) => ({
        textExcerptSuggestion: {
          ...DEFAULT_SUGGESTION.textExcerptSuggestion,
          link: `https://docs.aws.com/source-${index + 1}.html`,
        },
      }));
      const requests: string[] = [];
      const fetcher: Fetcher = (input) => {
        requests.push(input.toString());
        return Promise.resolve(
          input.toString() === SEARCH_URL
            ? jsonResponse(searchPayload(suggestions))
            : new Response("# Source", { headers: { "content-type": "text/markdown" } }),
        );
      };
      const result = await execute(t, fetcher, { ...INPUT, maxResults: 3, limit });
      const included = Math.min(count, limit);
      const text = result.content[0];
      assert.ok(text?.type === "text");
      assert.ok(text.text.includes(`Returned ${count} suggestion(s); included ${included}.`));
      assert.equal(text.text.includes("No matching documentation found."), count === 0);
      assert.equal(
        text.text.includes("No results displayed (limit: 0)."),
        count > 0 && limit === 0,
      );
      assert.equal(result.details.suggestionsReturned, count);
      assert.equal(result.details.results.length, included);
      assert.equal(result.details.documents.length, included);
      assert.deepEqual(result.details.documentErrors, []);
      assert.deepEqual(result.details.facets.products, ["AWS Identity and Access Management"]);
      assert.deepEqual(result.details.facets.guides, ["User Guide"]);
      assert.deepEqual(
        requests,
        included ? [SEARCH_URL, "https://docs.aws.com/source-1.md"] : [SEARCH_URL],
      );
      if (included === 0) assert.equal(result.details.fullOutputPath, undefined);
    }
  }
});

void test("cancellation as full-output writing finishes cannot return success", async (t) => {
  const writeFile = fs.writeFile;
  try {
    for (const bytes of [10, 60_000]) {
      const controller = new AbortController();
      const reason = new Error("cancelled while saving full output");
      t.mock.method(fs, "writeFile", async (...args: Parameters<typeof fs.writeFile>) => {
        const path = args[0];
        assert.ok(typeof path === "string");
        t.after(() => fs.rm(dirname(path), { recursive: true, force: true }));
        await writeFile(...args);
        controller.abort(reason);
      });
      syncBuiltinESMExports();
      const tool = createAwsDocsSearchTool((input) =>
        Promise.resolve(
          input.toString() === SEARCH_URL
            ? jsonResponse()
            : new Response("x".repeat(bytes), { headers: { "content-type": "text/markdown" } }),
        ),
      );
      await assert.rejects(
        tool.execute("output-abort", INPUT, controller.signal, undefined, {} as ExtensionContext),
        (error) => error === reason,
      );
    }
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});

void test("output persistence failures reject rather than returning bodies or an unusable path", async (t) => {
  try {
    const failure = new Error("EACCES: cannot create full-output directory");
    t.mock.method(fs, "mkdtemp", () => Promise.reject(failure));
    syncBuiltinESMExports();
    for (const bytes of [10, 60_000]) {
      const fetcher: Fetcher = (input) =>
        Promise.resolve(
          input.toString() === SEARCH_URL
            ? jsonResponse()
            : new Response("x".repeat(bytes), { headers: { "content-type": "text/markdown" } }),
        );
      await assert.rejects(execute(t, fetcher), (error) => error === failure);
    }
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
