# DKB Library — Durable Knowledge Bases

A TypeScript library for creating knowledge bases that are *durable, scalable,
and intuitive* — multiplying one's capacity to ingest, retrieve, and synthesize
data while preserving nuance. Built AI-first: the CLI is designed for agentic
interaction, and inference is deferred to the time and context of retrieval.

**The spec is the source of truth and lives in Ethan's Logseq graph**, not in
this repo — see `CLAUDE.md` for access details and the project's working
conventions. `docs/SPEC_SNAPSHOT.md` is a dated compilation for reference.

**See it working:** [`docs/showcase/`](docs/showcase/) — the acceptance eval
of an agent driving the full KB lifecycle (init → ingest → retrieve → modify →
re-retrieve), graded 5/5/5/5/4 against the project's principles by an
independent judge. Best moments up front, then the full verbatim transcript,
then the raw artifacts — one honest failure included.

## Layout

- `library/` — all mechanisms (ledger, ingestion, retrieval, inference, CLI, …)
- `engines/epistack/` — the first engine instantiation (thin; owns the KB)
- `docs/CONTRACTS.md` — blessed interface decisions (grammar, exit codes, schemas)
- `testing/` — logic tests, agentic evals, and the eval harness (`testing/harness/DESIGN.md`)
- `LOOP.md` — the build-loop state ledger

## Running

Requires [Bun](https://bun.sh). Retrieval's inference needs `CLAUDE_CODE_OAUTH_TOKEN`
(via a gitignored `.env`; Bun auto-loads it).

```sh
bun install
bun test              # phase-1 logic suite (deterministic; one sub-cent inference call)
bun run eval:ws       # walking-skeleton acceptance eval (agentic; costs ~$1)
bun engines/epistack/main.ts init --dir <path>   # try the engine itself
```

Current status: **v0.2.1 walking skeleton — complete** (suite 12/12, scenario
passes end-to-end). See `LOOP.md` for the live task queue.
