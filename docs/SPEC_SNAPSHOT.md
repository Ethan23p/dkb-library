# SPEC_SNAPSHOT.md — Read-Only Compilation of the Logseq Spec

> **This is a dated snapshot, not the source of truth.** Compiled 2026-07-19 from the
> Logseq graph (`Logseq-DB-desktop-2`): `[[Durable Knowledge Base Library]]` and
> `[[Durable Epistack KB Engine]]`. If a decision here conflicts with the graph, the
> graph wins — flag the drift and refresh this file. Purpose: give subagents ground
> truth without a Logseq round-trip. Concrete interface decisions live in
> `docs/CONTRACTS.md`, which complements (never contradicts) this snapshot.

## Vision

A TypeScript library for creating knowledge bases that are *durable, scalable, and
intuitive* — multiplying one's capacity to ingest, retrieve, and synthesize data while
preserving nuance. Nuance is preserved by (a) being source-data oriented and
(b) deferring synthesis over source data to the time and context of retrieval.
Guarantees come from preserving source data verbatim, keeping generative content out
of the source-data pipeline, and using AI mechanisms to optimize for the User's
limited attention.

## Guiding values & principles (the rubric for ws-grade / agt-5)

**Concept:**
- **Source Data First** — no generative content qualifies as source data or evidence;
  all inference is grounded solely by first-hand source data. Source fidelity is
  essential (though not byte-level preservation).
- **Just-in-Time Intelligence** — the fatal failure mode of modern AI is
  interpretations over interpretations. Inference is deferred to the time and context
  of retrieval: nuance preserved, modern model used, data up to date.
- **AI as an Interface for Hard Data** — Interface Agents are first-class citizens;
  the system is technically human-usable at a terminal but never will be. AI serves as
  both machinery (processing, interpreting, synthesis) and interface (interpolating
  jagged boundaries, driving a deterministic CLI with high trust) — both irreducible.
- Data-Orientation · Evaluation & Observability · Active Engagement · Crowd-Sourcing Dynamics
- (Under flexible attributes, added 2026-07-19:) attributes can go beyond the strictly
  functional, but **attributes are never declared as part of the source data or
  evidence** — ideally the search agent is separate from the synthesis agent, though
  early versions may simplify this.

**Development:** Durable/Regression-Resistant/Maintainable · Simple & Minimal ·
Moldable & Atomic · Ergonomic · Observable · Test & Evaluation Driven Development.

## Entities (v0.2.1 level)

- **library** (`library/`) — defines all mechanisms in TypeScript.
- **engine** (`engines/epistack/`) — a sparse TS program; owns and drives all
  operations over the KB; consults the inference handler; the CLI is its sole input.
  Stays thin: title, paths, convention seed, `main()`.
- **knowledge base** — SQLite as an append-only transactional log of EAV structure
  (Datomic-style). No UPDATE/DELETE; current state is a view over the log. Operated on
  only by the engine. Attributes form a graph AI can traverse; they are hand-holds for
  search.
- **inference handler** — owns agentic machinery and the contracts for using Agents
  in-program; *generates* dependent code from one place of configuration. v0.2.1
  (spec corrected 2026-07-19): subagents via **Agent-SDK only**, assuming the user is
  logged into Claude Code on the same system; proper feedback if the token is absent.
  Plugin generation is post-v0.2. (= CONTRACTS D9.)
- **convention** — the live, evolving best-practices document around
  attributes/metadata. Not a rigid schema. Divergence over time is expected; source
  data can be re-assessed transparently.
- **interfaces** — CLI (AI-legible: intuitive exit codes, `--json`, errors that say
  what to do next) and Smart-Interface Agent (v0.2.1: strong instructional content
  that turns user input into CLI commands; full subagent in v0.2.2).

## Capabilities (v0.2.1 scope)

| Capability | v0.2.1 status |
|---|---|
| introduction | **deferred** |
| initialize | minimal, non-destructive |
| retrieve explore | **the** retrieval path — context-window stuffing (sources in full + guidance + query to a subagent) |
| retrieve query / quick-reference / overview | deferred |
| add data | plain text only (`.md`, `.txt`); identity forged at ingestion; metadata generated against the convention |
| remove data | thin (in-line with values: history recorded) |
| modify | metadata only; all identity change on record; never touches source content |
| maintain | deferred (all of v0.2) |

Methods of search: v0.2.1 context stuffing (≤ ~900k tokens in theory) → v0.2.2 graph
search over the provenance graph → post-v0.2 graph + semantic/vector.

## Technical components (v0.2.1) and dependencies

```
ledger      (none)                          — the append-only EAV log
ingestion   ledger, convention, errors      — the source-data write path
convention  ledger, errors
retrieval   ledger, synthesis, convention, errors
synthesis   errors                          — the inference seam
cli         ingestion, retrieval, convention, errors
errors      (none)                          — one exit-code enumeration
```

## What "done" means for v0.2.1

1. The walking-skeleton scenario runs end-to-end.
2. Phase-1 test cases pass.

## Walking-skeleton scenario (the acceptance eval)

One sequential eval; `assertKBCorrect(expectedSources)` runs between steps.

- **ws-1 init** — initialize; KB-correct.
- **ws-2 explore-empty** — explore the empty KB; fails gracefully, tells how to add; KB-correct.
- **ws-3 add** — add sources from the fixture corpus; KB-correct.
- **ws-4 explore** — straightforward prompt → synthesized response with correct provenance.
- **ws-5 modify** — modify a source's author name; KB-correct.
- **ws-6 explore-updated** — same prompt → synthesis reflects the modified author.
- **ws-grade** — rubric-graded transcript for alignment with spec and values.

## Phase-1 test inventory (Claude's Revision — the blessed set)

Format: `label`: statement [grader / cadence] (components).

- `init-1`: init in a clean dir exits 0, creates exactly the documented artifacts, nothing else. [logic/every-run] (cli, ledger, convention)
- `init-3`: placeholder dance invisible — valid schema, zero sources; placeholder assert+retract datoms exist in the log. [logic/every-run] (ledger)
- `ret-1`: retrieve on empty KB → distinct documented exit code; message says how to add. [logic/every-run] (errors, retrieval)
- `ret-2`: retrieve is read-only — KB file hash unchanged, including failed retrieves. [logic/every-run] (ledger)
- `ret-3`: explore with zero matching sources reports no coverage, no synthesized answer — empty in, empty out. [logic/every-run] (retrieval, synthesis)
- `add-1`: valid import exits 0, count +1, output echoes assigned id. [logic/every-run] (ingestion, ledger)
- `add-2`: round-trip fidelity — retrieved content character-identical after line-ending normalization. [logic/every-run] (ingestion)
- `add-6`: add-source never modifies the input file. [logic/every-run] (ingestion)
- `mod-1`: metadata modification visible in next retrieve. [logic/every-run] (ledger)
- `mod-2`: non-destructive — prior value recoverable as retracted datom. [logic/every-run] (ledger)
- `xcut-2`: engine writes only within declared directories. [logic/every-run] (all)
- `xcut-3`: KB is one SQLite file with the documented tables, nothing undocumented. [logic/every-run] (ledger)
- `agt-2`: explore doesn't answer from training data when absent from sources. [rubric/checkpoint] (synthesis)
- `agt-5`: Ethan's transcript review for spec/values alignment. [human/milestone]

Phase 2 (v0.2.2) holds everything else: intro-*, help-*, init-2/4/5, add-3/4/5,
mod-3/4, xcut-1, ret-4, agt-1/3/4, p2-1..6. (mod-3's *implementation* — content
immutability — is still a v0.2.1 behavior per CONTRACTS D6; only its polish-grade
error-message test is phase 2.)

## Testing ground rules

- Tests/evals invoke the CLI **as a subprocess**; immutable once blessed; watch each
  fail for the right reason; sandboxed + newly initialized (never real KBs); fixtures
  from the canonical corpus (SABRE/CRS — `testing/fixtures/corpus/`); mind CRLF/LF and
  trailing newlines on Windows.
- Instrument from early on: agent turns per command, tool calls, token spend,
  wall-clock, exit-code tally. (The harness already does this.)

## Engine-specific color (from the Epistack spec)

The UX flows (see `[[Durable Epistack KB Engine]]` > User Experience Flows) convey the
intended texture: users converse with their AI assistant, which invokes the DKB skill,
pre-verifies with `--help` (a standing expectation until the app is mature — "no
assumptions"), and drives the CLI on the user's behalf. Explore returns are given to
the user verbatim. Sources arrive with heavy provenance emphasis: origin URL,
institutions, authors, and the contributor's justification. The head-researcher flows
set the accountability tone: the human researcher remains responsible; the system is a
tool, never the researcher.

## Deadline context

Epistack (FLF competition) submission draft follows v0.2.1; deadline ≈ 2026-07-25.
