# LOOP.md — Orchestrator State Ledger (ARCHIVED)

> **Archived.** This ledger drove the scaffolded build loop that produced the
> v0.2.1 walking skeleton. That loop is finished and its scaffolding has been
> taken down; nothing reads this file as live state, and the task queue below is
> a historical record, not a to-do list.
>
> It is kept for the **Decision Log** and **Session Log**: they are the only
> record of *why* several implementation choices were made — the bun:sqlite
> `{readwrite:true}` fix, the auth-gate-after-empty-KB-gate ordering, the
> coverage-none coercion, the eval's staged `.env`. Consult them before
> reversing anything that looks arbitrary.
>
> Current project state lives in `CLAUDE.md`, `docs/CONTRACTS.md`, and the
> Logseq spec. `docs/SPEC_SNAPSHOT.md`, referenced below, no longer exists.

## Current phase (as of archiving)

**v0.2.1 walking skeleton: done-criteria met.** Phase-1 logic suite green and
the walking-skeleton scenario passing end-to-end. Remaining v0.2.1 work is the
round-out bucket — the interface plugin, CLI polish, and a demo knowledge base —
tracked outside this file.

## The build loop (once prep is blessed)

```
1. bun test testing/tests/          # what's red?
2. Pick the reddest failure whose component dependencies are green
   (build order follows the dependency graph: errors → ledger → convention →
    ingestion → synthesis → retrieval → cli → engine main)
3. Dispatch a subagent: one component / one failing cluster per dispatch.
   Brief = CONTRACTS.md + SPEC_SNAPSHOT.md excerpt + the failing test file + report-back format.
4. Verify: tests that were red are green; tests that were green stayed green;
   failures migrated for the right reason.
5. Append to Session Log. Repeat.
6. When all logic tests green → run the walking-skeleton eval → ws-grade → Ethan (agt-5).
```

Ground rules for the loop:
- Tests are immutable once blessed. If a test seems wrong, that's a Decision Log
  entry + Ethan consult, never an edit-to-green.
- Subagents get contracts, not vibes. Every dispatch cites specific CONTRACTS.md sections.
- Orchestrator context is disposable; this file + the suite are not.
- Token economy (Ethan, 2026-07-19): subagent-driven development exists to keep the
  orchestrator's context lean. Briefs cite file paths + CONTRACTS section numbers —
  never paste file bodies. Subagents read from disk and iterate in their own context;
  they report back compactly. The orchestrator verifies via the suite, not by reading
  implementation code.

## Task queue

- [x] CONTRACTS.md — **validated by Ethan 2026-07-19** (D9 confirmed; A1/A2 amendments noted)
- [x] SPEC_SNAPSHOT.md (refreshed 2026-07-19 after Ethan's spec correction)
- [x] Fixture corpora: `corpus-lhc/` (6/6, primary) + `corpus/` (SABRE 5/6, spare)
- [x] Phase-1 logic suite: `bun test` → 12 tests, all red with "entry point not found" — correct day-one red
- [x] Walking-skeleton eval: `bun run eval:ws` (checkpoint cadence — real inference, ~$1-5/run)
- [x] BUILD: complete in 3 cycles (2026-07-19) — `bun test testing/tests` = 12/12 green
- [x] Walking-skeleton run + ws-grade: **PASS** (run 2, 2026-07-19) — 18/18 gates,
      grade 5/5/5/5/4. **v0.2.1 done-criteria met** (suite 12/12 + scenario e2e).
- [x] agt-5: human transcript review (artifacts:
      `testing/artifacts/walking-skeleton-2026-07-20T03-44-53Z/transcript.md`)
- [ ] Demo KB creation (Ethan)

## Decision Log (append-only)

- **2026-07-19 · Prep strategy**: four artifacts before any code — CONTRACTS.md
  (pinned decisions) → phase-1 test suite (executable ground truth) → LOOP.md (this
  ledger) → SPEC_SNAPSHOT.md (subagent-ready spec). Rationale: the orchestrator is
  amnesiac; only disk and executables are trustworthy. Ethan approved all four.
- **2026-07-19 · Tests-first**: whole suite red on day one ("entry point not found")
  is the correct initial state; watch failures migrate downward as code appears.
- **2026-07-19 · D9 (explore inference)**: v0.2.1 explore makes a real Agent-SDK call
  (CLAUDE_CODE_OAUTH_TOKEN) rather than returning a deterministic dummy — otherwise
  ret-3/agt-2/ws-4 are untestable. Plugin generation stays deferred to v0.2.2.
  ⚠ Flagged for Ethan's explicit sign-off with the rest of CONTRACTS.md.

- **2026-07-19 · Fixture corpus pivot (Ethan)**: primary corpus is now **LHC micro
  black hole safety** (`testing/fixtures/corpus-lhc/`) — one of the FLF competition's
  named case-study topics, so fixtures double as demo-KB material for the Epistack
  submission. Sources curated by Ethan+Fable as title/institution; subagent resolves &
  fetches. The SABRE corpus (`testing/fixtures/corpus/`, 5/6 fetched; SMU PDF behind
  WAF) is retained as a spare, truly-unrelated corpus. The Logseq
  `[[DKB Library Canonical Fixture Corpus]]` page needs updating to match (Ethan).

## Session Log (append-only)

- **2026-07-19 · prep session (Fable)**: Ingested both Logseq specs. Wrote
  CONTRACTS.md (12 decisions), SPEC_SNAPSHOT.md, this ledger. Dispatched fixture-fetch
  subagent (6 SABRE/CRS URLs → testing/fixtures/corpus/). Test suite deliberately held
  until Ethan validates contracts.
- **2026-07-19 · prep session, cont. (Fable)**: Ethan validated CONTRACTS.md and
  corrected the Logseq spec (inference handler v0.2.1 = Agent-SDK-only → D9 is
  spec-aligned; also new: attributes are never source data/evidence). Snapshot +
  repo CLAUDE.md updated to match. Amendment A1: provenance entries carry `author`
  (needed by ws-6). **Suite blessed**: 12 logic tests (`testing/tests/`: init-1/3,
  ret-1/2/3, add-1/2/6, mod-1/2, xcut-2/3) + walking-skeleton eval
  (`testing/evals/eval_walking_skeleton.ts`, sonnet in-loop, opus judge, koch+ord
  fixtures, NEW_AUTHOR token "FIAS" for ws-6 detection). Shared predicate:
  `testing/tests/kb_assert.ts` (checkKB/assertKBCorrect + currentState). Verified
  all-red for the right reason; eval bundle parse-checked. ret-3 skips loudly
  without CLAUDE_CODE_OAUTH_TOKEN. **Prep phase complete — build loop is next.**
- **2026-07-19 · build cycle 1 (Fable + foundation subagent)**: Ethan added a ground
  rule (token economy — see above) and noted the loop is supervised, not hard-line
  autonomous. Dispatched foundation cluster: `library/errors.ts` (D3 enum +
  DkbError), `library/ledger.ts` (append-only EAV, transact() sole write path),
  `library/init.ts` (D4 artifacts + D5 tx sequence), `library/cli.ts` (grammar from
  declarative capability table), thin `engines/epistack/main.ts`. Suite: 0→4 green
  (init-1, init-3, xcut-3, ret-2 failed-path); all 8 remaining failures migrated to
  "recognized but not implemented" (exit 1 with guidance; unknown command → 2).
  Verified independently. Subagent's ambiguity calls (placeholder attr
  `kb/placeholder`, minimal config.yml, no indexes per xcut-3's exactness) accepted —
  none contradict a contract. Next: cycle 2 = ingestion + modify (add-source +
  modify-entry → add-1/2/6, mod-1/2, xcut-2).
- **2026-07-19 · build cycle 2 (Fable + ingestion/modify subagent)**: `library/
  ingestion.ts` (addSource: D7 validation, D8 LF+sha256, D6 attrs, one tx),
  `library/modify.ts` (retract+assert in one tx; immutable set = content,
  content-hash, date-added per D6's Mutable:no column), cli.ts handlers. Also a
  **bug fix in cycle-1 ledger.ts**: bun:sqlite `{readonly:false}` = zero flags →
  SQLITE_MISUSE on every read-write open; now `{readwrite:true}`. Suite 4→10 green,
  no regressions; ret-1/ret-3 fail at the right spot (retrieve unimplemented —
  ret-3 now dies at the explore call, not its add-source setup). Flagged edge:
  modify on an attribute with no current value does assert-only (no fabricated
  retraction) — untested, awaiting a phase-2 contract if it matters. Next: cycle 3 =
  synthesis + retrieval (retrieve explore, D9/D10 → ret-1, ret-3).
- **2026-07-19 · build cycle 3 (Fable + retrieval/synthesis subagent)**: `library/
  inference.ts` (inference handler — sole SDK owner; `EXPLORE_MODEL` =
  claude-haiku-4-5, one place of config; structural read-only: subagent gets
  tools:[], maxTurns:1, temp cwd/CONFIG_DIR) + `library/retrieval.ts` (explore:
  readonly DB, EMPTY_KB gate → auth gate → context-stuff → D10 artifact w/ A1
  provenance) + cli.ts flip. **Suite 12/12 green** (verified independently; ret-3
  real call ≪1¢). Spot-checks: empty KB → exit 4 naming add-source; stripped token →
  exit 3 with login guidance; auth gate fires after EMPTY_KB gate so ret-1/2 stay
  token-free. Judgment calls (accepted, unblessed): coverage-none coerces stray
  synthesis to "" (no fabrication, documented in code); multi-token query = joined
  positionals, missing query = USAGE 2. Malformed model reply = exit 1, never a
  fabricated artifact. **Logic suite done — walking-skeleton eval next (Ethan
  pre-approved the run).**
- **2026-07-19 · walking-skeleton run 1 (FAIL — eval-environment bug, not engine)**:
  17/18 gates green; $0.89, 154s. Root cause: Claude Code scrubs
  CLAUDE_CODE_OAUTH_TOKEN from Bash-subprocess envs, so the engine's explore exited
  3 (auth) inside the eval sandbox — correct engine behavior, wrong environment.
  Notable: the in-loop Sonnet **refused to substitute its own physics knowledge**
  when explore failed (Opus judge: sourceDataFirst 5, noLeakage 5 — values held
  under failure). Gate audit: ws-4's provenance regex caught the failure (good
  gate); ws-6's whole-transcript FIAS search false-passed (ws-5's modify turn
  already contained the token). Maintenance (strengthen-only, per Ethan's OK):
  (a) eval stages a `.env` into the sandbox — the D9-documented auth path (staging
  dir gitignored, sandbox OS-temp); (b) ws-6 gate now searches only the final
  turn's relayed text. Run 2 dispatched. Harness wishlist (deferred): per-turn
  stderr progress + incremental artifact flushing — a timed-out run currently
  leaves zero artifacts.
- **2026-07-19 · walking-skeleton run 2: PASS — v0.2.1 done-criteria met.** 18/18
  gates; ws-grade pass with sourceDataFirst 5, jitIntelligence 5 (judge noted the
  agent *re-ran retrieval* after modify instead of patching a stale answer),
  aiAsInterface 5, noLeakage 5, ergonomics 4. $0.70, 249s. Artifacts (incl. full
  gradeVerdict in summary.json) persist under `testing/artifacts/
  walking-skeleton-2026-07-20T03-44-53Z/`. Session then PAUSED (usage credits).
  Post-run harness maintenance landed per Ethan's request: per-turn stderr
  progress + partial-artifact flushing after every turn (report.ts:
  createArtifactsDir/writePartialArtifacts; runtime.ts progress lines; documented
  in DESIGN.md §"Progress & partial artifacts"). Parse-checked via bun build;
  behavior change is additive — next eval run doubles as its live check.
  **Remaining: human review → demo KB → submission draft. Nothing
  is blocked on the orchestrator; resume from the task queue above.**
- **2026-07-23 · loop closed (Fable)**: Human transcript review done. Build-loop
  scaffolding taken down and this ledger archived; `docs/CONTRACTS.md` stays as a
  design reference and `testing/tests/` as an ordinary regression suite. Round-out
  work landed in the same pass: exit code 8 (AUTH), `--help` and `--verbose`,
  explore-model lifted from `inference.ts` into the engine's `config.yml`, and the
  repo packaged as a Claude Code plugin (`skills/dkb/SKILL.md`, `bin/dkb`,
  self-marketplace) with `docs/PLUGIN.md` recording the mechanics.
