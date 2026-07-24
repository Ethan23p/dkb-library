// Shared helpers for the phase-1 logic suite.
// Contract source: docs/CONTRACTS.md (D1, D8, D12). Tests invoke the CLI as a
// subprocess (never import engine/library code) and run in fresh temp sandboxes.

import { mkdtempSync, existsSync, readdirSync, statSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";

export const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");

/** D1: engine entry point, overridable via DKB_CLI_ENTRY. */
export const CLI_ENTRY =
  process.env.DKB_CLI_ENTRY ?? path.join(REPO_ROOT, "engines", "epistack", "main.ts");

export const CORPUS_LHC = path.join(REPO_ROOT, "testing", "fixtures", "corpus-lhc");

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the CLI as a subprocess. Red-first guard: if the entry point doesn't exist
 * yet, fail loudly with the reason — that is the correct day-one red.
 */
export function runCli(args: string[], opts: { cwd: string }): CliResult {
  if (!existsSync(CLI_ENTRY)) {
    throw new Error(
      `engine entry point not found: ${CLI_ENTRY} — check DKB_CLI_ENTRY, or that the repo is complete (CONTRACTS D1)`,
    );
  }
  const proc = Bun.spawnSync(["bun", CLI_ENTRY, ...args], {
    cwd: opts.cwd,
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
    exitCode: proc.exitCode ?? -1,
  };
}

/** Fresh temp sandbox per test. */
export function makeSandbox(prefix = "dkb-test-"): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

/** D8: LF-normalize for content comparison. */
export function norm(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function fileSha256(p: string): string {
  return sha256Hex(new Uint8Array(readFileSync(p)));
}

/** Recursive listing of relative paths + size + mtime, for write-boundary snapshots (D11). */
export function snapshotTree(root: string, exclude: string[] = []): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs);
      if (exclude.some((e) => rel === e || rel.startsWith(e + path.sep))) continue;
      const st = statSync(abs);
      if (st.isDirectory()) {
        out.push(`${rel}/`);
        walk(abs);
      } else {
        out.push(`${rel} ${st.size} ${st.mtimeMs}`);
      }
    }
  };
  walk(root);
  return out;
}

/** Copy one corpus fixture (md + import sidecar) into a sandbox; returns import-json path. */
export function stageFixture(slug: string, sandboxDir: string): string {
  cpSync(path.join(CORPUS_LHC, `${slug}.md`), path.join(sandboxDir, `${slug}.md`));
  cpSync(
    path.join(CORPUS_LHC, `${slug}.import.json`),
    path.join(sandboxDir, `${slug}.import.json`),
  );
  return path.join(sandboxDir, `${slug}.import.json`);
}

/** Read a staged fixture's metadata (title/author/origin) from its import sidecar. */
export async function fixtureMeta(slug: string): Promise<{
  title: string;
  author: string;
  origin: string;
  contentPath: string;
}> {
  const sidecar = JSON.parse(
    await Bun.file(path.join(CORPUS_LHC, `${slug}.import.json`)).text(),
  );
  return { ...sidecar.metadata, contentPath: sidecar.content_path };
}
