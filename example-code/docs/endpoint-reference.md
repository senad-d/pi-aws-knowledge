# AWS documentation search endpoint reference

This reference records direct observations of the AWS documentation website and its search frontend on 2026-09-01. The endpoint is not a documented public AWS API, so AWS can change it without compatibility guarantees.

## Search endpoint

```text
POST https://proxy.search.docs.aws.com/search
POST https://proxy.search.docs.aws.com/search?session=<value>
```

No AWS credentials or SigV4 signature were required in the tested requests.

### HTTP behavior

| Request | Observed status | Notes |
|---|---:|---|
| `POST` with a valid JSON body | 200 | Returns JSON search results |
| `POST` with an empty or invalid body | 400 | `{"message":"Invalid request body"}` |
| `OPTIONS` | 204 | Advertises `POST` and CORS request headers |
| `GET`, `HEAD`, `PUT`, `PATCH`, `DELETE` | 403 | Route is not exposed for these methods |

Successful responses included `access-control-allow-origin: *`. They did not include rate-limit headers in the observed runs.

### Session query parameter

The endpoint returned 200 with:

- no `session` parameter;
- a UUID session value;
- an arbitrary non-UUID session value; and
- an unrelated query parameter.

The current AWS search-page JavaScript posts directly to `/search` without adding `session`. This confirms that a session is not required for basic searching, but it does not prove that AWS ignores it internally. Omit it unless a caller needs to preserve the originally observed request form.

## Request body

A recommended request combines the frontend fields with the directly confirmed `maxResults` limiter:

```json
{
  "textQuery": {
    "input": "S3 versioning"
  },
  "contextAttributes": [
    {
      "key": "domain",
      "value": "docs.aws.amazon.com"
    }
  ],
  "acceptSuggestionBody": "RawText",
  "locales": [
    "en_us"
  ],
  "identityID": "optional-client-identifier",
  "maxResults": 10
}
```

Observed validation:

| Field | Observation |
|---|---|
| `textQuery.input` | Required and must be non-empty |
| `contextAttributes` | Required; omitting the domain context caused HTTP 400 |
| `acceptSuggestionBody` | `RawText` returns plain excerpts; omission returned highlighted HTML snippets |
| `locales` | Optional array containing at most one supported locale |
| `identityID` | Optional. The frontend reads it from the `aws-docs-id` cookie when available |
| `maxResults` | Optional integer from 1 through 100; bounds the result array |

Use this explicit shape rather than relying on server defaults. The current frontend omits `maxResults` and paginates up to 100 returned suggestions locally.

### Facet filters

Add filters as context attributes:

```json
{
  "key": "aws-docs-search-product",
  "value": "Amazon Simple Storage Service"
}
```

```json
{
  "key": "aws-docs-search-guide",
  "value": "User Guide"
}
```

Use facet spelling and capitalization exactly as returned by a broader search. In tested filtered responses, returned product and guide facets matched the requested scopes.

### Locales

The English frontend uses `en_us`. Probes returned 200 for `de_de`, `en_us`, `es_es`, `fr_fr`, `id_id`, `it_it`, `ja_jp`, `ko_kr`, `pt_br`, `zh_cn`, and `zh_tw`. Multiple locales or an unknown locale returned 400.

## Response body

A successful response has three top-level fields:

```json
{
  "queryId": "94d99cbb-3a2c-4f2a-980c-1057b987af0e",
  "suggestions": [],
  "facets": {
    "aws-docs-search-guide": [],
    "aws-docs-search-product": []
  }
}
```

Each suggestion observed during testing had this structure:

```json
{
  "textExcerptSuggestion": {
    "link": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html",
    "title": "How S3 Versioning works - Amazon Simple Storage Service",
    "suggestionBody": "To enable versioning, ...",
    "summary": "Describes how Amazon S3 versions objects and behavior.",
    "context": [
      {
        "key": "aws-docs-search-guide",
        "value": "User Guide"
      },
      {
        "key": "aws-docs-search-product",
        "value": "Amazon Simple Storage Service"
      }
    ],
    "sourceCreatedAt": 1783975668397,
    "sourceUpdatedAt": 1783975668397,
    "isCitable": true
  }
}
```

Treat all suggestion metadata as optional when building a durable client. The AWS frontend itself filters results missing a link or title and substitutes the excerpt when a summary is absent.

### Result count and pagination

Broad requests return 100 suggestions by default. Direct probes confirmed a `maxResults` integer field with a valid range of 1–100; it bounds the returned suggestions and response size. The current AWS web frontend does not send this field—it receives up to 100 suggestions and paginates them locally.

The response contains no continuation token. Tested `pageSize`, `offset`, `startIndex`, and `nextToken` fields did not page beyond the first result set.

Consequences:

- Use `maxResults` for an efficient bounded response.
- Do not treat `pageSize` as an alias for `maxResults`.
- No method to retrieve result 101 or later was established.
- Narrow queries and facets are required when the desired page is not in the returned set.
- The response exposes no relevance score. A deliberately nonsensical test query still returned 100 unrelated suggestions, so callers must inspect result metadata before downloading pages.

## Retrieving a result

The search API returns metadata and excerpts, not full pages. Fetch the result's `link` separately:

```bash
url=$(jq -r '.suggestions[0].textExcerptSuggestion.link' response.json)
curl --location --fail --output page.html "$url"
```

Many AWS documentation pages also have an AWS-authored Markdown representation. For a result ending in `.html`, try `.md` first:

```bash
markdown_url=${url%.html}.md
curl --location --fail --output page.md "$markdown_url"
```

The S3 test page returned:

```text
Content-Type: text/markdown; charset=utf-8
ETag: ...
Last-Modified: ...
```

Markdown was available for 15 of the first 20 results in one broad S3-versioning sample. It was not available for every documentation system, including several CLI, Boto3, and detector-library results in that sample. Always fall back to the original HTML URL.

## Related observed endpoint

The frontend bundle also names this autocomplete route:

```text
GET https://search.autosuggest.docs.aws.com/auto-suggest/<encoded-query>
```

A plain `curl` request returned HTTP 403 during testing, so it is not used by this project and no callable contract is claimed for it.

## Operational limitations

- This is a website implementation endpoint, not an AWS SDK service contract.
- Search ranking and index contents can change between requests. Three immediate repetitions of one DynamoDB query produced different `queryId` values but identical ordering for the first ten URLs.
- Facet values are exact: `Amazon EKS` returned EKS results, while the plausible label `Amazon Elastic Kubernetes Service` returned none in testing.
- `maxResults` limits the response to 1–100 suggestions, but there is no observed continuation mechanism beyond that result set.
- Absence of authentication and rate-limit headers is not permission to crawl aggressively.
- Cache pages, keep concurrency low, and comply with AWS terms and applicable content-use signals.

## Evidence

The mapping is grounded in:

- direct `curl` method and request-body probes against `https://proxy.search.docs.aws.com/search`;
- the current AWS search page at `https://docs.aws.amazon.com/search/doc-search.html`;
- its loaded `awsdocs-search-page` JavaScript bundle, which defines the request body, endpoint, facet fields, and client-side pagination; and
- direct retrieval of AWS HTML and Markdown documentation pages.

The reproducible request, response, headers, normalized results, and downloaded pages from the S3 test are stored under [`results/s3-versioning/`](../results/s3-versioning/).
