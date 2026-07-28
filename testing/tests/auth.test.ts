// Phase 1 — Inference credential resolution. Contracts: D3, D9, A3, A6.
//
// Why this file exists: the playtester path was broken for exactly as long as
// nothing tested it. Every other suite runs with the repo's own .env on cwd, so
// a credential was always present and the failure was invisible. These tests
// run the CLI with the variable explicitly unset, which is the state an
// installed user is actually in.
//
// Note the empty-KB check precedes the auth check (retrieval.ts), so these need
// a KB with a real source in it.

import { test, expect } from "bun:test";
import { writeFileSync } from "node:fs";
import * as path from "node:path";
import { runCli, makeSandbox, stageFixture, CORPUS } from "./helpers";

const SMALL_SLUG = "airways-sabre"; // cheapest real source; never actually explored here
const NO_CREDENTIAL = { CLAUDE_CODE_OAUTH_TOKEN: undefined };

/** A KB with one real source — enough to get past the EMPTY_KB gate. */
function sandboxWithSource(): string {
  const dir = makeSandbox();
  expect(runCli(["init"], { cwd: dir }).exitCode).toBe(0);
  const importPath = stageFixture(SMALL_SLUG, dir, CORPUS);
  expect(runCli(["add-source", "--json-import", importPath], { cwd: dir }).exitCode).toBe(0);
  return dir;
}

test("auth-1: no credential anywhere → exit 8", () => {
  const dir = sandboxWithSource();
  const res = runCli(["retrieve", "explore", "anything at all"], {
    cwd: dir,
    env: NO_CREDENTIAL,
  });
  expect(res.exitCode).toBe(8); // D3 AUTH
});

test("auth-2: the exit-8 message points at setup-token, not at logging in", () => {
  const dir = sandboxWithSource();
  const res = runCli(["retrieve", "explore", "anything at all"], {
    cwd: dir,
    env: NO_CREDENTIAL,
  });
  const out = res.stdout + res.stderr;

  // A6: the remedy has to be the one that actually works. Being logged into
  // Claude Code does not satisfy this and cannot be made to — telling the user
  // to log in sends them in a circle, which is what the old message did.
  expect(out).toContain("setup-token");
  expect(out).toContain("CLAUDE_CODE_OAUTH_TOKEN");
  expect(out).toMatch(/\.env/);
  expect(out).toMatch(/not sufficient/i);
});

// auth-3 — the POSITIVE path (a .env in cwd satisfies the check) is covered by
// `testing/evals/eval_demo.ts`, not here, and deliberately so.
//
// Proving it at this tier requires observing what happens *after* the gate
// opens, which means starting a real inference call. Two attempts at bounding
// that failed: a bogus token waits on remote retries (passed alone, timed out
// inside the suite), and pointing ANTHROPIC_BASE_URL at a closed local port
// still retries with backoff — it pushed the suite from 18s to 200s. A
// deterministic suite that makes no network calls is worth more than local
// coverage of this one branch, so the positive path is asserted one tier up,
// where a real explore is already the point.

test("auth-4: a credential in the knowledge base directory is NOT used", () => {
  // A6, deliberately: a knowledge base is meant to be copied, hydrated and
  // shared. A credential sitting inside one would travel with it to whoever
  // received a copy. Secrets attach to the operator, not to the data.
  const kbDir = sandboxWithSource();
  const workDir = makeSandbox("dkb-test-cwd-");
  writeFileSync(path.join(kbDir, ".env"), "CLAUDE_CODE_OAUTH_TOKEN=not-a-real-token\n");

  const res = runCli(["retrieve", "explore", "anything at all", "--dir", kbDir], {
    cwd: workDir, // no .env here — the only one is inside the KB
    env: NO_CREDENTIAL,
  });
  expect(res.exitCode).toBe(8);
});
