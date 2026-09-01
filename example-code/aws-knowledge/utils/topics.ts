import { MAX_SEARCH_TOPICS, SUPPORTED_TOPICS } from "../constants.ts";
import { ToolExecutionError } from "../contracts.ts";

export type TopicNormalizationResult = {
  normalized: string[];
  dropped: string[];
};

const SUPPORTED_TOPIC_SET = new Set<string>(SUPPORTED_TOPICS);

export function normalizeTopics(
  topics: string[] | undefined,
  mode: "strict" | "compat",
): TopicNormalizationResult {
  if (!topics || topics.length === 0) {
    return { normalized: [], dropped: [] };
  }

  if (topics.length > MAX_SEARCH_TOPICS) {
    throw new ToolExecutionError("validation_error", `topics supports at most ${MAX_SEARCH_TOPICS} values.`);
  }

  const cleaned = topics.map((topic) => topic.trim().toLowerCase());
  if (cleaned.some((topic) => topic.length === 0)) {
    throw new ToolExecutionError("validation_error", "topics entries must be non-empty strings.");
  }

  const normalized: string[] = [];
  const dropped: string[] = [];

  for (const topic of cleaned) {
    if (SUPPORTED_TOPIC_SET.has(topic)) {
      if (!normalized.includes(topic)) normalized.push(topic);
      continue;
    }

    if (mode === "strict") {
      throw new ToolExecutionError("validation_error", `Unsupported topic: ${topic}`);
    }

    if (!dropped.includes(topic)) dropped.push(topic);
  }

  return { normalized, dropped };
}
