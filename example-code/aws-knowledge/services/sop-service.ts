import type { RetrieveAgentSopResult } from "../contracts.ts";
import type { RetrieveAgentSopInput } from "../schemas.ts";
import type { FixtureAdapter } from "../adapters/fixtures-adapter.ts";
import { ToolExecutionError } from "../contracts.ts";
import { throwIfAborted } from "../utils/errors.ts";

type SopServiceDeps = {
  adapter: FixtureAdapter;
};

export function createSopService(deps: SopServiceDeps) {
  return {
    async retrieveAgentSop(
      input: RetrieveAgentSopInput,
      options: { signal?: AbortSignal } = {},
    ): Promise<RetrieveAgentSopResult> {
      throwIfAborted(options.signal);

      const sopName = input.sop_name?.trim();
      if (!sopName) {
        throw new ToolExecutionError("validation_error", "sop_name must be a non-empty string.");
      }

      const sop = deps.adapter.getSopByName(sopName);
      if (!sop) {
        throw new ToolExecutionError("not_found", `SOP not found for name: ${sopName}`);
      }

      return {
        fixture_version: deps.adapter.fixtureVersion,
        sop_name: sop.sop_name,
        title: sop.title,
        content: sop.content,
      };
    },
  };
}
