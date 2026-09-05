# AWS documentation extension: review tasks

Reviewed baseline: `f5a6134` (`0.1.1`). This is a local work list, not GitHub issues.

Scope: the source review, mocked failure probes, and direct use of the loaded
`aws_docs_search` tool. Implementation progress is recorded below. Line references
below refer to the reviewed baseline and will move as fixes land.

Priorities: **P1** security boundary; **P2** reliability, performance, or validation;
**P3** presentation/documentation. Each behavioral fix should leave a small
regression check in the existing test setup. Do not add a new test framework.

## What was exercised

| Check | Observed result |
| --- | --- |
| Broad `EKS Pod Identity` search | Ranked results, excerpts, URLs, and facets returned. |
| `product: "Amazon EKS"`, `guide: "User Guide"`, `prefer: "target"` | Exact filters worked and the target-role title was promoted. |
| DynamoDB GSI document retrieval | AWS-authored Markdown returned from cache. |
| `Amazon S3 Versioning`, `locale: "de_de"`, `noCache: true` | German Markdown returned with cache disabled. |
| EKS IPv6 agent document, `cacheTtlSeconds: 0`, followed by default TTL | First call reported `miss`; repeat reported `hit`. |
| `AWS CLI s3 cp`, `download: 1`, `noCache: true` | HTML fallback worked; 67.9 KiB formatted output was truncated and saved. The saved file's ending was readable. |
| CLI v2 filtering with returned `Cli` / `Guide` facets | Returned the v2 command reference. |
| Deliberately nonexistent product facet | Empty results and empty facets handled correctly. |
| `IAM least privilege`, `maxResults: 3`, `limit: 0` | Incorrectly said no matching documentation was found despite three suggestions. See T08. |
| Cancellation while waiting on a held cache queue | Did not settle while blocked; returned a cache hit after release despite cancellation. See T05. |
| Synthetic 1 MiB document persisted through Pi's SessionManager | About 653 bytes of agent text, but about 1.05 MB in tool details and the session file. See T07. |

The initial review also reproduced the redirect, body retry, response cleanup,
cache-write, and smoke-check failures below using controlled mocks. No real
private/internal endpoint was contacted for the redirect test.

Existing checks passed: `npm run check` (52 tests, typecheck, lint, formatting,
smoke command) and `npm run test:live` (one live test). The smoke command's green
exit is not proof of extension registration; see T06. Checks used Node 26 and
existing dependencies, not a fresh install on the minimum supported Node version.

## Ordered work list

### T01 — P1: Enforce the AWS-only boundary across redirects

- [x] Implement and verify T01.
- **Implemented:** manual redirect handling validates every document destination,
  permits at most five hops per Markdown/HTML fetch, and records the final URL in
  returned documents and cache metadata. Search POST redirects are rejected.
  URLs with credentials or non-default ports are rejected. Legacy cache entries
  are refetched because their download destinations were not validated.
- **Verified:** six new regression tests cover unsafe later hops, allowed redirect
  statuses, relative/cross-host AWS redirects, final Markdown/HTML/cache URLs,
  redirect loops and body cancellation, search POST rejection, and legacy-cache
  invalidation. `npm run check` passed all 58 tests; `npm run test:coverage` passed
  (99.16% lines, 91.51% branches, 100% functions); `npm run test:live` passed.
  These checks used the existing Node 26 environment; T06 and T10 remain open.
- **Location:** `src/index.ts:242–256,394–418,465–505`.
- **Evidence:** an allowed AWS document URL redirected to a mocked HTTP localhost
  URL. Fetch followed it and returned the non-AWS content with an AWS `fetchedUrl`.
  The current allowlist checks only the original search link.
- **Work:** validate each redirect destination before issuing its request; reject
  non-HTTPS and non-allowlisted destinations, bound redirect hops, and record the
  actual validated final document URL. Apply the appropriate boundary to search
  requests too, rather than forwarding POST inputs to arbitrary redirected hosts.
- **Done when:** an off-host or HTTPS-to-HTTP redirect causes no destination
  request; allowed AWS redirects still work; loops fail within a bounded number
  of hops; fetched and cached URL metadata accurately identifies the final source.

### T02 — P2: Retry transient failures during response-body reads

- [x] Implement and verify T02.
- **Implemented:** bounded body reads now run inside the same three-attempt loop
  as fetch/HTTP retries, with a fresh 45-second signal per attempt. Partial bodies
  are discarded. Caller cancellation, size violations, permanent HTTP errors, and
  invalid JSON/schemas do not trigger retries. Unusable document and redirect
  bodies are not consumed. Reader locks are released on success and failure;
  stream-cancellation errors cannot mask a non-retryable size violation.
- **Verified:** ten new checks in `tests/response.test.ts` cover search, Markdown,
  HTML fallback, persistent/mixed failures, size/schema exclusions, cancellation
  during reads/backoff, and per-attempt timeouts. Existing response helpers were
  moved to `tests/helpers.ts` to share them without exceeding 1,000 lines per file.
  `npm run check` passed all 68 tests; `npm run test:coverage` passed (99.42% lines,
  94.43% branches, 100% functions); `npm run test:live` passed on the existing Node
  26 environment. T01 regression checks still pass; T06 and T10 remain open.
- **Location:** `src/index.ts:394–418,475–504,660–674`.
- **Evidence:** a search response returned headers and then its stream failed with
  a simulated socket error. The call failed after one request, even though a
  subsequent request would have succeeded.
- **Work:** make the retry unit include bounded body consumption, not just receipt
  of headers. Preserve the attempt limit, timeout, Retry-After behavior, and abort
  signal. Do not retry explicit cancellation, size-limit violations, or invalid
  response schemas as transient network failures.
- **Done when:** interrupted search and document streams recover on the next
  attempt; persistent failures stop at the configured attempt limit; cancellation
  exits without starting another attempt.

### T03 — P2: Close response bodies on every rejection path

- [x] Implement and verify T03.
- **Implemented:** each fetch attempt now owns best-effort body cancellation in
  one `finally` block, after readers release their locks and before retry waits,
  redirects, fallbacks, or rejection. Removed the scattered cancellation calls.
  Cleanup failures cannot mask size/read/policy errors or change HTTP retries;
  retry-wait cancellation retains the caller's abort reason.
- **Verified:** five new checks and two expanded checks in `tests/response.test.ts`
  cover declared/streamed oversize, failed-reader cleanup, rejected Markdown/HTML
  responses (including the final HTTP retry), redirect cleanup failures, and
  cancellation at headers/backoff. `npm run check` passed all 73 tests;
  `npm run test:coverage` passed (99.43% lines, 94.44% branches, 100% functions);
  `npm run test:live` and `git diff --check` passed. Checks used the existing Node
  26 environment; T06 and T10 remain open.
- **Location:** `src/index.ts:420–443,491–497`.
- **Evidence:** instrumented streams were not cancelled when Content-Length
  exceeded the limit or when the fallback document returned an error/unsupported
  content type. Such responses can retain connections until timeout or cleanup.
- **Work:** cancel unused bodies before rejecting them and release stream readers
  on success and failure. Cleanup should not obscure the original error.
- **Done when:** checks confirm cleanup for declared oversize, streamed oversize,
  body-read failure, unsupported content types, and unsuccessful HTML fallback.
- **Coordination:** implement alongside T02 if that keeps response ownership clear.

### T04 — P2: Preserve downloads when optional cache persistence fails

- [x] Implement and verify T04.
- **Implemented:** successful downloads survive cache-write and queue-setup
  failures with `cache: "error"` and a `cacheWarning` capped at 500 characters,
  also shown in formatted output. Download failures and caller cancellation are
  not relabelled as cache failures. Version-3 metadata is published last and
  references a uniquely named body, preserving the old entry on failed refresh.
  Exclusive creation tracks owned files for best-effort cleanup; successful
  refreshes retire the old body. Version-2 entries remain readable, with existing
  integrity checks and validation of the new body filename before use.
- **Verified:** nine new checks in `tests/cache.test.ts` cover unavailable cache
  paths, interrupted writes/closes/publication, cleanup failures and ownership,
  queue setup, bounded tool warnings, mixed download outcomes, cancellation,
  legacy migration, and corrupt/unsafe entry recovery. `npm run check` passed all
  82 tests; `npm run test:coverage` passed (99.78% lines, 96.04% branches, 100%
  functions); `npm run test:live` and `git diff --check` passed. Checks used the
  existing Node 26 environment; T05, T06, and T10 remain open.
- **Known ceiling:** crashes, concurrent processes, or failed cleanup can leave
  orphan files. No speculative orphan sweep was added; clearing the cache removes
  them. Ordinary handled write failures remove the files they created where the
  filesystem permits it, without touching unrelated files.
- **Location:** `src/index.ts:573–603,606–627`.
- **Evidence:** a successful mocked Markdown download followed by an `ENOTDIR`
  cache-write failure produced zero returned documents and a download error.
- **Work:** return successfully fetched content even if optional caching fails,
  with a bounded cache warning/status that does not claim a successful write.
  Remove temporary cache files created by a failed write where possible without
  deleting unrelated or previously valid entries. Keep integrity checks intact.
- **Done when:** unavailable-cache and interrupted-write checks preserve content
  and other successful results, report the cache failure, and do not leave new
  temporary files behind. Normal miss/hit, refresh, and corrupt-entry recovery work.

### T05 — P2: Honor cancellation while waiting for or reading the cache

- [x] Implement and verify T05.
- **Implemented:** an abort-aware wait wraps the existing Pi queue operation,
  preserving the caller's abort reason and observing late rejections. Listeners
  are disposed on success, failure, and cancellation. Queued callbacks check the
  signal before starting; cache reads/writes receive it and recheck between I/O
  steps, before publication, and before returning documents. Cancellation never
  becomes a cache warning or successful hit, including uncached fallback paths.
  The underlying operation retains its queue position until work/cleanup ends.
- **Verified:** seven new checks in `tests/cache.test.ts` cover held warm/cold
  queues, registration failures, interrupted reads/refreshes, late I/O failures,
  original abort reasons, listener cleanup, completion-time cancellation, and
  concurrent writer/readers. The initial six checks failed before implementation;
  the additional completion-time check reproduced an uncached fallback gap.
  `npm run check` passed all 89 tests; `npm run test:coverage` passed (99.80% lines,
  96.33% branches, 100% functions); `npm run test:live` and `git diff --check`
  passed. Checks used the existing Node 26 environment; T06 and T10 remain open.
- **Boundary:** already-issued filesystem operations and Pi's queue bookkeeping
  can finish after the caller stops waiting. Cleanup stays serialized; a metadata
  rename already issued before cancellation may publish and is not rolled back.
- **Location:** `src/index.ts:532–571,619–626,634–653`.
- **Evidence:** warm a cache entry, hold its `body` mutation queue, start another
  search with an AbortSignal, then abort it. It remains pending while the queue is
  held and resolves successfully with `cache: "hit"` after the queue is released.
- **Work:** retain Pi's file-mutation serialization, but make the caller's wait
  abort-aware. Recheck cancellation when queued work starts and before returning
  cached content or starting subsequent I/O. Queued work must not resume network
  requests/cache writes after the caller has cancelled.
- **Done when:** cancellation rejects promptly while a different call holds the
  queue; releasing the queue later does not cause cancelled work to fetch/write
  or return success; ordinary concurrent downloads remain serialized correctly.

### T06 — P2: Replace the false-positive package-load smoke check

- [x] Implement and verify T06.
- **Implemented:** `npm run smoke` now runs `tests/smoke.test.ts` through Node's
  existing test runner. Pi's `DefaultResourceLoader` resolves the real package
  manifest and executes its factories; assertions require zero load errors and
  registration of `aws_docs_search`. Temporary working/agent directories and
  in-memory settings avoid personal configuration and agent/model sessions.
  Existing CI (`npm run check`) and release validation (`npm run release:check`)
  already run the smoke command, so no workflow changes were needed.
- **Verified:** the real package passes without fetch requests. Negative checks
  reject synchronous/asynchronous factory failures, broken imports, missing
  manifest entry points, and missing tool registration. A valid registered tool
  alongside a throwing entry still fails. In temporary package copies, the old
  command returned 0 for throwing/missing entries; the replacement returned 1
  with expected diagnostics for throwing, missing-entry, missing-tool, and mixed
  valid/broken cases. `npm run release:check` passed (89 existing tests, two smoke
  tests covering five negative cases, typecheck, lint, formatting, and pack
  dry-run); coverage remained 99.80% lines / 96.33% branches / 100% functions.
  `git diff --check` passed. Checks used Node 26 and Pi 0.84.4; clean/minimum-Node
  verification remains T10. Runtime source and dependencies are unchanged.
- **Location:** `package.json:31`; existing extension registration tests.
- **Evidence:** `pi --no-extensions -e <broken-extension.ts> --list-models` exited
  with code 0 and no load-error message when the factory deliberately threw.
- **Work:** use Pi's actual package/extension loader and assert both that there are
  no extension-load errors and that `aws_docs_search` is registered. Do not rely
  solely on `--list-models` exit status or on invoking the factory manually.
- **Done when:** the real package loads successfully; a throwing factory or broken
  entry point makes the smoke check fail; CI and release validation run that check.

### T07 — P2: Keep full documents out of persisted tool details

- [x] Implement and verify T07.
- **Implemented:** exported `AwsDocsSearchToolDetails` keeps document metadata but
  omits `documents[].content` and `truncation.content`. The existing full-output
  writer now saves complete formatted output whenever documents are retrieved
  (including short/empty documents) or output is truncated. Text and details
  expose `fullOutputPath`; search-only untruncated calls do not create files.
  `searchAwsDocumentation()` still returns complete document bodies unchanged.
  A completion-time check prevents success after caller cancellation during saving.
- **Verified:** seven new checks in `tests/output.test.ts` cover Markdown/HTML,
  empty/short bodies, byte/line truncation, full-text access, real SessionManager
  persistence/reload, standalone API compatibility, ten maximum-sized documents,
  search-only/download-error results, save failures, and completion-time aborts.
  Five of the initial six tests failed before implementation. With the controlled
  single-result fixture, 1 MiB and 5 MiB bodies each persisted in session files
  under 8 KiB, with details sizes differing by less than 100 bytes. Ten 5 MiB
  documents produced details under 16 KiB while all bodies remained in the saved
  output. The existing cache-warning check now verifies metadata and saved content;
  its injected permission failure is scoped to the cache, not the output directory.
  `npm run check` passed 96 tests, two loader smoke tests, typecheck, lint, and
  formatting; coverage passed at 99.80% lines / 96.42% branches / 100% functions.
  `git diff --check` passed. Checks used Node 26/Pi 0.84.4 without live requests;
  clean/minimum-Node verification remains T10. Source stays below 1,000 lines.
- **Contract/limits:** details still include search metadata/excerpts, so this is
  not a global details byte cap. Output files are separate from the cache and
  are written even with `noCache: true`; Pi can still persist visible source text.
  Saving required output must succeed or the tool fails rather than embedding
  bodies in details or returning an unusable path. Files are temporary, not durable
  session attachments; existing sessions are not rewritten. README documents this.
- **Location:** `src/index.ts:765–789`; `README.md` result contract.
- **Evidence:** a synthetic 1 MiB document produced only about 653 bytes of
  agent-visible text, but `details.documents[].content` still held the whole
  document. Persisting the result through Pi's SessionManager wrote it into the
  session file. Ten allowed 5 MiB documents can retain roughly 50 MiB of bodies in
  details, in addition to the cache/full-output file.
- **Impact:** session growth and serialization/reload overhead, not a claim that
  Pi sends tool details to the model or that `noCache` disables session storage.
- **Work:** keep document metadata and full-output file references in tool details
  rather than duplicating entire bodies there. Keep the standalone search API's
  full-document capability. Update the documented tool-result contract.
- **Done when:** persisted details no longer grow with downloaded body lengths;
  source/rank/format/cache metadata remains available; complete text is accessible
  via the saved output; truncated and non-truncated paths have regression checks.

### T08 — P3: Distinguish zero displayed results from zero matches

- [x] Implement and verify T08.
- **Implemented:** the formatter uses the upstream suggestion count for the
  no-match message. Suggestions hidden by `limit: 0` instead report
  `No results displayed (limit: 0).` Search, ranking, and download selection are
  unchanged. README explains that counts/facets remain available but no documents
  are downloaded when no ranked results are included.
- **Verified:** one regression in `tests/output.test.ts` exercises zero/three
  suggestions with limits zero/one and `download: 1`, checking both messages,
  counts/facets, and exact requests. It failed before the fix. Hidden/empty results
  make only the search request; an included result alone is downloaded.
  `npm run check` passed 97 tests, two loader smoke tests, typecheck, lint, and
  formatting; coverage passed at 99.80% lines / 96.44% branches / 100% functions.
  `git diff --check` passed on Node 26 without live requests. Source is 996 lines;
  clean/minimum-Node verification remains T10.
- **Location:** `src/index.ts:703–713`.
- **Live reproduction:** call `aws_docs_search` with
  `{"query":"IAM least privilege","maxResults":3,"limit":0,"download":1}`.
- **Evidence:** output said both `Returned 3 suggestion(s); included 0` and
  `No matching documentation found.`
- **Work:** report that no results were requested/displayed when suggestions exist
  but `limit` suppresses them. Do not change the documented rule that downloads
  are selected from the returned results.
- **Done when:** a positive suggestion count with `limit: 0` is not reported as no
  matches, while a genuine empty response still receives the no-match message.

### T09 — P3: Repair documentation and describe observed limitations

- [x] Implement and verify T09.
- **Implemented:** removed the three stale structure entries and replaced the
  missing API-map link with the real client and synthetic test fixtures. README
  now explains exact-facet reuse, metadata-only `prefer`, relevance/version limits,
  the observed `Cli` / `Guide` v2 example (not a guaranteed version filter), index
  lag versus cache freshness, and raw HTML rather than a cleaned reader view.
  Updated troubleshooting, fallback/network/storage wording, and the development
  install command to match existing behavior and CI. No API-map scaffolding added.
- **Verified:** a local README link/path/heading check reported all three missing
  paths before the edit; all 23 remaining local references now resolve. Both JSON
  examples passed client validation and exact facet/request forwarding checks with
  mocked responses. Reviewed the README against the client, fixtures, loader smoke,
  and CI/publish scripts. `npm run check` passed 97 tests, two loader smoke tests,
  typecheck, lint, and formatting; `git diff --check` passed on Node 26. No live
  requests, runtime changes, dependency changes, or new repository files for T09.
  Clean/minimum-Node verification remains T10.
- **Location:** `README.md:357–375` and relevant usage/troubleshooting sections.
- **Evidence:** README links and structure entries reference
  `example-code/api-map/openapi.yaml`, `example-code/api-map/examples/`, and
  `example-code/scripts/aws-docs-search.sh`; these paths do not exist in the checkout.
- **Work:** remove stale references or link to material that actually exists; do
  not create speculative API-map scaffolding just to satisfy the links. Incorporate
  the result/cache/smoke behavior changes from the preceding tasks.
- **Also document:** endpoint relevance/version/facet limitations and how to use
  returned exact facets or `prefer` to narrow results. Keep raw HTML retrieval
  explicitly identified as raw source, not a cleaned reader view.
- **Done when:** repository-relative documentation links resolve and usage examples
  match the implementation, including CLI v1/v2 facet differences and HTML output.

### T10 — P2: Verify the fixes from a clean, supported environment

- [x] Complete final verification after the fixes.
- **Environment:** verified on macOS arm64 using Node `22.19.0` / npm `10.9.3`
  and Node `26.0.0` / npm `11.12.1`. Each used an independent copy of all 32
  tracked/nonignored input files, including the uncommitted fixes, verified by
  SHA-256. Neither copy inherited `.env`, `.pi`, `.git`, `node_modules`, or coverage;
  each had isolated HOME, temporary files, npm configuration/cache, and a cleared
  process environment. The temporary Node 22 binary came from nodejs.org and was
  checked against its published SHA-256 checksum.
- **Dependency inventory:** `npm ci --ignore-scripts`, `npm ls --depth=0`, and
  `npm ls --all --json` passed in both copies. Both installed the locked
  `@types/node@26.4.0` and Pi `0.84.4`. All 306/314 installed package entries matched
  lockfile versions; absent entries were exclusively incompatible optional platform
  builds. The trees differed only by eight optional clipboard platform packages.
  Both installs reported zero audit vulnerabilities and only upstream
  `node-domexception` deprecation warnings, with no engine warnings.
- **Verified in both:** `npm run release:check` passed manifest checks, typecheck,
  all 97 tests, lint, formatting, two real-loader smoke tests (including negative
  cases), and `npm pack --dry-run`. The package contained the expected six files;
  no archive was written and nothing was published. `npm run test:coverage` passed
  the 80% gates at **99.80% lines / 96.44% branches / 100% functions**, producing
  `coverage/lcov.info` in each copy. Input files stayed byte-identical during checks.
- **Live verification in both:** `npm run test:live` passed. Separate opt-in probes
  repeated EKS broad search, returned `Amazon EKS` / `User Guide` facets, `target`
  preference ordering, hidden suggestions versus genuine empty results, German S3
  Markdown, and cache miss/hit/zero-TTL refresh/bypass. Cache probes replayed one
  captured live search response to keep the target stable despite possible reranking;
  document GETs remained live, and the cache hit made no document request.
  CLI facets selected v1 with `AWS CLI` / `API Reference` and v2 with `Cli` / `Guide`
  in this run, without asserting fixed ranks, versions, or query IDs. Raw HTML and
  truncation worked: 69,202-byte complete output, 50,887-byte preview, 1,094-byte
  metadata-only details, and a readable saved closing source marker. These are
  observations, not fixed upstream response-size expectations. Live checks remain
  outside the normal test/CI commands.
- **Outcome/scope:** no source, test, manifest, lockfile, or workflow changes were
  needed. Only this verification record changed for T10; `git diff --check` passed.
  The original checkout's dependency tree was deliberately left untouched, including
  its older local `@types/node`; the clean installs resolve the lockfile uncertainty.
  Temporary snapshots, runtimes, caches, output, and probe scripts were removed.
  This verifies the locked Pi versions on macOS arm64, not all wildcard peer versions
  or execution of the GitHub Linux/publishing workflows. T01–T10 are complete.
- **Location:** `package.json`, `package-lock.json`, existing CI/test commands.
- **Original verification gap:** the manifest/lockfile specify `@types/node@26.4.0`,
  but the local installation has `22.19.19`. Existing successful checks ran on
  Node `v26.0.0`; this is environment drift, not proof the lockfile is defective.
- **Work:** use an isolated clean checkout/install with `npm ci --ignore-scripts`,
  run the checks on minimum supported Node `22.19.0`, and repeat on the current
  development runtime. Keep live AWS checks opt-in rather than introducing flaky
  network dependencies into the normal test command.
- **Done when:** dependency inventory matches the lockfile; typecheck, tests,
  coverage gate, lint, formatting, corrected smoke, and release dry-run pass.
  Repeat the relevant live search/filter/locale/cache/HTML/truncation checks.
  Tests should assert behavior, not unstable AWS ranks, versions, or query IDs.

## Observations that do not need a new subsystem

- A nonsense query returned an unrelated SDK result. That came from AWS's search
  endpoint; the extension is not promising semantic relevance. Do not invent a
  confidence scorer to hide this one result.
- The unfiltered CLI query ranked v1 ahead of v2. The
  [v1 document](https://docs.aws.amazon.com/cli/v1/reference/s3/cp.html) itself
  identifies the older version. Filtering by the returned `Cli` / `Guide` facets
  selected the [v2 reference](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html).
  Preserve endpoint ranking unless the caller asks for a preference.
- Raw CLI HTML spends output space on navigation and markup and can be truncated.
  The saved full output worked. A cleaned reader view is an optional feature, not
  a prerequisite for fixing the confirmed bugs.
- Search-index version text lagged the freshly downloaded CLI page. That is an
  upstream freshness difference, not evidence that the extension cached a search.

Suggested execution order: T01; T02 + T03; T04 + T05; T06 + T07; T08; T09; T10.
Keep each change small and verify the relevant regression before moving on.
