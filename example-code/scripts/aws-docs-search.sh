#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="https://proxy.search.docs.aws.com/search"
QUERY=""
PRODUCT=""
GUIDE=""
LOCALE="en_us"
IDENTITY_ID=""
SESSION=""
PREFER=""
API_RESULTS=100
LIMIT=10
DOWNLOAD=0
OUTPUT_DIR=""
CACHE_DIR="${AWS_DOCS_CACHE_DIR:-.cache/aws-docs}"
CACHE_TTL=3600
USE_CACHE=1
PROGRAM_NAME="${AWS_DOCS_PROGRAM_NAME:-scripts/aws-docs-search.sh}"

usage() {
  printf 'Usage: %s --query TEXT [options]\n\n' "$PROGRAM_NAME"
  cat <<'EOF'
Search options:
  -q, --query TEXT       Search text (required)
  -p, --product NAME     Scope to an AWS product facet
  -g, --guide NAME       Scope to a guide facet
  -l, --locale LOCALE    Locale such as en_us or de_de (default: en_us)
      --prefer TEXT      Locally prioritize results containing this exact text
      --identity ID      Optional identityID sent in the request body
      --session VALUE    Optional session query parameter; use "auto" for a UUID

Output options:
      --api-results NUM  Suggestions requested from AWS, 1-100 (default: 100)
  -n, --limit NUMBER     Results written to the normalized files (default: 10)
  -d, --download NUMBER Download the first NUMBER documents (default: 0)
  -o, --output DIR       New or empty output directory (default: results/<UTC timestamp>)
      --cache DIR        Shared document cache (default: .cache/aws-docs)
      --cache-ttl SEC    Reuse cached responses for SEC seconds (default: 3600)
      --no-cache         Fetch documents without reading or writing the cache
  -h, --help             Show this help

Requires curl and jq. Downloaded AWS-authored Markdown is preferred; HTML is
saved as a fallback and converted with pandoc when pandoc is installed.
EOF
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

while (($#)); do
  case "$1" in
    -q|--query) (($# >= 2)) || fail "$1 requires a value"; QUERY=$2; shift 2 ;;
    -p|--product) (($# >= 2)) || fail "$1 requires a value"; PRODUCT=$2; shift 2 ;;
    -g|--guide) (($# >= 2)) || fail "$1 requires a value"; GUIDE=$2; shift 2 ;;
    -l|--locale) (($# >= 2)) || fail "$1 requires a value"; LOCALE=$2; shift 2 ;;
    --prefer) (($# >= 2)) || fail "$1 requires a value"; PREFER=$2; shift 2 ;;
    --identity) (($# >= 2)) || fail "$1 requires a value"; IDENTITY_ID=$2; shift 2 ;;
    --session) (($# >= 2)) || fail "$1 requires a value"; SESSION=$2; shift 2 ;;
    --api-results) (($# >= 2)) || fail "$1 requires a value"; API_RESULTS=$2; shift 2 ;;
    -n|--limit) (($# >= 2)) || fail "$1 requires a value"; LIMIT=$2; shift 2 ;;
    -d|--download) (($# >= 2)) || fail "$1 requires a value"; DOWNLOAD=$2; shift 2 ;;
    -o|--output) (($# >= 2)) || fail "$1 requires a value"; OUTPUT_DIR=$2; shift 2 ;;
    --cache) (($# >= 2)) || fail "$1 requires a value"; CACHE_DIR=$2; shift 2 ;;
    --cache-ttl) (($# >= 2)) || fail "$1 requires a value"; CACHE_TTL=$2; shift 2 ;;
    --no-cache) USE_CACHE=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown option: $1" ;;
  esac
done

[[ -n "$QUERY" ]] || fail "--query is required"
[[ "$API_RESULTS" =~ ^[0-9]+$ ]] || fail "--api-results must be an integer from 1 through 100"
((API_RESULTS >= 1 && API_RESULTS <= 100)) || fail "--api-results must be an integer from 1 through 100"
[[ "$LIMIT" =~ ^[0-9]+$ ]] || fail "--limit must be a non-negative integer"
[[ "$DOWNLOAD" =~ ^[0-9]+$ ]] || fail "--download must be a non-negative integer"
[[ "$CACHE_TTL" =~ ^[0-9]+$ ]] || fail "--cache-ttl must be a non-negative integer"
command -v curl >/dev/null || fail "curl is required"
command -v jq >/dev/null || fail "jq is required"

if [[ "$SESSION" == "auto" ]]; then
  command -v uuidgen >/dev/null || fail "uuidgen is required for --session auto"
  SESSION=$(uuidgen | tr '[:upper:]' '[:lower:]')
fi

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="results/$(date -u +%Y%m%dT%H%M%SZ)"
fi
if [[ -e "$OUTPUT_DIR" ]]; then
  [[ -d "$OUTPUT_DIR" ]] || fail "output path exists and is not a directory: $OUTPUT_DIR"
  if [[ -n "$(find "$OUTPUT_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
    fail "output directory is not empty; choose a new directory to preserve the existing run: $OUTPUT_DIR"
  fi
fi
mkdir -p "$OUTPUT_DIR"

REQUEST_FILE="$OUTPUT_DIR/request.json"
RESPONSE_FILE="$OUTPUT_DIR/response.json"
HEADERS_FILE="$OUTPUT_DIR/response-headers.txt"
RESULTS_FILE="$OUTPUT_DIR/results.json"
TSV_FILE="$OUTPUT_DIR/results.tsv"
FACETS_FILE="$OUTPUT_DIR/facets.tsv"
OVERVIEW_FILE="$OUTPUT_DIR/research-overview.md"
BUNDLE_FILE="$OUTPUT_DIR/research-bundle.md"
MANIFEST_FILE="$OUTPUT_DIR/manifest.json"
OPTIONS_FILE="$OUTPUT_DIR/run-options.json"

jq -n \
  --arg prefer "$PREFER" \
  --arg cacheDir "$CACHE_DIR" \
  --argjson cacheEnabled "$USE_CACHE" \
  --argjson cacheTtl "$CACHE_TTL" \
  --argjson apiResults "$API_RESULTS" \
  --argjson limit "$LIMIT" \
  --argjson download "$DOWNLOAD" \
  '{
    prefer: $prefer,
    apiResults: $apiResults,
    limit: $limit,
    download: $download,
    cache: {enabled: ($cacheEnabled == 1), directory: $cacheDir, ttlSeconds: $cacheTtl}
  }' > "$OPTIONS_FILE"

jq -n \
  --arg query "$QUERY" \
  --arg product "$PRODUCT" \
  --arg guide "$GUIDE" \
  --arg locale "$LOCALE" \
  --arg identity "$IDENTITY_ID" \
  --argjson maxResults "$API_RESULTS" \
  '{
    textQuery: {input: $query},
    contextAttributes: (
      [{key: "domain", value: "docs.aws.amazon.com"}]
      + (if $product == "" then [] else [{key: "aws-docs-search-product", value: $product}] end)
      + (if $guide == "" then [] else [{key: "aws-docs-search-guide", value: $guide}] end)
    ),
    acceptSuggestionBody: "RawText",
    locales: [$locale],
    maxResults: $maxResults
  }
  | if $identity == "" then . else . + {identityID: $identity} end' > "$REQUEST_FILE"

URL="$ENDPOINT"
if [[ -n "$SESSION" ]]; then
  URL="$URL?session=$(jq -rn --arg value "$SESSION" '$value|@uri')"
fi
printf '%s\n' "$URL" > "$OUTPUT_DIR/request-url.txt"

printf 'Searching AWS documentation...\n' >&2
set +e
HTTP_CODE=$(curl --silent --show-error \
  --request POST \
  --header 'content-type: application/json' \
  --connect-timeout 10 \
  --max-time 45 \
  --retry 2 \
  --retry-all-errors \
  --dump-header "$HEADERS_FILE" \
  --output "$RESPONSE_FILE" \
  --write-out '%{http_code}' \
  --data-binary "@$REQUEST_FILE" \
  "$URL")
CURL_STATUS=$?
set -e

((CURL_STATUS == 0)) || fail "search request failed (curl exit $CURL_STATUS)"
if [[ "$HTTP_CODE" != "200" ]]; then
  MESSAGE=$(jq -r '.message // empty' "$RESPONSE_FILE" 2>/dev/null || true)
  fail "search returned HTTP $HTTP_CODE${MESSAGE:+: $MESSAGE}"
fi
jq -e '.suggestions | type == "array"' "$RESPONSE_FILE" >/dev/null || fail "unexpected search response"

jq --argjson limit "$LIMIT" --arg prefer "$PREFER" '
  ($prefer | ascii_downcase) as $preferred
  | [.suggestions
     | to_entries[]
     | (.key + 1) as $endpointRank
     | .value.textExcerptSuggestion
     | {
         endpointRank: $endpointRank,
         title: (.title // ""),
         url: (.link // ""),
         summary: (.summary // ""),
         excerpt: (.suggestionBody // ""),
         product: ([.context[]? | select(.key == "aws-docs-search-product") | .value] | first // null),
         guide: ([.context[]? | select(.key == "aws-docs-search-guide") | .value] | first // null),
         isCitable: (.isCitable // null),
         sourceCreatedAt: (.sourceCreatedAt // null),
         sourceUpdatedAt: (.sourceUpdatedAt // null)
       }
     | ((.title + " " + .summary + " " + .excerpt) | ascii_downcase) as $metadata
     | (.title | ascii_downcase) as $title
     | .preferenceMatch = (
         if $preferred == "" then null
         elif $title | contains($preferred) then "title"
         elif $metadata | contains($preferred) then "metadata"
         else null
         end
       )
    ]
  | sort_by(
      (if .preferenceMatch == "title" then 0
       elif .preferenceMatch == "metadata" then 1
       else 2
       end),
      .endpointRank
    )
  | .[:$limit]
  | to_entries
  | map({rank: (.key + 1)} + .value)' "$RESPONSE_FILE" > "$RESULTS_FILE"

{
  printf 'rank\tendpoint_rank\tpreference_match\ttitle\tproduct\tguide\turl\tsummary\n'
  jq -r '.[] | [.rank, .endpointRank, (.preferenceMatch // ""), .title, (.product // ""), (.guide // ""), .url, .summary] | @tsv' "$RESULTS_FILE"
} > "$TSV_FILE"

{
  printf 'facet\tvalue\n'
  jq -r '
    (.facets["aws-docs-search-product"][]? | ["product", .]),
    (.facets["aws-docs-search-guide"][]? | ["guide", .])
    | @tsv' "$RESPONSE_FILE"
} > "$FACETS_FILE"

if [[ -n "$PREFER" ]] && ((LIMIT > 0)); then
  PREFERENCE_MATCHES=$(jq '[.[] | select(.preferenceMatch != null)] | length' "$RESULTS_FILE")
  if ((PREFERENCE_MATCHES == 0)); then
    printf 'Warning: no returned title, summary, or excerpt contains the preferred text: %s\n' "$PREFER" >&2
  fi
fi

if ((DOWNLOAD > LIMIT)); then
  DOWNLOAD=$LIMIT
fi

fetch_document() {
  fetch_url=$1
  expected_type=$2
  cache_key=$(printf '%s' "$fetch_url" | shasum -a 256 | awk '{print $1}')
  now=$(date +%s)
  FETCH_STATUS=""
  FETCH_TYPE=""
  FETCH_BODY=""
  FETCH_CACHE="disabled"

  if ((USE_CACHE == 1)); then
    cache_entry="$CACHE_DIR/$cache_key"
    cache_meta="$cache_entry/metadata.json"
    cache_body="$cache_entry/body"
    mkdir -p "$cache_entry"
    if [[ -s "$cache_meta" ]]; then
      cached_at=$(jq -r '.fetchedAt // 0' "$cache_meta")
      cached_status=$(jq -r '.httpStatus // ""' "$cache_meta")
      cached_type=$(jq -r '.contentType // ""' "$cache_meta")
      age=$((now - cached_at))
      if ((age <= CACHE_TTL)) && { [[ "$cached_status" != "200" ]] || [[ -s "$cache_body" ]]; }; then
        FETCH_STATUS=$cached_status
        FETCH_TYPE=$cached_type
        FETCH_BODY=$cache_body
        FETCH_CACHE="hit"
        return 0
      fi
    fi
    temp_body="$cache_entry/body.tmp.$$"
    FETCH_CACHE="miss"
  else
    temp_body="$DOCS_DIR/.fetch-$cache_key.tmp"
  fi

  metadata=$(curl --silent --show-error --location \
    --connect-timeout 10 --max-time 45 --retry 2 --retry-all-errors \
    --output "$temp_body" --write-out '%{http_code}\t%{content_type}' "$fetch_url" || true)
  FETCH_STATUS=${metadata%%$'\t'*}
  FETCH_TYPE=${metadata#*$'\t'}
  valid_body=0
  if [[ "$FETCH_STATUS" == "200" ]]; then
    case "$expected_type" in
      markdown) [[ "$FETCH_TYPE" == text/markdown* ]] && valid_body=1 ;;
      html) [[ "$FETCH_TYPE" == text/html* ]] && valid_body=1 ;;
    esac
  fi

  if ((USE_CACHE == 1)); then
    jq -n --arg url "$fetch_url" --arg type "$FETCH_TYPE" --arg status "$FETCH_STATUS" --argjson fetchedAt "$now" \
      '{url:$url,httpStatus:$status,contentType:$type,fetchedAt:$fetchedAt}' > "$cache_meta"
    if ((valid_body == 1)); then
      mv "$temp_body" "$cache_body"
      FETCH_BODY=$cache_body
    else
      rm -f "$temp_body"
      FETCH_BODY=""
    fi
  elif ((valid_body == 1)); then
    FETCH_BODY=$temp_body
  else
    rm -f "$temp_body"
    FETCH_BODY=""
  fi
}

DOWNLOADED=0
if ((DOWNLOAD > 0)); then
  DOCS_DIR="$OUTPUT_DIR/documents"
  mkdir -p "$DOCS_DIR"
  DOWNLOAD_MAP="$OUTPUT_DIR/downloads.tsv"
  printf 'rank\tsearch_url\tfetched_url\tformat\tcache\tfile\tsha256\tbytes\n' > "$DOWNLOAD_MAP"

  while IFS=$'\t' read -r rank title search_url; do
    [[ -n "$search_url" ]] || continue
    case "$search_url" in
      https://docs.aws.amazon.com/*|https://docs.aws.com/*) ;;
      *) printf 'Skipping non-AWS documentation URL: %s\n' "$search_url" >&2; continue ;;
    esac

    slug=$(printf '%s' "$title" \
      | tr '[:upper:]' '[:lower:]' \
      | tr -cs '[:alnum:]' '-' \
      | sed 's/^-//; s/-$//' \
      | cut -c 1-70)
    [[ -n "$slug" ]] || slug="document"
    stem=$(printf '%03d-%s' "$rank" "$slug")
    source_url=${search_url%%#*}
    markdown_url=""
    if [[ "$source_url" == *.html ]]; then
      markdown_url="${source_url%.html}.md"
    fi

    saved=""
    if [[ -n "$markdown_url" ]]; then
      markdown_file="$DOCS_DIR/$stem.md"
      fetch_document "$markdown_url" markdown
      if [[ "$FETCH_STATUS" == "200" && -s "$FETCH_BODY" ]]; then
        cp "$FETCH_BODY" "$markdown_file"
        ((USE_CACHE == 1)) || rm -f "$FETCH_BODY"
        saved="$markdown_file"
        checksum=$(shasum -a 256 "$saved" | awk '{print $1}')
        bytes=$(wc -c < "$saved" | tr -d ' ')
        printf '%s\t%s\t%s\tmarkdown\t%s\t%s\t%s\t%s\n' "$rank" "$search_url" "$markdown_url" "$FETCH_CACHE" "$saved" "$checksum" "$bytes" >> "$DOWNLOAD_MAP"
        DOWNLOADED=$((DOWNLOADED + 1))
      fi
    fi

    if [[ -z "$saved" ]]; then
      html_file="$DOCS_DIR/$stem.html"
      fetch_document "$source_url" html
      if [[ "$FETCH_STATUS" != "200" || ! -s "$FETCH_BODY" ]]; then
        printf 'Download failed (HTTP %s): %s\n' "$FETCH_STATUS" "$source_url" >&2
        continue
      fi
      cp "$FETCH_BODY" "$html_file"
      ((USE_CACHE == 1)) || rm -f "$FETCH_BODY"
      saved="$html_file"
      format="html"
      if command -v pandoc >/dev/null; then
        converted_file="$DOCS_DIR/$stem.md"
        if pandoc --from=html --to=gfm --wrap=none "$html_file" --output "$converted_file"; then
          saved="$converted_file"
          format="html-to-markdown"
        fi
      fi
      checksum=$(shasum -a 256 "$saved" | awk '{print $1}')
      bytes=$(wc -c < "$saved" | tr -d ' ')
      printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$rank" "$search_url" "$source_url" "$format" "$FETCH_CACHE" "$saved" "$checksum" "$bytes" >> "$DOWNLOAD_MAP"
      DOWNLOADED=$((DOWNLOADED + 1))
    fi
  done < <(jq -r --argjson count "$DOWNLOAD" 'limit($count; .[]) | [.rank, .title, .url] | @tsv' "$RESULTS_FILE")

  if ((DOWNLOADED == 0)); then
    rmdir "$DOCS_DIR" 2>/dev/null || true
  fi
fi

COUNT=$(jq 'length' "$RESULTS_FILE")
TOTAL=$(jq '.suggestions | length' "$RESPONSE_FILE")

{
  printf '# AWS documentation research overview\n\n'
  printf '**Query:** %s  \n' "$QUERY"
  printf "**Locale:** \`%s\`  \n" "$LOCALE"
  printf '**AWS suggestions requested:** %s  \n' "$API_RESULTS"
  printf '**AWS suggestions returned:** %s  \n' "$TOTAL"
  printf '**Results included here:** %s  \n' "$COUNT"
  printf '**Full documents downloaded:** %s\n\n' "$DOWNLOADED"
  if [[ -n "$PRODUCT" ]]; then printf '**Product filter:** %s  \n' "$PRODUCT"; fi
  if [[ -n "$GUIDE" ]]; then printf '**Guide filter:** %s  \n' "$GUIDE"; fi
  if [[ -n "$PREFER" ]]; then printf "**Locally preferred text:** \`%s\`  \n" "$PREFER"; fi
  printf '\n> This file organizes AWS search metadata. It is not an AI-generated synthesis. '
  printf "Full retrieved source text is in \`research-bundle.md\`.\n\n"
  printf '## Ranked documentation\n\n'
  jq -r '
    .[]
    | "### \(.rank). \(.title)\n\n"
      + "- **AWS endpoint rank:** \(.endpointRank)\n"
      + (if .preferenceMatch then "- **Preferred-text match:** \(.preferenceMatch)\n" else "" end)
      + (if .product then "- **Product:** \(.product)\n" else "" end)
      + (if .guide then "- **Guide:** \(.guide)\n" else "" end)
      + "- **Source:** [\(.url)](\(.url))\n\n"
      + (if .summary != "" then "**Summary:** \(.summary)\n\n" else "" end)
      + (if .excerpt != "" then "**Matched excerpt:** \(.excerpt)\n\n" else "" end)
  ' "$RESULTS_FILE"
  printf '## Available facets\n\n'
  printf 'Use these exact values in a narrower follow-up search.\n\n'
  printf '| Type | Value |\n|---|---|\n'
  tail -n +2 "$FACETS_FILE" | while IFS=$'\t' read -r facet value; do
    printf '| %s | %s |\n' "$facet" "$value"
  done
} > "$OVERVIEW_FILE"

{
  printf '# AWS documentation full-text source bundle\n\n'
  printf '**Query:** %s\n\n' "$QUERY"
  printf '> The sections below are verbatim downloaded AWS documentation, not a synthesized answer. '
  printf "Use each section's source URL when citing or checking freshness.\n\n"
  if ((DOWNLOADED == 0)); then
    printf "No full documents were downloaded. Run the search again in a new output directory with \`--download NUMBER\`.\n"
  else
    tail -n +2 "$DOWNLOAD_MAP" | while IFS=$'\t' read -r rank search_url fetched_url format cache_status file checksum bytes; do
      title=$(jq -r --argjson rank "$rank" '.[] | select(.rank == $rank) | .title' "$RESULTS_FILE")
      printf '\n---\n\n## Source %s: %s\n\n' "$rank" "$title"
      printf -- '- **Search result:** <%s>\n' "$search_url"
      printf -- '- **Retrieved from:** <%s>\n' "$fetched_url"
      printf -- "- **Stored format:** \`%s\`\n" "$format"
      printf -- "- **Cache:** \`%s\`\n" "$cache_status"
      printf -- "- **SHA-256:** \`%s\`\n" "$checksum"
      printf -- "- **Bytes:** %s\n\n" "$bytes"
      if [[ "$file" == *.md && -f "$file" ]]; then
        printf '<div class="aws-document-source">\n\n'
        cat "$file"
        printf '\n\n</div>\n'
      else
        printf "The source is stored locally at \`%s\`; install \`pandoc\` to include HTML as Markdown.\n" "$file"
      fi
    done
  fi
} > "$BUNDLE_FILE"

if [[ -s "${DOWNLOAD_MAP:-}" ]]; then
  documents=$(tail -n +2 "$DOWNLOAD_MAP" | jq -R -s '
    split("\n")
    | map(select(length > 0) | split("\t"))
    | map({
        rank: (.[0] | tonumber),
        searchUrl: .[1],
        fetchedUrl: .[2],
        format: .[3],
        cache: .[4],
        file: .[5],
        sha256: .[6],
        bytes: (.[7] | tonumber)
      })')
else
  documents='[]'
fi
jq -n \
  --arg query "$QUERY" \
  --arg queryId "$(jq -r '.queryId' "$RESPONSE_FILE")" \
  --arg endpoint "$URL" \
  --argjson requested "$API_RESULTS" \
  --argjson returned "$TOTAL" \
  --argjson included "$COUNT" \
  --argjson documents "$documents" \
  '{
    query: $query,
    queryId: $queryId,
    endpoint: $endpoint,
    suggestions: {requested: $requested, returned: $returned, included: $included},
    documents: $documents
  }' > "$MANIFEST_FILE"

printf 'Saved %s of %s returned results in %s\n' "$COUNT" "$TOTAL" "$OUTPUT_DIR" >&2
printf 'Research overview: %s\n' "$OVERVIEW_FILE" >&2
printf 'Full-text bundle: %s\n' "$BUNDLE_FILE" >&2
printf 'Provenance manifest: %s\n' "$MANIFEST_FILE" >&2
if ((TOTAL == 0)); then
  printf 'Warning: no results. Facet values are exact; retry without filters and inspect facets.tsv.\n' >&2
fi
if ((DOWNLOADED > 0)); then
  printf 'Downloaded %s document(s) into %s/documents\n' "$DOWNLOADED" "$OUTPUT_DIR" >&2
elif ((DOWNLOAD > 0)); then
  printf 'No documents were downloaded.\n' >&2
fi
