# AWS + Terraform documentation extension — research knowledge base

**Status:** discovery evidence plus accepted MVP decisions. Hosted-source and Pi API validation remain pending.

**Audience:** the project owner and participants in the next live discovery discussion.

**Scope:** evidence and options for a proposed Pi extension that retrieves AWS and Terraform documentation. This is not an implementation plan.

## Reading order

1. [Vision and terminology](01-vision-and-terminology.md) establishes the problem, vocabulary, and non-goals.
2. [Repository and example assessment](02-repository-and-example-assessment.md) records what exists locally and what it does not establish.
3. [Pi extension architecture](03-pi-extension-architecture.md) describes the verified local integration shape and questions to confirm against Pi's official extension reference.
4. [Documentation-source research](04-documentation-source-research.md) incorporates Objective 5’s first-party verification of Registry module APIs, provider/version boundaries, AWS API models, and hosted-source gaps.
5. [Workflows and tool boundaries](05-workflows-and-tool-boundaries.md) records the research that grounds the accepted two-tool surface.
6. [Operational, security, and rights considerations](06-operational-security-and-rights.md) collects the evidence behind accepted operational requirements and pending source gates.
7. [MVP options, risks, and validation spikes](07-mvp-risks-and-validation.md) records the validation work required before implementation and release.
8. [Decision log and discovery outcome](08-decision-log-and-agenda.md) records the accepted decisions and remaining validation gates.
9. [Product and technical specification](09-product-and-technical-specification.md) is the decision-complete MVP contract for implementation and release review.
10. [Implementation plan](10-implementation-plan.md) orders validation-first implementation, adversarial tests, independent review, deterministic layered Pi verification, and release gates.

## Evidence labels

Every substantive statement is labelled as one of the following:

- **[Verified — repository]**: directly observed in this checkout at the cited path on 2026-08-31.
- **[Verified — official source]**: supported by the linked official source with title and access date; confirm it again at product-selection time because web documentation changes.
- **[Assumption]**: a working premise, not established fact.
- **[Recommendation]**: a proposed direction, not a decision.
- **[Open decision]**: historical research label; accepted product choices are recorded in [08](08-decision-log-and-agenda.md) and [09](09-product-and-technical-specification.md).
- **[Accepted decision]**: a user-approved product requirement; it does not replace a validation gate.
- **[Validation needed]**: a claim or integration behavior that must be tested before relying on it.

The Pi documentation supplied by the harness is outside this repository. This session's filesystem policy did not permit reading that path, so API statements in the Pi architecture page are limited to the locally checked-in example; its official-reference links are a verification queue rather than a claim that the reference was re-read in this session.

## Source boundaries

- The local authority is `example-code/aws-knowledge/`; there is no application source, package manifest, test suite, or existing maintained project documentation in this checkout.
- `.env` exists but is deliberately not read or quoted. No secret, token, or environment value is included here.
- Objective 5 retrieved first-party GitHub source documents on 2026-08-31. It could not directly fetch hosted AWS, HashiCorp, or Registry pages; those citations remain authoritative targets and their HTTP/terms/robots contracts must be link-checked before implementation.

## Maintenance

Accepted decisions are recorded in [the decision log](08-decision-log-and-agenda.md) and specified in [09](09-product-and-technical-specification.md). Preserve research evidence labels and citations: acceptance does not convert a recommendation into a verified fact or remove a validation gate.
