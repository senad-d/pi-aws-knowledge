export type ToolErrorCode =
  | "validation_error"
  | "invalid_url"
  | "not_found"
  | "throttled"
  | "downstream_error";

export class ToolExecutionError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}

export type SearchResultRow = {
  rank_order: number;
  url: string;
  title: string;
  context: string;
  sop_name?: string;
};

export type SearchDocumentationResult = {
  fixture_version: string;
  mode: "strict" | "compat";
  normalized_topics: string[];
  dropped_topics: string[];
  results: SearchResultRow[];
};

export type ReadDocumentationSuccessRow = {
  status: "SUCCESS";
  url: string;
  title: string;
  content: string;
  total_length: number;
  start_index: number;
  end_index: number;
  truncated: boolean;
  redirected_url?: string;
};

export type ReadDocumentationErrorRow = {
  status: "ERROR";
  url: string;
  error_code: ToolErrorCode;
  error_message: string;
};

export type ReadDocumentationRow = ReadDocumentationSuccessRow | ReadDocumentationErrorRow;

export type ReadDocumentationResult = {
  fixture_version: string;
  rows: ReadDocumentationRow[];
};

export type RecommendationRow = {
  url: string;
  title: string;
  context: string;
};

export type RecommendResult = {
  fixture_version: string;
  source_url: string;
  fallback_scope: "exact" | "service" | "none";
  recommendations: RecommendationRow[];
};

export type RegionRow = {
  region_id: string;
  region_long_name: string;
};

export type ListRegionsResult = {
  fixture_version: string;
  regions: RegionRow[];
};

export type AvailabilityStatus = string;

export type AvailabilityItemRow = {
  id: string;
  name: string;
  status: AvailabilityStatus;
};

export type AvailabilityRegionResultRow = {
  region_id: string;
  resources: AvailabilityItemRow[];
};

export type GetRegionalAvailabilityResult = {
  fixture_version: string;
  resource_type: "product" | "api" | "cfn";
  regions: string[];
  filters: string[];
  results: AvailabilityRegionResultRow[];
  next_token?: string;
};

export type RetrieveAgentSopResult = {
  fixture_version: string;
  sop_name: string;
  title: string;
  content: string;
};
