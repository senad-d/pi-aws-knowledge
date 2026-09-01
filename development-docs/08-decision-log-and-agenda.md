# Decision log and discovery outcome

**Status:** product decisions accepted; implementation validation remains pending.

The user accepted the seven decision groups below following the structured discovery discussion. These are product decisions, not newly verified source facts. The evidence pages retain their **[Verified — official source]**, **[Verified — repository]**, and **[Validation needed]** labels and citations. A decision never removes a mandatory validation gate.

## Accepted decision groups

| # | Decision group | Accepted decision | Remaining validation gate |
| ---: | --- | --- | --- |
| 1 | Users, MVP corpus, and deferrals | Serve AWS/Terraform engineers using Pi. The MVP corpus is first-party AWS service guides and API references; Terraform language and CLI documentation; and Terraform Registry provider and module documentation. Arbitrary URLs are excluded. | Validate each hosted source contract before its adapter is enabled. |
| 2 | Version semantics | `latest` means current canonical first-party content at retrieval time. Return canonical URL, retrieval timestamp, and resolved source version when exposed. Terraform core, provider, and module versions are distinct; AWS human docs are unversioned unless the source exposes versions. An unavailable or unsupported explicit version fails and never silently becomes latest. | Prove route/version resolution for each adapter. |
| 3 | Public tool contract | Expose only `docs_search` and `docs_fetch`. Search defaults to 8 results. Fetch accepts only typed approved-source identifiers, defaults to 12,000 characters, and has a 50,000-character hard ceiling. Ambiguity returns choices. | Confirm Pi schema/result/error behavior. |
| 4 | Source strategy | Use approved first-party hosts and documented APIs. Do not use undocumented Registry UI/internal endpoints or archived `awsdocs` repositories as current sources; do not use third-party search or a full mirror. Provider documentation may fall back to a verified version-pinned upstream repository; otherwise return `source_unavailable`. | Complete terms/robots, redirect, extraction, auth/rate, cache, and content-reuse gates before any hosted HTML adapter. |
| 5 | Security, operations, and privacy | Use HTTPS exact host/path allowlists; reject private/reserved destinations; revalidate at most 3 redirects; use public unauthenticated sources; enforce 5-second connect/20-second total timeouts and a 5 MiB response cap; apply bounded concurrency/backoff; strip active/hidden content; treat output as untrusted quoted data; cache current content 15 minutes and explicit versions 24 hours; report cache/retrieval metadata and mark stale fallback; use privacy-safe logging and fail-closed typed errors. | Test controls, publisher behavior, and rights obligations against approved sources. |
| 6 | Delivery and testing | Deliver a locally installed reusable TypeScript Pi extension package: no npm publication, TUI, custom commands, settings UI, service, credentials, or `.env` configuration. Target installed Pi 0.84.4. Offline fixture tests are default; live checks are opt-in. Required deterministic release evidence is a supported real-Pi package/extension load-and-registration smoke plus fixture-backed enumeration and direct execution of the same exported production registration/handlers. The handler layer is not full Pi agent-pipeline E2E. | Validate the target Pi APIs/package contract and run both layers with the source/corpus gates. |
| 7 | Implementation sequence | Perform validation spikes first, then shared core, documented Terraform support, gated provider/AWS adapters, Pi tools, and release verification. A failed gate leaves that adapter unavailable rather than weakening safeguards. | Each phase has the gates in [07](07-mvp-risks-and-validation.md#ordered-validation-spikes). |

## Decision records

### D-001 — Scope and corpus

- **Status:** Resolved — accepted
- **Decision:** The product serves AWS/Terraform engineers using Pi and includes only the corpus in decision group 1.
- **Evidence:** [Vision](01-vision-and-terminology.md), [source research](04-documentation-source-research.md), and accepted decision group 1.
- **Deferrals:** AWS machine-readable API-model lookup, CloudFormation resource schemas, local Terraform provider schemas, OpenTofu, third-party tutorials/modules, historical mirrors, arbitrary URLs, live regional availability, account-aware retrieval, SOPs, recommendations, local Terraform execution, embeddings/vector indexes, and full-corpus mirroring.

### D-002 — Version semantics

- **Status:** Resolved — accepted
- **Decision:** Apply decision group 2. Use source-specific version dimensions and clear errors for explicit-version failure.
- **Evidence:** [Version policy research](04-documentation-source-research.md#version-policy-candidates), accepted decision group 2.
- **Validation gate:** A product policy does not establish a hosted source's version route or retained history.

### D-003 — Tools and retrieval strategy

- **Status:** Resolved — accepted
- **Decision:** Register only `docs_search` and `docs_fetch`; apply groups 3 and 4.
- **Evidence:** [Tool-boundary research](05-workflows-and-tool-boundaries.md), [source research](04-documentation-source-research.md), accepted decision groups 3–4.
- **Validation gate:** Approved identifiers and documented APIs do not authorize unvalidated HTML retrieval.

### D-004 — Security, delivery, and release

- **Status:** Resolved — accepted
- **Decision:** Apply groups 5–7, including fail-closed behavior and validation-first implementation.
- **Evidence:** [Operational research](06-operational-security-and-rights.md), [validation spikes](07-mvp-risks-and-validation.md), accepted decision groups 5–7.
- **Validation gate:** Target-Pi API, source contract, rights, and required layered test evidence remain required before release.

### D-005 — Pi 0.84.4 testing evidence

- **Status:** Resolved — accepted
- **Decision:** Target installed Pi 0.84.4. Release requires two deterministic layers: a real Pi process/package/extension-load smoke through supported public behavior, proving local package loading and the production registration path; and fixture-backed enumeration of exactly `docs_search` and `docs_fetch` plus direct execution of those production registered definitions/handlers through the same exported registration function. The second layer bypasses Pi's agent tool-call pipeline and is not full Pi E2E by itself.
- **Optional evidence:** A normal model-backed real-Pi conversation may be run only as explicit opt-in supplementary evidence when the minimum provider credential can be supplied safely to a fresh isolated workspace, Pi config, and home under a sanitized child environment. It is nondeterministic, must not copy user auth/config/session state or expose credential values, and is not required release evidence; skip it when those isolation conditions cannot be met.
- **Exclusions:** Mission agents/workflows/tools, Herdr, Mission model configuration, and testing-orcme are out of scope. Lack of a future direct Pi tool-runner API does not block implementation or release once the required layers and source/corpus gates pass.
- **Evidence:** Objective 18’s retained Pi testing evidence and the accepted user decision; validate the exact supported Pi 0.84.4 load/registration seam in the implementation plan's Task 1.

## Remaining validation gates

The following are still **[Validation needed]**, rather than open product choices:

1. Official installed Pi extension/package APIs, runtime compatibility, loading, schemas, errors, cancellation, and outbound-network behavior ([03](03-pi-extension-architecture.md#official-pi-verification-queue)).
2. For every hosted AWS, HashiCorp, or Registry HTML adapter: terms, robots, canonical/redirect behavior, extraction stability, public unauthenticated access, rates, caching, and content reuse ([04](04-documentation-source-research.md), [06](06-operational-security-and-rights.md)).
3. Safe-fetch adversarial controls, provider documentation version resolution, and cache/rate measurements ([07](07-mvp-risks-and-validation.md#ordered-validation-spikes)).

## Explicit MVP deferrals

The MVP does not include AWS API-model lookup, CloudFormation schemas, local provider schemas, OpenTofu, third-party content, historic mirrors, arbitrary URLs, account access, Terraform execution, credentials, a custom UI, custom commands, settings UI, a service, npm publication, telemetry requiring additional collection, or a full documentation mirror.

The decision-complete product requirements are in [09](09-product-and-technical-specification.md). Research facts and source citations remain in [01](01-vision-and-terminology.md) through [07](07-mvp-risks-and-validation.md).
