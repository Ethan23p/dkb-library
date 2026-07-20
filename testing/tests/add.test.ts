// Phase 1 — Add source. Contracts: D2, D6, D7, D8. Inventory: add-1, add-2, add-6.

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { runCli, makeSandbox, stageFixture, fixtureMeta, norm, sha256Hex, fileSha256 } from "./helpers";
import { assertKBCorrect, currentState } from "./kb_assert";

const SLUG = "koch-bleicher-2009";

function initAndStage() {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);
  const importPath = stageFixture(SLUG, dir);
  return { dir, importPath };
}

test("add-1: valid import exits 0, source count +1, output echoes the assigned id", async () => {
  const { dir, importPath } = initAndStage();
  const meta = await fixtureMeta(SLUG);

  const res = runCli(["add-source", "--json-import", importPath, "--json"], { cwd: dir });
  expect(res.exitCode).toBe(0);

  // --json output carries the assigned id (D2 AI-legible; strict single-document is phase 2).
  const parsed = JSON.parse(res.stdout);
  expect(Number.isInteger(parsed.id)).toBe(true);

  const content = norm(readFileSync(path.join(dir, `${SLUG}.md`), "utf8"));
  assertKBCorrect(dir, [
    { title: meta.title, author: meta.author, origin: meta.origin, contentHash: sha256Hex(content) },
  ]);
});

test("add-2: round-trip fidelity — stored content character-identical after LF normalization", async () => {
  const { dir, importPath } = initAndStage();
  expect(runCli(["add-source", "--json-import", importPath], { cwd: dir }).exitCode).toBe(0);

  const submitted = norm(readFileSync(path.join(dir, `${SLUG}.md`), "utf8"));

  const db = new Database(path.join(dir, "kb.sqlite"), { readonly: true });
  try {
    const datoms = db
      .query<{ id: number; e: number; a: string; v: string; tx: number; added: number }, []>(
        "SELECT id, e, a, v, tx, added FROM datoms",
      )
      .all();
    const view = currentState(datoms);
    const source = [...view.values()].find((attrs) => attrs.has("source/content"));
    expect(source).toBeDefined();
    expect(norm(source!.get("source/content")!)).toBe(submitted);
  } finally {
    db.close();
  }
});

test("add-6: add-source never modifies the input file on disk", () => {
  const { dir, importPath } = initAndStage();
  const mdPath = path.join(dir, `${SLUG}.md`);
  const mdBefore = fileSha256(mdPath);
  const importBefore = fileSha256(importPath);

  expect(runCli(["add-source", "--json-import", importPath], { cwd: dir }).exitCode).toBe(0);

  expect(fileSha256(mdPath)).toBe(mdBefore);
  expect(fileSha256(importPath)).toBe(importBefore);
});
