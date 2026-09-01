# Freshness, operations, security, licensing, and attribution

**Status:** externally grounded constraints supporting accepted operational requirements; hosted-source validation remains pending.

**Grounding:** local URL/output handling in `example-code/aws-knowledge/utils/`; source contracts in [04](04-documentation-source-research.md); OWASP sources accessed 2026-08-31.

## Freshness and caching

- **[Verified — official source]** The [Terraform Registry API](https://developer.hashicorp.com/terraform/registry/api-docs) (HashiCorp, accessed 2026-08-31) says latest-target redirects may be 302/307 and that 429 rate limiting can occur; it publishes no numeric quota.
- **[Recommendation]** Define “latest” as a retrieval policy, not a cache promise. Store `retrieved_at`, source family, and resolved source-specific version with every response. A latest entry must never satisfy an explicit-version request.
- **[Recommendation]** Cache by canonical/final allowed URL, source kind, and resolved version. Record validators only after a hosted-source spike confirms their meaning.
- **[Accepted decision]** Cache current content for 15 minutes and explicit-version content for 24 hours; report cache/retrieval metadata and mark stale fallback. Cache implementation details remain subject to rights validation.
- **[Validation needed]** Test cache headers, ETag/Last-Modified, canonical links, and redirect chains on approved hosted pages. No such response was observed in Objective 5.

## Network and content security

- **[Verified — repository]** The example allows both HTTP and HTTPS and has host/path checks, but no redirect, DNS, content-size, or extraction controls (`example-code/aws-knowledge/utils/url-policy.ts`, `constants.ts`).
- **[Verified — official source]** OWASP’s [Server-Side Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) (OWASP, accessed 2026-08-31) recommends allowlists, avoiding complete user-supplied URLs where possible, disabling redirects, and accounting for DNS pinning and private/link-local targets.
- **[Recommendation]** Use HTTPS-only exact origin/path/port allowlists; reject URL credentials; validate the destination before and after every redirect; and reject private, loopback, link-local, and metadata-service addresses at connection time. Hardcode public Registry endpoints rather than accepting user-controlled Terraform service-discovery hosts.
- **[Verified — official source]** OWASP’s [LLM Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) (OWASP, accessed 2026-08-31) identifies documentation analyzed by coding assistants and hidden web-page text as indirect prompt-injection sources.
- **[Recommendation]** Treat fetched pages, Registry content, model descriptions, and upstream READMEs as untrusted quoted data, never instructions. They must not expand source scope, invoke tools, disclose data, or trigger Terraform/AWS activity.

## Resource limits and resilience

- **[Verified — official source]** OWASP’s [Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html) (OWASP, accessed 2026-08-31) recommends cheap validation first, total request-size limits, timeouts, load limits, and rate limiting.
- **[Recommendation]** Bound input length, redirects, connect/overall time, compressed and decompressed bytes, content type, parse depth/nodes, excerpts, pages/results, per-host concurrency, and cache size. Return explicit `throttled`, `timeout`, `downstream_error`, or truncation results.
- **[Validation needed]** Measure approved-host latency, redirects, error behavior, 429 handling, and minimum safe request patterns. AWS documentation limits remain unknown.

## Rights, attribution, and privacy

- **[Validation needed]** Hosted [AWS Site Terms](https://aws.amazon.com/terms/), [AWS robots.txt](https://docs.aws.amazon.com/robots.txt), and [HashiCorp Terms of Service](https://www.hashicorp.com/terms-of-service) (accessed 2026-08-31) were not retrieved. Do not approve cache, indexing, embedding, redistribution, or hosted-content attribution wording from repository licenses.
- **[Recommendation]** Before persistence, review the current source-specific terms, robots, license, and attribution requirements for actual use. Attribute excerpts with publisher, title when available, URL, source kind, and retrieval time.
- **[Verified — official source]** OWASP’s [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) and [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) (OWASP, accessed 2026-08-31) identify tokens, passwords, connection strings, and keys as data to exclude from logs and say secrets should never be logged.
- **[Recommendation]** Send no AWS, HashiCorp, Pi, or local-workspace credentials to documentation hosts; do not log authorization headers, cookies, full query strings by default, bodies, local paths, or source documents. Do not cache prompts or credentials.
- **[Accepted decision]** The MVP has privacy-safe logging and no telemetry requirement. Do not collect diagnostics until a separately approved collection design defines destination, retention, opt-out, and redaction review.
