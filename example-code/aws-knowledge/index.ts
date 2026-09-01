import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  AWS_KNOWLEDGE_TOOL_NAMES,
  GET_REGIONAL_AVAILABILITY_TOOL_NAME,
  LIST_REGIONS_TOOL_NAME,
  READ_TOOL_NAME,
  RECOMMEND_TOOL_NAME,
  RETRIEVE_AGENT_SOP_TOOL_NAME,
  SEARCH_TOOL_NAME,
} from "./constants.ts";
import { loadConfig } from "./config.ts";
import { createFixtureAdapter, type FixtureAdapter } from "./adapters/fixtures-adapter.ts";
import { createSearchService } from "./services/search-service.ts";
import { createDocFetchService } from "./services/doc-fetch-service.ts";
import { createRecommendService } from "./services/recommend-service.ts";
import { createRegionService } from "./services/region-service.ts";
import { createAvailabilityService } from "./services/availability-service.ts";
import { createSopService } from "./services/sop-service.ts";
import {
  GetRegionalAvailabilitySchema,
  ListRegionsSchema,
  ReadDocumentationSchema,
  RecommendSchema,
  RetrieveAgentSopSchema,
  SearchDocumentationSchema,
} from "./schemas.ts";
import { asToolError } from "./utils/errors.ts";
import { formatToolResult } from "./utils/truncate.ts";

type ServiceBundle = {
  searchService: ReturnType<typeof createSearchService>;
  docFetchService: ReturnType<typeof createDocFetchService>;
  recommendService: ReturnType<typeof createRecommendService>;
  regionService: ReturnType<typeof createRegionService>;
  availabilityService: ReturnType<typeof createAvailabilityService>;
  sopService: ReturnType<typeof createSopService>;
};

export type AwsKnowledgeDependencies = {
  config: ReturnType<typeof loadConfig>;
  adapter: FixtureAdapter;
  services: ServiceBundle;
};

export function createDependencies(env: NodeJS.ProcessEnv = process.env): AwsKnowledgeDependencies {
  const config = loadConfig(env);
  const adapter = createFixtureAdapter(config.fixtureRoot);

  const services: ServiceBundle = {
    searchService: createSearchService({ adapter, mode: config.mode }),
    docFetchService: createDocFetchService({ adapter }),
    recommendService: createRecommendService({ adapter }),
    regionService: createRegionService({ adapter }),
    availabilityService: createAvailabilityService({ adapter, config }),
    sopService: createSopService({ adapter }),
  };

  return { config, adapter, services };
}

function registerSearchTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: SEARCH_TOOL_NAME,
    label: "AWS Search Documentation",
    description: "Search AWS documentation and SOP fixtures by phrase and optional topic filters.",
    promptSnippet: "Search AWS docs and SOP entries before reading raw documentation content.",
    promptGuidelines: [
      "Use this tool first to discover relevant AWS sources and SOP keys.",
      "When SOP workflow steps are needed, include topic agent_sops.",
      "In compat mode, unknown topics may be ignored instead of hard-failing.",
    ],
    parameters: SearchDocumentationSchema,
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Searching AWS fixture corpus..." }] });
        const payload = await deps.services.searchService.searchDocumentation(params, { signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

function registerReadTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: READ_TOOL_NAME,
    label: "AWS Read Documentation",
    description: "Read and chunk AWS documentation fixture pages with strict URL allow/deny policy.",
    promptSnippet: "Read selected AWS documentation URLs and return chunked content with metadata.",
    promptGuidelines: [
      "Use this after search to inspect specific docs URLs.",
      "Mixed valid and invalid requests may return mixed SUCCESS/ERROR rows.",
      "Only allow-listed AWS hosts are supported.",
    ],
    parameters: ReadDocumentationSchema,
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Reading AWS documentation fixtures..." }] });
        const payload = await deps.services.docFetchService.readDocumentation(params, { signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

function registerRecommendTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: RECOMMEND_TOOL_NAME,
    label: "AWS Recommend Documentation",
    description: "Recommend related AWS docs from fixture graphs based on docs.aws URLs.",
    promptSnippet: "Recommend neighboring AWS documentation pages from a docs.aws source URL.",
    promptGuidelines: [
      "Input URLs must come from docs.aws.amazon.com.",
      "The service falls back from exact page to service-level recommendations.",
    ],
    parameters: RecommendSchema,
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Resolving AWS recommendation fixtures..." }] });
        const payload = await deps.services.recommendService.recommend(params, { signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

function registerListRegionsTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: LIST_REGIONS_TOOL_NAME,
    label: "AWS List Regions",
    description: "List deterministic AWS region fixtures.",
    promptSnippet: "List canonical AWS regions before regional availability checks.",
    promptGuidelines: [
      "Use this tool to discover valid region IDs and names.",
      "Output ordering is deterministic for stable follow-up behavior.",
    ],
    parameters: ListRegionsSchema,
    async execute(_toolCallId, _params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Loading AWS region fixtures..." }] });
        const payload = await deps.services.regionService.listRegions({ signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

function registerAvailabilityTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: GET_REGIONAL_AVAILABILITY_TOOL_NAME,
    label: "AWS Get Regional Availability",
    description: "Retrieve fixture-based product/API/CFN regional availability with signed pagination tokens.",
    promptSnippet: "Check AWS resource availability by region with compatibility pagination rules.",
    promptGuidelines: [
      "Use resource_type product|api|cfn.",
      "For multi-region requests, provide at least one filter.",
      "Single-region, no-filter mode can paginate with next_token.",
    ],
    parameters: GetRegionalAvailabilitySchema,
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Computing regional availability from fixtures..." }] });
        const payload = await deps.services.availabilityService.getRegionalAvailability(params, { signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

function registerSopTool(pi: ExtensionAPI, deps: AwsKnowledgeDependencies): void {
  pi.registerTool({
    name: RETRIEVE_AGENT_SOP_TOOL_NAME,
    label: "AWS Retrieve Agent SOP",
    description: "Fetch an exact SOP fixture by sop_name.",
    promptSnippet: "Retrieve an AWS agent SOP by exact sop_name when procedural steps are needed.",
    promptGuidelines: [
      "Use exact sop_name values returned by aws___search_documentation.",
      "Unknown SOP names return a not_found tool error.",
    ],
    parameters: RetrieveAgentSopSchema,
    async execute(_toolCallId, params, signal, onUpdate) {
      try {
        onUpdate?.({ content: [{ type: "text", text: "Loading SOP fixture..." }] });
        const payload = await deps.services.sopService.retrieveAgentSop(params, { signal });
        return formatToolResult(payload);
      } catch (error) {
        throw asToolError(error);
      }
    },
  });
}

export default function awsKnowledgeExtension(pi: ExtensionAPI): void {
  const deps = createDependencies();

  registerSearchTool(pi, deps);
  registerReadTool(pi, deps);
  registerRecommendTool(pi, deps);
  registerListRegionsTool(pi, deps);
  registerAvailabilityTool(pi, deps);
  registerSopTool(pi, deps);
}

export const __test__ = {
  createDependencies,
  AWS_KNOWLEDGE_TOOL_NAMES,
};
