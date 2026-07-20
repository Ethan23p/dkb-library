// Phase 1 — Cross-cutting contracts. Contracts: D4, D5, D11. Inventory: xcut-2, xcut-3.

import { test, expect } from "bun:test";
import { mkdirSync } from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { runCli, makeSandbox, stageFixture, snapshotTree } from "./helpers";

test("xcut-2: the engine writes only within its declared directories", () => {
  // Layout: sandbox/ holds fixtures + a kb/ target; every command targets kb/ via --dir.
  // Nothing outside kb/ may change (D11; OS temp dir is exempt by contract).
  const sandbox = makeSandbox();
  const kbDir = path.join(sandbox, "kb");
  mkdirSync(kbDir);
  const importPath = stageFixture("koch-bleicher-2009", sandbox);

  const before = snapshotTree(sandbox, ["kb"]);

  expect(runCli(["init", "--dir", kbDir], { cwd: sandbox }).exitCode).toBe(0);
  const addRes = runCli(["add-source", "--json-import", importPath, "--dir", kbDir, "--json"], {
    cwd: sandbox,
  });
  expect(addRes.exitCode).toBe(0);
  const id: number = JSON.parse(addRes.stdout).id;
  expect(
    runCli(
      ["modify-entry", "--id", String(id), "--attribute", "source/author", "--value", "X", "--dir", kbDir],
      { cwd: sandbox },
    ).exitCode,
  ).toBe(0);
  // A failing command must not write outside the boundary either.
  runCli(["definitely-not-a-command"], { cwd: sandbox });

  const after = snapshotTree(sandbox, ["kb"]);
  expect(after).toEqual(before);
});

test("xcut-3: the KB is one SQLite file containing exactly the documented tables", () => {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);

  const db = new Database(path.join(dir, "kb.sqlite"), { readonly: true });
  try {
    const objects = db
      .query<{ name: string; type: string }, []>(
        "SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    // D5: two tables, and no undocumented user objects of any kind.
    expect(objects).toEqual([
      { name: "datoms", type: "table" },
      { name: "txs", type: "table" },
    ]);

    // Documented columns, exactly.
    const cols = (t: string) =>
      db.query<{ name: string }, []>(`PRAGMA table_info(${t})`).all().map((c) => c.name).sort();
    expect(cols("datoms")).toEqual(["a", "added", "e", "id", "tx", "v"]);
    expect(cols("txs")).toEqual(["ts", "tx"]);
  } finally {
    db.close();
  }
});
