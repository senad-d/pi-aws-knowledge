import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_AVAILABILITY_PAGE_SIZE } from "./constants.ts";
import { ToolExecutionError } from "./contracts.ts";

export type AwsKnowledgeMode = "strict" | "compat";
export type AwsKnowledgeDataSource = "fixtures";

export type AwsKnowledgeConfig = {
  mode: AwsKnowledgeMode;
  dataSource: AwsKnowledgeDataSource;
  paginationSecret: string;
  availabilityPageSize: number;
  fixtureRoot: string;
};

const DEFAULT_MODE: AwsKnowledgeMode = "compat";

function resolveModuleDir(): string {
  const dirGlobal = (globalThis as any).__dirname as string | undefined;
  if (typeof dirGlobal === "string" && dirGlobal.length > 0) return dirGlobal;
  if (typeof __dirname !== "undefined") return __dirname;
  try {
    const meta = (Function("return import.meta") as () => any)();
    if (meta && typeof meta.url === "string") {
      return path.dirname(fileURLToPath(meta.url));
    }
  } catch {
  }
  return process.cwd();
}

const MODULE_DIR = resolveModuleDir();
const DEFAULT_FIXTURE_ROOT = path.resolve(MODULE_DIR, "data/fixtures");

const EPHEMERAL_PAGINATION_SECRET = crypto.randomBytes(32).toString("base64url");

function parseMode(value: string | undefined): AwsKnowledgeMode {
  if (!value) return DEFAULT_MODE;
  const normalized = value.trim().toLowerCase();
  if (normalized === "strict") return "strict";
  return DEFAULT_MODE;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function resolveFixtureRoot(value: string | undefined): string {
  if (value && value.trim()) {
    const configured = value.trim();
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return DEFAULT_FIXTURE_ROOT;
}

function assertFixtureOnlyDataSource(value: string | undefined): AwsKnowledgeDataSource {
  if (!value || value.trim() === "" || value.trim().toLowerCase() === "fixtures") {
    return "fixtures";
  }

  throw new ToolExecutionError(
    "downstream_error",
    "Live adapter mode is blocked in phase 1. Set AWS_KNOWLEDGE_DATA_SOURCE=fixtures or unset it.",
    { value },
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AwsKnowledgeConfig {
  const mode = parseMode(env.AWS_KNOWLEDGE_MODE);
  const dataSource = assertFixtureOnlyDataSource(env.AWS_KNOWLEDGE_DATA_SOURCE);
  const explicitSecret = env.AWS_KNOWLEDGE_TOKEN_SECRET?.trim();
  if (mode === "strict" && !explicitSecret) {
    throw new ToolExecutionError(
      "validation_error",
      "AWS_KNOWLEDGE_TOKEN_SECRET must be set when AWS_KNOWLEDGE_MODE=strict.",
    );
  }
  const paginationSecret = explicitSecret || EPHEMERAL_PAGINATION_SECRET;
  const availabilityPageSize = parsePositiveInteger(
    env.AWS_KNOWLEDGE_AVAILABILITY_PAGE_SIZE,
    DEFAULT_AVAILABILITY_PAGE_SIZE,
  );

  return {
    mode,
    dataSource,
    paginationSecret,
    availabilityPageSize,
    fixtureRoot: resolveFixtureRoot(env.AWS_KNOWLEDGE_FIXTURE_ROOT),
  };
}
