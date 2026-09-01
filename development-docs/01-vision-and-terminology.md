# Vision and terminology

**Status:** research framing; product choices are accepted in [08](08-decision-log-and-agenda.md) and [09](09-product-and-technical-specification.md).

**Primary evidence:** repository assessment in [02](02-repository-and-example-assessment.md); source options in [04](04-documentation-source-research.md).

## Proposed problem statement

**[Assumption]** A Pi user working on AWS infrastructure and Terraform needs grounded documentation answers without manually locating the correct vendor page, provider version, or region-specific fact. The proposed extension would retrieve and present source-linked documentation; it would not itself make infrastructure changes.

**[Recommendation]** Treat provenance, source version, and retrieval time as first-class output metadata. Those are necessary to distinguish a current AWS page from a Terraform provider page tied to a chosen version.

## Terms

| Term | Meaning in this research | Status |
| --- | --- | --- |
| **Pi extension** | A Pi-loaded module that registers tools. The local example's default export accepts `ExtensionAPI` and calls `pi.registerTool`. | [Verified — repository] `example-code/aws-knowledge/index.ts` |
| **Tool** | A named, schema-described operation that Pi can invoke and whose result is returned as content and details. | [Verified — repository] `example-code/aws-knowledge/index.ts`, `schemas.ts`, `utils/truncate.ts` |
| **Retrieval** | Obtaining a document, excerpt, or structured source record from an approved documentation source. It does not mean applying Terraform or calling AWS control-plane APIs. | [Recommendation] boundary |
| **Discovery/search** | Finding candidate documentation records for a query before reading their text. | [Recommendation] workflow term |
| **Read** | Returning a bounded excerpt of one selected source, with its canonical URL and provenance. | [Recommendation] workflow term |
| **Latest by default** | The source's current canonical first-party representation at retrieval time; it is not a promise of historical reproducibility. | [Accepted decision] [08](08-decision-log-and-agenda.md) |
| **Explicit version** | A caller-selected source-specific Terraform core, provider, or module version. It resolves exactly or fails; it never silently becomes latest. | [Accepted decision] [08](08-decision-log-and-agenda.md) |
| **Provider documentation** | Terraform Registry documentation for a provider (for example, `hashicorp/aws`), distinct from Terraform language documentation and a module's README. | [Verified — official source] [Terraform Registry](https://registry.terraform.io/) (accessed 2026-08-31) |
| **AWS documentation** | AWS-published service/reference/guidance content, distinct from account-specific console state or live service availability. | [Verified — official source] [AWS Documentation](https://docs.aws.amazon.com/) (accessed 2026-08-31) |
| **Canonical URL** | The source URL that identifies the retrieved document/version. Redirects should be retained as metadata rather than silently substituted. | [Recommendation] |
| **Freshness** | How recently the extension checked or obtained a source, expressed separately from its publication date. | [Recommendation] |
| **Cache** | A bounded local store of retrieval results and metadata. It is not an authoritative documentation mirror. | [Recommendation] |

## Vision constraints

- **[Recommendation]** The product should answer "what does the official documentation say?" with links and bounded excerpts, not claim deployment-time truth.
- **[Recommendation]** AWS region availability, Terraform provider schema, and Terraform plan behavior are separate domains; do not merge them under a vague “AWS knowledge” result.
- **[Recommendation]** A result should identify source family (`aws-docs`, `terraform-language`, `terraform-registry-provider`, or another agreed value), canonical URL, retrieval time, and version policy/result.
- **[Accepted decision]** The MVP is AWS-plus-Terraform: AWS service guides/API references, Terraform language/CLI, and Terraform Registry provider/module documentation. Provider schemas are deferred. [08](08-decision-log-and-agenda.md)
- **[Accepted decision]** No arbitrary URLs are in scope. [09](09-product-and-technical-specification.md#product)

## Non-goals for this research

- **[Verified — repository]** The local example reads deterministic fixtures and blocks live adapters; it does not retrieve live documentation. `example-code/aws-knowledge/README.md`, `config.ts`.
- **[Recommendation]** Do not use this extension to execute `terraform`, inspect credentials, query a customer's AWS account, or mutate cloud resources.
- **[Recommendation]** Do not call a search result authoritative until its publisher, canonical URL, version semantics, and retrieval policy are known.
