# DKB Library — Durable Knowledge Bases

A TypeScript library for creating knowledge bases that are *durable, scalable,
and intuitive* — multiplying one's capacity to ingest, retrieve, and synthesize
data while preserving nuance. Built AI-first: the CLI is designed for agentic
interaction, and inference is deferred to the time and context of retrieval.

**The spec is the source of truth and lives in Ethan's Logseq graph**, not in
this repo — see `CLAUDE.md` for access details and the project's working
conventions.

**Read it online → [ethan23p.github.io/dkb-library](https://ethan23p.github.io/dkb-library/)**
— the Epistack submission write-up (what this is, why it's built this way, and
how to try it), with the showcase one click away.

**See it working:** [the showcase](https://ethan23p.github.io/dkb-library/showcase/)
(or [in-repo](docs/showcase/)) — the acceptance eval of an agent driving the full
KB lifecycle (init → ingest → retrieve → modify → re-retrieve), graded 5/5/5/5/4
against the project's principles by an independent judge. Best moments up front,
then the full verbatim transcript, then the raw artifacts — one honest failure
included.

## Layout

- `library/` — all mechanisms (ledger, ingestion, retrieval, inference, CLI, …)
- `engines/epistack/` — the first engine instantiation (thin; owns the KB)
- `skills/`, `bin/`, `.claude-plugin/` — the Claude Code plugin (`docs/PLUGIN.md`)
- `docs/CONTRACTS.md` — interface decisions (grammar, exit codes, schemas)
- `testing/` — logic tests, agentic evals, and the eval harness (`testing/harness/DESIGN.md`)

## Using it

The intended interface is a Claude Code plugin — install it and talk to Claude
rather than running commands yourself:

```
/plugin marketplace add Ethan23p/dkb-library
/plugin install dkb@ethan-dkb
```

See [`docs/PLAYTESTING.md`](docs/PLAYTESTING.md) to try it, and
[`docs/PLUGIN.md`](docs/PLUGIN.md) for how the packaging works.

## Developing

Requires [Bun](https://bun.sh). Retrieval's inference needs `CLAUDE_CODE_OAUTH_TOKEN`
(via a gitignored `.env`; Bun auto-loads it).

```sh
bun install
bun test              # phase-1 logic suite (deterministic; one sub-cent inference call)
bun run eval:ws       # walking-skeleton acceptance eval (agentic; costs ~$1)
bun engines/epistack/main.ts --help              # the engine directly
bun engines/epistack/main.ts init --dir <path>
```

Current status: **v0.2.1 walking skeleton — complete** (suite green, scenario
passes end-to-end), now packaged as a plugin. Remaining for v0.2.1: a demo
knowledge base.
