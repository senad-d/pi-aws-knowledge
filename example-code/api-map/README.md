# AWS documentation API map

This is a reproducible map of the undocumented API used by the AWS documentation search website. It is based on direct `curl` probes and inspection of the current AWS search frontend on 2026-09-01.

> This is not an AWS-published API contract. AWS can change it without notice. Use low request rates, cache retrieved pages, and do not treat observed permissiveness as a guarantee.

## Endpoint inventory

| Purpose | Method and URL | Observed behavior |
|---|---|---|
| Search API | `POST https://proxy.search.docs.aws.com/search` | Public JSON search; no AWS credentials required |
| CORS discovery | `OPTIONS https://proxy.search.docs.aws.com/search` | 204; advertises `POST` |
| AWS search UI | `GET https://docs.aws.amazon.com/search/doc-search.html?...` | 200 HTML application |
| Autocomplete | `GET https://search.autosuggest.docs.aws.com/auto-suggest/<query>` | Plain curl returned 403; no callable contract established |
| Full documentation HTML | `GET <suggestion.link>` | 200 for tested result URLs |
| Full documentation Markdown | Replace a result's final `.html` with `.md` | 200 `text/markdown` for many user guides; 404 for tested CLI and CDK references |

`GET`, `HEAD`, and `PUT` against the search API route returned 403. Invalid POST bodies returned 400.

## Recommended search request

Use `maxResults` to avoid downloading the default set of up to 100 suggestions:

```bash
curl --silent --show-error \
  --request POST \
  --header 'content-type: application/json' \
  --data-binary @api-map/examples/search-request.json \
  'https://proxy.search.docs.aws.com/search' \
  | jq '{queryId, count:(.suggestions|length), suggestions}'
```

Request:

```json
{
  "textQuery": {
    "input": "DynamoDB global secondary index"
  },
  "contextAttributes": [
    {
      "key": "domain",
      "value": "docs.aws.amazon.com"
    }
  ],
  "acceptSuggestionBody": "RawText",
  "locales": ["en_us"],
  "maxResults": 10
}
```

### Confirmed request fields

| Field | Required | Observed contract |
|---|---:|---|
| `textQuery` | Yes | Object containing `input` |
| `textQuery.input` | Yes | Non-empty, non-whitespace string |
| `contextAttributes` | Yes | Non-empty array of `{key,value}` objects |
| Domain context | Operationally | `domain=docs.aws.amazon.com` produced docs; a wrong domain returned 200 with zero matches |
| `acceptSuggestionBody` | No | `RawText` returns clean plain-text excerpts; omission returns larger HTML snippets with highlight spans; an unknown value returned 400 |
| `locales` | No | Empty or one supported locale accepted; two locales or an unknown locale returned 400 |
| `identityID` | No | Frontend client identifier; omission works. String and number were accepted. A string identity changed top-ten ordering in one controlled probe, so avoid it unless stable client identity is intended |
| `maxResults` | No | Integer from 1 through 100; controls response size |
| Other fields | Not rejected consistently | Unknown fields were accepted. Do not infer they have semantics |

Although requests without `Content-Type` and with `text/plain` were accepted in probes, clients should send `application/json`.

## Result limiting and pagination

`maxResults` is confirmed:

| Value | Status | Suggestions |
|---:|---:|---:|
| 0 | 400 | — |
| 1 | 200 | 1 |
| 2 | 200 | 2 |
| 10 | 200 | 10 |
| 100 | 200 | 100 |
| 101 | 400 | — |
| `"1"` | 400 | — |

The response contains no continuation token. Tested fields named `pageSize`, `offset`, `startIndex`, and `nextToken` did not provide pagination: they returned the normal first result and, except for the real `maxResults` field, the normal 100-result set.

Therefore:

- use `maxResults` for efficient bounded responses;
- use exact product/guide facets to narrow searches;
- do not claim that results beyond the first 100 can be paged through this route.

## Facet filtering

Add exact facet values to `contextAttributes`:

```json
{
  "key": "aws-docs-search-product",
  "value": "Amazon EKS"
}
```

```json
{
  "key": "aws-docs-search-guide",
  "value": "User Guide"
}
```

A product-filtered EKS probe returned only the `Amazon EKS` product facet. A plausible but incorrect value, `Amazon Elastic Kubernetes Service`, returned 200 with zero suggestions. Discover values from an unfiltered response's `facets` object before applying them.

## Locales

These single locale values all returned 200 in the probe suite:

```text
de_de en_us es_es fr_fr id_id it_it ja_jp ko_kr pt_br zh_cn zh_tw
```

The same generic `Amazon S3` query returned between 96 and 100 suggestions depending on locale. Localized queries should be used for meaningful ranking. Multiple locales in one request returned 400.

## Session query parameter

All of these returned 200 and had identical first-ten URL ordering in the controlled DynamoDB probe:

```text
/search
/search?session=00000000-0000-4000-8000-000000000000
/search?session=not-a-uuid
/search?unknown=value
```

This proves that `session` is optional and not UUID-validated at the HTTP boundary. It does not prove that the backend never uses it. The current frontend bundle posts directly to `/search` without a session parameter.

## Response schema

Top-level fields:

| Field | Type | Meaning |
|---|---|---|
| `queryId` | string | Unique request/search identifier |
| `suggestions` | array | Ranked documentation results, bounded by `maxResults` or 100 |
| `facets` | object | Product and guide values represented in the result set |

A suggestion wraps `textExcerptSuggestion`, which can contain:

- `link`
- `title`
- `suggestionBody`
- `summary`
- `context[]`
- `sourceCreatedAt`
- `sourceUpdatedAt`
- `isCitable`

The exact observed paths are saved in [`evidence/contract-run-20260901-v2/response-paths.txt`](evidence/contract-run-20260901-v2/response-paths.txt). See [`openapi.yaml`](openapi.yaml) for a machine-readable description.

No relevance score was exposed. Nonsense queries can still return unrelated suggestions.

## Retrieving full documentation

The search response contains metadata and excerpts, not complete pages.

```bash
url=$(curl --silent --show-error \
  --request POST \
  --header 'content-type: application/json' \
  --data-binary @api-map/examples/search-request.json \
  'https://proxy.search.docs.aws.com/search' \
  | jq -r '.suggestions[0].textExcerptSuggestion.link')

curl --location --fail --output page.html "$url"
```

Try AWS-authored Markdown first when the result ends in `.html`:

```bash
markdown_url=${url%.html}.md
if ! curl --location --fail --output page.md "$markdown_url"; then
  curl --location --fail --output page.html "$url"
fi
```

Observed retrieval matrix:

| Documentation system | HTML | `.md` replacement |
|---|---:|---:|
| Amazon S3 User Guide | 200 | 200 `text/markdown` |
| AWS CLI reference | 200 | 404 |
| AWS CDK API reference | 200 | 404 |

Do not assume Markdown exists for every link.

## HTTP and CORS behavior

The OPTIONS response advertised:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,...
```

Successful POST responses included `access-control-allow-origin: *` and `access-control-allow-credentials: true`. No rate-limit headers were observed. Rate limits were not stress-tested.

## Error behavior

| Condition | Observed response |
|---|---|
| Empty object or malformed JSON | 400 `{"message":"Invalid request body"}` |
| Missing/empty query | 400 |
| Numeric `textQuery.input` | 502 `{"message":"Internal server error"}` |
| Missing/empty context | 400 |
| Context item missing key or value | 400 |
| Unsupported or multiple locales | 400 |
| Unsupported `acceptSuggestionBody` | 400 |
| Invalid `maxResults` | 400 |
| Valid request with unmatched domain/facet | 200 with empty suggestions and facets |

The error body does not identify which field failed.

## Reproduce the map

Run the complete probe suite into a new directory:

```bash
scripts/probe-aws-docs-api.sh api-map/evidence/my-run
column -t -s $'\t' api-map/evidence/my-run/summary.tsv
```

The probe preserves, per case:

- method and URL;
- request JSON;
- response headers;
- raw response body;
- curl status and metadata.

Primary evidence:

- [`contract-run-20260901-v2/summary.tsv`](evidence/contract-run-20260901-v2/summary.tsv)
- [`limits-run-20260901/summary.tsv`](evidence/limits-run-20260901/summary.tsv)
- [`contract-run-20260901-v2/top-10-url-sha1.tsv`](evidence/contract-run-20260901-v2/top-10-url-sha1.tsv)
- [`frontend-bundle-20260901/observed-fragments.txt`](evidence/frontend-bundle-20260901/observed-fragments.txt), with the fetched bundle URL and SHA-256 alongside it

## Known unknowns

The probes did not establish:

- service-level availability or compatibility guarantees;
- rate limits;
- a way to retrieve result 101 or later;
- all accepted `acceptSuggestionBody` values;
- maximum query length;
- whether `session` has backend analytics or experimentation effects;
- whether `identityID` personalization is stable;
- an unauthenticated callable contract for autocomplete.
