import http from "node:http";
import { Type, StringEnum } from "@earendil-works/pi-ai";
import { DEFAULT_MAX_BYTES, DEFAULT_MAX_LINES, defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const probe = defineTool({
  name: "pi_contract_probe",
  label: "Pi contract probe",
  description: "Disposable local probe for success, errors, cancellation, progress, details, and loopback networking.",
  parameters: Type.Object({ action: StringEnum(["success", "fail", "delay", "loopback"] as const) }, { additionalProperties: false }),
  async execute(_id, { action }, signal, onUpdate) {
    onUpdate?.({ content: [{ type: "text", text: "probe progress (no body)" }] });
    if (action === "fail") throw new Error("probe_typed_failure");
    if (action === "delay") {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 30_000);
        signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("probe_cancelled")); }, { once: true });
      });
    }
    if (action === "loopback") {
      const server = http.createServer((_request, response) => response.end("ok"));
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("loopback_unavailable");
      const observed = await new Promise<string>((resolve, reject) => http.get(`http://127.0.0.1:${address.port}`, (response) => {
        let value = "";
        response.on("data", (chunk) => value += chunk);
        response.on("end", () => resolve(value));
      }).on("error", reject));
      server.close();
      if (observed !== "ok") throw new Error("loopback_mismatch");
    }
    return {
      content: [{ type: "text", text: `probe success; limits=${DEFAULT_MAX_BYTES} bytes/${DEFAULT_MAX_LINES} lines` }],
      details: { action, maxBytes: DEFAULT_MAX_BYTES, maxLines: DEFAULT_MAX_LINES },
    };
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(probe);
}
