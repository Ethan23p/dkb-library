// Phase 1 — Modify. Contracts: D2, D5, D6. Inventory: mod-1, mod-2.
// (mod-3/mod-4 error-polish tests are phase 2, but content immutability itself is D6.)

import { test, expect } from "bun:test";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { runCli, makeSandbox, stageFixture, fixtureMeta } from "./helpers";
import { assertKBCorrect } from "./kb_assert";

const SLUG = "koch-bleicher-2009";
const NEW_AUTHOR = "B. Koch, M. Bleicher, H. Stöcker";

async function initAddAndGetId() {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);
  const importPath = stageFixture(SLUG, dir);
  const res = runCli(["add-source", "--json-import", importPath, "--json"], { cwd: dir });
  expect(res.exitCode).toBe(0);
  const id: number = JSON.parse(res.stdout).id;
  const meta = await fixtureMeta(SLUG);
  return { dir, id, meta };
}

test("mod-1: a metadata modification is visible in the current state", async () => {
  const { dir, id, meta } = await initAddAndGetId();

  const res = runCli(
    ["modify-entry", "--id", String(id), "--attribute", "source/author", "--value", NEW_AUTHOR],
    { cwd: dir },
  );
  expect(res.exitCode).toBe(0);

  assertKBCorrect(dir, [{ title: meta.title, author: NEW_AUTHOR, origin: meta.origin }]);
});

test("mod-2: modification is non-destructive — prior value recoverable as a retracted datom", async () => {
  const { dir, id, meta } = await initAddAndGetId();
  expect(
    runCli(
      ["modify-entry", "--id", String(id), "--attribute", "source/author", "--value", NEW_AUTHOR],
      { cwd: dir },
    ).exitCode,
  ).toBe(0);

  const db = new Database(path.join(dir, "kb.sqlite"), { readonly: true });
  try {
    const rows = db
      .query<{ v: string; tx: number; added: number }, [number]>(
        "SELECT v, tx, added FROM datoms WHERE e = ? AND a = 'source/author' ORDER BY tx, id",
      )
      .all(id);

    // Original assert, retraction of the original, assert of the new — the D5 shape.
    expect(rows.some((r) => r.added === 1 && r.v === meta.author)).toBe(true);
    const originalAssert = rows.find((r) => r.added === 1 && r.v === meta.author)!;
    expect(
      rows.some((r) => r.added === 0 && r.v === meta.author && r.tx > originalAssert.tx),
    ).toBe(true);
    expect(rows.some((r) => r.added === 1 && r.v === NEW_AUTHOR)).toBe(true);
  } finally {
    db.close();
  }
});
