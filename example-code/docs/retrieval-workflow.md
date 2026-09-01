# Retrieve AWS documentation efficiently

Use `scripts/aws-docs-search.sh` to search the mapped AWS endpoint, select relevant results, retrieve full pages, and preserve enough provenance to reproduce or verify the run.

The underlying endpoint is undocumented. Review [`api-map/README.md`](../api-map/README.md) before depending on it in automation.

## Requirements

- Bash
- `curl`
- `jq`
- `shasum`
- Optional: `pandoc` for AWS pages that provide HTML but not Markdown

## 1. Discover exact facets

Start with metadata only. Request enough suggestions to expose useful product and guide facets, but do not download pages yet:

```bash
scripts/aws-docs-search.sh \
  --query 'EKS Pod Identity' \
  --api-results 100 \
  --limit 10 \
  --output results/eks-discovery
```

Inspect the exact values returned by AWS:

```bash
column -t -s $'\t' results/eks-discovery/facets.tsv
```

Facet values are exact. For example, the mapped API returned `Amazon EKS`, while `Amazon Elastic Kubernetes Service` produced zero matches.

## 2. Run a narrow retrieval

Use the discovered facets and bound the API response with `--api-results`:

```bash
scripts/aws-docs-search.sh \
  --query 'EKS Pod Identity' \
  --product 'Amazon EKS' \
  --guide 'User Guide' \
  --api-results 10 \
  --limit 10 \
  --download 5 \
  --output results/eks-pod-identity
```

This makes one search request, then retrieves at most five full pages.

## 3. Read the result

Open the generated reports:

```bash
code results/eks-pod-identity/research-overview.md
code results/eks-pod-identity/research-bundle.md
```

- `research-overview.md` organizes titles, AWS ranks, summaries, matched excerpts, source links, and facets.
- `research-bundle.md` combines the downloaded full-text Markdown sources.
- `manifest.json` records the query ID, endpoint, counts, source URLs, local files, formats, byte counts, and SHA-256 checksums.

Use the original source URLs when citing AWS documentation.

## Exact identifiers

AWS ranking can bury an exact error code or API symbol. `--prefer` locally moves literal matches ahead of the endpoint order:

```bash
scripts/aws-docs-search.sh \
  --query 'InvalidClientTokenId error troubleshooting' \
  --prefer 'InvalidClientTokenId' \
  --api-results 100 \
  --limit 10 \
  --download 2 \
  --output results/invalid-client-token
```

Keep `--api-results 100` when using `--prefer` so local reranking can inspect deep results. `results.tsv` preserves both local `rank` and original `endpoint_rank`.

## Cache behavior

The shared cache defaults to `.cache/aws-docs` with a one-hour TTL.

For each source URL, it stores:

- the fetched body when successful;
- HTTP status and content type;
- fetch time; and
- negative Markdown availability, such as a `.md` URL returning 404.

This avoids repeatedly downloading the same page and repeatedly testing known-unavailable Markdown routes.

Configure it when needed:

```bash
scripts/aws-docs-search.sh \
  --query 'Lambda SnapStart' \
  --api-results 10 \
  --limit 10 \
  --download 3 \
  --cache "$HOME/.cache/aws-docs" \
  --cache-ttl 86400 \
  --output results/lambda-snapstart
```

Disable caching for a forced retrieval:

```bash
scripts/aws-docs-search.sh \
  --query 'Lambda SnapStart' \
  --api-results 5 \
  --limit 5 \
  --download 1 \
  --no-cache \
  --output results/lambda-snapstart-fresh
```

The `cache` column in `downloads.tsv` reports `hit`, `miss`, or `disabled`.

## Retrieval strategy

For each selected result, the script:

1. accepts only `https://docs.aws.amazon.com/` or `https://docs.aws.com/` links;
2. removes URL fragments before retrieval;
3. tries an AWS-authored `.md` representation when the link ends in `.html`;
4. requires HTTP 200 and `text/markdown` before accepting Markdown;
5. falls back to the original HTML URL;
6. converts HTML to GitHub-flavored Markdown when `pandoc` is available;
7. calculates SHA-256 and byte count; and
8. records provenance in `downloads.tsv` and `manifest.json`.

## Output files

| File | Purpose |
|---|---|
| `request.json` | Exact search request, including `maxResults` |
| `request-url.txt` | Search endpoint and optional session parameter |
| `run-options.json` | Local filtering, download, and cache settings |
| `response.json` | Raw AWS search response |
| `response-headers.txt` | Search HTTP headers |
| `facets.tsv` | Product and guide facet values |
| `results.json` / `results.tsv` | Normalized ranked results |
| `downloads.tsv` | Retrieval method, cache state, paths, hashes, and sizes |
| `manifest.json` | Machine-readable run and document provenance |
| `research-overview.md` | Human-readable search report |
| `research-bundle.md` | Combined retrieved source text |
| `documents/` | Individual downloaded or converted pages |

Output directories must be new or empty. The script refuses to overwrite a previous run.

## Choosing limits

- Use `--api-results 5` or `10` for a precise query and small response.
- Use `--api-results 100` for facet discovery or deep `--prefer` reranking.
- Set `--limit` no higher than `--api-results`.
- Set `--download` only as high as the number of pages you will actually inspect.

The mapped API accepts `maxResults` from 1 through 100 and exposes no continuation mechanism beyond that result set.
