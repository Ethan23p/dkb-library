// Phase 1 — Retrieve (explore). Contracts: D2, D3, D9, D10. Inventory: ret-1, ret-2, ret-3.
//
// NOTE (D9/D12): ret-3 exercises a REAL inference call (Agent-SDK via
// CLAUDE_CODE_OAUTH_TOKEN — Bun auto-loads repo .env). It costs a few cents per
// run and is skipped, loudly, when no token is present. The KB for it is the
// smallest corpus fixture to keep context-stuffing cheap.

import { test, expect } from "bun:test";
import * as path from "node:path";
import { runCli, makeSandbox, stageFixture, fileSha256, CORPUS } from "./helpers";

const HAS_TOKEN = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
const SMALL_SLUG = "airways-sabre"; // 834 words — cheapest real source
// The two fixture corpora are deliberately unrelated, so a question about one
// has provably zero coverage in a KB built from the other. This KB is SABRE;
// the query is LHC:
const UNRELATED_QUERY =
  "What did the LHC safety assessments conclude about the risk of microscopic black holes?";

test("ret-1: retrieve on an empty KB exits 4 and says how to add a source", () => {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);

  const res = runCli(["retrieve", "explore", "anything at all"], { cwd: dir });
  expect(res.exitCode).toBe(4); // D3 EMPTY_KB — the distinct documented code
  expect((res.stdout + res.stderr).includes("add-source")).toBe(true); // what to do next
});

test("ret-2 (failed path): a failed retrieve leaves the KB file byte-identical", () => {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);
  const kbPath = path.join(dir, "kb.sqlite");
  const before = fileSha256(kbPath);

  runCli(["retrieve", "explore", "anything at all"], { cwd: dir }); // exits 4
  expect(fileSha256(kbPath)).toBe(before);
});

test.skipIf(!HAS_TOKEN)(
  "ret-3 + ret-2 (success path): zero-coverage explore reports none, no synthesis, KB untouched [INFERENCE — costs cents]",
  () => {
    const dir = makeSandbox();
    expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);
    const importPath = stageFixture(SMALL_SLUG, dir, CORPUS);
    expect(runCli(["add-source", "--json-import", importPath], { cwd: dir }).exitCode).toBe(0);

    const kbPath = path.join(dir, "kb.sqlite");
    const before = fileSha256(kbPath);

    const res = runCli(["retrieve", "explore", UNRELATED_QUERY, "--json"], { cwd: dir });
    expect(res.exitCode).toBe(0);

    // D10 artifact contract: empty in, empty out.
    const artifact = JSON.parse(res.stdout);
    expect(artifact.coverage).toBe("none");
    expect(artifact.synthesis).toBe("");
    // Provenance may list consulted-but-unused sources or be empty; every id must resolve —
    // structurally guaranteed here by the single-source KB, so just check shape.
    expect(Array.isArray(artifact.provenance)).toBe(true);

    // ret-2: retrieve is read-only, including the successful path (D9).
    expect(fileSha256(kbPath)).toBe(before);
  },
  120_000,
);

if (!HAS_TOKEN) {
  console.warn(
    "[retrieve.test] CLAUDE_CODE_OAUTH_TOKEN absent — ret-3 (inference) SKIPPED. " +
      "This is a hole in the run, not a pass; see docs/CONTRACTS.md D9/D12.",
  );
}
