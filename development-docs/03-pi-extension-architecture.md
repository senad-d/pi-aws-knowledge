# Pi extension architecture and constraints

**Status:** local integration evidence plus official-reference verification queue.

**Do not treat this as an API specification.** The supplied Pi documentation was not readable in this offline session; confirm the official API before coding.

## Locally verified shape

**[Verified — repository]** `example-code/aws-knowledge/index.ts` default-exports a function with `ExtensionAPI` imported from `@mariozechner/pi-coding-agent`. It constructs dependencies once, then registers each tool with `pi.registerTool({...})`.

Each local registration supplies:

- **[Verified — repository]** `name`, `label`, `description`, `promptSnippet`, `promptGuidelines`, and `parameters`.
- **[Verified — repository]** a TypeBox parameter schema from `@mariozechner/pi-ai` / `typebox` (`example-code/aws-knowledge/schemas.ts`).
- **[Verified — repository]** an asynchronous `execute(_toolCallId, params, signal, onUpdate)` callback.
- **[Verified — repository]** optional progress through `onUpdate?.({ content: [{ type: "text", text: ... }] })`.
- **[Verified — repository]** a final `{ content: [{ type: "text", text }], details }` result (`utils/truncate.ts`) or a thrown mapped tool error (`utils/errors.ts`).

## Constraints inferred from that shape

| Constraint | Why it matters | Status |
| --- | --- | --- |
| Tool names are the user/model-facing contract. | Names, parameter schemas, and output metadata need stable semantics and migration discipline. | [Recommendation] |
| Tool calls can receive cancellation. | A live HTTP client must bind the provided `AbortSignal` to fetch/request cancellation, not merely check it before work. | [Verified — repository] signal is passed; [Recommendation] for live behavior |
| Tool output has a context cost. | Return concise excerpts and structured details; prevent large pages, error bodies, or search sets from exhausting context. | [Verified — repository] formatter truncates; [Recommendation] for upstream limits |
| Startup can fail on configuration. | The fixture gate throws while dependencies are created, before registrations. Secret/config validation should be deliberate and documented. | [Verified — repository] `config.ts`, `index.ts` |
| Runtime/package compatibility is unknown. | There is no manifest in this checkout and no Pi version is declared. Delivery is a locally installed reusable TypeScript package, but the exact current Pi contract must be validated. | [Verified — repository] file inventory; [Accepted decision] delivery boundary; [Validation needed] Pi contract |

## Candidate live architecture

**[Accepted decision]** Keep the example's separation, but make its contracts source-neutral:

```text
Pi tool registration
  -> request validation + source/version policy
  -> source adapter (AWS docs | Terraform language | Terraform Registry)
  -> guarded HTTP/retrieval client
  -> cache + provenance record
  -> excerpt/normalization formatter
```

The adapter must return a normalized internal record with source family, canonical URL, requested/resolved source-specific version when applicable, retrieval timestamp, cache/stale state, bounded excerpt/truncation state, and attribution. See [09](09-product-and-technical-specification.md#public-tools).

## Accepted tool boundaries

**[Accepted decision]** Register only `docs_search` for source-aware discovery and `docs_fetch` for a selected typed approved-source identifier. Search returns candidates, not full pages; fetch returns a bounded excerpt plus provenance. Provider schemas are deferred.

Do not combine live AWS regional availability, SOPs, recommendations, account data, Terraform execution, arbitrary URLs, or separate version resolution into these tools. See [09](09-product-and-technical-specification.md#public-tools).

## Official Pi verification queue

The following links are the authoritative source targets requested by the project instructions. **[Validation needed]** Re-read the installed official extension reference and its linked API/package documentation before implementation; this session could not read it due to filesystem policy.

- [Pi extension documentation (installed reference path)](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md)
- [Pi package documentation (installed reference path)](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/packages.md)
- [Pi README (installed reference path)](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/README.md)

Confirm, at minimum: extension discovery/load paths, supported module/runtime format, `registerTool` field and result types, schema package/version, tool-name rules, cancellation semantics, error rendering, reload behavior, permission model, and supported outbound-network behavior.
