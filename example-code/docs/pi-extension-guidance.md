# Native Pi extension guidance

This example is an untracked exploration of an undocumented AWS documentation-site endpoint; it is not an AWS SDK, a public AWS API contract, or a Pi extension. The existing [API map](../api-map/README.md), [endpoint reference](endpoint-reference.md), and [retrieval workflow](retrieval-workflow.md) describe its search and retrieval flow. This page records only the verified Pi constraints for exposing that flow as a native extension.

## Scope

Use a narrow custom tool that searches, returns bounded result metadata, and optionally retrieves selected pages. It should preserve request/response and source provenance. Do **not** register a custom Pi model provider: `registerProvider()` is for LLM providers, while this example calls a documentation website. [Pi Custom Providers: Quick Reference](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/custom-provider.md#quick-reference).

## Documented Pi requirements

- Implement a TypeScript extension as a default `ExtensionAPI` factory and register the tool with `pi.registerTool()`. Project-local extensions live in `.pi/extensions/` and load only after the project is trusted. [Pi Extensions: Extension Locations, Writing an Extension, and Custom Tools](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md#extension-locations).
- Define tool input with TypeBox. Return `{content, details}` on success; throw from `execute` to mark a tool result as an error. Respect the passed `AbortSignal`. [Pi Extensions: Tool Definition and Error Handling](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md#tool-definition).
- Custom tools **must** truncate output. Pi documents a 50 KB or 2,000-line limit, whichever occurs first; use its truncation helpers, state the limit in the tool description, and identify where the full output was saved. [Pi Extensions: Output Truncation](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md#output-truncation); [example](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/examples/extensions/truncated-tool.ts).
- Do not require interactive UI. TUI-only features require `ctx.mode === "tui"`; print and JSON modes have no UI. [Pi Extensions: Mode Behavior](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md#mode-behavior).

## Recommendations grounded in the example

- Model only observed request fields and validate them before transport: a non-blank query, non-empty context containing `domain=docs.aws.amazon.com`, zero or one supported locale, and `maxResults` 1–100. Report zero matches separately from HTTP/schema failures. [API map: Confirmed request fields and Error behavior](../api-map/README.md#confirmed-request-fields).
- Treat the route as unstable. It has no observed pagination beyond the first 100 results, no observed rate-limit contract, and incomplete knowledge of query limits, `session`, `identityID`, and autocomplete. [API map: Result limiting and pagination and Known unknowns](../api-map/README.md#result-limiting-and-pagination).
- Preserve provenance (request URL/body, result link, fetched URL, format, and hash). Use the observed Markdown-first/HTML-fallback retrieval sequence; not every AWS page has Markdown. [Retrieval workflow: Retrieval strategy](retrieval-workflow.md#retrieval-strategy).
- Prefer Node built-ins and `fetch`; add a package only for a real missing runtime capability. Distributed package runtime dependencies belong in `dependencies`; Pi core packages are peer dependencies with a `"*"` range. [Pi Extensions: Available Imports](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md#available-imports); [Pi Packages: Dependencies](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/packages.md#dependencies).
- Keep default rendering unless interaction is necessary. If adding custom TUI, each rendered line must fit its supplied width and use the callback-provided theme. [Pi TUI: Component Interface](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/tui.md#component-interface).
- Pi session `PI_*` variables describe the Pi model/session and are injected only into LLM-callable Bash commands, not user `!`/`!!` commands; they are not AWS search state. [Pi Environment Variables: Bash Tool Session Environment](/Users/senad/Documents/Code/Moj_git/pi-mission/node_modules/@earendil-works/pi-coding-agent/docs/environment-variables.md#bash-tool-session-environment).

## Unresolved API questions

AWS has not established rate, availability, retention/content-use, or compatibility guarantees for this website endpoint. The probes also did not establish maximum query length, all accepted body modes, supported access beyond result 100, a callable autocomplete contract, or stable `session`/`identityID` effects. [API map: Known unknowns](../api-map/README.md#known-unknowns).
