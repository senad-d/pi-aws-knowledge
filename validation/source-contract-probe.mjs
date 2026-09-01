#!/usr/bin/env node
import { createHash } from "node:crypto";
import { promises as dns } from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { basename, resolve } from "node:path";
import { gunzipSync, brotliDecompressSync, inflateSync } from "node:zlib";
import { readFile } from "node:fs/promises";

const MAX_BYTES = 5 * 1024 * 1024;
const ROOT = resolve(import.meta.dirname, "sources");
const ALLOWED_FILES = new Set(["aws.json", "terraform-core.json", "registry-module.json", "registry-provider.json"]);
const POLICIES = {
  aws: [{ host: "docs.aws.amazon.com", paths: ["/", "/robots.txt", "/search/", "/AmazonS3/"] }, { host: "aws.amazon.com", paths: ["/terms/"] }],
  "terraform-core": [{ host: "developer.hashicorp.com", paths: ["/robots.txt", "/terraform/", "/terms-of-service"] }, { host: "www.hashicorp.com", paths: ["/terms-of-service"] }],
  "registry-module": [{ host: "registry.terraform.io", paths: ["/v1/modules/", "/robots.txt"] }, { host: "developer.hashicorp.com", paths: ["/terraform/registry/api-docs", "/robots.txt"] }, { host: "www.hashicorp.com", paths: ["/terms-of-service"] }],
  "registry-provider": [{ host: "registry.terraform.io", paths: ["/v1/providers/", "/providers/", "/robots.txt"] }, { host: "developer.hashicorp.com", paths: ["/terraform/internals/provider-registry-protocol", "/robots.txt"] }, { host: "raw.githubusercontent.com", paths: ["/hashicorp/terraform-provider-aws/"] }, { host: "api.github.com", paths: ["/repos/hashicorp/terraform-provider-aws/"] }, { host: "www.hashicorp.com", paths: ["/terms-of-service"] }],
};

function redact(value) {
  return String(value ?? "")
    .replace(/([?&][^=]+)=([^&#]*)/g, "$1=[redacted]")
    .replace(/(authorization|cookie|token|secret|password)[^\s,;]*/gi, "$1=[redacted]")
    .replace(/\b(?:[A-Za-z]:\\|\/Users\/|\/home\/|\/tmp\/)[^\s]*/g, "[local-path]");
}

function publicAddress(address) {
  const family = net.isIP(address);
  if (!family) return false;
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51) || (a === 203 && b === 0));
  }
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) return publicAddress(normalized.slice(7));
  return !(normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("ff") || normalized.startsWith("2001:db8"));
}

function allowed(kind, url) {
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  return (POLICIES[kind] ?? []).some(({ host, paths }) => url.hostname === host && paths.some((path) => url.pathname.startsWith(path)));
}

function decode(buffer, encoding) {
  if (!encoding || encoding === "identity") return buffer;
  if (encoding === "gzip") return gunzipSync(buffer);
  if (encoding === "br") return brotliDecompressSync(buffer);
  if (encoding === "deflate") return inflateSync(buffer);
  throw new Error("unsupported content encoding");
}

async function request(kind, target, fixtureOrigin) {
  let current = new URL(target.url);
  const redirects = [];
  const started = Date.now();
  for (let hop = 0; hop <= 3; hop++) {
    const fixture = fixtureOrigin && current.origin === fixtureOrigin;
    if (!fixture && !allowed(kind, current)) throw new Error("target rejected by exact allowlist");
    const addresses = fixture ? [{ address: current.hostname, family: 4 }] : await dns.lookup(current.hostname, { all: true, verbatim: true });
    if (!fixture && (addresses.length === 0 || addresses.some(({ address }) => !publicAddress(address)))) throw new Error("non-public or mixed DNS answer");
    const response = await new Promise((ok, fail) => {
      const client = fixture ? http : https;
      const req = client.get(current, {
        headers: { accept: target.accept ?? "text/html,application/json;q=0.9,text/plain;q=0.8", "accept-encoding": "gzip, br, deflate", "user-agent": "pi-aws-terraform-docs-contract-probe/0.1" },
        timeout: 20_000,
      }, (res) => {
        const chunks = [];
        let wire = 0;
        res.on("data", (chunk) => {
          wire += chunk.length;
          if (wire > MAX_BYTES) req.destroy(new Error("encoded response exceeds 5 MiB"));
          else chunks.push(chunk);
        });
        res.on("end", () => ok({ res, body: Buffer.concat(chunks), wire }));
      });
      req.on("timeout", () => req.destroy(new Error("total timeout")));
      req.on("error", fail);
    });
    const location = response.res.headers.location;
    if (location && [301, 302, 303, 307, 308].includes(response.res.statusCode ?? 0)) {
      if (hop === 3) throw new Error("redirect limit exceeded");
      const next = new URL(location, current);
      redirects.push({ status: response.res.statusCode, from: `${current.origin}${current.pathname}`, to: `${next.origin}${next.pathname}` });
      current = next;
      continue;
    }
    const decoded = decode(response.body, String(response.res.headers["content-encoding"] ?? "").toLowerCase());
    if (decoded.length > MAX_BYTES) throw new Error("decoded response exceeds 5 MiB");
    const type = String(response.res.headers["content-type"] ?? "").split(";", 1)[0].toLowerCase();
    const expected = target.contentTypes ?? ["text/html", "application/json", "text/plain", "text/markdown"];
    if (!expected.includes(type)) throw new Error(`unexpected content type: ${redact(type || "missing")}`);
    const text = decoded.toString("utf8");
    const canonical = text.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1] ?? text.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1];
    const markers = Object.fromEntries((target.markers ?? []).map((marker) => [marker.name, (text.match(new RegExp(marker.pattern, "gi")) ?? []).length]));
    return {
      name: target.name,
      requested: `${new URL(target.url).origin}${new URL(target.url).pathname}`,
      final: `${current.origin}${current.pathname}`,
      redirects,
      dns: fixture ? ["fixture"] : addresses.map(({ family }) => `public-ipv${family}`).sort(),
      status: response.res.statusCode,
      content_type: type,
      encoded_bytes: response.wire,
      decoded_bytes: decoded.length,
      canonical: canonical ? redact(canonical) : null,
      validators: { etag: Boolean(response.res.headers.etag), last_modified: Boolean(response.res.headers["last-modified"]), cache_control: redact(response.res.headers["cache-control"] ?? "") },
      latency_ms: Date.now() - started,
      body_sha256: createHash("sha256").update(decoded).digest("hex"),
      markers,
    };
  }
  throw new Error("redirect loop");
}

async function selfTest() {
  const sentinel = "secret=DO_NOT_PRINT_BODY";
  const server = http.createServer((req, res) => {
    if (req.url === "/loop") { res.writeHead(302, { location: "/loop" }); return res.end(); }
    if (req.url === "/wrong") { res.writeHead(200, { "content-type": "image/png" }); return res.end("png"); }
    if (req.url === "/large") { res.writeHead(200, { "content-type": "text/plain" }); return res.end(Buffer.alloc(MAX_BYTES + 1)); }
    res.writeHead(200, { "content-type": "text/plain" }); res.end(sentinel);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  const failures = [];
  for (const [path, message] of [["/loop", "redirect limit"], ["/wrong", "content type"], ["/large", "5 MiB"]]) {
    try { await request("self", { name: path, url: origin + path }, origin); failures.push(`${path} was accepted`); }
    catch (error) { if (!String(error.message).includes(message)) failures.push(`${path}: wrong failure`); }
  }
  const safe = await request("self", { name: "safe", url: origin + "/safe", contentTypes: ["text/plain"] }, origin);
  server.close();
  const output = JSON.stringify(safe);
  if (output.includes(sentinel) || output.includes("DO_NOT_PRINT_BODY") || redact("?secret=x").includes("=x")) failures.push("redaction/body sentinel leaked");
  if (failures.length) throw new Error(failures.join("; "));
  console.log("source-contract-probe self-test: pass (redirect limit, content type, size cap, redaction, no body output)");
}

async function main() {
  if (process.argv[2] === "--self-test") return selfTest();
  const input = process.argv[2];
  if (!input || !ALLOWED_FILES.has(basename(input)) || resolve(input) !== resolve(ROOT, basename(input))) throw new Error("use one checked-in validation/sources definition");
  const definition = JSON.parse(await readFile(input, "utf8"));
  if (!POLICIES[definition.kind]) throw new Error("unknown source kind");
  const report = { source: definition.kind, observed_at: new Date().toISOString(), targets: [] };
  for (const target of definition.targets) {
    try { report.targets.push({ outcome: "observed", ...(await request(definition.kind, target)) }); }
    catch (error) { report.targets.push({ name: target.name, outcome: "failed", error: redact(error instanceof Error ? error.message : error) }); }
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(`source-contract-probe: ${redact(error instanceof Error ? error.message : error)}`); process.exitCode = 1; });
