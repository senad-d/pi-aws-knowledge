import {
  DEFAULT_MAX_BYTES as PI_DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES as PI_DEFAULT_MAX_LINES,
  truncateHead as piTruncateHead,
} from "@mariozechner/pi-coding-agent";

const LOCAL_DEFAULT_MAX_BYTES = 50 * 1024;
const LOCAL_DEFAULT_MAX_LINES = 2000;

type TruncateOptions = {
  maxBytes?: number;
  maxLines?: number;
};

type TruncateHeadResult = {
  content: string;
  truncated: boolean;
};

function fallbackTruncateHead(content: string, options: TruncateOptions): TruncateHeadResult {
  const maxBytes = options.maxBytes ?? LOCAL_DEFAULT_MAX_BYTES;
  const maxLines = options.maxLines ?? LOCAL_DEFAULT_MAX_LINES;

  const lines = content.split(/\r?\n/);
  const limitedLines = lines.slice(0, maxLines);
  let joined = limitedLines.join("\n");

  if (Buffer.byteLength(joined, "utf8") > maxBytes) {
    while (joined.length > 0 && Buffer.byteLength(joined, "utf8") > maxBytes) {
      joined = joined.slice(0, -1);
    }
    return { content: joined, truncated: true };
  }

  return {
    content: joined,
    truncated: lines.length > limitedLines.length,
  };
}

export function truncateForContext(content: string, options: TruncateOptions = {}): TruncateHeadResult {
  const maxBytes = options.maxBytes ?? PI_DEFAULT_MAX_BYTES ?? LOCAL_DEFAULT_MAX_BYTES;
  const maxLines = options.maxLines ?? PI_DEFAULT_MAX_LINES ?? LOCAL_DEFAULT_MAX_LINES;

  if (typeof piTruncateHead === "function") {
    return piTruncateHead(content, { maxBytes, maxLines });
  }

  return fallbackTruncateHead(content, { maxBytes, maxLines });
}

export function formatToolResult(payload: unknown): {
  content: Array<{ type: "text"; text: string }>;
  details: unknown;
} {
  const pretty = JSON.stringify(payload, null, 2);
  const truncated = truncateForContext(pretty, {});
  const suffix = truncated.truncated ? "\n\n[Output truncated for context safety.]" : "";

  return {
    content: [{ type: "text", text: `${truncated.content}${suffix}` }],
    details: payload,
  };
}
