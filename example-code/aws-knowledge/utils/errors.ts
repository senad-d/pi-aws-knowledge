import { ToolExecutionError, type ToolErrorCode } from "../contracts.ts";

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new ToolExecutionError("downstream_error", "Operation canceled.", { canceled: true });
  }
}

export function ensure(condition: unknown, code: ToolErrorCode, message: string): asserts condition {
  if (!condition) {
    throw new ToolExecutionError(code, message);
  }
}

export function asToolError(error: unknown, fallbackCode: ToolErrorCode = "downstream_error"): ToolExecutionError {
  if (error instanceof ToolExecutionError) return error;
  if (error instanceof Error) {
    return new ToolExecutionError(fallbackCode, error.message);
  }
  return new ToolExecutionError(fallbackCode, String(error));
}

export function rowError(
  url: string,
  error: unknown,
): { status: "ERROR"; url: string; error_code: ToolErrorCode; error_message: string } {
  const toolError = asToolError(error, "downstream_error");
  return {
    status: "ERROR",
    url,
    error_code: toolError.code,
    error_message: toolError.message,
  };
}
