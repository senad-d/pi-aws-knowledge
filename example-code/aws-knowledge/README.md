# aws-knowledge extension

Fixture-only AWS Knowledge compatibility tools for pi.

## Registered tools

- `aws___search_documentation`
- `aws___read_documentation`
- `aws___recommend`
- `aws___list_regions`
- `aws___get_regional_availability`
- `aws___retrieve_agent_sop`

## Phase-1 scope

- Uses deterministic fixtures only (`.pi/extensions/aws-knowledge/data/fixtures`).
- Live adapters are intentionally blocked in phase 1.
- No network fetch/index integration is performed.

## Configuration

Environment variables:

- `AWS_KNOWLEDGE_MODE` (`compat` default, `strict` optional)
  - `compat`: unknown search topics are dropped.
  - `strict`: unknown search topics raise `validation_error`.
- `AWS_KNOWLEDGE_DATA_SOURCE`
  - Must be unset or `fixtures` in phase 1.
  - Any other value throws a startup `downstream_error`.
- `AWS_KNOWLEDGE_TOKEN_SECRET`
  - HMAC secret used to sign/verify `next_token` values.
  - If unset, a fixture default is used for local development.
- `AWS_KNOWLEDGE_AVAILABILITY_PAGE_SIZE`
  - Page size for single-region/no-filter availability pagination.
- `AWS_KNOWLEDGE_FIXTURE_ROOT`
  - Optional path override for fixture JSON files.
  - If unset, fixtures are loaded from the extension directory itself (independent of current working directory).

## Pagination token signing expectations

`aws___get_regional_availability` uses signed opaque tokens (`base64url(payload).hmac`).

- Payload fields: region (`r`), resource type (`t`), offset (`o`), filter hash (`f`).
- Tokens are validated with HMAC SHA-256.
- Malformed or forged tokens fail closed with `validation_error`.

## Known limits and compatibility notes

- Search topics: max 3.
- Availability `regions`: max 10.
- Multi-region availability requires at least one filter.
- `next_token` works only for single-region + no-filter mode.
- Read tool keeps mixed row-level `SUCCESS`/`ERROR` behavior.
- SOP lookups are exact-key only (`not_found` for unknown names).

## Manual validation checklist

After `/reload`, run representative calls:

1. Search compat-topic behavior (`topics` with an unknown value).
2. Read mixed request set (one valid URL + one blocked URL), verify partial `ERROR` rows.
3. Read page with redirect metadata (`redirected_url` present).
4. Recommend with non-docs.aws URL (expect `invalid_url`).
5. List regions ordering is deterministic (`region_id` sorted).
6. Availability multi-region without filters (expect `validation_error`).
7. Availability single-region pagination with `next_token` continuation.
8. Retrieve SOP with valid and invalid exact `sop_name`.

## Rollback / abort path

If runtime behavior deviates during validation:

1. Disable extension by renaming/removing `.pi/extensions/aws-knowledge/`.
2. `/reload` pi session.
3. Revert the introducing commit.

## Phase-2 backlog (deferred)

- Live docs fetch adapter with timeout/retry and cancellation.
- Search index quality improvements (hybrid retrieval/rerank).
- External region/availability synchronization.
- Structured metrics and cache controls.
