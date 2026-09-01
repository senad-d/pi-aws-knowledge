# AWS and Terraform documentation-source research

**Status:** externally verified source-selection research. The MVP corpus and version policy are accepted; hosted-source contracts remain validation-needed.

**Access note:** the Objective 5 report retrieved the first-party GitHub source files cited below on **2026-08-31**. Direct hosted-page requests to AWS, HashiCorp, and Registry hosts were blocked; citations to those hosted pages are authoritative targets, not observations of their current HTTP behavior. Robots, terms, headers, redirects, and hosted-content reuse remain validation items.

## Source comparison

| Source family | Authoritative source | Verified capability | Retrieval posture | Status |
| --- | --- | --- | --- | --- |
| AWS HTML documentation | [AWS Documentation](https://docs.aws.amazon.com/) (AWS, accessed 2026-08-31) | Official documentation entry point; representative [S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) and [S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html) URL families exist | Direct allow-listed read only after hosted-page permission/behavior validation | [Validation needed] |
| AWS API models | [AWS API Models — README](https://github.com/aws/api-models-aws/blob/main/README.md) (AWS, accessed 2026-08-31) | Smithy JSON-AST models for public AWS API services; AWS says it uses them for daily SDK/CLI releases | Structured API metadata, not guide prose or current account state | [Verified — official source] |
| Terraform core docs | [Terraform documentation](https://developer.hashicorp.com/terraform/docs) (HashiCorp, accessed 2026-08-31); [web-unified-docs](https://github.com/hashicorp/web-unified-docs) (HashiCorp, accessed 2026-08-31) | First-party source has named core documentation lines `v1.1.x` through `v1.16.x` | Hosted route behavior and terms still need validation | [Verified — official source] source tree; [Validation needed] hosted behavior |
| Registry modules | [Registry API](https://developer.hashicorp.com/terraform/registry/api-docs) (HashiCorp, accessed 2026-08-31) | Supported module search, latest, exact-version, version-list, and metadata/readme surface | Strongest verified discovery/read candidate | [Verified — official source] |
| Registry providers | [Provider Registry Protocol](https://developer.hashicorp.com/terraform/internals/provider-registry-protocol) (HashiCorp, accessed 2026-08-31) | Provider address/version and package-installation discovery | Not a verified provider-documentation-body API | [Verified — official source] protocol; [Validation needed] docs HTML |
| Local provider schema | [`terraform providers schema`](https://developer.hashicorp.com/terraform/cli/commands/providers/schema) (HashiCorp, accessed 2026-08-31) | Machine-readable schemas for providers used in the current configuration | Separate local-execution feature, not hosted documentation | [Verified — official source] |

## Verified source facts

### AWS

- **[Verified — official source]** [AWS API Models — README](https://github.com/aws/api-models-aws/blob/main/README.md) (AWS, accessed 2026-08-31) says the repository contains Smithy JSON-AST models for all public AWS API services and describes service directories with a service `version` property. [AWS API Models LICENSE](https://github.com/aws/api-models-aws/blob/main/LICENSE) (AWS, accessed 2026-08-31) is Apache-2.0.
- **[Verified — official source]** An API model version, such as [S3 `2006-03-01`](https://github.com/aws/api-models-aws/blob/main/models/s3/service/2006-03-01/s3-2006-03-01.json) (AWS, accessed 2026-08-31), identifies an API model; it is not an AWS documentation-release version.
- **[Verified — official source]** [awsdocs/amazon-s3-userguide](https://github.com/awsdocs/amazon-s3-userguide) (AWS, accessed 2026-08-31) has `archived` as its default branch. Do not use AWS GitHub guide repositories as a current `docs.aws.amazon.com` mirror without page-specific provenance review.
- **[Validation needed]** No hosted request was observed for [AWS Documentation](https://docs.aws.amazon.com/), [robots.txt](https://docs.aws.amazon.com/robots.txt), or [AWS Site Terms](https://aws.amazon.com/terms/) (AWS, accessed 2026-08-31). Search/index APIs, canonical URLs, redirects, authentication, rate limits, and hosted-content reuse are not verified.

### Terraform

- **[Verified — official source]** [Registry API](https://developer.hashicorp.com/terraform/registry/api-docs) (HashiCorp, accessed 2026-08-31) documents public Registry module base URL `https://registry.terraform.io/v1/modules/`, module search, versions, latest module metadata, and exact-version module metadata. Its source is [Registry API source](https://github.com/hashicorp/web-unified-docs/blob/main/content/terraform-docs-common/docs/registry/api-docs.mdx) (HashiCorp, accessed 2026-08-31).
- **[Verified — official source]** The same API documents mutable latest redirects (302/307), 301 aliases, and possible 429 rate limiting, but no numeric quota. It warns that additional internal UI endpoints and undocumented properties can change. Do not use Registry UI/internal endpoints as APIs.
- **[Verified — official source]** [Provider Registry Protocol](https://developer.hashicorp.com/terraform/internals/provider-registry-protocol) (HashiCorp, accessed 2026-08-31) defines provider address/version discovery, including `GET /v1/providers/:namespace/:type/versions` for the public Registry. It documents installation metadata/packages, not provider documentation page bodies or provider-doc search.
- **[Verified — official source]** [Terraform provider schema command](https://developer.hashicorp.com/terraform/cli/commands/providers/schema) (HashiCorp, accessed 2026-08-31) requires `-json` for machine-readable output. Its [source](https://github.com/hashicorp/web-unified-docs/blob/main/content/terraform/v1.16.x/docs/cli/commands/providers/schema.mdx) explicitly says a schema `version` is not a provider version.
- **[Validation needed]** Hosted `developer.hashicorp.com` and Registry HTML canonical/redirect/cache behavior, terms, robots, and provider documentation HTML version resolution were not observed. Public module API examples do not authenticate, but that is not a blanket anonymous-access contract.

## Version policy candidates

| Source type | Truthful no-version statement | Exact version policy | Status |
| --- | --- | --- | --- |
| AWS HTML | “Current official page retrieved at `<retrieved_at>`.” | Unsupported unless that page family exposes and passes validation for an exact identifier. | [Recommendation] |
| AWS API model | Current `main` model at recorded commit and retrieval time. | Pin service + service-model version + Git commit; this is a source snapshot, not HTML documentation history. | [Recommendation] |
| Terraform core docs | Current page at retrieval time; include resolved core docs line when exposed. | Select a verified versioned route and echo requested/resolved line. Source directories do not prove complete historical hosted docs. | [Recommendation] |
| Registry module | Registry latest response at retrieval time; store returned module version. | Use documented exact module endpoint; fail clearly if missing. Retention is not guaranteed. | [Verified — official source] API capability; [Recommendation] output policy |
| Provider docs | Mutable current representation only until live behavior proves a resolved version. | Require exact address + version and use a tested Registry page or separately labelled upstream tag/commit. | [Recommendation]; [Validation needed] Registry docs HTML |
| Local schema | Schema for identified local configuration/provider context. | Never represent schema format version as provider version or Registry documentation. | [Verified — official source] schema distinction; [Recommendation] boundary |

**[Accepted decision]** Use separate Terraform core, provider, and module version dimensions rather than one ambiguous `version` input. AWS human documentation is unversioned unless a validated source exposes a version. AWS API models are deferred. [08](08-decision-log-and-agenda.md#accepted-decision-groups)

## Provenance and source boundaries

**[Recommendation]** Record publisher, source family/kind, title when available, requested/resolved version in its source-specific dimension, final allowed URL, retrieval time, and bounded-excerpt/truncation state. For upstream Git, additionally record tag and commit.

**[Recommendation]** Keep `registry-module-api`, `registry-provider-html`, `terraform-core-html`, `upstream-provider-git`, `aws-api-model`, `aws-html`, and `local-schema` distinct. Repository licenses—AWS models Apache-2.0, provider source MPL-2.0, and [web-unified-docs LICENSE](https://github.com/hashicorp/web-unified-docs/blob/main/LICENSE) (HashiCorp/IBM, accessed 2026-08-31)—do not establish rights for hosted AWS, HashiCorp, or Registry content.

See [06](06-operational-security-and-rights.md) for security and rights constraints and [07](07-mvp-risks-and-validation.md) for evidence gates.
