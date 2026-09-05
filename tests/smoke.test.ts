import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";

const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));

async function checkPackage(packagePath: string): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "pi-aws-smoke-loader-"));
  try {
    const loader = new DefaultResourceLoader({
      cwd: directory,
      agentDir: join(directory, "agent"),
      settingsManager: SettingsManager.inMemory(),
      // Resolve the package manifest, not a hard-coded source file or inline factory.
      additionalExtensionPaths: [packagePath],
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
    });
    await loader.reload();
    const { extensions, errors } = loader.getExtensions();
    assert.equal(errors.length, 0, JSON.stringify(errors, null, 2));
    assert.ok(
      extensions.some((extension) => extension.tools.has("aws_docs_search")),
      `${packagePath}: aws_docs_search was not registered`,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

void test("Pi loads the package manifest and registers aws_docs_search without requests", async (t) => {
  const requests = t.mock.method(globalThis, "fetch", () =>
    Promise.reject(new Error("The package-load smoke check must not make requests")),
  );
  await checkPackage(PACKAGE_ROOT);
  assert.equal(requests.mock.callCount(), 0);
});

void test("the smoke assertions reject load failures, broken entry points, and missing tools", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pi-aws-smoke-broken-"));
  try {
    await writeFile(
      join(directory, "throws.ts"),
      'export default function () { throw new Error("SMOKE_FACTORY_FAILURE"); }\n',
    );
    await writeFile(
      join(directory, "rejects.ts"),
      'export default async function () { await Promise.resolve(); throw new Error("SMOKE_ASYNC_FAILURE"); }\n',
    );
    await writeFile(
      join(directory, "import-error.ts"),
      'import "./missing-dependency.js"; export default function () {}\n',
    );
    await writeFile(join(directory, "no-tool.ts"), "export default function () {}\n");

    for (const { entries, expected } of [
      // Registration alone must not hide a load error from another manifest entry.
      {
        entries: [join(PACKAGE_ROOT, "src/index.ts"), "./throws.ts"],
        expected: /SMOKE_FACTORY_FAILURE/,
      },
      { entries: ["./rejects.ts"], expected: /SMOKE_ASYNC_FAILURE/ },
      { entries: ["./import-error.ts"], expected: /missing-dependency/ },
      { entries: ["./missing.ts"], expected: /aws_docs_search was not registered/ },
      { entries: ["./no-tool.ts"], expected: /aws_docs_search was not registered/ },
    ]) {
      await writeFile(
        join(directory, "package.json"),
        JSON.stringify({ type: "module", pi: { extensions: entries } }),
      );
      await assert.rejects(checkPackage(directory), expected, entries.join(", "));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
