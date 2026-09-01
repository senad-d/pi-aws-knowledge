#!/usr/bin/env bash
set -euo pipefail

ENDPOINT='https://proxy.search.docs.aws.com/search'
OUTPUT_DIR=${1:-"api-map/evidence/$(date -u +%Y%m%dT%H%M%SZ)"}

command -v curl >/dev/null || { echo 'curl is required' >&2; exit 1; }
command -v jq >/dev/null || { echo 'jq is required' >&2; exit 1; }

if [[ -e "$OUTPUT_DIR" ]]; then
  [[ -d "$OUTPUT_DIR" ]] || { echo "Output path is not a directory: $OUTPUT_DIR" >&2; exit 1; }
  [[ -z "$(find "$OUTPUT_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]] || {
    echo "Output directory is not empty: $OUTPUT_DIR" >&2
    exit 1
  }
fi
mkdir -p "$OUTPUT_DIR/cases"
printf 'case\tmethod\turl\tcurl_exit\thttp_status\tcontent_type\tbytes\tsuggestion_count\tmessage\n' > "$OUTPUT_DIR/summary.tsv"

probe() {
  name=$1
  method=$2
  url=$3
  content_type=$4
  body=$5
  case_dir="$OUTPUT_DIR/cases/$name"
  mkdir -p "$case_dir"
  printf '%s\n' "$method" > "$case_dir/method.txt"
  printf '%s\n' "$url" > "$case_dir/url.txt"
  if [[ -n "$body" ]]; then printf '%s\n' "$body" > "$case_dir/request.json"; fi

  args=(--silent --show-error --request "$method" --connect-timeout 10 --max-time 45 --dump-header "$case_dir/headers.txt" --output "$case_dir/response.txt" --write-out $'%{http_code}\t%{content_type}\t%{size_download}')
  if [[ -n "$content_type" ]]; then args+=(--header "content-type: $content_type"); fi
  if [[ -n "$body" ]]; then args+=(--data-binary "@$case_dir/request.json"); fi

  set +e
  metadata=$(curl "${args[@]}" "$url")
  curl_exit=$?
  set -e
  printf '%s\n' "$curl_exit" > "$case_dir/curl-exit.txt"
  printf '%s\n' "$metadata" > "$case_dir/curl-metadata.tsv"

  http_status=$(printf '%s' "$metadata" | cut -f1)
  response_type=$(printf '%s' "$metadata" | cut -f2)
  bytes=$(printf '%s' "$metadata" | cut -f3)
  count=$(jq -r 'if (.suggestions | type) == "array" then (.suggestions | length) else "" end' "$case_dir/response.txt" 2>/dev/null || true)
  message=$(jq -r '.message // ""' "$case_dir/response.txt" 2>/dev/null | tr '\t\n' '  ' || true)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$method" "$url" "$curl_exit" "$http_status" "$response_type" "$bytes" "$count" "$message" >> "$OUTPUT_DIR/summary.tsv"
  printf '%-28s %s %s (%s bytes)\n' "$name" "$method" "$http_status" "$bytes" >&2
}

valid='{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"acceptSuggestionBody":"RawText","locales":["en_us"]}'
minimal='{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'

# Route and method map.
probe options OPTIONS "$ENDPOINT" '' ''
probe get GET "$ENDPOINT" '' ''
probe head HEAD "$ENDPOINT" '' ''
probe put PUT "$ENDPOINT" 'application/json' "$valid"
probe post-valid POST "$ENDPOINT" 'application/json' "$valid"
probe post-valid-session POST "$ENDPOINT?session=00000000-0000-4000-8000-000000000000" 'application/json' "$valid"
probe post-arbitrary-session POST "$ENDPOINT?session=not-a-uuid" 'application/json' "$valid"
probe post-unknown-query-param POST "$ENDPOINT?unknown=value" 'application/json' "$valid"

# Content type and required-body map.
probe post-no-content-type POST "$ENDPOINT" '' "$valid"
probe post-text-content-type POST "$ENDPOINT" 'text/plain' "$valid"
probe post-empty-object POST "$ENDPOINT" 'application/json' '{}'
probe post-malformed-json POST "$ENDPOINT" 'application/json' '{not-json'
probe post-minimal POST "$ENDPOINT" 'application/json' "$minimal"
probe post-no-text-query POST "$ENDPOINT" 'application/json' '{"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'
probe post-empty-input POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":""},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'
probe post-whitespace-input POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"   "},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'
probe post-null-input POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":null},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'
probe post-number-input POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":123},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}]}'
probe post-no-context POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"}}'
probe post-empty-context POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[]}'
probe post-context-no-key POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"value":"docs.aws.amazon.com"}]}'
probe post-context-no-value POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain"}]}'
probe post-wrong-domain POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"example.com"}]}'

# Optional and unknown-field behavior.
probe post-empty-locales POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"locales":[]}'
for locale in de_de en_us es_es fr_fr id_id it_it ja_jp ko_kr pt_br zh_cn zh_tw; do
  locale_body=$(jq -nc --arg locale "$locale" '{textQuery:{input:"Amazon S3"},contextAttributes:[{key:"domain",value:"docs.aws.amazon.com"}],locales:[$locale]}')
  probe "post-locale-$locale" POST "$ENDPOINT" 'application/json' "$locale_body"
done
probe post-multiple-locales POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"Amazon S3"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"locales":["en_us","de_de"]}'
probe post-bogus-locale POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"locales":["xx_yy"]}'
probe post-bogus-accept POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"acceptSuggestionBody":"Bogus"}'
probe post-identity POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"identityID":"probe-client"}'
probe post-number-identity POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"identityID":123}'
probe post-unknown-body-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"unknownField":"value"}'
probe post-page-size-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"pageSize":1}'
probe post-max-results-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"maxResults":1}'
probe post-max-results-zero POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"maxResults":0}'
probe post-max-results-two POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"maxResults":2}'
probe post-max-results-hundred POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"maxResults":100}'
probe post-max-results-101 POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"maxResults":101}'
probe post-offset-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"offset":1}'
probe post-start-index-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"startIndex":1}'
probe post-next-token-field POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"DynamoDB global secondary index"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"}],"nextToken":"not-a-real-token"}'

# Facet behavior.
probe post-product-filter POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"EKS Pod Identity"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"},{"key":"aws-docs-search-product","value":"Amazon EKS"}]}'
probe post-guide-filter POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"S3 versioning"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"},{"key":"aws-docs-search-guide","value":"User Guide"}]}'
probe post-invalid-product-filter POST "$ENDPOINT" 'application/json' '{"textQuery":{"input":"EKS Pod Identity"},"contextAttributes":[{"key":"domain","value":"docs.aws.amazon.com"},{"key":"aws-docs-search-product","value":"Amazon Elastic Kubernetes Service"}]}'

# Search UI, autocomplete, and full-document retrieval routes.
probe search-ui GET 'https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation&searchQuery=Amazon%20S3' '' ''
probe autosuggest GET 'https://search.autosuggest.docs.aws.com/auto-suggest/Amazon%20S3' '' ''
probe docs-user-guide-html GET 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html' '' ''
probe docs-user-guide-markdown GET 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.md' '' ''
probe docs-cli-html GET 'https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html' '' ''
probe docs-cli-markdown GET 'https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.md' '' ''
probe docs-cdk-html GET 'https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionUrlAuthType.html' '' ''
probe docs-cdk-markdown GET 'https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionUrlAuthType.md' '' ''

# Preserve compact schemas and ordering comparisons.
jq -S 'paths | map(if type == "number" then "[]" else . end) | join(".")' "$OUTPUT_DIR/cases/post-valid/response.txt" | sort -u > "$OUTPUT_DIR/response-paths.txt"
for name in post-valid post-valid-session post-arbitrary-session post-unknown-query-param post-minimal post-page-size-field post-max-results-field post-identity post-unknown-body-field; do
  jq -r '.suggestions[:10][].textExcerptSuggestion.link' "$OUTPUT_DIR/cases/$name/response.txt" | shasum | awk -v case_name="$name" '{print case_name "\t" $1}' >> "$OUTPUT_DIR/top-10-url-sha1.tsv"
done

printf '\nSaved API probe evidence to %s\n' "$OUTPUT_DIR" >&2
