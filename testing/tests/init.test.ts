// Phase 1 — Initialization. Contracts: D2, D4, D5. Inventory: init-1, init-3.

import { test, expect } from "bun:test";
import { readdirSync } from "node:fs";
import { Database } from "bun:sqlite";
import * as path from "node:path";
import { runCli, makeSandbox } from "./helpers";
import { assertKBCorrect, currentState } from "./kb_assert";

test("init-1: init in a clean directory exits 0 and creates exactly the documented artifacts", () => {
  const dir = makeSandbox();
  const res = runCli(["init"], { cwd: dir });
  expect(res.exitCode).toBe(0);
  const listing = readdirSync(dir).sort();
  expect(listing).toEqual(["config.yml", "convention.md", "kb.sqlite"]); // D4: nothing else
});

test("init-3: placeholder dance completes invisibly — valid schema, zero sources, assert+retract in the log", () => {
  const dir = makeSandbox();
  const res = runCli(["init"], { cwd: dir });
  expect(res.exitCode).toBe(0);

  // Valid schema + zero current sources.
  assertKBCorrect(dir, []);

  // The placeholder's assert and retract datoms exist in the log (D5).
  const db = new Database(path.join(dir, "kb.sqlite"), { readonly: true });
  try {
    const datoms = db
      .query<{ id: number; e: number; a: string; v: string; tx: number; added: number }, []>(
        "SELECT id, e, a, v, tx, added FROM datoms",
      )
      .all();
    const placeholderEntities = new Set(
      datoms.filter((d) => d.e !== 0 && d.added === 1).map((d) => d.e),
    );
    expect(placeholderEntities.size).toBeGreaterThanOrEqual(1);

    // Every placeholder assertion is matched by a later retraction of the same (e, a, v).
    for (const e of placeholderEntities) {
      const asserts = datoms.filter((d) => d.e === e && d.added === 1);
      for (const a of asserts) {
        const retracted = datoms.some(
          (d) => d.e === a.e && d.a === a.a && d.v === a.v && d.added === 0 && d.tx > a.tx,
        );
        expect(retracted, `placeholder datom (${a.e}, ${a.a}) must be retracted post-init`).toBe(true);
      }
    }

    // And the current view over non-schema entities is empty.
    const view = currentState(datoms);
    const nonSchema = [...view.keys()].filter((e) => e !== 0);
    expect(nonSchema).toEqual([]);
  } finally {
    db.close();
  }
});
