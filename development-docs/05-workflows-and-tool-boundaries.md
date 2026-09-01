# User workflows and tool boundaries

**Status:** research workflows grounding the accepted two-tool contract; adapter behavior remains validation-needed.

**Grounding:** local search/read separation in `example-code/aws-knowledge/index.ts`; source/version findings in [04](04-documentation-source-research.md); accepted requirements in [08](08-decision-log-and-agenda.md) and [09](09-product-and-technical-specification.md).

## Workflow A: answer an AWS documentation question

1. **[Accepted decision]** The user asks a documentation question, optionally constrained by AWS service.
2. **[Accepted decision]** `docs_search` returns a bounded ranked candidate set with typed identifiers, title, canonical URL when resolved, source family, and retrieval/cache metadata.
3. **[Accepted decision]** The caller selects a candidate; `docs_fetch` accepts its typed identifier and returns a bounded attributed excerpt, canonical URL, and retrieval timestamp.
4. **[Recommendation]** The assistant states that the answer is based on the linked page and does not conflate it with account-specific state.

**Boundary:** no direct URL input, AWS credentials, AWS API calls, account inventory, deployment, or region-availability guarantee.

## Workflow B: find Terraform provider documentation

1. **[Accepted decision]** The user supplies a provider address and exact version when documentation is version-sensitive.
2. **[Verified — official source]** The [Provider Registry Protocol](https://developer.hashicorp.com/terraform/internals/provider-registry-protocol) (HashiCorp, accessed 2026-08-31) supports provider version/package discovery, not provider documentation-body search.
3. **[Accepted decision]** `docs_fetch` uses a live-validated versioned Registry page or a verified version-pinned upstream fallback; otherwise it returns `source_unavailable`.
4. **[Validation needed]** Do not claim a Registry provider HTML page resolved a requested/default version until its URL and redirect behavior have been tested.

**Boundary:** the tool does not infer provider version from user code, a lock file, or Terraform installation.

## Workflow C: find Terraform Registry module documentation

1. **[Verified — official source]** The [Registry API](https://developer.hashicorp.com/terraform/registry/api-docs) (HashiCorp, accessed 2026-08-31) supports module search, latest module metadata, exact module metadata, and version lists.
2. **[Accepted decision]** `docs_search` may use that documented module API for `registry-module-api` results and stores the returned version for a no-version request.
3. **[Accepted decision]** An exact module request uses the documented exact-version endpoint and fails clearly if unavailable; a module download redirect is not permission to fetch arbitrary targets.

**Boundary:** module and provider versions are distinct parameters.

## Workflow D: resolve a Terraform language question

1. **[Accepted decision]** Search Terraform language/CLI separately from provider documentation.
2. **[Accepted decision]** `docs_fetch` labels the selected language page `terraform-language`.
3. **[Accepted decision]** An unsupported or unavailable explicit version returns a typed error; it does not become latest.

**Boundary:** language documentation does not establish a configured provider's schema or a module's behavior.

## Accepted tool contract matrix

| Tool | Inputs | Output responsibility | Must not do |
| --- | --- | --- | --- |
| `docs_search` | query; source filter; optional service/product; source-specific version; bounded limit (default 8) | Candidate records, typed identifiers, and provenance; not page bodies | Fetch arbitrary URLs or claim version resolution without evidence |
| `docs_fetch` | typed approved-source identifier; optional source-supported section; bounded output limit (default 12,000; maximum 50,000 characters) | Bounded, attributed excerpt and metadata | Read arbitrary network locations, secrets, or unbounded content |

**[Accepted decision]** Version resolution remains visible in `docs_search` and `docs_fetch`; there is no separate public tool. Direct URLs are not accepted. Search uses only approved source-specific mechanisms; do not assume an AWS or provider-documentation publisher search API exists.

**[Recommendation]** Surface partial results/warnings explicitly (for timeout, stale cache, unsupported version, redirect, or truncated excerpt); do not silently fall back across source families.

## Why the example is not the boundary

**[Verified — repository]** The example also supplies `recommend`, `list_regions`, `get_regional_availability`, and `retrieve_agent_sop`; these are fixtures with AWS-specific semantics (`example-code/aws-knowledge/index.ts`). **[Accepted decision]** They remain out of the MVP cross-source retrieval contract.
