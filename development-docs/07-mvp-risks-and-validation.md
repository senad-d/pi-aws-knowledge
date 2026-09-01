# MVP possibilities, risks, and validation spikes

**Status:** evidence and mandatory validation gates for the accepted MVP; implementation remains validation-first.

## MVP options

| Option | User value | Included | Deliberately excluded | Status |
| --- | --- | --- | --- | --- |
| A. AWS official-doc read | Grounded AWS excerpts with links | Approved AWS URLs, bounded reads, provenance | Search indexing, Terraform, account data | [Recommendation] smallest live retrieval proof |
| B. AWS + Terraform source-aware read | One consistent read experience across two publishers | Source family, strict approved URLs, version-policy metadata | General web search, local Terraform execution | [Recommendation] strongest core-boundary proof |
| C. Terraform provider versioned documentation | Addresses version-sensitive provider questions | Exact provider address/version plus a tested Registry page or labelled upstream tag/commit | AWS sources, modules, local schemas | [Recommendation] only after provider-doc source behavior validates |
| D. Discovery + read across both families | Reduces manual URL discovery | Source-specific search and bounded reads | Recommendations, region data, SOPs, arbitrary web | [Recommendation] only after search-source rights/quality validate |

**[Accepted decision]** The MVP is discovery and read across the accepted AWS/Terraform corpus, using only `docs_search` and `docs_fetch`. See [09](09-product-and-technical-specification.md).

## Primary risks

| Risk | Consequence | Mitigation / spike | Status |
| --- | --- | --- | --- |
| Unsupported/unstable publisher search or Registry interface | Product breaks or violates terms | Registry module API is supported; provider UI/internal endpoints are not. Verify terms and every other search surface. | [Verified — official source] module API boundary; [Validation needed] others |
| “Latest” resolves ambiguously | Wrong Terraform guidance or unreproducible answers | Test and record requested/resolved version behavior per source | [Validation needed] |
| HTML/layout changes | Broken extraction or wrong text | Fetch representative pages and test content extraction/canonicalization | [Validation needed] |
| SSRF/redirect bypass | Internal network exposure | Adversarial URL/redirect/DNS test suite and strict egress policy | [Validation needed] |
| Cache staleness | Outdated documentation presented as current | TTL/validator experiment; visible retrieval timestamps | [Validation needed] |
| Rights/attribution violation | Legal/compliance exposure | Owner reviews per-source terms/license/robots and intended cache/index use | [Validation needed] |
| Context bloat | Tool results degrade Pi interaction | Measure excerpts/results against output limits | [Validation needed] |
| Scope creep from AWS fixtures | Delayed useful retrieval product | Keep regional availability/SOP/recommendations explicitly deferred | [Recommendation] |

## Ordered validation spikes

1. **Source permission and access spike.** For one AWS and one HashiCorp/Registry target, document terms/license/robots, allowed retrieval mechanism, attribution requirements, requested/final URL, redirect statuses/locations, canonical link, content type/bytes, cache validators, and authentication sent (must be none for public reads). **Exit:** a source-specific go/no-go record.
2. **Pi contract spike.** Re-read the official installed Pi extension docs and create the smallest disposable extension that validates registration, schemas, cancellation, result/details, error display, reload, and outbound-network assumptions. **Exit:** observed behavior tied to target Pi package version.
3. **Safe fetch spike.** Build no product feature; exercise HTTPS allow-listing, redirect revalidation, response/content limits, abort, timeout, and private-address rejection against controlled endpoints. **Exit:** security controls have passing adversarial cases.
4. **AWS canonical/excerpt spike.** Retrieve a small representative set of AWS pages and record canonical URL, redirects, content type, extraction quality, headers, and attribution. **Exit:** a reproducible source record format.
5. **Terraform version spike.** Exercise the documented Registry module latest/exact endpoints and test no-version/exact provider documentation selection on an approved surface. **Exit:** module provenance is recorded; provider behavior is either reliable or narrows the MVP.
6. **Cache/rate spike.** Measure headers, latency, cache outcome, retries, 429 behavior, and per-host behavior under a polite bounded sample. **Exit:** evidence-based cache/rate defaults proposed for discussion; no invented numeric limit.
7. **Workflow evaluation spike.** Run the selected MVP workflow against representative questions and adversarial redirects/DNS/IP classes plus prompt-injection strings treated as data. Score source accuracy, version clarity, latency, and context size. **Exit:** owner can select MVP with evidence.

## Acceptance questions for any selected MVP

- **[Recommendation]** Can every answer link to an approved publisher URL and state when it was retrieved?
- **[Recommendation]** Does an explicit Terraform version either resolve exactly or fail clearly, never fall back silently?
- **[Recommendation]** Can every outbound request be constrained to approved public documentation origins, including redirects?
- **[Recommendation]** Is cached content visibly distinguishable from a fresh retrieval?
- **[Recommendation]** Has rights/attribution review approved the actual persistence/indexing behavior?

Accepted outcomes are in [08](08-decision-log-and-agenda.md); these validation spikes remain required before implementation and release.
