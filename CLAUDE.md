# DKB Library — Durable Knowledge Bases

A TypeScript library for creating knowledge bases that are *durable, scalable, and intuitive* — multiplying one's capacity to ingest, retrieve, and synthesize data while preserving nuance.

## Source of truth

The spec lives in Ethan's Logseq graph, not in this repo. **Read it, don't duplicate it here.**

> **Graph name:** currently `Logseq-DB-Aurelius`

- `[[Durable Knowledge Base Library]]` — the library spec (vision, principles, entities, capabilities, technical components, testing & evaluation, roadmap).
- `[[Durable Epistack KB Engine]]` — the first instantiation: an engine for applied epistemology, built for the FLF Epistemic Case Study competition. Contains the UX flows (rich detail and implicit assumptions live there).
- `[[DKB Library Agent Reference]]` — agent-facing reference page.
- `[[DKB Library Canonical Fixture Corpus]]` — the small canonical fixture corpus for tests/evals (intentionally unrelated content).

Access via the `/logseq-interface` skill →
`logseq show --graph "Logseq-DB-Aurelius" --page "<title>" --linked-references false`

Known Logseq-CLI quirks (from the spec's "For AI Agent Collaborators", plus session experience): the CLI doesn't differentiate block refs from pages — if a `[[link]]` fails as a page, pull the JSON of the referring block to see what it refs. `--page` and `--id` are mutually exclusive on `show`; a block id alone implies its page context.

## Core principles (internalize; full list in spec)

- ## Concept

  - Source Data First
    - None of the *generative content* from this system qualifies as source data or evidence - inference this system does is grounded solely by first-hand source data. (inference, meaning: metadata formation, informational artifact generation, etc.)
    - Source data at source fidelity is essential, though that doesn't imply byte-level preservation.
  - Just in Time (JiT) Intelligence
    - The fatal failure mode with modern AI is interpretations over interpretations.
    - Inference this system does is deferred to the *time* and *context* of retrieval - ensuring that nuance is preserved, a modern model is used, and data is up-to-date.
  - AI as an Interface for Hard Data
    - The **Interface Agents** are *first-class citizens* - this system is technically useable by a human at a terminal but will *never* be used that way.
    - This system leverages AI Agents both as machinery and as interfaces, both **irreducible**.
      - Machinery: processing data, interpreting between sources, on-demand synthesis;
      - interfaces: interpolating across jagged boundaries for humans, using a deterministic CLI to perform complex operations with *high trust*.
  - Data-Orientation
  - Evaluation & Observability
  - Active Engagement
  - Crowd-Sourcing Dynamics

- ## Development

  - Durable, Regression Resistant, Maintainable
  - Simple & Minimal
  - Moldable & Atomic
  - Ergonomic
  - Observable
  - Test & Evaluation Driven Development

## Vocabulary (use these terms precisely)

Entities (each specced at *platonic* / *v0.2.1* / *v0.2.2* levels in the spec):

- **library** — this repo; defines all mechanisms in TypeScript.
- **engine** — a program using the library; owns and drives all operations over a knowledge base; consults the inference handler; defines the CLI as its sole point of input.
- **knowledge base** — the data store; only ever operated on by the engine. v0.2: SQLite as an append-only transactional log of EAV structure (Datomic-style) — no UPDATE/DELETE; current state is a view over the log.
- **inference handler** — owns the agentic machinery and formalizes the contracts for using Agents inside the program (providers, interfaces, return formats). It *generates* the dependent code from one place of configuration. v0.2.1: supports subagents via Agent-SDK only (assumes the user is logged into Claude Code on the same system; proper feedback if the token is absent). Plugin generation is post-v0.2.
- **convention** — the live, evolving set of best practices around attributes/metadata (not a rigid schema). Attributes are hand-holds for AI searching the graph.
- **interfaces** — two, both first-class:
  - **CLI** — AI-legible: intuitive exit codes, `--json` mode, errors that say what to do next, an access path through the plugin interface. Technically human-usable but agentic interaction is baked into the concept.
  - **Smart-Interface Agent** — the subagent through which the User actually interfaces; normalizes jagged boundaries into conversational requests. v0.2.1: the vital piece is solid instructional content that lets a fresh Claude instance turn *user input* into *CLI commands*, with expectations and boundaries set.
- **capabilities** — introduction, initialize, retrieve (explore / query / quick reference / overview), add data, remove data, modify, maintain. In v0.2.1: **introduction is deferred**; retrieve = **explore only** (query deferred — with a small KB, context-stuffing makes a straightforward explore agent highly effective); add data accepts plain text only (`.md`, `.txt`); maintain deferred for all of v0.2.
- **methods of search** — v0.2.1: context-window stuffing (sources in full, up to ~900k tokens in theory). v0.2.2: graph search over the provenance graph. Post-v0.2: graph + semantic/vector search.

## Current phase & constraints

**v0.2.1 — walking skeleton (DOING).** A sparse TypeScript program: most entities and capabilities exist but shallow. Source data is already-processed `.md`/`.txt`; entity-boundary compromises are acceptable (remedied in v0.2.2). Done means: the walking-skeleton scenario runs end-to-end and phase-1 test cases pass.

Roadmap position: the walking-skeleton done-criteria are **met** — phase-1 suite green, scenario passing end-to-end. Also landed: the Smart-Interface Agent as a skill, the plugin access path, `--help` and `--verbose`, and the engine's own `config.yml`. Remaining for v0.2.1: a demo knowledge base (Ethan). Epistack submission is ongoing — the Alpha is in, and work continues toward full v0.2.1.

**v0.2.2 — prototype**: robust definitions, error handling, full AI-legible CLI polish (did-you-mean, `intro`, complete `--json` coverage), graph search. Done means phase-2 test cases pass.

## Technical components (v0.2.1)

How scope maps onto code (spec: Technical Specification > Components): **ledger, ingestion, convention, retrieval, synthesis, cli, errors**. Test cases are tagged against these names.

## Repo layout

- `library/` — the DKB Library source (TypeScript); all mechanisms live here.
- `engines/epistack/` — the first engine instantiation; stays thin (CLI title, invocation name, convention seed, model choice, `main()`).
- `testing/` — harness, evals, and run artifacts.
- `skills/dkb/SKILL.md`, `bin/dkb`, `.claude-plugin/` — the Claude Code plugin: the repo installs itself as the Smart-Interface Agent plus the `dkb` command. See `docs/PLUGIN.md`.

## Testing & evaluation

The spec's "Testing & Evaluation" section is authoritative; highlights:

- **Walking-skeleton scenario** — one sequential acceptance eval: `ws-1` init → `ws-2` explore-empty (fails gracefully, tells how to add) → `ws-3` add fixtures → `ws-4` explore (synthesis + correct provenance) → `ws-5` modify (author name) → `ws-6` explore-updated → `ws-grade` rubric-graded transcript for alignment with spec/values. A reusable `assertKBCorrect(expectedSources)` predicate runs between steps.
- **Test inventory** — every case is `label: statement [grader / cadence] (components)`; graders/cadences: logic/every-run, rubric/checkpoint, human/milestone. Use the **"Test Inventory (Claude's Revision)"** section — it re-phases the original inventory: phase 1 (v0.2.1) keeps only what proves the ledger and ingestion subsystems real (durability, round-trip fidelity, non-destructive modify, no-training-data-leakage, human transcript review); AI-legibility polish (intro, help & grammar, did-you-mean, full `--json`, dedup, error-message richness) moves to phase 2 (v0.2.2).
- **Ground rules**: tests/evals invoke the CLI as a subprocess; are immutable once blessed; watch each fail for the right reason; sandboxed and newly initialized — no operations on real KBs; fixtures come from the canonical fixture corpus; mind CRLF/LF and trailing-newline normalization on Windows.
- **Stats to instrument from early on**: agent turns per command, tool calls, token spend, wall-clock time, exit-codes tally.

## Eval harness (built)

`testing/harness/` is the scenario-agnostic eval runtime; **`testing/harness/DESIGN.md` is its authoritative doc — read it before touching evals.** Key contracts:

- The harness runtime bears all Agent-SDK knowledge; eval scripts (in `testing/evals/`) import ONLY from `harness/runtime.ts` — never the SDK directly.
- Run with Bun (e.g. `bun testing/evals/eval_smoke.ts`, or `bun run eval:smoke`). Auth: `CLAUDE_CODE_OAUTH_TOKEN` in repo `.env` (Bun auto-loads it).
- Every run writes artifacts (transcript, summary, stats) to `testing/artifacts/` (gitignored).
- Gates needing exit codes use `ctx.exec()` — the SDK doesn't expose Bash exit codes, and CLI-as-subprocess is the spec-correct approach anyway.

## Repo documents

- **`docs/CONTRACTS.md`** — the concrete interface decisions the spec deliberately
  leaves open (CLI grammar, exit codes, KB schema, artifact formats). The tests
  derive from it. Changing a decision means Ethan's sign-off and a dated amendment
  note at the bottom, never a silent edit.
- **`testing/tests/`** — the phase-1 regression suite (`bun test testing/tests/`).
  If a test looks wrong, consult Ethan; don't edit it to green.
- **`docs/PLUGIN.md`** — how this repo packages itself as a Claude Code plugin,
  with links to the upstream docs the mechanics come from.
- **`docs/PLAYTESTING.md`** — the guide handed to someone trying the system.
- **`docs/archive/`** — superseded process documents, kept for their decision
  records.

## Working conventions for agents

- **Pre-verify functionality, no assumptions** — until the app is mature, always check before relying on a command (e.g. run `--help` first). Small cost, prevents derailing.
- Evals frame: use the `/evaluating-ai-agents` skill's framing (tasks, trials, graders, transcripts, outcomes; capability vs. regression evals; grade what the agent produced, not the path it took; read the transcripts). Test cases derive from the UX flows.
- Ethan is the sole user/designer; consult him for design decisions, proceed autonomously on execution.
