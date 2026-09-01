import { ALLOWED_DOC_HOSTS, AWS_DENY_PREFIX, REPOST_ALLOWED_PREFIX } from "../constants.ts";
import { ToolExecutionError } from "../contracts.ts";

function isAllowedHost(host: string, pathName: string): boolean {
  if (!ALLOWED_DOC_HOSTS.has(host)) {
    return false;
  }

  if (host === "repost.aws") {
    return pathName.startsWith(REPOST_ALLOWED_PREFIX);
  }

  return true;
}

export function validateAwsDocUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ToolExecutionError("invalid_url", `Invalid URL: ${raw}`);
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== "https:" && protocol !== "http:") {
    throw new ToolExecutionError("invalid_url", `Unsupported URL protocol: ${raw}`);
  }

  const host = url.hostname.toLowerCase();
  const pathName = url.pathname.toLowerCase();

  if (host === "aws.amazon.com" && pathName.startsWith(AWS_DENY_PREFIX)) {
    throw new ToolExecutionError("invalid_url", `URL blocked by deny-list: ${raw}`);
  }

  if (!isAllowedHost(host, pathName)) {
    throw new ToolExecutionError("invalid_url", `URL not allow-listed: ${raw}`);
  }

  return url;
}
