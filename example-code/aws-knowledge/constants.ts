export const SEARCH_TOOL_NAME = "aws___search_documentation";
export const READ_TOOL_NAME = "aws___read_documentation";
export const RECOMMEND_TOOL_NAME = "aws___recommend";
export const LIST_REGIONS_TOOL_NAME = "aws___list_regions";
export const GET_REGIONAL_AVAILABILITY_TOOL_NAME = "aws___get_regional_availability";
export const RETRIEVE_AGENT_SOP_TOOL_NAME = "aws___retrieve_agent_sop";

export const AWS_KNOWLEDGE_TOOL_NAMES = [
  SEARCH_TOOL_NAME,
  READ_TOOL_NAME,
  RECOMMEND_TOOL_NAME,
  LIST_REGIONS_TOOL_NAME,
  GET_REGIONAL_AVAILABILITY_TOOL_NAME,
  RETRIEVE_AGENT_SOP_TOOL_NAME,
] as const;

export const SUPPORTED_TOPICS = ["product", "api", "cfn", "guides", "agent_sops"] as const;

export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_TOPICS = 3;

export const DEFAULT_READ_MAX_LENGTH = 2000;

export const MAX_AVAILABILITY_REGIONS = 10;
export const DEFAULT_AVAILABILITY_PAGE_SIZE = 2;

export const FIXTURE_DATASET_VERSION = "aws-knowledge-fixtures-v1";

export const ALLOWED_DOC_HOSTS = new Set([
  "docs.aws.amazon.com",
  "aws.amazon.com",
  "docs.amplify.aws",
  "ui.docs.amplify.aws",
  "repost.aws",
]);

export const REPOST_ALLOWED_PREFIX = "/knowledge-center";
export const AWS_DENY_PREFIX = "/marketplace";
