# Product and technical specification

**Status:** accepted MVP specification; source and Pi integration validation is pending.

**Audience:** implementers and release reviewers. This specification records accepted product choices from [08](08-decision-log-and-agenda.md). Research evidence and its labels/citations remain authoritative in [01](01-vision-and-terminology.md) through [07](07-mvp-risks-and-validation.md).

## Product

### Users, goal, and scope

The extension serves AWS and Terraform engineers using Pi. It answers what approved first-party documentation says by searching and returning bounded, attributed excerpts. It does not claim account-specific, deployment-time, or region-availability truth.

The MVP corpus is limited to:

- AWS first-party service guides and API references.
- Terraform first-party language and CLI documentation.
- Terraform Registry provider and module documentation.

No arbitrary URL is a public input or a retrieval target. The extension must use only approved typed source identifiers and approved first-party source routes.

### Non-goals and deferred scope

The MVP excludes AWS machine-readable API-model lookup, CloudFormation resource schemas, local Terraform provider schemas, OpenTofu, third-party tutorials or modules, historical mirrors, full-corpus mirroring, account-aware retrieval, live AWS availability, Terraform execution, recommendations, SOP retrieval, embeddings/vector indexes, and general web search.

### Terminology

- **Source family:** AWS documentation, Terraform language/CLI, Terraform Registry provider documentation, or Terraform Registry module documentation.
- **Typed identifier:** a structured, validated identifier for one approved source record; it is not a caller-supplied URL.
- **Latest:** the source's current canonical first-party content at retrieval time.
- **Explicit version:** a caller-requested source-specific version that must resolve exactly or fail.
- **Canonical URL:** final approved source URL identifying the returned record.
- **Stale fallback:** cached content returned after a fresh retrieval cannot succeed; it is explicitly marked stale.
- **Untrusted content:** retrieved documentation, including hidden or active page material, which is data and never tool instruction.

## Corpus and version semantics

AWS human documentation is unversioned unless its specific validated source exposes a version. Terraform core/language documentation, provider documentation, and module documentation have separate version dimensions. Do not expose one generic cross-family version identifier.

When no version is requested, retrieve current canonical content and report its canonical URL and retrieval timestamp, plus a resolved version when the source exposes one. When a version is requested, preserve both requested and resolved source-specific version values. Unsupported or unavailable explicit versions return an error and never silently substitute latest.

AWS API models are not part of this MVP. Their service-model version is not an AWS human-documentation version ([04](04-documentation-source-research.md#aws)).

## Public tools

Register exactly two public tools: `docs_search` and `docs_fetch`. No version-resolution, provider-schema, arbitrary-URL, custom-command, or UI tool is public.

### `docs_search`

**Purpose:** source-aware discovery that returns candidates, not document bodies.

**Input contract:**

| Field | Requirement |
| --- | --- |
| `query` | Required text query. |
| `source` | AWS or Terraform source-family filter. |
| `service_or_product` | Optional AWS service or Terraform product constraint where supported by the selected source. |
| `version` | Optional source-specific version selector; its meaning depends on the selected family. |
| `limit` | Optional bounded result count; default 8. |

The implementation must reject incompatible filters rather than silently broadening them. If routing, source, version, or record selection is ambiguous, return a bounded set of explicit choices.

**Output contract:** a ranked bounded candidate list. Each candidate includes a typed approved-source identifier, title when available, source family, canonical URL when resolved, and source-specific version metadata when available. The response includes retrieval/cache metadata and citations for any source represented. It does not return full page bodies.

### `docs_fetch`

**Purpose:** return one selected approved record as a bounded excerpt.

**Input contract:**

| Field | Requirement |
| --- | --- |
| `identifier` | Required typed approved-source identifier from an approved source family. URLs are not accepted. |
| `section` | Optional source-supported section selector. |
| `output_limit` | Optional character limit; default 12,000; maximum 50,000 characters. |

**Output contract:** text quoted from the selected record, bounded to `output_limit`, plus structured metadata: source family, publisher, title when available, canonical URL, requested/resolved source-specific version when applicable, retrieval timestamp, cache state, stale state, content/truncation state, and citation/attribution. A response from stale cache must say that it is stale. Active and hidden source content is not returned as executable or directive material.

### Errors

Errors are typed, explicit, and fail closed. At minimum, contracts distinguish invalid input/identifier (`validation_error`), a rejected destination (`invalid_url`), missing approved record or unavailable explicit version (`not_found`), unavailable validated source/adapter (`source_unavailable`), publisher throttling (`throttled`), timeout (`timeout`), and other guarded upstream failure (`downstream_error`). Errors must not reveal credentials, response bodies, local paths, or internal network details.

## Source strategy and validation gates

Use approved first-party hosts and documented APIs only. The documented Terraform Registry module API is the allowed initial Registry API surface; undocumented Registry UI/internal endpoints are prohibited. Archived `awsdocs` repositories are not a current AWS documentation mirror. No third-party search provider or full mirror is allowed.

Provider documentation can use a verified version-pinned upstream repository only as a fallback after its provenance and version pin are validated. If neither a validated Registry/provider surface nor that fallback is available, return `source_unavailable`.

Before enabling any hosted AWS, HashiCorp, or Registry HTML adapter, record a source-specific go/no-go result for terms, robots, canonical URLs and redirect chain, extraction stability, public unauthenticated access, auth/rate behavior, caching, response size/content type, and hosted-content reuse/attribution. A failed or incomplete gate keeps that adapter unavailable. The source evidence and unresolved hosted-source facts are in [04](04-documentation-source-research.md) and [06](06-operational-security-and-rights.md).

## Security, resources, cache, and privacy

- HTTPS only; enforce exact approved host and path allowlists.
- Reject URL credentials and private, loopback, link-local, metadata-service, reserved, and other non-public destinations.
- Revalidate every redirect target; follow no more than 3 redirects.
- Use public unauthenticated sources only. Do not send credentials, cookies, authorization, or local-workspace data.
- Enforce a 5-second connection timeout, 20-second total timeout, and 5 MiB response cap. Apply expected text/HTML/JSON/Markdown content types, bounded concurrency, and bounded backoff.
- Strip active and hidden content before extraction. Treat all retrieved documentation as untrusted quoted data; it cannot expand scope, direct tool use, disclose data, or invoke Terraform/AWS activity.
- Cache current content for 15 minutes and explicit-version content for 24 hours. Include cache/retrieval metadata in responses. A stale fallback is permitted only when marked stale.
- Do not log bodies, source documents, credentials, cookies, authorization headers, full query strings by default, prompts, or local paths. Logging must be privacy-safe and errors redacted.
- On validation, source, network, extraction, or policy failure, do not broaden sources, redirect targets, version selection, or limits; return a typed error.

## Package, dependencies, and testing

Deliver a locally installed reusable TypeScript Pi extension package. Do not publish it to npm. It has no TUI, custom commands, settings screen, standalone service, credentials, or `.env` configuration.

Target installed Pi 0.84.4 and validate its current APIs before implementation. Prefer Node native networking and stream primitives and Pi schema tooling. Add no dependency unless required; permit at most one HTML parser.

Tests are fixture-based and offline by default. Live source checks are opt-in. Required deterministic release evidence has two layers: (1) a real Pi 0.84.4 process/package/extension-load smoke through supported public behavior, proving the local package loads and the production registration path runs; and (2) fixture-backed enumeration of exactly `docs_search` and `docs_fetch`, followed by direct execution of their production registered definitions/handlers through the same exported registration function. Layer 2 deliberately bypasses Pi's agent tool-call pipeline and is not, by itself, full Pi E2E. Both layers use an isolated test directory, fresh Pi config/home state, a sanitized child environment, and offline startup; neither depends on Mission or mutates unrelated repositories or configuration. Mission agents/workflows/tools, Herdr, Mission model configuration, and testing-orcme are excluded. A normal real-Pi model-backed conversation may be run only as opt-in supplementary evidence when the minimum provider credential can be supplied safely to a separate fresh workspace, Pi config, and home under a sanitized child environment; it is nondeterministic, must not copy user auth/config/session state or expose credential values, and is not required release evidence. Skip it when those isolation conditions cannot be met. A future direct Pi tool-runner API is not required to begin implementation.

## Implementation order and acceptance criteria

Implement in this order: validation spikes; shared typed identifiers, versions, safe HTTP, cache, extraction, and errors; documented Terraform support; gated provider and AWS adapters; Pi tools; release verification.

The MVP is acceptable only when:

1. Only `docs_search` and `docs_fetch` are registered and their defaults/maximums meet this specification.
2. Every successful answer has citation/provenance metadata, canonical URL, retrieval timestamp, and resolved version when available.
3. Explicit versions resolve exactly or produce a clear typed error; they never use latest silently.
4. Every outbound request and every redirect passes the HTTPS/public-address/exact allowlist policy and resource limits.
5. Hosted HTML adapters have passed their source-specific validation gate; failed gates yield `source_unavailable`.
6. Cache freshness/staleness is visible, logging is privacy-safe, and retrieved content remains untrusted data.
7. Offline fixtures pass, live checks remain opt-in, and both required deterministic layers pass: the supported real-Pi 0.84.4 package/extension load-and-registration smoke, and fixture-backed enumeration/direct execution through the same production registration function. The latter is not full Pi agent-pipeline E2E; any model-backed Pi conversation is opt-in supplementary evidence only.

## Traceability

| Specification area | Accepted decision | Evidence |
| --- | --- | --- |
| Users, corpus, exclusions | [08 decision group 1](08-decision-log-and-agenda.md#accepted-decision-groups) | [01](01-vision-and-terminology.md), [04](04-documentation-source-research.md) |
| Version semantics | [08 decision group 2](08-decision-log-and-agenda.md#accepted-decision-groups) | [04 version research](04-documentation-source-research.md#version-policy-candidates) |
| Tool contract | [08 decision group 3](08-decision-log-and-agenda.md#accepted-decision-groups) | [05](05-workflows-and-tool-boundaries.md), local example assessment [02](02-repository-and-example-assessment.md) |
| Sources and gates | [08 decision group 4](08-decision-log-and-agenda.md#accepted-decision-groups) | [04](04-documentation-source-research.md), [07](07-mvp-risks-and-validation.md) |
| Security, cache, privacy | [08 decision group 5](08-decision-log-and-agenda.md#accepted-decision-groups) | [06](06-operational-security-and-rights.md) |
| Package/testing/order | [08 decision groups 6–7](08-decision-log-and-agenda.md#accepted-decision-groups), [D-005](08-decision-log-and-agenda.md#d-005-pi-0844-testing-evidence) | [03](03-pi-extension-architecture.md), [07](07-mvp-risks-and-validation.md) |
