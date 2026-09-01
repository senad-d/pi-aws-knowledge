# AWS documentation search exploration

This project demonstrates a two-step, command-line workflow:

1. Search the AWS documentation index with `curl`.
2. Save normalized results and optionally retrieve the matching documentation pages.

The search URL is an internal endpoint used by the AWS documentation website, not a documented public AWS API. Treat its request and response formats as changeable. Start with the reproducible [`api-map/`](api-map/README.md) for the endpoint matrix, field behavior, limits, raw evidence, and OpenAPI description.

## Quick start

Requirements:

- Bash
- `curl`
- `jq`
- Optional: `pandoc` for converting HTML-only pages to Markdown

Run a scoped search and download the first two documents:

```bash
scripts/aws-docs-search.sh \
  --query 'S3 versioning' \
  --product 'Amazon Simple Storage Service' \
  --guide 'User Guide' \
  --api-results 10 \
  --limit 10 \
  --download 2 \
  --output results/s3-versioning
```

Add `--session auto` to send the `session=<uuid>` query parameter from the originally proposed URL. Testing found that this parameter is optional; the current AWS search frontend does not add it to the search request.

## Inspect the output

```bash
jq -r '.[] | [.rank, .title, .url] | @tsv' \
  results/s3-versioning/results.json

column -t -s $'\t' results/s3-versioning/results.tsv
```

Each run stores:

| Path | Contents |
|---|---|
| `request-url.txt` | Exact endpoint URL, including an optional session |
| `request.json` | JSON request body |
| `run-options.json` | Local processing options such as limit, download count, and preferred text |
| `response-headers.txt` | HTTP response headers |
| `response.json` | Complete AWS response, bounded by `--api-results` (default 100) |
| `facets.tsv` | Exact product and guide filter values returned by AWS |
| `results.json` | Normalized first `--limit` results, including AWS endpoint rank |
| `results.tsv` | Spreadsheet-friendly result summary and local/AWS rank comparison |
| `research-overview.md` | Readable ranked report containing titles, summaries, matched excerpts, sources, and facets |
| `research-bundle.md` | Combined full text of every downloaded Markdown document |
| `downloads.tsv` | Download source and saved-file map, when downloading |
| `documents/` | Retrieved Markdown or HTML documents |

The script first changes a result URL ending in `.html` to `.md`. AWS serves many documentation pages directly as `text/markdown`. If that URL is unavailable, the script downloads the original HTML and uses `pandoc` when installed.

Output directories must be new or empty. The script refuses to overwrite a previous run so search evidence and downloaded files are preserved.

## Build a rich subject package

The search endpoint returns snippets rather than a complete explanation. Use `--download` to retrieve several relevant pages; the script then combines their full text:

```bash
scripts/aws-docs-search.sh \
  --query 'S3 Object Lock compliance governance retention legal hold' \
  --product 'Amazon Simple Storage Service' \
  --guide 'User Guide' \
  --prefer 'Object Lock' \
  --limit 10 \
  --download 5 \
  --output results/s3-object-lock
```

Open the readable search report and full source corpus:

```bash
code results/s3-object-lock/research-overview.md
code results/s3-object-lock/research-bundle.md
```

In VS Code, use **Markdown: Open Preview** to render them. The overview organizes AWS-provided metadata; the bundle contains the retrieved documentation verbatim. Producing a cohesive subject explanation from multiple sources is a separate synthesis step and should retain links to the original pages.

A complete preserved example, including a source-grounded synthesized guide, is available at [`results/evaluations/round-4/s3-object-lock-rich/`](results/evaluations/round-4/s3-object-lock-rich/).

## Basic curl request

The smallest useful request confirmed during testing is:

```bash
jq -n --arg query 'S3 versioning' '{
  textQuery: {input: $query},
  contextAttributes: [
    {key: "domain", value: "docs.aws.amazon.com"}
  ],
  acceptSuggestionBody: "RawText",
  locales: ["en_us"],
  maxResults: 10
}' > request.json

curl --silent --show-error \
  --request POST \
  --header 'content-type: application/json' \
  --data-binary @request.json \
  'https://proxy.search.docs.aws.com/search' \
  | tee response.json \
  | jq '.suggestions[:10] | map(.textExcerptSuggestion | {title, link, summary})'
```

To include the proposed session parameter:

```bash
session=$(uuidgen | tr '[:upper:]' '[:lower:]')
curl --request POST \
  --header 'content-type: application/json' \
  --data-binary @request.json \
  "https://proxy.search.docs.aws.com/search?session=$session"
```

## Discover and apply facets

Facet values are exact. For example, AWS currently uses `Amazon EKS`, not `Amazon Elastic Kubernetes Service`.

First run a broad search without filters:

```bash
scripts/aws-docs-search.sh \
  --query 'EKS Pod Identity' \
  --limit 10 \
  --output results/eks-broad

column -t -s $'\t' results/eks-broad/facets.tsv
```

Then use a returned value:

```bash
scripts/aws-docs-search.sh \
  --query 'EKS Pod Identity' \
  --product 'Amazon EKS' \
  --guide 'User Guide' \
  --download 2 \
  --output results/eks-pod-identity
```

If a filter is misspelled, the endpoint can return zero results. The script emits a warning in that case.

## Prioritize an exact symbol or phrase

AWS ranking can bury exact error codes and API symbols. Use `--prefer` to search all returned metadata for literal text and move matching results ahead of the endpoint order:

```bash
scripts/aws-docs-search.sh \
  --query 'InvalidClientTokenId error troubleshooting' \
  --prefer 'InvalidClientTokenId' \
  --limit 10 \
  --output results/invalid-client-token
```

`results.tsv` records both `rank` and `endpoint_rank`, while `preference_match` shows whether the text occurred in the title or other metadata. This is local reordering only; it does not change the request sent to AWS. The script warns when none of the returned titles, summaries, or excerpts contain the preferred text.

## Query efficiently

- Run a broad metadata-only search to discover exact facets, then add product and guide filters before downloading.
- Use `--api-results 1..100` (the API's `maxResults` field) to bound response size. Use 100 when local `--prefer` reranking must inspect deep results.
- Download only the first relevant results.
- Prefer AWS's direct Markdown representation, but fall back to HTML because Markdown is not available for every result.
- Cache downloaded pages using their `ETag` or `Last-Modified` headers in long-running integrations.
- Use bounded retries and low concurrency. The endpoint did not advertise rate-limit headers during testing, which does not imply unlimited use.
- Inspect titles and excerpts before downloading. The response has no relevance score, and a nonsense query can still return 100 unrelated suggestions.
- Use `--prefer` for identifiers and exact phrases, not as a general semantic-ranking replacement.

See the canonical [API map](api-map/README.md) and its [OpenAPI description](api-map/openapi.yaml). The shorter [endpoint reference](docs/endpoint-reference.md) summarizes the observed contract. The preserved [search evaluation runs](results/evaluations/README.md) contain the raw evidence and quality comparisons from multiple query styles.
