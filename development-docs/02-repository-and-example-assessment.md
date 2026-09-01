# Repository and example assessment

**Status:** direct checkout assessment on 2026-08-31.

**Evidence scope:** repository files only. `.env` was not read.

## Current project state

| Finding | Evidence | Implication |
| --- | --- | --- |
| The checkout contains `AGENTS.md`, `.pi/observme.yaml`, an empty `.env`, an empty `.gitignore`, `docs/`, `development-docs/`, and `example-code/aws-knowledge/`. | [Verified — repository] top-level file inventory | There is no implemented product surface to document beyond the example. |
| `docs/` contains no files. | [Verified — repository] file inventory | This knowledge base is the first maintained documentation set. |
| No `package.json`, lockfile, tests, CI configuration, or application source file is present. | [Verified — repository] file inventory | Runtime, package/version, test, and deployment claims cannot be made. |
| There is no Git remote and the working tree began with untracked files. | [Verified — repository] `git remote -v`, `git status --short` | No hosted-project or release-process assumption is warranted. |
| `AGENTS.md` says the repository has no Git remote and is local only. | [Verified — repository] `AGENTS.md` | Do not link to a presumed project repository. |

## What the local `aws-knowledge` example actually is

**[Verified — repository]** `example-code/aws-knowledge/README.md` describes it as “Fixture-only AWS Knowledge compatibility tools for pi.” Its `config.ts` accepts only an unset/`fixtures` `AWS_KNOWLEDGE_DATA_SOURCE`; any other value throws a `downstream_error` saying live adapter mode is blocked in phase 1.

**[Verified — repository]** The extension registers six AWS-prefixed tools in `example-code/aws-knowledge/index.ts`:

1. `aws___search_documentation`
2. `aws___read_documentation`
3. `aws___recommend`
4. `aws___list_regions`
5. `aws___get_regional_availability`
6. `aws___retrieve_agent_sop`

Their schemas are in `example-code/aws-knowledge/schemas.ts`; result/error types are in `contracts.ts`; fixture data is under `example-code/aws-knowledge/data/fixtures/`. The adapter loads JSON synchronously from its fixture root (`adapters/fixtures-adapter.ts`). It makes no HTTP request.

## Reusable ideas, with limits

| Example idea | Assessment | Evidence |
| --- | --- | --- |
| Search before read | **[Recommendation] Retain.** Separate discovery from fetching a selected document; the example's tool guidance follows this order. | `index.ts`, `services/search-service.ts` |
| Typed inputs and stable error codes | **[Recommendation] Retain and generalize.** TypeBox schemas and `validation_error`, `invalid_url`, `not_found`, `throttled`, and `downstream_error` provide a useful contract vocabulary. | `schemas.ts`, `contracts.ts` |
| Per-row read errors | **[Recommendation] Retain for batched reads.** One invalid URL need not discard valid rows. | `services/doc-fetch-service.ts`, `utils/errors.ts` |
| Bounded output | **[Recommendation] Retain.** The formatter uses Pi truncation when available and has a 50 KiB/2,000-line fallback. Retrieval should additionally bound upstream bytes/time. | `utils/truncate.ts` |
| Allow-list and deny-list URL policy | **[Recommendation] Retain but redesign by source family.** The example validates HTTP(S), exact allowed hosts, an AWS Marketplace deny prefix, and a restricted re:Post prefix. A live fetcher needs redirect revalidation, DNS/private-address protections, response-size limits, and Terraform hosts. | `utils/url-policy.ts`, `constants.ts` |
| Cancellation signal | **[Recommendation] Retain.** Services check `AbortSignal` at entry. A live adapter must also cancel in-flight requests. | `index.ts`, `utils/errors.ts` |
| Signed pagination tokens | **[Recommendation] Use only if a selected live operation truly paginates.** The existing token binds resource type, region, offset, and filters with HMAC-SHA-256. | `services/availability-service.ts`, `utils/pagination.ts` |
| Fixture adapter boundary | **[Recommendation] Retain.** It separates service logic from data loading and gives tests a deterministic substitute. | `adapters/fixtures-adapter.ts`, all `services/` |

## Ideas to reject or improve

| Example behavior | Why it should not become the product unchanged | Status |
| --- | --- | --- |
| AWS-only, six-tool surface | Region availability and SOP retrieval are not necessary to retrieve AWS/Terraform documentation and would obscure the core boundary. | [Recommendation] Start from search/read/source metadata; add only validated needs. |
| Fixture results presented as documentation | Fixtures are intentionally deterministic and may not be current or complete. | [Recommendation] Never label fixture corpus results as current official documentation. |
| Local substring ranking | `search-service.ts` scores title/context tokens over a small fixture set, without source freshness, authority, version, or semantic retrieval. | [Recommendation] Treat it as a UX shape, not a live-search design. |
| `compat` silently drops unknown topics | `utils/topics.ts` records dropped topics, but silent relaxation can conceal a caller's intent. | [Recommendation] Prefer explicit supported source/filter values or return a visible warning. |
| URL host checks only | `validateAwsDocUrl` permits `http:` and does not show redirect, DNS, content-type, body-size, or HTML extraction controls. | [Recommendation] Require HTTPS for live sources unless a documented exception is approved; revalidate every redirect. |
| Ephemeral pagination secret | Non-strict mode generates a random secret at process start, so tokens cannot survive restart. | [Verified — repository] `config.ts`; **[Recommendation]** do not promise resumable cursors unless persistence is designed. |
| Service-name URL heuristic | Recommendation fallback infers the first URL path segment as a service name. This is source-specific and brittle. | [Recommendation] Do not reuse for Terraform or arbitrary AWS URL layouts. |
| Fixture-only compatibility claims | The README's “compatibility” language has no external protocol/specification cited in this checkout. | [Validation needed] Identify the target compatibility contract before preserving it. |

## Local source map

- Entry point and registrations: `example-code/aws-knowledge/index.ts`
- Configuration and fixture-only gate: `example-code/aws-knowledge/config.ts`
- Inputs: `example-code/aws-knowledge/schemas.ts`
- Results/errors: `example-code/aws-knowledge/contracts.ts`
- Source loading boundary: `example-code/aws-knowledge/adapters/fixtures-adapter.ts`
- HTTP-like URL policy shape: `example-code/aws-knowledge/utils/url-policy.ts`
- Output limit shape: `example-code/aws-knowledge/utils/truncate.ts`

See [03](03-pi-extension-architecture.md) for the integration constraints and [07](07-mvp-risks-and-validation.md) for spikes that test which ideas survive a live source.
