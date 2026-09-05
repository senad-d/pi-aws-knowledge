import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getEventListeners } from "node:events";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test, { type TestContext } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";

import { withFileMutationQueue, type ExtensionContext } from "@earendil-works/pi-coding-agent";

import {
  createAwsDocsSearchTool,
  searchAwsDocumentation,
  type AwsDocsSearchToolDetails,
} from "../src/index.ts";
import { DEFAULT_SUGGESTION, jsonResponse, searchPayload } from "./helpers.ts";

const SEARCH_URL = "https://proxy.search.docs.aws.com/search";
const SOURCE_URL = DEFAULT_SUGGESTION.textExcerptSuggestion.link;
const ENTRY_KEY = createHash("sha256").update(SOURCE_URL).digest("hex");
const INPUT = { query: "IAM", download: 1 };
const realOpen = fs.open;
const realWriteFile = fs.writeFile;
const realReadFile = fs.readFile;
const realRealpath = fs.realpath;
const realStat = fs.stat;
const realMkdir = fs.mkdir;
const realRename = fs.rename;

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function rejectsPromptly(operation: Promise<unknown>, reason: unknown): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await assert.rejects(
      Promise.race([
        operation,
        new Promise((resolve) => {
          timer = setTimeout(resolve, 250);
        }),
      ]),
      (error) => error === reason,
    );
  } finally {
    clearTimeout(timer);
  }
}

function sourceFetcher(input: string | URL): Promise<Response> {
  return Promise.resolve(
    input.toString() === SEARCH_URL
      ? jsonResponse()
      : new Response("# Source", {
          headers: { "content-type": "text/markdown" },
        }),
  );
}

function restoreFsMocks(t: TestContext): void {
  t.mock.restoreAll();
  syncBuiltinESMExports();
}

async function snapshot(directory: string): Promise<Record<string, Buffer>> {
  const files: Record<string, Buffer> = {};
  for (const name of await fs.readdir(directory))
    files[name] = await fs.readFile(join(directory, name));
  return files;
}

void test("keeps multiple Markdown or HTML downloads when the cache path is unavailable", async () => {
  for (const format of ["markdown", "html"]) {
    const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-unavailable-"));
    const blocked = join(directory, "blocked");
    await fs.writeFile(blocked, "keep this file");
    const fetcher = (input: string | URL): Promise<Response> => {
      const url = input.toString();
      if (url === SEARCH_URL)
        return Promise.resolve(
          jsonResponse(
            searchPayload([
              DEFAULT_SUGGESTION,
              {
                textExcerptSuggestion: {
                  ...DEFAULT_SUGGESTION.textExcerptSuggestion,
                  link: "https://docs.aws.com/other.html",
                },
              },
            ]),
          ),
        );
      if (format === "html" && url.endsWith(".md"))
        return Promise.resolve(new Response(null, { status: 404 }));
      return Promise.resolve(
        new Response(`Full ${format} source`, { headers: { "content-type": `text/${format}` } }),
      );
    };
    try {
      const result = await searchAwsDocumentation(
        { ...INPUT, download: 2 },
        fetcher,
        undefined,
        join(blocked, "cache"),
      );
      assert.equal(result.results.length, 2);
      assert.equal(result.documents.length, 2);
      assert.deepEqual(result.documentErrors, []);
      for (const document of result.documents) {
        assert.equal(document.content, `Full ${format} source`);
        assert.equal(document.format, format);
        assert.equal(document.cache, "error");
        assert.match(document.cacheWarning ?? "", /ENOTDIR/);
      }
      assert.equal(await fs.readFile(blocked, "utf8"), "keep this file");
      assert.deepEqual(await fs.readdir(directory), ["blocked"]);
    } finally {
      await fs.rm(directory, { recursive: true });
    }
  }
});

void test("interrupted writes preserve old entries, remove owned files, and allow later refresh", async (t) => {
  for (const warm of [false, true]) {
    for (const stage of ["body", "metadata", "publish", "body-close", "body-and-close"]) {
      const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-write-"));
      const entry = join(directory, ENTRY_KEY);
      let content = "# Old source";
      let documentRequests = 0;
      let failures = 0;
      const fetcher = (input: string | URL): Promise<Response> => {
        if (input.toString() === SEARCH_URL) return Promise.resolve(jsonResponse());
        documentRequests += 1;
        return Promise.resolve(
          new Response(content, { headers: { "content-type": "text/markdown" } }),
        );
      };
      try {
        if (warm) await searchAwsDocumentation(INPUT, fetcher, undefined, directory);
        await fs.mkdir(entry, { recursive: true });
        await fs.writeFile(join(entry, "unrelated.tmp"), "do not delete");
        const before = await snapshot(entry);
        content = "# New source";
        if (stage === "publish") {
          t.mock.method(fs, "rename", () => {
            failures += 1;
            return Promise.reject(new Error("injected publish failure"));
          });
        } else {
          t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
            const handle = await realOpen(...args);
            const name = basename(String(args[0]));
            if (
              (stage.startsWith("body") && name.startsWith("body.")) ||
              (stage === "metadata" && name.startsWith("metadata.json."))
            ) {
              if (stage !== "body-close") {
                const write = handle.writeFile.bind(handle);
                t.mock.method(handle, "writeFile", async () => {
                  await write("partial write", "utf8");
                  failures += 1;
                  throw new Error(`injected ${stage} failure`);
                });
              }
              if (stage.endsWith("-close")) {
                const close = handle.close.bind(handle);
                t.mock.method(handle, "close", async () => {
                  await close();
                  if (stage === "body-close") {
                    failures += 1;
                    throw new Error(`injected ${stage} failure`);
                  }
                  throw new Error("close failure must not mask the write failure");
                });
              }
            }
            return handle;
          });
        }
        syncBuiltinESMExports();
        const result = await searchAwsDocumentation(
          { ...INPUT, cacheTtlSeconds: 0 },
          fetcher,
          undefined,
          directory,
        );
        assert.equal(failures, 1, `${stage}, warm=${warm}`);
        assert.deepEqual(
          await snapshot(entry),
          before,
          "failed publication must leave the old entry and unrelated files intact",
        );
        assert.equal(result.documents[0]?.content, content);
        assert.equal(result.documents[0]?.cache, "error");
        assert.equal(result.documents[0]?.cacheWarning, `injected ${stage} failure`);
        assert.deepEqual(result.documentErrors, []);
        restoreFsMocks(t);
        if (warm) {
          const requestsBeforeHit = documentRequests;
          const hit = await searchAwsDocumentation(INPUT, fetcher, undefined, directory);
          assert.equal(hit.documents[0]?.cache, "hit");
          assert.equal(hit.documents[0]?.content, "# Old source");
          assert.equal(documentRequests, requestsBeforeHit);
        }
        const refresh = await searchAwsDocumentation(
          { ...INPUT, cacheTtlSeconds: 0 },
          fetcher,
          undefined,
          directory,
        );
        assert.equal(refresh.documents[0]?.cache, "miss");
        assert.equal(refresh.documents[0]?.cacheWarning, undefined);
        const hit = await searchAwsDocumentation(INPUT, fetcher, undefined, directory);
        assert.equal(hit.documents[0]?.cache, "hit");
        assert.equal(hit.documents[0]?.content, content);
        assert.equal((await fs.readdir(entry)).length, 3); // Active body, metadata, unrelated file.
      } finally {
        restoreFsMocks(t);
        await fs.rm(directory, { recursive: true });
      }
    }
  }
});

void test("cleanup failures cannot replace the cache-write warning or destroy the old entry", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-cleanup-"));
  try {
    await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
    t.mock.method(fs, "rename", () => Promise.reject(new Error("publish failed")));
    t.mock.method(fs, "unlink", () => Promise.reject(new Error("cleanup failed")));
    syncBuiltinESMExports();
    const result = await searchAwsDocumentation(
      { ...INPUT, cacheTtlSeconds: 0 },
      sourceFetcher,
      undefined,
      directory,
    );
    assert.equal(result.documents[0]?.content, "# Source");
    assert.equal(result.documents[0]?.cache, "error");
    assert.equal(result.documents[0]?.cacheWarning, "publish failed");
    restoreFsMocks(t);
    const hit = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
    assert.equal(hit.documents[0]?.cache, "hit");
    assert.equal(hit.documents[0]?.content, "# Source");
  } finally {
    restoreFsMocks(t);
    await fs.rm(directory, { recursive: true });
  }
});

void test("exclusive cache creation never overwrites or cleans up a pre-existing file", async (t) => {
  for (const prefix of ["body.", "metadata.json."]) {
    const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-collision-"));
    let foreignPath = "";
    try {
      t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
        const path = String(args[0]);
        if (basename(path).startsWith(prefix)) {
          foreignPath = path;
          await realWriteFile(path, "unrelated existing file");
        }
        return realOpen(...args);
      });
      syncBuiltinESMExports();
      const result = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
      assert.equal(result.documents[0]?.content, "# Source");
      assert.equal(result.documents[0]?.cache, "error");
      assert.match(result.documents[0]?.cacheWarning ?? "", /EEXIST/);
      assert.ok(foreignPath);
      assert.equal(await fs.readFile(foreignPath, "utf8"), "unrelated existing file");
      assert.deepEqual(await fs.readdir(join(directory, ENTRY_KEY)), [basename(foreignPath)]);
    } finally {
      restoreFsMocks(t);
      await fs.rm(directory, { recursive: true });
    }
  }
});

void test("cache queue setup failures preserve content and render a bounded warning", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-queue-"));
  const previous = process.env.AWS_DOCS_CACHE_DIR;
  let requests = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    requests += 1;
    return sourceFetcher(input);
  };
  try {
    process.env.AWS_DOCS_CACHE_DIR = directory;
    t.mock.method(fs, "realpath", (...args: Parameters<typeof fs.realpath>) =>
      typeof args[0] === "string" && args[0].startsWith(directory)
        ? Promise.reject(
            Object.assign(new Error(`EACCES: ${"x".repeat(1000)}`), { code: "EACCES" }),
          )
        : realRealpath(...args),
    );
    syncBuiltinESMExports();
    const result = await createAwsDocsSearchTool(fetcher).execute(
      "cache-test",
      INPUT,
      undefined,
      undefined,
      {} as ExtensionContext,
    );
    assert.equal(requests, 2);
    const details = result.details as AwsDocsSearchToolDetails;
    const { fullOutputPath } = details;
    assert.ok(fullOutputPath);
    t.after(() => fs.rm(dirname(fullOutputPath), { recursive: true, force: true }));
    assert.match(await fs.readFile(fullOutputPath, "utf8"), /# Source/);
    assert.equal(Object.hasOwn(details.documents[0]!, "content"), false);
    assert.equal(details.documents[0]?.cache, "error");
    assert.equal(details.documents[0]?.cacheWarning?.length, 500);
    assert.deepEqual(details.documentErrors, []);
    const text = result.content[0];
    assert.equal(text?.type, "text");
    if (text?.type !== "text") assert.fail("text output required");
    assert.match(text.text, /Cache: error/);
    assert.match(text.text, /Cache warning: EACCES:/);
    assert.match(text.text, /# Source/);
    assert.deepEqual(await fs.readdir(directory), []);
  } finally {
    restoreFsMocks(t);
    if (previous === undefined) delete process.env.AWS_DOCS_CACHE_DIR;
    else process.env.AWS_DOCS_CACHE_DIR = previous;
    await fs.rm(directory, { recursive: true });
  }
});

void test("separates a failed cache write from successful caching and real download failures", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-mixed-"));
  let documentRequests = 0;
  const fetcher = (input: string | URL): Promise<Response> => {
    const url = input.toString();
    if (url === SEARCH_URL)
      return Promise.resolve(
        jsonResponse(
          searchPayload([
            DEFAULT_SUGGESTION,
            ...["other", "missing"].map((page) => ({
              textExcerptSuggestion: {
                ...DEFAULT_SUGGESTION.textExcerptSuggestion,
                link: `https://docs.aws.com/${page}.html`,
              },
            })),
          ]),
        ),
      );
    documentRequests += 1;
    return url.includes("/missing.")
      ? Promise.resolve(new Response(null, { status: 404 }))
      : sourceFetcher(input);
  };
  try {
    t.mock.method(fs, "open", (...args: Parameters<typeof fs.open>) =>
      String(args[0]).includes(ENTRY_KEY)
        ? Promise.reject(new Error("EACCES: cache write denied"))
        : realOpen(...args),
    );
    syncBuiltinESMExports();
    const result = await searchAwsDocumentation(
      { ...INPUT, download: 3 },
      fetcher,
      undefined,
      directory,
    );
    assert.deepEqual(
      result.documents.map((document) => [document.rank, document.cache, document.content]),
      [
        [1, "error", "# Source"],
        [2, "miss", "# Source"],
      ],
    );
    assert.equal(result.documents[0]?.cacheWarning, "EACCES: cache write denied");
    assert.equal(result.documents[1]?.cacheWarning, undefined);
    assert.equal(result.documentErrors.length, 1);
    assert.equal(result.documentErrors[0]?.rank, 3);
    assert.match(result.documentErrors[0]?.error ?? "", /HTTP 404/);
    assert.equal(documentRequests, 4);
  } finally {
    restoreFsMocks(t);
    await fs.rm(directory, { recursive: true });
  }
});

void test("does not turn caller cancellation during a failed write into a cache warning", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-abort-"));
  const controller = new AbortController();
  const reason = new Error("cancelled during cache write");
  try {
    t.mock.method(fs, "rename", () => {
      controller.abort(reason);
      return Promise.reject(new Error("write interrupted"));
    });
    syncBuiltinESMExports();
    await assert.rejects(
      searchAwsDocumentation(INPUT, sourceFetcher, controller.signal, directory),
      (error) => error === reason,
    );
    // The caller stops waiting immediately; the queued owner still finishes cleanup.
    await withFileMutationQueue(join(directory, ENTRY_KEY, "body"), () => Promise.resolve());
    assert.deepEqual(await fs.readdir(join(directory, ENTRY_KEY)), []);
  } finally {
    restoreFsMocks(t);
    await withFileMutationQueue(join(directory, ENTRY_KEY, "body"), () => Promise.resolve());
    await fs.rm(directory, { recursive: true });
  }
});

void test("reuses version-2 entries and migrates them only after a successful refresh", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-v2-"));
  const entry = join(directory, ENTRY_KEY);
  try {
    await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
    const metadataPath = join(entry, "metadata.json");
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8")) as Record<string, unknown>;
    if (typeof metadata.bodyFile === "string")
      await fs.rename(join(entry, metadata.bodyFile), join(entry, "body"));
    metadata.version = 2;
    delete metadata.bodyFile;
    await fs.writeFile(metadataPath, JSON.stringify(metadata));
    const hit = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
    assert.equal(hit.documents[0]?.cache, "hit");
    assert.equal(hit.documents[0]?.content, "# Source");
    const refreshed = await searchAwsDocumentation(
      { ...INPUT, cacheTtlSeconds: 0 },
      sourceFetcher,
      undefined,
      directory,
    );
    assert.equal(refreshed.documents[0]?.cache, "miss");
    const updated = JSON.parse(await fs.readFile(metadataPath, "utf8")) as Record<string, unknown>;
    assert.equal(updated.version, 3);
    assert.ok(typeof updated.bodyFile === "string");
    assert.equal((await fs.readdir(entry)).includes("body"), false);
    assert.equal((await fs.stat(join(entry, updated.bodyFile))).mode & 0o777, 0o600);
    assert.equal((await fs.stat(metadataPath)).mode & 0o777, 0o600);
  } finally {
    await fs.rm(directory, { recursive: true });
  }
});

void test("corrupt bodies and unsafe metadata trigger safe refetch and recovery", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-integrity-"));
  const entry = join(directory, ENTRY_KEY);
  const outside = join(directory, "keep.txt");
  try {
    await fs.writeFile(outside, "# Source");
    for (const fault of ["checksum", "size", "url", "../keep.txt", outside]) {
      await searchAwsDocumentation(
        { ...INPUT, cacheTtlSeconds: 0 },
        sourceFetcher,
        undefined,
        directory,
      );
      const path = join(entry, "metadata.json");
      const metadata = JSON.parse(await fs.readFile(path, "utf8")) as Record<string, unknown>;
      if (fault === "checksum") {
        assert.ok(typeof metadata.bodyFile === "string");
        await fs.writeFile(join(entry, metadata.bodyFile), "# Broken");
      } else if (fault === "size") metadata.bytes = 1;
      else if (fault === "url") metadata.fetchedUrl = "https://example.com/blocked";
      else metadata.bodyFile = fault;
      await fs.writeFile(path, JSON.stringify(metadata));
      const result = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
      assert.equal(result.documents[0]?.cache, "miss", fault);
      assert.equal(result.documents[0]?.content, "# Source");
      assert.equal(
        (await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory)).documents[0]
          ?.cache,
        "hit",
      );
      assert.equal(await fs.readFile(outside, "utf8"), "# Source");
    }
  } finally {
    await fs.rm(directory, { recursive: true });
  }
});

void test("cancels a cache waiter promptly and skips its I/O when the held queue is released", async (t) => {
  for (const warm of [false, true]) {
    for (const reason of [
      undefined,
      "cancelled cache waiter",
      new Error("cancelled cache waiter"),
    ]) {
      const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-wait-"));
      const key = join(directory, ENTRY_KEY, "body");
      const held = gate();
      const entered = gate();
      const registered = gate();
      const controller = new AbortController();
      if (warm)
        controller.signal.addEventListener("abort", (event) => event.stopImmediatePropagation(), {
          once: true,
        });
      let holder = Promise.resolve();
      let requests = 0;
      try {
        if (warm) await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
        holder = withFileMutationQueue(key, () => {
          entered.release();
          return held.promise;
        });
        await entered.promise;
        t.mock.method(fs, "realpath", (...args: Parameters<typeof fs.realpath>) => {
          registered.release();
          return realRealpath(...args);
        });
        const reads = t.mock.method(fs, "readFile");
        const writes = t.mock.method(fs, "open");
        syncBuiltinESMExports();
        const operation = searchAwsDocumentation(
          INPUT,
          (input) => {
            requests += 1;
            return sourceFetcher(input);
          },
          controller.signal,
          directory,
        );
        await registered.promise;
        // Pi serializes registration globally; a different key is a registration barrier.
        await withFileMutationQueue(join(directory, "barrier"), () => Promise.resolve());
        controller.abort(reason);
        await rejectsPromptly(operation, controller.signal.reason);
        assert.equal(getEventListeners(controller.signal, "abort").length, 0);
        held.release();
        await holder;
        await withFileMutationQueue(key, () => Promise.resolve());
        assert.equal(requests, 1, "cancelled work must not fetch a document");
        assert.equal(reads.mock.callCount(), 0, "cancelled work must not read the cache");
        assert.equal(writes.mock.callCount(), 0, "cancelled work must not write the cache");
      } finally {
        held.release();
        restoreFsMocks(t);
        await holder;
        await withFileMutationQueue(key, () => Promise.resolve());
        await fs.rm(directory, { recursive: true });
      }
    }
  }
});

void test("cancels during queue registration and observes a later setup failure without fetching", async (t) => {
  for (const fails of [false, true]) {
    const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-registration-"));
    const key = join(directory, ENTRY_KEY, "body");
    const entered = gate();
    const held = gate();
    const controller = new AbortController();
    const reason = new Error("cancelled during registration");
    let requests = 0;
    try {
      t.mock.method(fs, "realpath", async (...args: Parameters<typeof fs.realpath>) => {
        entered.release();
        await held.promise;
        if (fails) throw Object.assign(new Error("late queue failure"), { code: "EACCES" });
        return realRealpath(...args);
      });
      syncBuiltinESMExports();
      const operation = searchAwsDocumentation(
        INPUT,
        (input) => {
          requests += 1;
          return sourceFetcher(input);
        },
        controller.signal,
        directory,
      );
      await entered.promise;
      controller.abort(reason);
      await rejectsPromptly(operation, reason);
      held.release();
      restoreFsMocks(t);
      await withFileMutationQueue(key, () => Promise.resolve());
      assert.equal(requests, 1);
      assert.deepEqual(await fs.readdir(directory), []);
      assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    } finally {
      held.release();
      restoreFsMocks(t);
      await withFileMutationQueue(key, () => Promise.resolve());
      await fs.rm(directory, { recursive: true });
    }
  }
});

void test("cache read cancellation keeps the queue until I/O settles and starts no later I/O", async (t) => {
  for (const stage of ["metadata", "stat", "body"]) {
    for (const fails of [false, true]) {
      const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-read-abort-"));
      const key = join(directory, ENTRY_KEY, "body");
      const entered = gate();
      const held = gate();
      const controller = new AbortController();
      const reason = new Error(`cancelled during ${stage}`);
      let requests = 0;
      let nextStarted = false;
      try {
        await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
        const reads = t.mock.method(
          fs,
          "readFile",
          async (...args: Parameters<typeof fs.readFile>) => {
            const result = await realReadFile(...args);
            assert.ok(typeof args[0] === "string");
            const name = basename(args[0]);
            assert.ok(args[1] && typeof args[1] === "object");
            assert.equal(args[1].signal, controller.signal);
            if (
              (stage === "metadata" && name === "metadata.json") ||
              (stage === "body" && name.startsWith("body."))
            ) {
              entered.release();
              await held.promise; // Deliberately ignore the signal, like an already issued OS request.
              if (fails) throw new Error("late cache read failure");
            }
            return result;
          },
        );
        const stats = t.mock.method(fs, "stat", async (...args: Parameters<typeof fs.stat>) => {
          const result = await realStat(...args);
          if (stage === "stat") {
            entered.release();
            await held.promise;
            if (fails) throw new Error("late stat failure");
          }
          return result;
        });
        const writes = t.mock.method(fs, "open");
        syncBuiltinESMExports();
        const operation = searchAwsDocumentation(
          INPUT,
          (input) => {
            requests += 1;
            return sourceFetcher(input);
          },
          controller.signal,
          directory,
        );
        await entered.promise;
        const before = [reads.mock.callCount(), stats.mock.callCount()];
        controller.abort(reason);
        await rejectsPromptly(operation, reason);
        const next = withFileMutationQueue(key, () => {
          nextStarted = true;
          return Promise.resolve();
        });
        await withFileMutationQueue(join(directory, "barrier"), () => Promise.resolve());
        assert.equal(nextStarted, false, "aborting the wait must not release active cache I/O");
        held.release();
        await next;
        assert.deepEqual([reads.mock.callCount(), stats.mock.callCount()], before);
        assert.equal(writes.mock.callCount(), 0);
        assert.equal(requests, 1);
        assert.equal(getEventListeners(controller.signal, "abort").length, 0);
        restoreFsMocks(t);
        const hit = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
        assert.equal(hit.documents[0]?.cache, "hit");
      } finally {
        held.release();
        restoreFsMocks(t);
        await withFileMutationQueue(key, () => Promise.resolve());
        await fs.rm(directory, { recursive: true });
      }
    }
  }
});

void test("cancelled cache refreshes stop before subsequent writes and retain cleanup ownership", async (t) => {
  for (const stage of [
    "mkdir",
    "previous-metadata",
    "body-open",
    "body-write",
    "body-close",
    "metadata-write",
    "metadata-close",
    "publish",
  ]) {
    const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-refresh-abort-"));
    const entry = join(directory, ENTRY_KEY);
    const key = join(entry, "body");
    const entered = gate();
    const held = gate();
    const controller = new AbortController();
    const reason = new Error(`cancelled at ${stage}`);
    let publications = 0;
    try {
      await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
      const before = await snapshot(entry);
      t.mock.method(fs, "mkdir", async (...args: Parameters<typeof fs.mkdir>) => {
        const result = await realMkdir(...args);
        if (stage === "mkdir") {
          entered.release();
          await held.promise;
        }
        return result;
      });
      t.mock.method(fs, "readFile", async (...args: Parameters<typeof fs.readFile>) => {
        const result = await realReadFile(...args);
        if (stage === "previous-metadata") {
          entered.release();
          await held.promise;
        }
        return result;
      });
      t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
        const handle = await realOpen(...args);
        const kind = basename(String(args[0])).startsWith("body.") ? "body" : "metadata";
        if (stage === `${kind}-open`) {
          entered.release();
          await held.promise;
        }
        const write = handle.writeFile.bind(handle);
        const close = handle.close.bind(handle);
        t.mock.method(
          handle,
          "writeFile",
          async (...writeArgs: Parameters<typeof handle.writeFile>) => {
            assert.ok(writeArgs[1] && typeof writeArgs[1] === "object");
            assert.equal(writeArgs[1].signal, controller.signal);
            await write(...writeArgs);
            if (stage === `${kind}-write`) {
              entered.release();
              await held.promise;
            }
          },
        );
        t.mock.method(handle, "close", async () => {
          await close();
          if (stage === `${kind}-close`) {
            entered.release();
            await held.promise;
          }
        });
        return handle;
      });
      t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
        await realRename(...args);
        publications += 1;
        if (stage === "publish") {
          entered.release();
          await held.promise;
        }
      });
      syncBuiltinESMExports();
      const operation = searchAwsDocumentation(
        { ...INPUT, cacheTtlSeconds: 0 },
        sourceFetcher,
        controller.signal,
        directory,
      );
      await entered.promise;
      controller.abort(reason);
      await rejectsPromptly(operation, reason);
      held.release();
      await withFileMutationQueue(key, () => Promise.resolve());
      assert.equal(publications, stage === "publish" ? 1 : 0, "do not publish after cancellation");
      restoreFsMocks(t);
      if (stage !== "publish") assert.deepEqual(await snapshot(entry), before);
      else
        assert.equal((await fs.readdir(entry)).length, 2, "finish cleanup after an issued rename");
      const hit = await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
      assert.equal(hit.documents[0]?.cache, "hit");
      assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    } finally {
      held.release();
      restoreFsMocks(t);
      await withFileMutationQueue(key, () => Promise.resolve());
      await fs.rm(directory, { recursive: true });
    }
  }
});

void test("a cancelled concurrent waiter does not interrupt the writer or another cache reader", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-concurrent-"));
  const key = join(directory, ENTRY_KEY, "body");
  const entered = gate();
  const held = gate();
  const registered = gate();
  const writer = new AbortController();
  const cancelled = new AbortController();
  const reader = new AbortController();
  let requests = 0;
  let registrations = 0;
  const fetcher = async (input: string | URL): Promise<Response> => {
    if (input.toString() !== SEARCH_URL) {
      requests += 1;
      entered.release();
      await held.promise;
    }
    return sourceFetcher(input);
  };
  try {
    const first = searchAwsDocumentation(INPUT, fetcher, writer.signal, directory);
    await entered.promise;
    t.mock.method(fs, "realpath", (...args: Parameters<typeof fs.realpath>) => {
      registrations += 1;
      if (registrations === 2) registered.release();
      return realRealpath(...args);
    });
    syncBuiltinESMExports();
    const second = searchAwsDocumentation(INPUT, fetcher, cancelled.signal, directory);
    const third = searchAwsDocumentation(INPUT, fetcher, reader.signal, directory);
    await registered.promise;
    await withFileMutationQueue(join(directory, "barrier"), () => Promise.resolve());
    cancelled.abort(new Error("only cancel this waiter"));
    await rejectsPromptly(second, cancelled.signal.reason);
    assert.equal(requests, 1);
    held.release();
    assert.equal((await first).documents[0]?.cache, "miss");
    assert.equal((await third).documents[0]?.cache, "hit");
    assert.equal(requests, 1, "same-entry concurrent downloads remain serialized");
    for (const controller of [writer, cancelled, reader])
      assert.equal(getEventListeners(controller.signal, "abort").length, 0);
    const missing = await searchAwsDocumentation(
      { ...INPUT, cacheTtlSeconds: 0 },
      (input) =>
        Promise.resolve(
          input.toString() === SEARCH_URL ? jsonResponse() : new Response(null, { status: 404 }),
        ),
      reader.signal,
      directory,
    );
    assert.equal(missing.documentErrors.length, 1);
    assert.equal(getEventListeners(reader.signal, "abort").length, 0);
  } finally {
    held.release();
    restoreFsMocks(t);
    await withFileMutationQueue(key, () => Promise.resolve());
    await fs.rm(directory, { recursive: true });
  }
});

void test("cancellation at document completion prevents cache writes and successful fallback results", async (t) => {
  for (const mode of ["cached", "unavailable", "disabled"]) {
    const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-download-abort-"));
    const controller = new AbortController();
    const reason = new Error("cancelled at document completion");
    let requests = 0;
    try {
      if (mode === "unavailable")
        t.mock.method(fs, "realpath", () =>
          Promise.reject(Object.assign(new Error("cache denied"), { code: "EACCES" })),
        );
      const writes = t.mock.method(fs, "mkdir");
      syncBuiltinESMExports();
      const operation = searchAwsDocumentation(
        { ...INPUT, noCache: mode === "disabled" },
        (input) => {
          if (input.toString() === SEARCH_URL) return Promise.resolve(jsonResponse());
          requests += 1;
          const response = new Response("# Source", {
            headers: { "content-type": "text/markdown" },
          });
          assert.ok(response.body);
          t.mock.method(response.body, "cancel", () => {
            controller.abort(reason);
            return Promise.resolve();
          });
          return Promise.resolve(response);
        },
        controller.signal,
        directory,
      );
      await rejectsPromptly(operation, reason);
      restoreFsMocks(t);
      await withFileMutationQueue(join(directory, ENTRY_KEY, "body"), () => Promise.resolve());
      assert.equal(writes.mock.callCount(), 0);
      assert.equal(requests, 1);
      assert.deepEqual(await fs.readdir(directory), []);
    } finally {
      restoreFsMocks(t);
      await withFileMutationQueue(join(directory, ENTRY_KEY, "body"), () => Promise.resolve());
      await fs.rm(directory, { recursive: true });
    }
  }
});

void test("cancellation after search body cleanup prevents cache queue registration", async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "pi-aws-cache-pre-abort-"));
  const controller = new AbortController();
  const reason = new Error("cancelled before cache entry");
  try {
    await searchAwsDocumentation(INPUT, sourceFetcher, undefined, directory);
    const response = jsonResponse();
    assert.ok(response.body);
    t.mock.method(response.body, "cancel", () => {
      controller.abort(reason);
      return Promise.resolve();
    });
    const registrations = t.mock.method(fs, "realpath");
    syncBuiltinESMExports();
    await rejectsPromptly(
      searchAwsDocumentation(INPUT, () => Promise.resolve(response), controller.signal, directory),
      reason,
    );
    await nextTurn();
    assert.equal(registrations.mock.callCount(), 0);
  } finally {
    restoreFsMocks(t);
    await fs.rm(directory, { recursive: true });
  }
});
