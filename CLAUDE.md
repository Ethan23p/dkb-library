# DKB Library — Durable Knowledge Bases

A TypeScript library for creating knowledge bases that are *durable, scalable, and intuitive* — multiplying one's capacity to ingest, retrieve, and synthesize data while preserving nuance.

## Source of truth

The spec lives in Ethan's Logseq graph (`Logseq-DB-desktop`), not in this repo. **Read it, don't duplicate it here.**

- `[[Durable Knowledge Base Library]]` — the library spec (vision, principles, entities, capabilities, roadmap, test cases).
- `[[Durable Epistack KB Engine]]` — the first instantiation: an engine for applied epistemology, built for the FLF Epistemic Case Study competition. Contains the UX flows (rich detail and implicit assumptions live there).
- `[[DKB Library Agent Reference]]` — agent-facing reference page.

Access via the `/logseq-interface` skill →
`logseq show --graph "Logseq-DB-desktop" --page "<title>" --linked-references false`

Known Logseq-CLI quirks (from the spec's "For AI Agent Collaborators", plus session experience): the CLI doesn't differentiate block refs from pages — if a `[[link]]` fails as a page, pull the JSON of the referring block to see what it refs. `--page` and `--id` are mutually exclusive on `show`; a block id alone implies its page context.

## Core principles (internalize; full list in spec)

- **Source-data first**: preserve source data verbatim; identity is forged at ingestion; not a single datum lost afterward.
- **No generative content in the source-data pipeline.** AI-generated content never qualifies as source data. Avoid the key antipattern: stale interpretation layered on earlier interpretation.
- **Just-in-Time intelligence**: defer synthesis to the time and context of retrieval, using SotA models at that moment.
- **AI as an interface for hard data**; optimize for the scarce resource — the User's attention.
- Development values: simple & minimal, moldable & atomic, ergonomic, observable, regression-resistant, **test & evaluation driven**.

## Vocabulary (use these terms precisely)

- **library** — this repo; defines all mechanisms in TypeScript.
- **engine** — a program using the library; owns and drives all operations over a knowledge base; the CLI is its sole point of input.
- **knowledge base** — the data store; only ever operated on by the engine. v0.2: SQLite as an append-only transactional log of EAV structure (Datomic-style) — no UPDATE/DELETE; current state is a view over the log.
- **convention** — the live, evolving set of best practices around attributes/metadata (not a rigid schema). Attributes are hand-holds for AI searching the graph.
- **interfaces** — CLI (AI-legible: intuitive exit codes, `--json`, errors that say what to do next) and, later, a plugin (thin skill wrapper + Smart Interface Agent subagent).
- **capabilities** — introduction, initialize, retrieve (explore / query / quick reference / overview), add data, remove data, modify, maintain. Each is specced at three levels: *platonic*, *v0.2.1*, *v0.2.2*. In v0.2.1, retrieve = **explore only** (query deferred; context-stuffing makes a straightforward explore agent highly effective at small scale).
- **components** — declared in the spec under "Technical Specification (Claude's Refactor)": Store, Source Model, Convention, Retrieval, Inference, CLI Framework, Error & Exit-Code Taxonomy. One dependency rule: CLI → capabilities → {Retrieval, Source Model, Convention} → Store, with Inference reachable only from Retrieval's explore path — the write path having no import path to Inference is what enforces "no generative content in the pipeline."

## Current phase & constraints

**v0.2.1 — walking skeleton.** A sparse TypeScript program: entities and capabilities exist but shallow, with placeholder data and dummy returns. CLI only; plugin deferred. Done means: the walking-skeleton scenario runs end-to-end and phase-1 test cases pass.

Walking-skeleton scenario: initialize → retrieve (fails gracefully) → add source(s) → retrieve (source included) → modify → retrieve (updated info) — with KB-correctness checks between steps, plus a transcript-grading test for alignment with spec/values.

**v0.2.2 — prototype**: robust definitions, error handling, logging, `--help` guidance, AI-legible CLI, plugin interface. Phase-2 test cases pass.

## Repo layout

- `library/` — the DKB Library source (TypeScript); all mechanisms live here.
- `engines/epistack/` — the first engine instantiation; stays thin (CLI title, paths, convention seed, `main()`).
- `testing/` — harness, evals, and run artifacts.

## Eval harness (built)

`testing/harness/` is the scenario-agnostic eval runtime; **`testing/harness/DESIGN.md` is its authoritative doc — read it before touching evals.** Key contracts:

- Eval definitions (in `testing/evals/`) import ONLY from `harness/runtime.ts` — never the Agent SDK directly. All SDK knowledge is quarantined in the harness.
- Run with Bun (e.g. `bun testing/evals/eval_smoke.ts`, or `bun run eval:smoke`). Auth: `CLAUDE_CODE_OAUTH_TOKEN` in repo `.env` (Bun auto-loads it).
- Every run writes artifacts (transcript, summary, stats) to `testing/artifacts/` (gitignored).
- Gates needing exit codes use `ctx.exec()` — the SDK doesn't expose Bash exit codes, and CLI-as-subprocess is the spec-correct approach anyway.
- Test inventory (in the spec) tags every case `[grader | cadence]`: logic/every-run, rubric/checkpoint, human/milestone.

## Working conventions for agents

- **Pre-verify functionality, no assumptions** — until the app is mature, always check before relying on a command (e.g. run `--help` first). Small cost, prevents derailing.
- Evals frame: use the `/evaluating-ai-agents` skill's framing (tasks, trials, graders, transcripts, outcomes; capability vs. regression evals; grade what the agent produced, not the path it took; read the transcripts). Test cases derive from the UX flows.
- Stats to instrument from early on: agent turns per command, tool calls, token spend, wall-clock time, exit-codes tally.
- Ethan is the sole user/designer; consult him for design decisions, proceed autonomously on execution.
