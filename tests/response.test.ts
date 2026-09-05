import assert from "node:assert/strict";
import test from "node:test";

import { searchAwsDocumentation } from "../src/index.ts";
import { DEFAULT_SUGGESTION, jsonResponse, searchPayload } from "./helpers.ts";

const SEARCH_URL = "https://proxy.search.docs.aws.com/search";
const HTML_URL = DEFAULT_SUGGESTION.textExcerptSuggestion.link;
const MARKDOWN_URL = HTML_URL.replace(/\.html$/, ".md");
const BODY_TARGETS = [
  [SEARCH_URL, "application/json", searchPayload()],
  [MARKDOWN_URL, "text/markdown", "# Complete source"],
  [HTML_URL, "text/html", "<p>Complete source</p>"],
] as const;

function interruptedResponse(contentType: string, error: Error): Response {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("partial response to discard"));
    },
    pull(controller) {
      controller.error(error);
    },
  });
  return new Response(body, { headers: { "content-type": contentType } });
}

void test("retries interrupted search, Markdown, and HTML bodies from scratch", async () => {
  for (const [target, contentType, content] of BODY_TARGETS) {
    let attempts = 0;
    const responses: Response[] = [];
    const fetcher = (input: string | URL): Promise<Response> => {
      const url = input.toString();
      if (url !== target) {
        return Promise.resolve(
          url === SEARCH_URL ? jsonResponse() : new Response(null, { status: 404 }),
        );
      }
      attempts += 1;
      const response =
        attempts === 1
          ? interruptedResponse(contentType, new TypeError("terminated: socket closed during body"))
          : new Response(content, { headers: { "content-type": contentType } });
      responses.push(response);
      return Promise.resolve(response);
    };
    const result = await searchAwsDocumentation(
      { query: "IAM", download: 1, noCache: true },
      fetcher,
    );
    assert.equal(attempts, 2, target);
    assert.equal(result.queryId, "query-1");
    if (target !== SEARCH_URL) assert.equal(result.documents[0]?.content, content);
    for (const response of responses) assert.equal(response.body?.locked, false);
  }
});

void test("stops persistent body failures after three attempts per URL", async () => {
  for (const [target, contentType] of BODY_TARGETS) {
    let attempts = 0;
    const fetcher = (input: string | URL): Promise<Response> => {
      const url = input.toString();
      if (url !== target) {
        return Promise.resolve(
          url === SEARCH_URL ? jsonResponse() : new Response(null, { status: 404 }),
        );
      }
      attempts += 1;
      return Promise.resolve(interruptedResponse(contentType, new TypeError("socket closed")));
    };
    const operation = searchAwsDocumentation({ query: "IAM", download: 1, noCache: true }, fetcher);
    if (target === SEARCH_URL) {
      await assert.rejects(operation, /socket closed/);
    } else {
      const result = await operation;
      assert.equal(result.results.length, 1);
      assert.deepEqual(result.documents, []);
      assert.equal(result.documentErrors.length, 1);
    }
    assert.equal(attempts, 3, target);
  }
});

void test("shares one attempt budget across retryable statuses and broken bodies", async () => {
  let attempts = 0;
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    return Promise.resolve(
      attempts === 1
        ? jsonResponse("{}", { status: 503, headers: { "retry-after": "0" } })
        : interruptedResponse("application/json", new TypeError("socket closed")),
    );
  };
  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /socket closed/);
  assert.equal(attempts, 3);
});

void test("does not retry a permanent HTTP error when its diagnostic body breaks", async () => {
  let attempts = 0;
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    const response = interruptedResponse("application/json", new TypeError("broken error body"));
    return Promise.resolve(new Response(response.body, { status: 400, headers: response.headers }));
  };
  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), /broken error body/);
  assert.equal(attempts, 1);
});

void test("honors cancellation during body-retry backoff", async () => {
  const controller = new AbortController();
  let attempts = 0;
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    setImmediate(() => controller.abort());
    return Promise.resolve(interruptedResponse("application/json", new TypeError("socket closed")));
  };
  await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher, controller.signal), {
    name: "AbortError",
  });
  assert.equal(attempts, 1);
});

void test("does not retry invalid JSON, schemas, size violations, or explicit abort errors", async () => {
  const cases: Array<[Response, RegExp]> = [
    [jsonResponse("invalid JSON"), /non-JSON/],
    [
      jsonResponse(
        searchPayload([
          {
            textExcerptSuggestion: { ...DEFAULT_SUGGESTION.textExcerptSuggestion, title: 123 },
          },
        ]),
      ),
      /title must be a string/,
    ],
    [jsonResponse("{}", { headers: { "content-length": "2097153" } }), /2\.0MB limit/],
    [jsonResponse("x".repeat(2 * 1024 * 1024 + 1)), /2\.0MB limit/],
    [
      interruptedResponse("application/json", new DOMException("explicit abort", "AbortError")),
      /explicit abort/,
    ],
  ];
  for (const [response, expected] of cases) {
    let attempts = 0;
    const fetcher = (): Promise<Response> => {
      attempts += 1;
      return Promise.resolve(response);
    };
    await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), expected);
    assert.equal(attempts, 1);
    assert.equal(response.body?.locked, false);
  }
});

void test("does not retry oversized documents even when stream cancellation fails", async () => {
  for (const target of [MARKDOWN_URL, HTML_URL]) {
    for (const declared of [true, false]) {
      let attempts = 0;
      let cancellations = 0;
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1));
        },
        cancel() {
          cancellations += 1;
          throw new TypeError("cleanup failed");
        },
      });
      const response = new Response(body, {
        headers: {
          "content-type": "text/markdown",
          ...(declared ? { "content-length": "5242881" } : {}),
        },
      });
      const fetcher = (input: string | URL): Promise<Response> => {
        const url = input.toString();
        if (url === SEARCH_URL) return Promise.resolve(jsonResponse());
        if (url !== target) return Promise.resolve(new Response(null, { status: 404 }));
        attempts += 1;
        return Promise.resolve(response);
      };
      const result = await searchAwsDocumentation(
        { query: "IAM", download: 1, noCache: true },
        fetcher,
      );
      assert.equal(attempts, 1, target);
      assert.deepEqual(result.documents, []);
      if (target === HTML_URL) assert.match(result.documentErrors[0]?.error ?? "", /5\.0MB limit/);
      assert.equal(cancellations, 1);
      assert.equal(body.locked, false);
    }
  }
});

void test("honors caller cancellation during search, Markdown, and HTML body reads", async () => {
  for (const [target, contentType] of BODY_TARGETS) {
    const controller = new AbortController();
    const reason = new Error("cancelled during body");
    let attempts = 0;
    const fetcher = (input: string | URL): Promise<Response> => {
      const url = input.toString();
      if (url !== target) {
        return Promise.resolve(
          url === SEARCH_URL ? jsonResponse() : new Response(null, { status: 404 }),
        );
      }
      attempts += 1;
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(stream) {
              stream.enqueue(Uint8Array.of(0));
            },
            pull(stream) {
              controller.abort(reason);
              stream.error(new TypeError("stream aborted"));
            },
          }),
          { headers: { "content-type": contentType } },
        ),
      );
    };
    await assert.rejects(
      searchAwsDocumentation(
        { query: "IAM", download: 1, noCache: true },
        fetcher,
        controller.signal,
      ),
      reason,
    );
    assert.equal(attempts, 1, target);
  }
});

void test("retries body timeouts with a fresh 45-second signal, not as caller cancellation", async (t) => {
  const deadlines: AbortController[] = [];
  const signals: Array<AbortSignal | null | undefined> = [];
  t.mock.method(AbortSignal, "timeout", (delay: number) => {
    assert.equal(delay, 45_000);
    const controller = new AbortController();
    deadlines.push(controller);
    return controller.signal;
  });
  const caller = new AbortController();
  const fetcher = (_input: string | URL, init?: RequestInit): Promise<Response> => {
    signals.push(init?.signal);
    if (signals.length !== 1) return Promise.resolve(jsonResponse());
    return Promise.resolve(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(Uint8Array.of(0));
          },
          pull(controller) {
            deadlines[0]?.abort(new DOMException("attempt timeout", "TimeoutError"));
            controller.error(new DOMException("body aborted", "AbortError"));
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
  };
  const result = await searchAwsDocumentation({ query: "IAM" }, fetcher, caller.signal);
  assert.equal(result.queryId, "query-1");
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals[0]?.aborted, true);
  assert.equal(signals[1]?.aborted, false);
  assert.equal(caller.signal.aborted, false);
});

void test("cancels rejected document bodies without changing HTTP retries or fallback errors", async () => {
  for (const [status, contentType] of [
    [200, "application/octet-stream"],
    [404, "text/html"],
    [503, "text/html"],
  ] as const) {
    for (const cleanupFails of [false, true]) {
      let documentRequests = 0;
      let cancellations = 0;
      const bodies: ReadableStream[] = [];
      const fetcher = (input: string | URL): Promise<Response> => {
        if (input.toString() === SEARCH_URL) return Promise.resolve(jsonResponse());
        assert.equal(cancellations, documentRequests, "clean up before the next request");
        documentRequests += 1;
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(Uint8Array.of(0));
          },
          pull() {
            assert.fail("rejected bodies must not be consumed");
          },
          cancel() {
            cancellations += 1;
            if (cleanupFails) throw new RangeError("cleanup failed");
          },
        });
        bodies.push(body);
        return Promise.resolve(
          new Response(body, {
            status,
            headers: { "content-type": contentType, "retry-after": "0" },
          }),
        );
      };
      const result = await searchAwsDocumentation(
        { query: "IAM", download: 1, noCache: true },
        fetcher,
      );
      assert.equal(documentRequests, status === 503 ? 6 : 2); // Markdown probe and HTML fallback.
      assert.equal(cancellations, documentRequests);
      assert.deepEqual(result.documents, []);
      assert.equal(result.results.length, 1);
      assert.equal(
        result.documentErrors[0]?.error,
        `document returned HTTP ${status} or an unsupported content type`,
      );
      for (const body of bodies) assert.equal(body.locked, false);
    }
  }
});

void test("cancels declared and streamed oversized search bodies without masking the size error", async () => {
  for (const declared of [true, false]) {
    for (const cleanupFails of [false, true]) {
      let attempts = 0;
      let cancellations = 0;
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(declared ? 1 : 2 * 1024 * 1024 + 1));
        },
        cancel() {
          cancellations += 1;
          return cleanupFails ? Promise.reject(new Error("cleanup failed")) : Promise.resolve();
        },
      });
      const fetcher = (): Promise<Response> => {
        attempts += 1;
        return Promise.resolve(
          new Response(body, {
            headers: {
              "content-type": "application/json",
              ...(declared ? { "content-length": "2097153" } : {}),
            },
          }),
        );
      };
      await assert.rejects(searchAwsDocumentation({ query: "IAM" }, fetcher), {
        name: "RangeError",
        message: /2\.0MB limit/,
      });
      assert.equal(attempts, 1);
      assert.equal(cancellations, 1);
      assert.equal(body.locked, false);
    }
  }
});

void test("releases a failed reader before cleanup and preserves its original error", async (t) => {
  const reason = new TypeError("socket closed during error body");
  const interrupted = interruptedResponse("application/json", reason);
  const response = new Response(interrupted.body, { status: 400, headers: interrupted.headers });
  assert.ok(response.body);
  const cancel = t.mock.method(response.body, "cancel");
  let attempts = 0;
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    return Promise.resolve(response);
  };
  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher),
    (error) => error === reason,
  );
  assert.equal(attempts, 1);
  assert.equal(response.body.locked, false);
  assert.equal(cancel.mock.callCount(), 1);
  const [call] = cancel.mock.calls;
  assert.ok(call?.result);
  // An errored, unlocked stream rejects cancel with the read error, not a lock error.
  await assert.rejects(call.result, (error) => error === reason);
});

void test("redirect cleanup failures preserve policy errors and allowed document redirects", async () => {
  for (const target of [SEARCH_URL, MARKDOWN_URL, HTML_URL]) {
    for (const location of ["https://docs.aws.com/final.md", "https://example.com/blocked", null]) {
      let cancellations = 0;
      const requests: string[] = [];
      const fetcher = (input: string | URL): Promise<Response> => {
        const url = input.toString();
        requests.push(url);
        if (url === target) {
          const body = new ReadableStream({
            start(controller) {
              controller.enqueue(Uint8Array.of(0));
            },
            cancel() {
              cancellations += 1;
              throw new Error("cleanup failed");
            },
          });
          return Promise.resolve(
            new Response(body, { status: 302, headers: location === null ? {} : { location } }),
          );
        }
        if (url === SEARCH_URL) return Promise.resolve(jsonResponse());
        if (url === "https://docs.aws.com/final.md") {
          assert.equal(cancellations, 1, "clean up before following the redirect");
          return Promise.resolve(
            new Response("# Final source", { headers: { "content-type": "text/markdown" } }),
          );
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      };
      const operation = searchAwsDocumentation(
        { query: "IAM", download: 1, noCache: true },
        fetcher,
      );
      if (target === SEARCH_URL) {
        await assert.rejects(operation, /search redirects are not allowed/);
        assert.deepEqual(requests, [SEARCH_URL]);
      } else {
        const result = await operation;
        if (location === "https://docs.aws.com/final.md") {
          assert.equal(result.documents[0]?.content, "# Final source");
          assert.equal(result.documents[0]?.fetchedUrl, location);
        } else {
          assert.deepEqual(result.documents, []);
          assert.match(
            result.documentErrors[0]?.error ?? "",
            target === MARKDOWN_URL
              ? /HTTP 404/
              : location === null
                ? /redirect is missing Location/
                : /AWS docs host/,
          );
        }
        assert.equal(requests.includes("https://example.com/blocked"), false);
      }
      assert.equal(cancellations, 1);
    }
  }
});

void test("cleans up before HTTP retry backoff and retains the caller's abort reason", async () => {
  const controller = new AbortController();
  const reason = new Error("cancelled during HTTP retry backoff");
  let attempts = 0;
  let cancellations = 0;
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    if (attempts > 1) return Promise.resolve(jsonResponse());
    return Promise.resolve(
      new Response(
        new ReadableStream({
          start(stream) {
            stream.enqueue(Uint8Array.of(0));
          },
          cancel() {
            cancellations += 1;
            setImmediate(() => controller.abort(reason));
          },
        }),
        { status: 503, headers: { "retry-after": "0.25" } },
      ),
    );
  };
  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher, controller.signal),
    (error) => error === reason,
  );
  assert.equal(attempts, 1);
  assert.equal(cancellations, 1);
});

void test("cancels unused bodies when the caller aborts as headers arrive", async () => {
  const controller = new AbortController();
  const reason = new Error("cancelled at headers");
  let attempts = 0;
  let cancellations = 0;
  const body = new ReadableStream({
    start(stream) {
      stream.enqueue(Uint8Array.of(0));
    },
    cancel() {
      cancellations += 1;
      throw new Error("cleanup failed");
    },
  });
  const fetcher = (): Promise<Response> => {
    attempts += 1;
    controller.abort(reason);
    return Promise.resolve(new Response(body, { status: 302, headers: { location: "/redirect" } }));
  };
  await assert.rejects(
    searchAwsDocumentation({ query: "IAM" }, fetcher, controller.signal),
    (error) => error === reason,
  );
  assert.equal(attempts, 1);
  assert.equal(cancellations, 1);
  assert.equal(body.locked, false);
});
