import crypto from "node:crypto";
import { ToolExecutionError } from "../contracts.ts";

export type AvailabilityCursor = {
  r: string;
  t: "product" | "api" | "cfn";
  o: number;
  f: string;
};

function encodePart(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodePart(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeSignatureEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function assertCursorShape(value: unknown): asserts value is AvailabilityCursor {
  if (!value || typeof value !== "object") {
    throw new ToolExecutionError("validation_error", "Malformed pagination token payload.");
  }

  const cursor = value as Partial<AvailabilityCursor>;
  const validType = cursor.t === "product" || cursor.t === "api" || cursor.t === "cfn";

  if (
    typeof cursor.r !== "string" ||
    cursor.r.trim().length === 0 ||
    !validType ||
    typeof cursor.o !== "number" ||
    !Number.isInteger(cursor.o) ||
    cursor.o < 0 ||
    typeof cursor.f !== "string"
  ) {
    throw new ToolExecutionError("validation_error", "Malformed pagination token payload.");
  }
}

export function encodePaginationToken(cursor: AvailabilityCursor, secret: string): string {
  const payload = JSON.stringify(cursor);
  const encodedPayload = encodePart(payload);
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function decodePaginationToken(token: string, secret: string): AvailabilityCursor {
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 2) {
    throw new ToolExecutionError("validation_error", "Invalid pagination token format.");
  }
  const [encodedPayload, signature] = parts as [string, string];
  if (!encodedPayload || !signature) {
    throw new ToolExecutionError("validation_error", "Invalid pagination token format.");
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!safeSignatureEqual(expectedSignature, signature)) {
    throw new ToolExecutionError("validation_error", "Invalid pagination token signature.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodePart(encodedPayload));
  } catch {
    throw new ToolExecutionError("validation_error", "Malformed pagination token payload.");
  }

  assertCursorShape(parsed);
  return parsed;
}
