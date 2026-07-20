# Eval Harness Runtime — Design

> **Status**: v1 design, authored 2026-07-17 by Fable (orchestrator) with Ethan.
> **Purpose**: the scenario-agnostic runtime that bears ALL Claude Agent SDK knowledge.
> Eval definitions (e.g. the walking-skeleton scenario) are ordinary TypeScript written
> against this runtime's API and must never import the SDK directly.

## Why this exists

The DKB Library is test-&-evaluation driven. Its evals work by **invoking a fresh,
controlled instance of Claude** (the "in-loop" agent) that operates the system under
test via Bash, while scripted user turns drive a multi-turn scenario and deterministic
gates assert KB correctness between turns. This runtime front-loads the Agent-SDK
comprehension so later build agents write plain TS, not SDK code.

## The three roles

| Role | Intelligence | Where it lives |
|---|---|---|
| In-loop Claude | Full agentic loop (the component under indirect evaluation) | one `query()` session, streaming input |
| Simulated User | ~zero — scripted lines | the eval definition's `turns[]` |
| Grader | deterministic gates (no LLM) + optional LLM-as-judge over the transcript | gate callbacks; `grade()` hook |

## Runtime API (contract for eval definitions)

```ts
// eval definitions import ONLY from harness/runtime.ts
import { runScenario, type ScenarioDefinition } from "../harness/runtime";

const scenario: ScenarioDefinition = {
  name: "walking-skeleton",
  sandbox: { fixtures: "./fixtures" },      // copied into a fresh temp dir; cwd of the session
  agent: {
    model: "claude-opus-4-8",               // in-loop model, configurable
    systemPrompt: "...",                    // how the agent is primed on the CLI (v0.2.1: no plugin, so preamble)
    tools: ["Bash", "Read"],                // default minimal
    maxTurnsPerMessage: 25,                 // runaway brake per user turn
    maxBudgetUsd: 2.0,                      // runaway brake per scenario
  },
  turns: [
    {
      user: "Hey Claude! Let's initialize a knowledge base here.",
      gate: async (ctx) => {                 // runs AFTER the agent finishes responding
        ctx.assert(await fileExists(ctx.sandboxPath("dkb.sqlite")), "KB file created");
        ctx.assert(ctx.lastTurn.bashCommands.some(c => c.includes("init")), "agent ran init");
      },
    },
    // ...more turns; a gate failure marks the scenario failed; `haltOnGateFailure` decides continue/stop
  ],
  grade: async (transcript) => ({ ... }),    // optional LLM-as-judge slot (runtime provides `judge()` helper)
};

const result = await runScenario(scenario);
// result: { pass, gates: GateResult[], stats, artifactsDir, transcript }
process.exit(result.pass ? 0 : 1);
```

### What the runtime guarantees

1. **Fresh sandbox** per run: temp dir, fixtures copied in, session `cwd` set there;
   directory snapshot before/after (supports the "no stray files" contract test).
2. **One persistent session** across all turns (shared agent context — the point of
   multi-turn), via streaming input; turn N+1 is not sent until turn N's `result`
   message arrives AND its gate has run.
3. **Isolation** from the developer's own Claude config (`settingSources: []`,
   `persistSession: false`, stripped env).
4. **Captured artifacts** on every run, pass or fail, under `artifacts/<name>-<timestamp>/`:
   - `transcript.json` — every SDK message, ordered
   - `transcript.md` — human-readable rendering (user lines, assistant text, tool calls + results)
   - `summary.json` — pass/fail per gate + stats
5. **Stats** (the spec's "instrument from early on" list):
   - agent turns per user message (`num_turns` from each result message)
   - tool-call count (tool_use blocks in assistant messages), Bash commands extracted
   - token spend (`usage` per turn + total), `total_cost_usd`
   - wall-clock per turn and total
   - exit-code tally of Bash invocations (parsed from tool results where available)
6. **Actionable exit**: process exit 0 iff all gates (and grade, if present) pass;
   failures print which gate, which turn, what was asserted.

### GateContext (what gates can see/do)

- `ctx.sandboxPath(rel)` — absolute path into the sandbox
- `ctx.lastTurn` — parsed view of the just-finished turn: assistant text, tool calls,
  `bashCommands`, tool results, usage
- `ctx.transcript` — everything so far
- `ctx.assert(cond, label)` / `ctx.fail(label)` — record gate outcomes (collected, not thrown)
- `ctx.exec(cmd)` — run a subprocess in the sandbox (for KB introspection, e.g. sqlite queries)

## SDK facts (verified against @anthropic-ai/claude-agent-sdk@0.3.214, local types)

- Entry: `query({ prompt, options }): Query`. `prompt: string | AsyncIterable<SDKUserMessage>`.
  **Streaming-input mode** (AsyncIterable) is the multi-turn mechanism: yield one
  `SDKUserMessage` per scripted turn; hold the iterable open until scenario end.
- `SDKUserMessage`: `{ type: 'user', message: MessageParam, parent_tool_use_id: null, session_id?: string }`.
- **Turn completion signal**: a `result` message (`SDKResultMessage`) per user turn.
  `SDKResultSuccess` carries `num_turns`, `usage`, `modelUsage`, `total_cost_usd`,
  `duration_ms`, `permission_denials`, `result` (final text). Error subtypes:
  `error_during_execution | error_max_turns | error_max_budget_usd | error_max_structured_output_retries`.
- Message stream also yields: `system`/`init` (session_id, tools, model), `assistant`
  (content blocks incl. `tool_use`), `user` (tool results incl. `tool_use_result`
  structured output), various `system` subtypes. `SDKSessionStateChangedMessage`
  (`state: 'idle'`) exists but per-turn `result` is the primary turn-over signal in
  streaming mode.
- Key `Options` (all verified present in 0.3.214):
  - `cwd` — session working dir (the sandbox)
  - `tools: string[]` — base toolset (e.g. `['Bash','Read']`); `allowedTools` auto-allows
  - `permissionMode: 'bypassPermissions'` + `allowDangerouslySkipPermissions: true`
  - `settingSources: []` — SDK isolation mode: no user/project/local settings, no CLAUDE.md
  - `persistSession: false` — no writes to ~/.claude/projects
  - `model`, `maxTurns`, `maxBudgetUsd`, `effort`, `thinking`
  - `env` — **replaces** subprocess env entirely (not merged); spread process.env and
    strip nested-session vars
  - `executable: 'bun'`, `pathToClaudeCodeExecutable` (if needed)
  - `systemPrompt` (see types: string or preset+append form)
  - `outputFormat: { type: 'json_schema', schema }` — for the LLM-judge grader:
    structured verdicts, `structured_output` on the result message, auto-retry on
    mismatch (`error_max_structured_output_retries`)
  - `mcpServers`, `agents`, `skills`, `plugins` — available later for v0.2.2 plugin-interface evals
- Auth: `CLAUDE_CODE_OAUTH_TOKEN` in env (from `claude setup-token`); repo `.env` has it;
  Bun auto-loads `.env`. Strip `ANTHROPIC_API_KEY` if present to avoid auth-path ambiguity.
- Nested-session hygiene (harness may run from inside a Claude Code session): strip
  `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT` from child env.

## File layout

All paths below live under `testing/` (siblings: `library/` — the TS library source; `engines/epistack/` — the first engine instantiation).

```
testing/harness/
  DESIGN.md        # this file
  runtime.ts       # runScenario + session driver (ALL SDK imports live here)
  types.ts         # ScenarioDefinition, TurnDef, GateContext, ScenarioResult, Stats
  transcript.ts    # message capture, parsing into per-turn views, md rendering
  report.ts        # artifacts dir, summary, console output
  judge.ts         # optional LLM-as-judge helper (one more query() call, outputFormat json_schema)
testing/evals/
  eval_smoke.ts    # trivial scenario proving the loop (no DKB CLI needed)
  # eval_walking-skeleton.ts  ← build agents, later
testing/artifacts/ # gitignored run outputs
```

## Smoke eval (validates the harness itself, today)

Scenario with no DKB dependency: sandbox contains a `notes.txt` fixture; turns like
(1) "create a file greeting.txt containing exactly 'hello dkb'" → gate: file exists,
content exact; (2) "now append the first line of notes.txt to it" → gate: content
correct, fixture unmodified. Proves: session persistence across turns, gating,
transcript capture, stats, sandbox isolation, auth.

## Empirical findings (verified 2026-07-17, SDK 0.3.214, smoke runs on Haiku)

Observed message order for a 2-turn streaming-input session:
`system/init` → `rate_limit_event` → `assistant`(+tool_use) → `user`(tool result) →
`assistant` → **`result` (success)** → `system/init` (turn 2 opens) → … → **`result`**.

- **Exactly one `result` message per user turn** — this is the turn-over signal the
  runtime keys on. `session_state_changed` was never emitted in this mode; treat it
  as an untested fallback only.
- **`usage` / `total_cost_usd` on each `result` are per-turn, not cumulative**
  (verified by cache-counter reset + summed costs matching).
- **Bash exit codes are NOT exposed by the SDK.** `tool_use_result` for Bash is
  `{stdout, stderr, interrupted, isImage, noOutputExpected}`. The runtime's tally
  derives 0 from non-error results and parses "Exit code N" from error text.
  → Eval gates needing precise exit codes must invoke the CLI themselves via
  `ctx.exec()` — which is also the spec-correct approach (the CLI-as-subprocess
  contract), so this limitation costs nothing.
- Auth via `CLAUDE_CODE_OAUTH_TOKEN` from repo `.env` (Bun auto-loads) worked
  first try; smoke run ≈ $0.016, ~38 s wall clock.

### Gotchas for eval authors

1. **Normalize CRLF + trailing newline** in content gates (`echo >` appends `\n`;
   Windows tools may emit `\r\n`). See `norm()` in `testing/evals/eval_smoke.ts`.
2. For "no stray files" gates, use `stats.sandboxBefore/After` (config dir already
   filtered), not a raw `readdir`.
3. `maxTurnsPerMessage` maps to SDK `maxTurns`, which behaves as a global brake
   across the whole streaming session — not strictly per-message.
4. `haltOnGateFailure` defaults to false (all turns still run); a non-success
   `result` subtype (budget/turn cap) always halts and records a failing gate.
5. `Read` tool failures return a plain string `tool_use_result`, not an object.

## Deliberately deferred (build agents / later)

- The walking-skeleton eval definition + SABRE fixture corpus
- KB-correctness helper library (sqlite EAV introspection) — belongs with the eval,
  not the runtime
- Transcript-grading rubric content (runtime only provides the `grade()` slot + `judge()` helper)
- Cost/cadence tagging taxonomy for test cases
- pass@k / trial repetition (post-v0.2; runtime's single-run contract keeps the door open)

## Progress & partial artifacts (added 2026-07-19, post first ws run)

Motivated by the first walking-skeleton run being a ~4-minute black box (and a
timed-out run would have left zero artifacts):

- The runtime prints per-turn progress to **stderr** (`[<scenario>] turn i/N done
  in Xs — gates: … — $… so far`, plus run-start and grading lines); stdout still
  carries only the final report.
- The artifacts dir is created at run start; after every completed turn the
  transcript (json+md) and a `summary.json` with `partial: true` are flushed to
  it (`writePartialArtifacts` in report.ts). The final `writeArtifacts` overwrites
  them into the finished form, so a `partial: true` summary on disk always means
  the run died before completing.
