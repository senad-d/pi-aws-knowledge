# AWS + Terraform documentation Pi extension implementation plan

**Status:** executable MVP task proposal; product implementation has not started, and existing validation residue is unreviewed/incomplete.

**Authority:** [09-product-and-technical-specification.md](09-product-and-technical-specification.md) is the accepted contract. [01](01-vision-and-terminology.md) through [08](08-decision-log-and-agenda.md) remain the evidence and decision record. Validation can narrow an adapter to unavailable; it cannot broaden or reopen scope.

## Verified starting point

- The checkout has no product `package.json`, lockfile, test suite, or `src/`. `.env` exists and was deliberately not read. No task may read it, copy it, log it, or use it for configuration.
- A stopped Objective 12 left incomplete validation implementation residue at `validation/pi-package/index.ts`, `validation/pi-package/package.json`, and `validation/source-contract-probe.mjs`; none is an accepted Task 1 or Task 2 output. Task-shaped files also exist at `validation/pi-reload-project/.pi/settings.json`, `validation/sources/*.json`, and `validation/evidence/*.json`, while `development-docs/validation/` is empty. Their presence proves no task complete: Tasks 1–6 must audit each applicable file against the task, record whether it was reused, corrected, or replaced, rerun the prescribed checks, and produce the required reviewed Markdown records before any checkbox or gate row can pass.
- Objective 12's 0.82.1 RPC observation is historical only: it did not establish arbitrary registered-tool enumeration/invocation. The target is installed Pi 0.84.4, and Task 1 must validate its supported public package/extension-load and registration-smoke seam. Lack of an arbitrary RPC or future direct tool-runner API does not block implementation or the required layered release evidence.
- The example's `index.ts` registers six AWS-only tools over services created once at extension load. `config.ts` blocks every non-fixture data source; `adapters/fixtures-adapter.ts` synchronously loads local JSON; the six services only query those fixtures. It performs no HTTP retrieval.
- Reusable example shapes are TypeBox inputs, `AbortSignal`, thrown typed errors, search-before-read, adapter/service separation, and bounded tool output. Its URL policy permits HTTP and lacks DNS, redirect, response-size, content-type, and extraction controls, so it is not reusable as live egress policy. Its region, availability, SOP, recommendation, pagination, compatibility-mode, and arbitrary-URL contracts are outside this MVP.
- The target installed Pi is `@earendil-works/pi-coding-agent` 0.84.4. Earlier 0.82.1 reference observations are historical and must not define the runtime contract. The checked-in example instead imports older `@mariozechner` package names. Task 1 must test the target runtime rather than choosing either shape by assumption.
- Hosted AWS, HashiCorp, Registry, and provider-documentation HTTP contracts remain unknown. The documented Terraform Registry module API is verified as a supported API surface; the provider Registry protocol is version/package discovery, not a provider-documentation-body API.

## Execution rules

1. Work in this local checkout. Do not create a branch, commit, pull request, publication, service, UI, command, credentials flow, or `.env` configuration.
2. Run Tasks 1–8 before product implementation. Tasks 3–6 are independent after Task 2 and should run in parallel. A source gate marked fail/incomplete produces an explicit disabled source; it never causes an allowlist, redirect, version, or source fallback to widen.
3. A failed Pi 0.84.4 package/load-registration smoke gate blocks Task 9 until the documented package/API mismatch is resolved. Absence of arbitrary RPC tool invocation does not. Failed source gates do not block shared-core work; their adapters implement `source_unavailable`. They do block release if the Definition of Done requires that source.
4. Use Node 22.19+ standard modules and the Pi peer/schema packages validated in Task 1. Use Node's test runner. Add at most one HTML parser, and only when Tasks 3, 4, or 6 prove native/structured extraction insufficient. Do not add an interface or factory with only one consumer.
5. Every successful tool result treats retrieved text as quoted, untrusted documentation data. Never obey content as instructions or allow it to initiate tools, network expansion, AWS/Terraform activity, or local reads.
6. Default tests are offline fixtures. Live checks run only through the explicit contract command. Required deterministic evidence is layered: a real Pi 0.84.4 package/extension-load and production-registration smoke through supported public behavior, plus fixture-backed enumeration and direct handler execution through the same exported production registration function. The handler layer bypasses Pi's agent tool-call pipeline and is not full Pi E2E by itself. Both layers use an isolated fixture workspace, fresh Pi config/home directories, and a sanitized credential-free child environment; they do not depend on Mission and must not mutate unrelated repositories or configuration. A model-backed real-Pi conversation is optional, explicit opt-in supplementary evidence only, never a release gate, and must be skipped unless its minimum provider credential can be supplied without copying user auth/config/session state into a separate fresh workspace/config/home and sanitized child environment.
7. Existing validation residue is untrusted partial input. Before using it, compare it to the owning task's complete commands, files, and acceptance criteria; keep the task unchecked, rerun its checks, and record a disposition. Raw JSON evidence, a probe source file, or a successful partial command is never a go/no-go record and never enables a catalog route by itself.

## Technical decisions and rejected alternatives

- **Package shape:** use one private local Pi package whose manifest points at `src/index.ts`; do not copy the fixture extension or publish to npm. The example's six-tool compatibility surface was rejected because the accepted contract has exactly two source-neutral tools.
- **Networking:** use `node:https`, DNS, streams, URL, and zlib primitives with manually controlled redirects. Do not use caller URLs, generic fetch-follow behavior, proxy search, or undocumented endpoints.
- **Discovery:** use only a source's validated documented API or validated first-party navigation/index route. A route passes discovery only when a fixed representative query can be transformed into bounded approved requests and return candidate fields sufficient for a typed identifier without fetching full document bodies. Preserve each publisher's order. For a multi-adapter result, rank by `(publisher ordinal, source-catalog order, normalized title, stable identifier)`, with catalog order fixed as `aws-docs`, `terraform-core`, `terraform-registry-provider`, then `terraform-registry-module`; do not claim cross-publisher relevance beyond that deterministic merge. Do not build a mirror, crawler, embedding index, or third-party search integration. `docs_search.limit` has a hard ceiling of 50 results; 8 remains the default.
- **Cache:** use a bounded process-memory cache only. Disk persistence is unnecessary and has unresolved content-reuse implications. Current entries live 15 minutes and exact-version entries 24 hours. The MVP does not return stale fallback because no accepted stale retention horizon exists; expired entries are never labeled fresh, and responses still carry `stale: false`. A later stale fallback requires a separate bounded-retention decision and must set `stale: true`.
- **Diagnostics:** emit no telemetry and no request/body logs. Typed, redacted errors provide sufficient MVP diagnostics; an optional logger abstraction was rejected.
- **Tool-output envelope:** the accepted `docs_fetch.output_limit` remains a Unicode-character request with a 12,000 default and 50,000 maximum. Task 1 must verify Pi 0.84.4's exported `DEFAULT_MAX_BYTES`/`DEFAULT_MAX_LINES` and their counting behavior; the earlier 0.82.1 51,200-byte/2,000-line observation is historical, not target evidence. Character selection happens first, then the complete framed result (metadata, excerpt or candidates, boundaries, and truncation notice) is reduced to the validated Pi byte/line envelope. This compatibility rule may return fewer excerpt characters or search candidates than requested but never rejects an otherwise valid limit at or below 50,000. Raw/full bodies are never written to a temporary file; the canonical citation and narrower `section` fetch are the continuation path.
- **Provider/module boundary:** the documented Registry module API is one adapter. Provider documentation is a separate adapter that may use a validated Registry HTML route or a validated version-pinned official upstream fallback. The provider protocol may resolve provider versions but never stands in for documentation text.

## Tasks

### 1. Validate the current Pi API and local package-loading contract

- [ ] Build and run a disposable one-tool package probe, then record a pass/fail Pi contract tied to the exact installed Pi and Node versions.

#### Why

The local example uses older package names, while the currently readable official reference describes the `@earendil-works` API. Product code cannot start until loading and tool behavior are observed on the target runtime.

#### How

Depends on: none. First audit all stopped Objective 12 residue applicable to this task: `validation/pi-package/index.ts`, `validation/pi-package/package.json`, and `validation/pi-reload-project/.pi/settings.json`. Record whether each is reused, corrected, or replaced; its presence does not complete a task. Create or finish a minimal private package with one `pi_contract_probe` tool and no product logic. On installed Pi 0.84.4, record runtime/package versions, package discovery from a local directory, project trust behavior, the supported public load/registration-smoke seam and its exact command/protocol, `defineTool` or `registerTool` shape, Google-compatible enum schema, `execute` arguments, progress update, `details`, thrown-error rendering (`isError`), active cancellation, `/reload`, exported `DEFAULT_MAX_BYTES`/`DEFAULT_MAX_LINES` values and UTF-8-byte/logical-line counting behavior, and outbound-request capability.

Make the real-process registration observation concrete with a test-only observer extension that registers no tool or command. Load only the probe package and observer after `--no-extensions`, disable built-ins and context discovery, and use non-session RPC mode under the isolated environment after confirming those exact 0.84.4 flags. In `session_start`, the observer uses the public `pi.getAllTools()`/`pi.getActiveTools()` metadata seam, emits one nonce-tagged body-free RPC notification containing only the observed tool names/source kinds, and requests graceful shutdown after the harness receives a normal RPC response. The expected product-free list is only `pi_contract_probe`. This proves that a real Pi process loaded the local package and ran registration without inventing a tool-invocation RPC command. Validate success/progress/details, thrown failure, cancellation, and schema behavior through the supported SDK/wrapped-definition or captured-definition harness as appropriate, and label any direct execution as bypassing the agent tool-call pipeline; only an actually observed agent-pipeline check may be credited as Pi `isError` rendering. Do not search indefinitely for arbitrary RPC tool invocation or require a future direct tool-runner API.

Do not access `.env`. Run every Pi child with a fresh `PI_CODING_AGENT_DIR` and `HOME` under a disposable validation workspace and an explicit environment allowlist containing only required runtime variables plus `PI_OFFLINE=1`; do not inherit provider, cloud, Registry, GitHub, or other credential variables. Validate the exact Pi 0.84.4 command/flags before recording them. Test both explicit-path loading and trusted project auto-discovery/reload when supported; the record distinguishes a supported smoke result from an unavailable mode rather than inventing a substitute. Invoke the probe only through the supported process/SDK/direct-definition behavior assigned above; any outbound-capability check may contact only an in-process loopback listener opened and closed by the tool, never a public host. **Smallest runnable check:** the observer protocol starts real Pi 0.84.4 in isolated configuration, loads the same probe package, reports only `pi_contract_probe`, observes its registration source, and neither loading mode registers a `docs_*` tool; the separately labelled execution check covers schema, success/details/progress, failure, and cancellation without a hosted model. **Traceability:** specification “Package, dependencies, and testing,” “Public tools,” and acceptance criteria 1 and 7; [08 D-005](08-decision-log-and-agenda.md#d-005-pi-0844-testing-evidence); [03 official Pi verification queue](03-pi-extension-architecture.md#official-pi-verification-queue).

#### Where

- `validation/pi-package/package.json`
- `validation/pi-package/index.ts`
- `validation/pi-smoke-observer.ts`
- `validation/pi-reload-project/.pi/settings.json`
- `development-docs/validation/01-pi-contract.md`

#### Acceptance criteria

- The record names exact Node, Pi 0.84.4, schema-package, module format, the exact observer-based public package-load/registration-smoke command/protocol and expected tool metadata, the separately labelled SDK/direct execution seam, isolated config/home and sanitized-environment method, each Objective 12 residue file's reuse/correct/replace disposition, exported tool-output byte/line constants and counting semantics, and observed results; screenshots are optional, but transcript excerpts contain no prompts, credentials, local paths, or bodies.
- Pass requires the supported load/registration smoke, schema validation, success/details, thrown error, cancellation, and reload behavior to be reproducible. Failure states the incompatible package/API behavior and blocks Task 9 and Task 28; absence of arbitrary RPC tool invocation does not.
- The probe registers no `docs_*` product tool and is excluded from the product package.

### 2. Create a body-safe hosted-source contract probe

- [ ] Create one Node-native probe used only to collect reproducible source-gate metadata without storing source bodies or secrets.

#### Why

Tasks 3–6 need comparable evidence for redirects, headers, sizes, and access policy; ad hoc commands would make gate decisions unrepeatable.

#### How

Depends on: none. Audit the stopped Objective 12 `validation/source-contract-probe.mjs`, record in the validation README whether it was reused, corrected, or replaced, and rerun its self-test; its current presence is not Task 2 completion. Implement or finish a CLI that accepts a checked-in target definition, sends HTTPS GET/HEAD with no auth/cookies, follows redirects manually up to three while enforcing the target allowlist, and reports requested/final URL, redirect statuses/locations, DNS/IP class, status, content type, encoded/decompressed byte counts, canonical link, validators/cache headers, latency, robots/terms targets, and a body hash plus bounded structural markers. Never print or persist a body, authorization value, cookie, full query string, local path, or environment. The probe is evidence tooling, not the product HTTP client. **Smallest runnable check:** `node validation/source-contract-probe.mjs --self-test` must prove redirect-limit, redaction, and no-body output against its in-process fixture server. **Traceability:** specification “Source strategy and validation gates,” “Security, resources, cache, and privacy”; [06](06-operational-security-and-rights.md).

#### Where

- `validation/source-contract-probe.mjs`
- `development-docs/validation/README.md`

#### Acceptance criteria

- `--self-test` passes without external network access and detects a redirect loop, wrong content type, oversized response, and a redaction sentinel.
- The README defines the required evidence fields and a binary pass/fail/incomplete outcome; “not observed” is never rewritten as pass.
- The probe has exact target allowlists and cannot be pointed at an arbitrary URL.

### 3. Gate AWS service-guide and API-reference routes

- [ ] Produce an AWS-specific go/no-go record for bounded discovery and read routes covering at least one service guide and one API reference.

#### Why

AWS hosted terms, robots, discovery, redirects, extraction, cache, and reuse were not observed in discovery; archived `awsdocs` repositories are not current-source evidence.

#### How

Depends on: Task 2. Audit the existing `validation/sources/aws.json` and `validation/evidence/aws-2026-09-01.json`, record their disposition in the AWS gate record, and rerun the approved command; the raw JSON is observation input, not a gate outcome. Probe representative `docs.aws.amazon.com` guide/API families across at least two pages, plus current robots and terms targets. Record exact approved host/path templates, any first-party discovery/navigation route, canonical/redirect behavior, public unauthenticated access, content types/sizes, extraction markers, validators, polite rate observations, attribution/reuse decision, and reviewer/date. A discovery pass must run fixed representative queries both with and without `service_or_product`, record the query-to-approved-route transformation, and return bounded guide/API candidate fields sufficient for later typed identifiers; a landing page that cannot answer a query is not discovery evidence. Do not probe archived `awsdocs`, Marketplace, re:Post, account APIs, or arbitrary services. **Smallest runnable check:** `node validation/source-contract-probe.mjs validation/sources/aws.json`, inspect the two fixed-query outcomes, and repeat one page to compare stable structure/cache metadata. **Traceability:** specification “Product” AWS corpus, “Source strategy and validation gates,” acceptance criteria 2 and 5; [04 AWS](04-documentation-source-research.md#aws).

#### Where

- `validation/sources/aws.json`
- `development-docs/validation/02-aws-source-contract.md`

#### Acceptance criteria

- Pass identifies one bounded query-capable discovery route and one bounded read route, approved host/path rules, canonicalization, extraction markers, and attribution/cache permission; evidence includes requested/final URLs, timestamps, and candidate identifier components.
- Fail/incomplete leaves `aws-docs` unavailable and records whether discovery, read, or both failed; it never substitutes archived GitHub content or third-party search.
- Every approved AWS path is HTTPS/public/unauthenticated and within the 3-redirect, 5 MiB, expected-content constraints.

### 4. Gate HashiCorp Terraform language and CLI routes

- [ ] Produce a HashiCorp-specific go/no-go record for current and explicit-version Terraform language/CLI discovery and retrieval.

#### Why

The first-party source tree proves version lines exist, but hosted routes, retained versions, canonicalization, discovery, extraction, and reuse remain unverified.

#### How

Depends on: Task 2. Audit the existing `validation/sources/terraform-core.json` and `validation/evidence/terraform-core-2026-09-01.json`, record their disposition in the Terraform core gate record, and rerun the approved command; the raw JSON is observation input, not a gate outcome. Probe representative language and CLI pages for latest plus one exposed version line, current robots/terms, and any first-party documented navigation/index route. Record route templates, requested/resolved core version, redirect/canonical behavior, auth/rates, cache validators, extraction stability, content reuse/attribution, and unsupported-version behavior. A discovery pass must execute fixed language and CLI queries for current and exact-version inputs, record each query/product/version-to-route transformation, and return bounded candidate fields sufficient for later typed identifiers; navigation that cannot answer those queries fails discovery. Source repositories can corroborate provenance but do not by themselves approve hosted behavior. **Smallest runnable check:** `node validation/source-contract-probe.mjs validation/sources/terraform-core.json`, inspect the fixed-query outcomes, then run one deliberately unavailable version probe. **Traceability:** specification “Corpus and version semantics,” “Source strategy and validation gates”; [04 Terraform](04-documentation-source-research.md#terraform).

#### Where

- `validation/sources/terraform-core.json`
- `development-docs/validation/03-terraform-core-source-contract.md`

#### Acceptance criteria

- Pass covers both language and CLI query discovery/read and proves latest plus exact-version behavior without silent substitution.
- Pass names a bounded query-capable first-party discovery mechanism; absent discovery or read approval keeps the affected capability unavailable.
- Fail/incomplete returns `source_unavailable` for this adapter and becomes a Terraform-corpus release blocker, without using third-party search or a mirror.

### 5. Gate the documented Terraform Registry module API

- [ ] Produce a Registry-module API go/no-go record for search, latest metadata, exact metadata, version lists, and documentation/readme fields.

#### Why

The API surface is documented, but its live redirects, anonymous access, rate behavior, payload limits, and content reuse still require observation.

#### How

Depends on: Task 2. Audit the existing `validation/sources/registry-module.json` and `validation/evidence/registry-module-2026-09-01.json`, record their disposition in the Registry module gate record, and rerun the approved command; the raw JSON is observation input, not a gate outcome. Probe only documented `/v1/modules/` operations with fixed public module identifiers. Exercise search, latest, exact version, version list, mutable latest redirects, unavailable exact version, content/readme metadata, 429 behavior if safely observable, validators, and attribution/terms. Treat undocumented properties as optional data and never call Registry UI/internal endpoints. **Smallest runnable check:** `node validation/source-contract-probe.mjs validation/sources/registry-module.json` and compare latest versus an exact version. **Traceability:** specification “Source strategy and validation gates,” module version semantics; [04 Registry modules](04-documentation-source-research.md#terraform), [05 Workflow C](05-workflows-and-tool-boundaries.md#workflow-c-find-terraform-registry-module-documentation).

#### Where

- `validation/sources/registry-module.json`
- `development-docs/validation/04-registry-module-api-contract.md`

#### Acceptance criteria

- Pass separately records module search, latest, exact, version-list, and readme/documentation capabilities with requested/resolved module versions.
- A missing exact version is observed as a clear miss and never replaced by latest.
- Fail/incomplete disables only `terraform-registry-module`; it does not authorize an undocumented Registry endpoint.

### 6. Gate provider-documentation discovery/retrieval and its pinned upstream fallback

- [ ] Produce separate go/no-go outcomes for provider-documentation discovery, Registry provider HTML, and a version-pinned official upstream repository fallback.

#### Why

The documented provider Registry protocol discovers versions/packages but does not provide documentation bodies or prove `docs_search` discovery. Provider discovery/retrieval must not be conflated with the module API.

#### How

Depends on: Task 2. Audit the existing `validation/sources/registry-provider.json` and `validation/evidence/registry-provider-2026-09-01.json`, record their disposition in the provider gate record, and rerun the approved command; the raw JSON is observation input, not a gate outcome. Validate provider version discovery only through the documented protocol, then independently validate bounded provider-documentation query/index discovery and current/exact provider documentation HTML routes for canonical version resolution, extraction, rates, terms/robots, caching, and attribution. Run one fixed unconstrained provider-doc query and one query constrained by provider address/version; record the query-to-route transformation and candidate fields sufficient for a typed provider-doc identifier. Also validate one official provider-address-to-repository mapping and exact tag/commit documentation path, provenance, license/reuse, host/API limits, and any query/listing needed to discover documents on that fallback. A protocol response is never documentation-search or body evidence; a mutable branch is never an exact-version fallback. **Smallest runnable check:** `node validation/source-contract-probe.mjs validation/sources/registry-provider.json` with both fixed queries, one exact provider version, and one nonexistent version. **Traceability:** specification provider fallback rule and source gates; [04 Registry providers](04-documentation-source-research.md#terraform), [05 Workflow B](05-workflows-and-tool-boundaries.md#workflow-b-find-terraform-provider-documentation).

#### Where

- `validation/sources/registry-provider.json`
- `development-docs/validation/05-registry-provider-docs-contract.md`

#### Acceptance criteria

- The record has independent `discovery`, `registry_html`, and `upstream_pinned` outcomes and identifies which discovery/body combination, if any, may serve provider documentation.
- Pass proves bounded query-to-candidate discovery and exact provider address/version to exact documentation provenance; latest first resolves a provider version, then retrieves that same version.
- If no complete discovery-plus-body combination passes, `terraform-registry-provider` remains unavailable and release is blocked; module APIs, protocol metadata alone, undocumented UI APIs, arbitrary repositories, and mutable branches are not fallback options.

### 7. Synthesize validation outcomes into an executable gate matrix

- [ ] Record every Pi/source capability as enabled, disabled, or blocked with its exact approved routes and release effect.

#### Why

Implementation must continue safely when an adapter fails while preventing failed evidence from being treated as an implicit approval.

#### How

Depends on: Tasks 1, 3, 4, 5, 6. Kind: specification. Build a matrix for Pi loading, AWS discovery/read, Terraform core language/CLI discovery/read/versioning, Registry module API operations, provider-documentation discovery, provider Registry HTML, and provider pinned-upstream fallback. For each row cite the gate record, approved hosts/paths/content types, version semantics, parser need, cache/reuse decision, and failure error. Mark unknown facts incomplete, not pass. **Smallest runnable check:** a reviewer can select each planned adapter and find exactly one gate row that determines enabled or `source_unavailable`. **Traceability:** specification “Source strategy and validation gates,” implementation acceptance criteria 3 and 5.

#### Where

- `development-docs/validation/06-gate-matrix.md`

#### Acceptance criteria

- Every source family has separate discovery and fetch status; module API and provider documentation are distinct rows.
- A failed row contains no approved route and explicitly names the adapter capability that stays unavailable.
- The release column requires Pi pass and discovery plus fetch to pass for at least one validated AWS service-guide route and at least one validated AWS API-reference route (they may share a discovery mechanism and host/path template), Terraform language and CLI, Registry modules, and provider documentation through one validated discovery-plus-body combination.

### 8. Independently critique and amend validation readiness

- [ ] Have a reviewer who did not author Tasks 1–7 challenge the evidence and close every material readiness gap before package work.

#### Why

A self-approved gate can miss rights, SSRF, version, or source-boundary assumptions; the final matrix must reflect critique rather than merely append it.

#### How

Depends on: Task 7. Kind: specification. Review every pass against its raw probe command/evidence, the accepted spec, and the prohibited-source list. Check terms/robots ownership, discovery legitimacy, provider/module separation, redirect/DNS assumptions, version exactness, parser need, and release impact. Amend the matrix and, only where observed facts change an implementation assumption (never accepted scope), the specification's validation status. A material finding is closed by corrected evidence, a disabled route, or an explicit release blocker; “accept risk” without user authority is not closure. **Smallest runnable check:** the review has a disposition and closure reference for every finding and zero unresolved material findings. **Traceability:** specification source gates and Definition of Done; [07 primary risks](07-mvp-risks-and-validation.md#primary-risks).

#### Where

- `development-docs/validation/07-independent-readiness-review.md`
- `development-docs/validation/06-gate-matrix.md`
- `development-docs/09-product-and-technical-specification.md`

#### Acceptance criteria

- An independent reviewer and review date are named; every gate pass is either upheld with evidence or amended.
- No accepted decision or explicit deferral is reopened, and no unavailable source is promoted by assumption.
- Task 9 is unblocked when the Pi 0.84.4 package/load-registration smoke row passes; lack of arbitrary RPC tool invocation is not a blocker. Source failures remain encoded and release blockers are explicit.

### 9. Establish the private local package baseline

- [ ] Add the smallest reproducible TypeScript Pi package and Node-native test/typecheck scripts using versions proven by Task 1.

#### Why

The repository currently has no package/runtime baseline, and source work needs one reproducible local install contract.

#### How

Depends on: Tasks 1, 8. The baseline is blocked only by an incompatible Pi 0.84.4 package/load-registration smoke result, not by absence of arbitrary RPC tool invocation. Create a private, non-publishable package with a `pi.extensions` entry for `src/index.ts`, Node engine from the Pi gate, validated Pi/schema peer dependencies, dev dependencies for typechecking, and exact scripts `"typecheck": "tsc --noEmit"` plus `"test": "node --test --experimental-strip-types tests/*.test.ts"`; the flat default glob is the offline boundary. Add the minimal loadable `src/index.ts` factory that registers no tool and starts no resource; Task 23 later wires the product tools into this same file. Add one flat baseline test so the initial `test` and typecheck scripts have real inputs and can keep live tests under `tests/contracts/` excluded by default. Generate one lockfile. Create a minimal root `README.md` that says this is a not-yet-implemented local package baseline, registers zero tools at this task, requires no credentials or `.env`, and will be completed by Task 26; it must not claim any source works. Add a package `files` allowlist limited to `src/`, `README.md`, and npm-required package metadata so validation probes, development documents, tests/fixtures, local state, and `.env` cannot enter a tarball. Add at most the one parser approved by the gate matrix; otherwise add none. Do not add dotenv, HTTP, cache, logging, test-framework, UI, or CLI dependencies. **Smallest runnable check:** `npm ci --ignore-scripts && npm ls --depth=0 && npm run typecheck && npm test && npm pack --dry-run`. **Traceability:** specification “Package, dependencies, and testing”; decision groups 6–7.

#### Where

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `README.md`
- `src/index.ts`
- `tests/package-baseline.test.ts`

#### Acceptance criteria

- The manifest is `private`, has no publish script, exposes one loadable Pi extension entry, requires no credentials or `.env`, and has an allowlist-only tarball surface; the baseline factory registers zero tools and opens no resource.
- `npm ci --ignore-scripts`, `npm run typecheck`, and the baseline offline test script succeed on the validated Node version; the lockfile is current.
- Runtime dependencies are zero except one gate-justified HTML parser; Pi and TypeBox packages follow the validated peer-development pattern.
- The baseline README makes no implemented-tool/source claim, and the dry-run tarball contains only runtime source, that README, package metadata, and required license material; it excludes validation, development docs, tests/fixtures, local state, and `.env`.

### 10. Define source-neutral identifiers, versions, results, and errors

- [ ] Implement and test the discriminated contracts that prevent URLs and cross-family versions from entering public operations.

#### Why

The example's AWS URL rows and five error codes cannot represent the accepted four source families, provenance, stale state, or exact-version failure.

#### How

Depends on: Task 9. Define structured identifiers for AWS docs, Terraform core, Registry modules, and Registry providers; source-specific requested/resolved versions; candidates/documents; cache/retrieval/truncation metadata; adapter capability; and all required error codes (`validation_error`, `invalid_url`, `not_found`, `source_unavailable`, `throttled`, `timeout`, `downstream_error`). Fetch truncation metadata must carry the requested character limit and returned excerpt character count; search truncation metadata must carry requested, available, and returned candidate counts. Both carry final UTF-8 byte/logical-line counts and ordered applicable reasons drawn from character limit, Pi byte limit, and Pi line limit. Add runtime validators because tool input is untrusted. Reject strings/URL fields, mixed version dimensions, malformed provider/module addresses, and incompatible source/filter combinations. **Smallest runnable check:** `node --test --experimental-strip-types tests/contracts.test.ts`. **Traceability:** specification “Terminology,” “Corpus and version semantics,” “Public tools,” and “Errors”; Task 1's Pi output contract.

#### Where

- `src/contracts.ts`
- `src/errors.ts`
- `tests/contracts.test.ts`

#### Acceptance criteria

- Identifiers contain only approved structured fields and cannot carry a URL, host, path traversal, credential, or generic cross-family version.
- Exact-version contracts preserve requested and resolved values; mismatch fails `not_found` rather than becoming latest.
- Every required output metadata field, Pi-compatible truncation reason/count, and error code has a tested runtime representation with redacted details.

### 11. Encode the validated source catalog and disabled capabilities

- [ ] Convert the amended gate matrix into the only code-level host/path/content/discovery catalog used by adapters.

#### Why

Network policy must consume exact approved routes, and failed gates need deterministic `source_unavailable` behavior without environment switches.

#### How

Depends on: Tasks 8, 10. Add a small immutable catalog keyed by source capability, containing only passed hosts, port 443, path templates, expected media types, version behavior, evidence references, and the fixed merge order from the discovery decision. Disabled/incomplete rows contain a reason and no route. Keep Registry module operations separate from provider docs and provider version discovery. Do not add arbitrary endpoint configuration. **Smallest runnable check:** `node --test --experimental-strip-types tests/sources.test.ts`. **Traceability:** specification “Source strategy and validation gates,” security allowlist requirement, acceptance criterion 5.

#### Where

- `src/sources.ts`
- `tests/sources.test.ts`

#### Acceptance criteria

- Catalog entries correspond one-for-one with gate-matrix rows and tests reject a route not present in passed evidence.
- Disabled capabilities expose no request builder and return a source/evidence-specific `source_unavailable` reason.
- No archived `awsdocs`, undocumented Registry UI/internal endpoint, arbitrary URL, third-party search, deferred source, credential, or environment override appears.

### 12. Enforce destination, DNS, and redirect policy

- [ ] Implement and adversarially test the network policy used before connection and on every redirect.

#### Why

The example validates only protocol/host/path and would not prevent DNS rebinding, private-address connections, or redirect escapes.

#### How

Depends on: Tasks 10, 11. Use URL and `node:net`/DNS primitives to accept only catalog-built HTTPS URLs on port 443 with no credentials. Reject IPv4/IPv6 loopback, private, link-local, multicast, documentation, benchmark, carrier-grade NAT, reserved, unspecified, metadata-service, IPv4-mapped, and other non-public classes. Resolve all addresses, pin an approved address through the HTTPS request's lookup hook, and preserve the original approved hostname for the HTTP `Host` header, TLS SNI, and default certificate/hostname verification; never set `rejectUnauthorized: false`. Verify the connected remote address and repeat the complete check for every redirect; reject mixed public/private answers and more than three redirects. **Smallest runnable check:** `node --test --experimental-strip-types tests/network.test.ts`. **Traceability:** specification security bullets 1–3; [06 network security](06-operational-security-and-rights.md#network-and-content-security).

#### Where

- `src/network.ts`
- `tests/network.test.ts`

#### Acceptance criteria

- Tests cover literal and DNS-resolved private/reserved IPv4/IPv6, IPv4-mapped IPv6, localhost/metadata names, credentials, HTTP, ports, path/host confusion, redirect loops, fourth redirect, public-to-private redirect, DNS answer change, pinned-IP Host/SNI preservation, and certificate/hostname mismatch rejection.
- Every request URL originates from a typed identifier plus a catalog route; no public API accepts a URL.
- Connection uses the validated pinned address and fails `invalid_url` before body processing when destination identity changes.

### 13. Implement bounded HTTPS retrieval, decoding, cancellation, and rate handling

- [ ] Implement one guarded GET path with fixed connection/total/byte limits and deterministic upstream error mapping.

#### Why

Live documents are untrusted network input and can hang, throttle, lie about type/length, or expand after decompression.

#### How

Depends on: Tasks 10, 11, 12. Use `node:https` with manual redirects and the caller `AbortSignal`; send no cookies/auth/referrer/local data. Enforce 5-second connect and 20-second total deadlines, expected text/HTML/JSON/Markdown types, and 5 MiB caps on both wire and decompressed bytes. Bound per-host concurrency to the gate-recorded limit, or one in-flight request when none is published. Retry at most once only for an idempotent GET with a valid server `Retry-After` that fits the total deadline; otherwise return `throttled`/guarded error. Stream gzip/br/deflate through capped decoding and cancel sockets/readers on every failure. **Smallest runnable check:** `node --test --experimental-strip-types tests/http.test.ts`. **Traceability:** specification security/resource bullets 3–5 and typed errors.

#### Where

- `src/http.ts`
- `tests/http.test.ts`

#### Acceptance criteria

- Tests cover connect timeout, total timeout, cancellation, wrong/missing content type, declared and streamed oversize bodies, gzip/brotli/deflate expansion bombs, truncated compression, 429 with valid/invalid/absent `Retry-After`, bounded concurrency, retry exhaustion, socket error, and body disposal.
- A response crossing either 5 MiB boundary is aborted and never cached or parsed.
- Errors contain source/status/category only—never body, credentials, cookies, full query, remote/internal IP, or local path.

### 14. Extract bounded text while preserving the untrusted-data boundary

- [ ] Implement source-marker-driven extraction, section selection, quoting, and character truncation for validated media types.

#### Why

Documentation can contain active/hidden HTML and indirect prompt injection; raw pages cannot be sent to Pi as instructions.

#### How

Depends on: Tasks 10, 11. Use validated main-content roots/structural markers and, only if the matrix requires it, the single approved parser. Remove scripts, styles, templates, forms, frames, comments, active embeds, unsafe link/image payloads, elements with `hidden` or `aria-hidden="true"`, elements hidden by inline `display:none`/`visibility:hidden`, and source-specific hidden classes/markers proven by the gate. Do not claim to evaluate an external CSS cascade: if safe extraction depends on unbounded computed-style evaluation rather than the validated root/markers, the extraction gate fails and that route stays disabled. Parse structured Registry JSON defensively. Keep visible hostile prose as data inside explicit `UNTRUSTED DOCUMENTATION EXCERPT` boundaries, never as guidance. Support exact source headings when present, return a clear miss for absent/unsupported sections, and select at most the requested number of Unicode code points without splitting a UTF-16 surrogate pair or UTF-8 sequence (the default/ceiling are applied by the service). Return pre/post character counts and whether the character limit removed content; Task 16, not extraction, applies the complete-result Pi byte/line envelope. **Smallest runnable check:** `node --test --experimental-strip-types tests/extract.test.ts`. **Traceability:** specification `docs_fetch` output, untrusted-content requirement, acceptance criteria 2 and 6; Task 1's Pi output contract.

#### Where

- `src/extract.ts`
- `tests/extract.test.ts`
- `tests/fixtures/malicious-document.html`

#### Acceptance criteria

- Tests remove active/hidden nodes and deceptive metadata while retaining visible documentation text and headings.
- Prompt-injection fixtures containing tool requests, data-exfiltration instructions, encoded text, fake system prompts, and hostile links remain visibly quoted data and produce no network/tool/local-file action.
- Section misses, malformed HTML/JSON/Markdown, empty extraction, ASCII/multibyte Unicode boundaries, exact character-limit output, and character-truncation metadata are deterministic and typed.

### 15. Add a bounded in-memory cache with exact freshness semantics

- [ ] Implement and test current-versus-explicit cache keys, TTLs, eviction, and visible cache state.

#### Why

Latest content must not satisfy an explicit version, and expired data must not appear fresh.

#### How

Depends on: Tasks 10, 11. Use one process-memory Map for successful bounded normalized fetch records. Key it by source kind, typed canonical identity known before lookup, requested version selector (`latest` sentinel or exact requested value), and section/extraction dimensions; store the resolved version in the value and reject an exact requested/resolved mismatch before insertion. This makes a latest lookup possible before the network response reveals a resolved version while keeping latest and exact entries isolated. Apply 15 minutes to latest selectors and 24 hours to exact selectors, with an injected clock and a 32 MiB total-value ceiling using insertion-order LRU eviction. Query-specific publisher search responses bypass this cache so no query text or query hash is retained; only a gate-approved query-free navigation/index record may be cached under its catalog identity. Cache metadata must represent `bypass`, `miss`, and `hit`. Never cache prompts, errors, credentials, raw bodies, or requests that failed policy/extraction. Retain no disk state and return no stale fallback in MVP. **Smallest runnable check:** `node --test --experimental-strip-types tests/cache.test.ts`. **Traceability:** specification cache bullets and output metadata; [06 freshness](06-operational-security-and-rights.md#freshness-and-caching).

#### Where

- `src/cache.ts`
- `tests/cache.test.ts`

#### Acceptance criteria

- Fake-clock tests prove a latest hit before version resolution, 15-minute latest and 24-hour exact boundaries, separate selector keys, canonical/version isolation, exact mismatch rejection, bypass/hit/miss age metadata, 32 MiB eviction, and no error/raw-body caching.
- Expired entries are never returned as fresh; a failed refresh returns its typed error with `stale: false` rather than stale content.
- Cache keys and diagnostics omit full query strings, query text/hashes, prompts, credentials, cookies, authorization, bodies, and local paths.

### 16. Assemble provenance-rich results and privacy-safe failures

- [ ] Implement one formatter for successful search/fetch metadata and one redaction boundary for all failures.

#### Why

Every adapter must report provenance consistently, and thrown upstream errors must not leak bodies or local/network internals through Pi.

#### How

Depends on: Tasks 10, 14, 15. Build search candidates and fetched documents with publisher, title, source family, typed identifier, canonical URL, requested/resolved source-specific version, retrieval timestamp, cache state/age, `stale`, content state, truncation state, and citation. Format fetched text as quoted untrusted data. Apply one final head-preserving output-budget algorithm using the Pi 0.84.4 byte/line constants and logical-line semantics verified in Task 1. First build the complete result after Task 14's requested-character selection and measure whether that complete text exceeds the byte limit, the line limit, or both. If it does not fit, reserve the complete mandatory prefix, closing untrusted-data boundary, provenance, and bounded truncation notice, then choose the longest Unicode-code-point excerpt prefix for which the entire final text fits both Pi limits. For search, add only complete candidate records in deterministic rank order and drop the tail records needed to fit; never split an identifier or citation. Record only constraints that removed content, in fixed reason order: character limit when the pre-selection source exceeded the requested characters, then Pi byte limit when the complete character-bounded text exceeded it, then Pi line limit when that same complete text exceeded it. Measure the final text again with `Buffer.byteLength(text, "utf8")` and the Task 1/Pi logical-line semantics after the notice is present. If the mandatory envelope alone cannot fit, throw a bounded redacted `downstream_error` rather than emit oversized content. Map other internal failures to the required codes/messages and emit no console/request telemetry. Synthetic stale records used in tests must display `stale: true`, even though Task 15 does not produce them. Never store an omitted/full body in `details` or a temporary file; point the notice to the canonical citation and optional narrower `section` request. **Smallest runnable check:** `node --test --experimental-strip-types tests/results.test.ts`. **Traceability:** specification tool output contracts, errors, privacy, acceptance criteria 2 and 6; installed Pi `docs/extensions.md` “Output Truncation” and Task 1's observed constants.

#### Where

- `src/results.ts`
- `tests/results.test.ts`

#### Acceptance criteria

- Every fetch success fixture has a canonical URL; every search candidate has one when the source resolved it. All success fixtures have retrieval time, citation/publisher, cache metadata (including search `bypass` where applicable), content/truncation state, and resolved version when exposed.
- Tests prove the complete final text, including framing/metadata/notice, is at most the validated Pi byte and line limits for ASCII, 4-byte Unicode, a single long line, more than 2,000 lines, exact boundaries, and simultaneous byte/line truncation; no malformed Unicode, incomplete candidate, or inaccurate reason/count is emitted.
- Error tests inject body, auth, cookie, query, prompt, local-path, and private-IP sentinels and find none in message/details/console output; an impossible mandatory envelope fails with one bounded error.
- Tool-visible text names the untrusted-data boundary and never adds recommendations, commands, or account/deployment claims; truncation writes no raw/full body to disk or `details`.

### 17. Create the reusable offline adapter-test transport

- [ ] Add a minimal fixture transport that exercises real adapter parsing without external network access.

#### Why

Each source adapter needs deterministic offline tests, but duplicating HTTP mocks and clocks in four test files would be larger and less reliable.

#### How

Depends on: Tasks 9, 10, 13. Provide a test-only transport that implements the guarded retrieval seam established by Task 13, returns declared status, headers, redirect sequence, chunks, delay, and body from per-adapter fixtures, and records requested catalog route plus cancellation. It must implement only the seam consumed by adapters and must never ship in the package manifest. **Smallest runnable check:** `node --test --experimental-strip-types tests/fixture-transport.test.ts`. **Traceability:** specification fixture-based/offline-default testing; [02 fixture adapter boundary](02-repository-and-example-assessment.md#reusable-ideas-with-limits).

#### Where

- `tests/fixture-transport.ts`
- `tests/fixture-transport.test.ts`

#### Acceptance criteria

- The helper deterministically simulates success, redirect, chunked body, delay/cancel, 429, and guarded failure without opening a socket.
- It records only approved route metadata and contains no production fallback mode.
- Default test scripts include its self-check and exclude every live contract test.

### 18. Implement the documented Registry module adapter

- [ ] Implement module search/fetch over only the passed documented API operations, or a disabled adapter when its gate failed.

#### Why

Registry modules have the strongest documented discovery/read API and are distinct from provider documentation.

#### How

Depends on: Tasks 5, 11, 13, 14, 15, 16, 17. For a passed gate, map structured module identifiers to documented search/latest/exact/version-list routes, preserve returned publisher order before deterministic lexical ties, normalize readme/documentation text, and cache latest separately from exact. For a failed gate, perform no request and return `source_unavailable`. Ignore undocumented response properties and never follow module download redirects as documentation targets. **Smallest runnable check:** `node --test --experimental-strip-types tests/terraform-module.test.ts`. **Traceability:** specification Registry module corpus/version semantics; [05 Workflow C](05-workflows-and-tool-boundaries.md#workflow-c-find-terraform-registry-module-documentation).

#### Where

- `src/adapters/terraform-module.ts`
- `tests/terraform-module.test.ts`
- `tests/fixtures/registry-module.json`

#### Acceptance criteria

- Offline tests cover ranked bounded search, latest resolution, exact resolution, version list, readme fetch, cache metadata, 429, malformed payload, missing exact version, and explicit/latest cache separation.
- Search results use typed module identifiers; no URL input or undocumented Registry endpoint is accepted.
- The gate-fail fixture makes zero transport calls and returns `source_unavailable` without affecting other adapters.

### 19. Implement the Terraform language and CLI adapter

- [ ] Implement validated first-party Terraform core discovery/fetch/version routing, or keep the capability unavailable.

#### Why

Terraform language/CLI versions are separate from module and provider versions and cannot be inferred from source directories alone.

#### How

Depends on: Tasks 4, 11, 13, 14, 15, 16, 17. Use only the passed HashiCorp navigation/index and page routes. Represent language versus CLI product in typed identifiers, resolve latest at retrieval, echo exact requested/resolved core line, extract source-supported sections, and return unavailable when discovery/read gates fail. Do not use repository content as an undeclared mirror. **Smallest runnable check:** `node --test --experimental-strip-types tests/terraform-core.test.ts`. **Traceability:** specification Terraform language/CLI corpus and source-specific versions; [05 Workflow D](05-workflows-and-tool-boundaries.md#workflow-d-resolve-a-terraform-language-question).

#### Where

- `src/adapters/terraform-core.ts`
- `tests/terraform-core.test.ts`
- `tests/fixtures/terraform-core.html`

#### Acceptance criteria

- Fixtures cover both language and CLI search/fetch, latest, one exact core line, unsupported/unavailable exact version, section miss, extraction/truncation, provenance, and cache state.
- An exact core version never falls back to current and never populates provider/module version metadata.
- A failed discovery/read gate causes zero network calls and a capability-specific `source_unavailable` response.

### 20. Implement provider documentation separately from module APIs

- [ ] Implement provider docs through one passed discovery-plus-body combination, or a disabled provider adapter when no complete combination passed.

#### Why

Provider protocol metadata is neither documentation search nor documentation text, and silent latest/upstream substitution would violate exact-version semantics.

#### How

Depends on: Tasks 6, 11, 13, 14, 15, 16, 17. Search only through the passed provider-doc query/index route. Resolve provider address/version through the documented protocol only where approved, then retrieve docs from the body route paired with that discovery outcome. Prefer passed Registry HTML; use upstream only for a verified address-to-repository mapping and exact tag/commit, visibly label that provenance, and never fall across routes after an explicit version miss. If discovery or every compatible body route failed, disable the whole adapter rather than exposing a partial public-tool path. **Smallest runnable check:** `node --test --experimental-strip-types tests/terraform-provider.test.ts`. **Traceability:** specification provider fallback and exact versions; [05 Workflow B](05-workflows-and-tool-boundaries.md#workflow-b-find-terraform-provider-documentation).

#### Where

- `src/adapters/terraform-provider.ts`
- `tests/terraform-provider.test.ts`
- `tests/fixtures/terraform-provider.html`

#### Acceptance criteria

- Tests keep provider address/version/doc kind distinct from modules and core, and cover bounded search, latest resolution, exact Registry HTML, exact pinned upstream provenance, unavailable exact version, malformed docs, and cache keys.
- Provider protocol responses are used only for version/address discovery and never returned as documentation-search candidates or body content.
- If no complete provider discovery-plus-body combination passed, every provider call makes zero HTTP requests and returns `source_unavailable`; this remains a release blocker.

### 21. Implement the gated AWS documentation adapter

- [ ] Implement AWS guide/API discovery and fetch only for passed host/path families, or keep AWS unavailable.

#### Why

AWS is required for release, but no source route may be enabled from the fixture example or archived repository assumptions.

#### How

Depends on: Tasks 3, 11, 13, 14, 15, 16, 17. Use only the AWS gate's passed first-party discovery/navigation and read routes. Build typed identifiers from validated service/guide/page fields, treat AWS human docs as unversioned unless the gate proves otherwise, distinguish guide from API reference, and extract/cite canonical pages. Do not add re:Post, Marketplace, account/availability calls, archived repositories, recommendations, or API models. **Smallest runnable check:** `node --test --experimental-strip-types tests/aws.test.ts`. **Traceability:** specification AWS corpus, version semantics, source gates, and release requirement.

#### Where

- `src/adapters/aws.ts`
- `tests/aws.test.ts`
- `tests/fixtures/aws-document.html`

#### Acceptance criteria

- Fixtures cover at least one service guide and API reference search/fetch, canonical redirect, section, truncation, content-type/extraction failure, provenance, cache state, and unversioned metadata.
- Typed identifiers cannot escape the passed service/guide path templates and never contain caller URLs.
- A failed AWS gate produces zero transport calls and `source_unavailable`; it does not use archived `awsdocs` or third-party discovery.

### 22. Route source-aware `docs_search` and `docs_fetch` behavior

- [ ] Implement the Pi-independent service layer for bounded discovery, ambiguity, typed fetch, limits, partial availability, and exact versions.

#### Why

Adapters need one public semantic boundary before Pi schemas/rendering, and unavailable adapters must not break working sources.

#### How

Depends on: Tasks 18, 19, 20, 21. Route `docs_search` by AWS/Terraform filter, optional service/product, and exactly one source-specific version dimension. Default to 8 and reject limits above 50. Merge only enabled adapter candidates with the documented tuple `(publisher ordinal, fixed source-catalog order, normalized title, stable identifier)`, preserving each adapter's publisher order and making no unsupported cross-publisher relevance claim. Surface unavailable sources as warnings or `source_unavailable` when specifically selected, and report `cache: bypass` for query-specific discovery unless the adapter used a cached query-free approved index. `docs_fetch` accepts one validated typed identifier, optional supported section, default 12,000 Unicode characters, and hard input maximum 50,000. Apply that character selection before Task 16's final envelope; a valid request at or below 50,000 remains accepted even when multibyte or high-line-count content makes the Pi byte/line compatibility rule return fewer characters. Return bounded choices for ambiguous family/product/version/record selection; never broaden filters. **Smallest runnable check:** `node --test --experimental-strip-types tests/services.test.ts`. **Traceability:** specification “Public tools,” errors, implementation acceptance criteria 1–3; Task 1's Pi output contract.

#### Where

- `src/services.ts`
- `tests/services.test.ts`

#### Acceptance criteria

- Tests cover the 8-result default/50-result search ceiling, deterministic cross-adapter merge order, incompatible filters, all source-specific version dimensions, exact-version failures, unavailable source, partial multi-source results, query-cache bypass, zero results, ambiguity choices, section routing, the 12,000-character default, acceptance at exactly 50,000 characters, and rejection above 50,000.
- Boundary tests cover ASCII and 4-byte Unicode at the product character limits, a 50,000-character fetch reduced by the Pi byte budget, a more-than-2,000-line fetch reduced by the Pi line budget, both Pi limits together, and a 50-candidate search whose tail candidates are dropped whole; final text and truncation metadata match Task 16 exactly.
- Search candidates contain typed identifiers and metadata but no full body; fetch returns exactly one bounded quoted excerpt.
- No URL, arbitrary host, generic version, silent latest substitution, cross-family fallback, recommendation, or deferred operation reaches an adapter.

### 23. Register exactly `docs_search` and `docs_fetch` in Pi

- [ ] Add validated Pi schemas/result handling and register only the two accepted tools over the service layer.

#### Why

The extension package is complete only when real Pi can validate, invoke, cancel, and render the source-neutral contracts.

#### How

Depends on: Tasks 1, 22. Use the exact API/schema imports and output-limit exports proven by Task 1. Define strict Google-compatible schemas with a 500-character query ceiling, 200-character service/product and section ceilings, 200-character identifier segments, and the accepted result/output limits; add tighter source-specific segment rules where the gate requires them. Add source-naming prompt snippets/guidelines, and handlers that pass `AbortSignal`, provide body-free progress, return Task 16's already-budgeted concise text plus bounded structured `details`, verify final UTF-8 byte/logical-line metrics before return, and throw redacted typed failures. The tool descriptions must state the 12,000/50,000 character contract and the validated Pi complete-content byte/line compatibility ceiling. Guidelines must name each tool and state that documentation is untrusted data.

Keep the two tool definitions and handler wiring in one named registration function in `src/index.ts` that accepts already-created services. The default package export constructs production services once, with no startup network I/O or background resources, and calls that function. Registration-spy tests and Task 28's fixture-backed handler layer call the same function with fixture-backed services; they must not duplicate or replace schemas, handlers, error mapping, or output formatting. This is the only layered-verification injection seam and is not a runtime option. **Smallest runnable check:** `node --test --experimental-strip-types tests/index.test.ts`. **Traceability:** specification “Public tools,” package boundary, acceptance criteria 1 and 7; [03 locally verified shape](03-pi-extension-architecture.md#locally-verified-shape); installed Pi `docs/extensions.md` “Output Truncation.”

#### Where

- `src/schemas.ts`
- `src/index.ts`
- `tests/index.test.ts`

#### Acceptance criteria

- A registration spy observes exactly `docs_search` and `docs_fetch`, with the accepted defaults/ceiling and no legacy six tools, commands, UI, settings, service, or public version tool.
- Schema tests reject direct URLs, malformed identifiers, excess limits, incompatible versions/filters, unknown fields, and ambiguous invalid shapes before network work.
- Cancellation reaches in-flight retrieval, thrown failures are marked errors by Pi, every final `content` text is within the Task 1 byte/line constants for multibyte and high-line-count fixtures, `details` contains no omitted excerpt/body, and no startup request occurs.

### 24. Complete the offline threat and failure matrix

- [ ] Add end-to-end fixture tests that prove all security, resilience, version, ambiguity, truncation, cache, and privacy requirements across tool-to-adapter flow.

#### Why

Focused unit checks can pass while composition weakens a boundary; release needs one runnable offline matrix.

#### How

Depends on: Task 23. Kind: tests. Drive registered tool handlers with fixture transports and hostile inputs. Cover SSRF/private/reserved DNS, rebinding, redirects, prompt injection, content types, connect/total timeouts, cancellation, encoded/decompressed oversize, compression corruption, rate limits/backoff, cache fresh/expired/evicted state, synthetic stale marking, exact-version misses, ambiguity choices, search/fetch truncation, 4-byte Unicode, single-long-line and more-than-2,000-line output, exact/simultaneous Pi byte-line boundaries including framing and notice, whole-candidate search reduction, disabled adapters, and privacy sentinels. Assert no fixture body or sentinel appears in diagnostics. **Smallest runnable check:** `npm test`. **Traceability:** specification security/cache/privacy bullets and implementation acceptance criteria 1–7; [07 primary risks](07-mvp-risks-and-validation.md#primary-risks); Task 1's Pi output contract.

#### Where

- `tests/security-integration.test.ts`
- `tests/tool-contract-integration.test.ts`

#### Acceptance criteria

- `npm test` is fully offline, opens no external socket, and passes every enumerated threat/failure case.
- Tests prove every redirect and connection is revalidated, every complete tool text is within the validated Pi UTF-8-byte/logical-line envelope and accurately attributed/truncation-marked, explicit versions never become latest, and unavailable adapters make no request.
- A forbidden-data sentinel scan covers tool text, details, errors, progress, and captured console output.

### 25. Add explicit opt-in live contract tests

- [ ] Turn passed source-gate definitions into a non-default live test command that detects publisher contract drift.

#### Why

Fixture tests cannot detect changed redirects, terms, content types, version routes, or extraction markers, but default tests must remain offline.

#### How

Depends on: Task 24. Add a dedicated test file that invokes only enabled gate targets, with no credentials and the same product network limits. Check AWS, Terraform core, documented module API, provider version discovery, provider-doc discovery, and provider body routes separately; skipped/disabled rows report why. Add `"test:contracts": "node --test --experimental-strip-types tests/contracts/*.test.ts"` so only `npm run test:contracts` performs live requests. Never test undocumented Registry UI APIs or arbitrary URLs. A drift failure does not mutate policy automatically: it reopens Tasks 7, 8, 11, and the owning adapter task; Task 27 stays blocked until corrected evidence restores the pass or the reviewed matrix/catalog disables the capability and its zero-request test passes. **Smallest runnable check:** `npm run test:contracts`; `npm test` must still make zero external requests. **Traceability:** specification live-check opt-in rule and source-specific validation gates.

#### Where

- `tests/contracts/live-source-contracts.test.ts`
- `tests/contracts/README.md`
- `package.json`

#### Acceptance criteria

- The live command reports per-source pass/fail with canonical URL, retrieval time, resolved version when exposed, and structural metadata but no bodies/full queries.
- Registry module API and provider documentation have separate test groups and failure statuses.
- A contract drift failure blocks release and produces a reviewed corrected-evidence or disabled-capability closure; it never edits the catalog automatically or broadens a route.

### 26. Document local installation, use, source status, and safety boundaries

- [ ] Expand the baseline package README into the local Pi installation and exact two-tool workflow guide without adding deferred behavior.

#### Why

Users need reproducible local loading, identifiers/version semantics, errors, source availability, and opt-in testing instructions before E2E.

#### How

Depends on: Tasks 8, 23, 25. Kind: documentation. Replace Task 9's baseline-only text with prerequisites from the Pi gate, `pi install /absolute/path/to/package` and one-run `-e` use, `docs_search` then `docs_fetch`, defaults/maximum, the Pi byte/line compatibility rule, source-specific versions, metadata/citations, disabled-source behavior, offline/live checks, and removal. State that content is untrusted, no credentials/`.env`/telemetry are used, and no AWS/Terraform action occurs. Link the gate matrix rather than claiming failed sources work. **Smallest runnable check:** `npm pack --dry-run` includes the completed root README, then follow the local install/remove steps in a disposable Pi settings scope without publishing. **Traceability:** all product/package requirements and explicit deferrals in specification “Product” and “Package, dependencies, and testing”; Task 1's Pi output contract.

#### Where

- `README.md`

#### Acceptance criteria

- README exposes only `docs_search` and `docs_fetch`, accurately describes typed identifiers, ambiguity, versions, errors, provenance, cache, character limits, the Pi byte/line compatibility ceiling, truncation, and unavailable sources, and replaces every Task 9 baseline-only statement.
- A dry-run tarball contains this completed root README and the same allowlisted package surface established in Task 9.
- Every explicit MVP deferral is preserved; no arbitrary URLs, credentials, UI/commands, service, third-party search, mirror, schema/API-model, account, recommendation, SOP, or execution feature is implied.
- Instructions are local-only and include no npm publication, Git branch/commit/PR, or `.env` step.

### 27. Independently critique implementation and threat coverage

- [ ] Obtain independent code and security review, route material findings back to their owning tasks, and record closure before E2E.

#### Why

Safe-fetch and untrusted-content failures are release-critical and should not be approved solely by their implementer.

#### How

Depends on: Tasks 24, 25, 26. Kind: documentation. Have reviewers who did not implement the slice trace typed input to every request/redirect, decompressor, extractor, cache, result, and Pi registration. Re-run adversarial fixtures and inspect the live-contract boundary. The report assigns every finding to an existing task/file and records its correcting test; rerun review after remediation. Scope additions are rejected or separately approved, not smuggled in as fixes. **Smallest runnable check:** the final review report has zero open critical/high or material requirement gaps and cites passing focused tests for every closed finding. **Traceability:** specification acceptance criteria 1–7 and [07 risks](07-mvp-risks-and-validation.md#primary-risks).

#### Where

- `development-docs/validation/08-independent-implementation-review.md`

#### Acceptance criteria

- Independent code and security reviewers are named with date and reviewed version/checksum.
- Every material finding is fixed with a cited runnable check or leaves the release status blocked; waiver-by-assumption is prohibited.
- Review confirms no deferred source/feature, hidden network route, body log, stale-latest substitution, or extra Pi tool entered the implementation.

### 28. Run deterministic layered Pi verification

- [ ] Run the required real-Pi load/registration smoke and fixture-backed production-registration handler layer.

#### Why

Release must prove both that Pi 0.84.4 loads the local package and runs its production registration path, and that the exact registered production definitions/handlers produce the required deterministic results. Direct handler execution bypasses Pi's agent tool-call pipeline, so it is not full Pi E2E by itself.

#### How

Depends on: Task 27 and a Task 8 gate matrix whose release column passes for the complete required corpus. Kind: tests and documentation. If any required discovery/fetch row is disabled, failed, or incomplete, write a blocked report and stop; never fixture-enable a catalog-disabled adapter or represent fixture success as closure of a source gate.

**Layer 1 — supported real-Pi smoke.** Use Task 1's recorded observer protocol to launch the local package and a test-only zero-tool/zero-command observer in a fresh workspace. Run only those explicit extension sources after disabling extension discovery, built-in tools, context discovery, and session persistence with the exact Pi 0.84.4 flags validated by Task 1. At `session_start`, the observer calls the public `pi.getAllTools()`/`pi.getActiveTools()` metadata seam and emits one nonce-tagged body-free RPC notification; assert that the only active/configured extension tools are the package-owned `docs_search` and `docs_fetch`, then obtain a normal RPC response and shut down gracefully. This proves that a real Pi process loads the package and runs the default production registration path without invoking a tool. Use fresh `home/` and `agent/` directories, an explicit credential-free environment allowlist including `HOME`, `PI_CODING_AGENT_DIR`, and `PI_OFFLINE=1`, and no inherited model-provider, AWS, HashiCorp/Registry, GitHub, proxy, or other credential variables. Do not read `.env`, install globally, edit user settings, or mutate another repository or configuration. Record the exact validated command/protocol rather than assuming an RPC tool-invocation command.

**Layer 2 — fixture-backed production handler verification.** Create a test-only fixture composition that imports Task 23's exported production registration function and passes production services/adapters backed by Task 17's fixture transport. Its registration collector enumerates exactly `docs_search` and `docs_fetch`, then directly executes those collected production definitions/handlers. It contains no duplicate schema, handler, error mapping, output formatting, runtime setting, network fallback, command, or extra product tool. This deliberately bypasses Pi's agent tool-call pipeline and must be labelled as such in the report. Cover a successful search-to-typed-fetch flow across representative fixture-backed AWS guide/API and Terraform language/CLI, module, and provider requests; latest and exact versions where applicable; ambiguity choices; unavailable exact version; direct-URL rejection; citation/cache/retrieval metadata; section requests; small-limit and Pi byte/line truncation; and rejection above 50,000 characters. The fixture transport fails unmatched routes and opens no external socket. A disabled-adapter diagnostic is covered only when the matrix actually disables that adapter; do not disable a release adapter to manufacture the case.

**Optional supplementary model-backed Pi conversation.** When a provider credential can be supplied safely, an explicitly opt-in normal real-Pi model-backed conversation may be run separately in its own fresh workspace, `HOME`, Pi config, and non-persistent session under a sanitized child environment. Pass only the minimum credential through a provider-supported non-command-line mechanism; record at most its environment-variable/provider key name, never its value, and never copy user auth/config/session files. If that isolation cannot be achieved, skip the conversation. It is nondeterministic and is neither a substitute for nor a requirement of either release layer. Mission agents/workflows/tools, Herdr, Mission model configuration, and testing-orcme do not participate. **Smallest runnable check:** Layer 1 exits successfully through Task 1's supported public observer seam; Layer 2 observes exactly the two product registrations and directly executes their collected production handlers with offline fixtures, verifying the representative successes, typed failures, metadata, and truncation. **Traceability:** specification release evidence and acceptance criterion 7; [08 D-005](08-decision-log-and-agenda.md#d-005-pi-0844-testing-evidence); `AGENTS.md` E2E rules; Task 1 Pi contract.

#### Where

- `tests/pi-load-smoke.test.ts`
- `tests/pi-registration-handlers.test.ts`
- `tests/fixtures/pi-e2e/`
- `development-docs/validation/09-e2e-report.md`

#### Acceptance criteria

- The report records date, exact Pi 0.84.4, Node, and extension versions; Objective 12 residue audit reference; isolated workspace disposition; Layer 1's validated command/protocol with workspace paths redacted; sanitized child-environment key names but no values; source-gate statuses; fixture identifiers; Layer 2 registration list; scenario outcomes; and redacted evidence only. It includes no body, prompt, credential, `.env`, user-configuration, or session-file content.
- Layer 1 is a real Pi process/package/extension-load smoke using the public observer seam; its observer registers no tool/command and proves the local package loads and the default production registration path registers the two package-owned tools. Layer 2 invokes the same exported production registration function with fixture-backed services, observes exactly `docs_search` and `docs_fetch`, and directly executes those collected definitions/handlers. The report explicitly says that Layer 2 bypasses Pi's agent tool-call pipeline and is not full Pi E2E by itself.
- Layer 2's successful fixture-backed AWS and Terraform calls return required provenance/cache/truncation metadata, and typed failures cover invalid URL, unavailable exact version, ambiguity, and excessive limit. The complete result respects the Task 1 byte/line envelope. Both deterministic layers are required release evidence; absence of arbitrary RPC tool invocation or a future direct tool-runner API does not block them. No Mission component, Mission agent/workflow/model configuration, Herdr, testing-orcme, external repository, global installation, inherited user resource, or user configuration participates.

### 29. Execute the final release-readiness gate

- [ ] Produce a no-publish release report that checks artifacts, tests, source gates, layered Pi evidence, scope, and Definition of Done.

#### Why

Passing unit tests is insufficient if a source gate, package load, corpus requirement, or required deterministic layered Pi evidence remains incomplete.

#### How

Depends on: Task 28. Kind: documentation. On the validated Node/Pi 0.84.4 versions run `npm ci --ignore-scripts`, typecheck, offline tests, opt-in contracts, and `npm pack --dry-run`; verify the independent reviews and both required deterministic layers in the Task 28 report, including the conditional disabled-adapter disposition from Task 24. Inspect package contents for source, the completed README, and lock consistency while excluding validation probes, fixtures, local state, and `.env`. Recheck representative final `docs_search`/`docs_fetch` content byte/line metrics against Task 1's Pi constants. Do not publish, branch, commit, or open a PR. An optional model-backed conversation is supplementary only and cannot change the gate result. **Smallest runnable check:** the documented release command sequence exits zero and the gate matrix satisfies the required corpus. **Traceability:** specification “Implementation order and acceptance criteria” 1–7 and the Definition of Done below.

#### Where

- `development-docs/validation/10-release-readiness.md`

#### Acceptance criteria

- A **go** report requires typecheck, all offline fixtures, all enabled opt-in contracts, package dry-run, independent review, and both required deterministic Pi layers to pass on recorded Pi 0.84.4 versions. A **blocked** report records each failed, skipped, disabled, or diagnostic-only gate without representing it as a pass. Optional model-backed evidence is never required or credited as a substitute.
- Exactly two tools are registered and successful outputs meet provenance/version/cache/truncation requirements, accept the product's 12,000/50,000 character limits, and keep complete content within the validated Pi byte/line envelope; threat/failure tests remain green.
- Release is **go** only when discovery and fetch pass for at least one validated AWS service-guide route and at least one validated AWS API-reference route, plus Terraform language, CLI, documented Registry module, and validated provider documentation; otherwise the report is **blocked**, even though disabled adapters and other package behavior may be complete.
- No npm publication, branch, commit, pull request, telemetry, credential, `.env` access, or deferred feature occurred.

## Parallel execution map

- Tasks 1 and 2 can run in parallel; Tasks 3–6 run in parallel after Task 2.
- Task 14 and Task 15 can run in parallel after their stated prerequisites. Task 12 precedes Task 13; Task 17 starts after Task 13 defines the guarded retrieval seam and can then run in parallel with any unfinished Task 14/15 work.
- Tasks 18–21 are source-vertical slices and run in parallel once the shared core/test transport is ready. A failed gate changes its slice to tested unavailable behavior, not to a different source.
- Tasks 22–29 form the integration and release chain and should remain sequential.

## Open validation facts

These are evidence gaps, not reopened product decisions:

- The target executor's exact Pi 0.84.4/Node/schema versions, exported output byte/line constants and counting behavior, and observed package/error/cancellation/reload/load-registration-smoke behavior remain Task 1 evidence. The prior 0.82.1 RPC observation is historical only; arbitrary registered-tool invocation is neither a Task 1 deliverable nor a Task 28 blocker.
- AWS and HashiCorp approved discovery routes, hosted terms/robots/reuse, canonical redirects, extraction markers, cache headers, and rate behavior remain Tasks 3–4 evidence.
- Registry module live payload/redirect/rate/reuse behavior remains Task 5 evidence; documented API status does not make its hosted contract observed.
- Provider HTML exact-version behavior and a provider-address-to-official-repository pinned fallback remain Task 6 evidence. Provider protocol metadata is not a documentation-body answer.
- Parser choice is intentionally unset until source gates prove whether one is needed. Zero parsers is preferred; one is the hard maximum.

There are no open product-scope questions. If a fact stays unresolved, the corresponding adapter is unavailable and release status follows the matrix.

## Definition of Done

The MVP is done only when Tasks 1–29 meet acceptance criteria; the package registers exactly `docs_search` and `docs_fetch`; every successful response is bounded, cited, timestamped, source/version/cache/truncation-aware, and visibly untrusted; the accepted 12,000-character default and 50,000-character input maximum remain available while every complete tool text (framing, metadata, payload, boundaries, and notice) stays within the Task 1-validated Pi UTF-8-byte/logical-line envelope; every request/redirect passes exact HTTPS/public-address/resource policy; explicit versions resolve exactly or fail; fixtures and enabled live contracts pass; independent review has no material gap; and required deterministic Pi 0.84.4 evidence passes in an isolated workspace: supported observer-visible real-Pi package/extension load and production-registration smoke plus fixture-backed enumeration/direct execution through the identical exported production registration function. The handler layer is not full Pi agent-pipeline E2E; an optional model-backed Pi conversation is supplementary only and is skipped unless it meets the separate isolation and credential-safety conditions in Task 28.

Release additionally requires discovery and fetch for at least one validated AWS service-guide route and at least one validated AWS API-reference route, and for the complete agreed Terraform corpus (language, CLI, Registry modules through documented APIs, and provider documentation through a validated discovery-plus-body combination). A failed required source gate is a release blocker, never permission to use an undocumented endpoint, archived mirror, arbitrary URL, third-party search, or deferred feature.
