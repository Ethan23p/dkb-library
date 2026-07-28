# CONTRACTS.md — Blessed Interface Decisions (v0.2.1)

> **Status**: blessed 2026-07-19 (Fable + Ethan), amended since — see the bottom.
> Append-only in spirit: changing a decision requires Ethan's sign-off and a dated
> amendment note, never a silent edit. The tests derive from this file. The Logseq
> spec remains the source of truth for *concept*; this file pins the *concrete
> decisions* the spec deliberately leaves open.

## D1 — Invocation & entry point

- Engine entry: `engines/epistack/main.ts`. Canonical invocation:
  `bun engines/epistack/main.ts <command> [args]`.
- Tests/evals resolve the entry from env `DKB_CLI_ENTRY`, defaulting to the path above.
- The *grammar* after the entry point is library-defined; the engine contributes only
  title ("Epistack"), paths, and convention seed.

## D2 — Command grammar (v0.2.1)

```
init                                      # initialize KB in target dir
add-source --json-import <file>           # ingest one source via import JSON
retrieve explore <query>                  # context-stuffed synthesis w/ provenance
modify-entry --id <id> --attribute <a> --value <v>   # metadata modification
```

Global flags (every command):
- `--dir <path>` — target KB directory. Default: cwd.
- `--json` — machine output mode. (Exists in v0.2.1; the strict single-JSON-document
  stdout guarantee is a phase-2 test, `help-4`.)
- `--verbose` — progress notes, **stderr only** (amendment A5).
- `--help` — usage rendered from the capability declarations, exit 0 (amendment A5).

Deferred (v0.2.1): `intro`, `retrieve query`, `remove-entry`, maintain. Unknown
commands/flags → exit 2. Grammar is generated from the library's capability
declarations, not hand-listed (this makes `intro-3` checkable by construction later).

## D3 — Exit-code taxonomy

One enumeration in `library` (errors component); single source of truth (`xcut-1`).

| Code | Name        | Meaning |
|------|-------------|---------|
| 0    | OK          | success |
| 1    | UNEXPECTED  | bug/panic — anything not classified below |
| 2    | USAGE       | unknown command/flag, malformed arguments |
| 3    | STATE       | KB already exists (init), KB missing (other commands) |
| 4    | EMPTY_KB    | retrieve against an initialized-but-empty KB (`ret-1`) |
| 5    | VALIDATION  | missing required metadata, malformed import JSON |
| 6    | NOT_FOUND   | entry id does not resolve |
| 7    | FORBIDDEN   | attempt to modify a privileged attribute (`mod-3`) |
| 8    | AUTH        | no usable inference credential (amendment A3) |

Every non-zero exit's stderr message says **what to do next** (AI-legible requirement).

## D4 — Post-init artifacts (`init-1`)

`init` creates **exactly** these three files in the target dir, nothing else:

```
config.yml        # engine config (title, paths, inference, versions)
kb.sqlite         # the knowledge base — one file (xcut-3)
convention.md     # the convention seed (live best-practices doc)
```

## D5 — KB schema (SQLite, append-only EAV log)

Exactly two tables (plus SQLite internals, which don't count against `xcut-3`):

```sql
CREATE TABLE datoms (
  id    INTEGER PRIMARY KEY,          -- log sequence
  e     INTEGER NOT NULL,             -- entity id
  a     TEXT    NOT NULL,             -- attribute, e.g. 'source/title'
  v     TEXT    NOT NULL,             -- value (TEXT-encoded)
  tx    INTEGER NOT NULL REFERENCES txs(tx),
  added INTEGER NOT NULL CHECK (added IN (0,1))   -- 1 assert, 0 retract
);
CREATE TABLE txs (
  tx INTEGER PRIMARY KEY,             -- monotonic
  ts TEXT NOT NULL                    -- ISO-8601 UTC
);
```

- **No UPDATE or DELETE, ever** — modification = retract (added=0) + assert (added=1)
  in a new tx (`mod-2`). Enforced in code v0.2.1; triggers may harden it later.
- **Current-state view**: for each (e, a), the v from the latest tx whose net effect
  is an assertion (asserted and not subsequently retracted).
- Init writes tx 1: `kb/schema-version = "0.2.1"` on entity 0; then the placeholder
  dance (`init-3`): assert a placeholder entity in tx 2, retract it in tx 3. Post-init:
  valid schema, zero current sources, placeholder datoms present in the log.

## D6 — Source entity model

| Attribute              | Required | Mutable | Notes |
|------------------------|----------|---------|-------|
| `source/content`       | yes      | **never** (`mod-3`) | verbatim, LF-normalized |
| `source/content-hash`  | derived  | **never** | sha256 hex over stored content |
| `source/title`         | yes      | yes | |
| `source/author`        | yes      | yes | |
| `source/origin`        | yes      | yes | URL or path — provenance anchor |
| `source/contributor`   | no       | yes | |
| `source/justification` | no       | yes | |
| `source/date-added`    | derived  | no  | from the ingest tx timestamp |

Entity ids are integers assigned by the engine; CLI output echoes the id on add (`add-1`).

## D7 — add-source import JSON

```json
{
  "content_path": "relative/or/absolute.md",
  "metadata": {
    "title": "…", "author": "…", "origin": "…",
    "contributor": "…", "justification": "…"
  }
}
```

- Exactly one of `content_path` | `content` (inline string).
- Accepted content: plain text (`.md`, `.txt`) — v0.2.1 scope.
- Validation failures (exit 5) name **each** missing/invalid field.
- The input file on disk is never touched (`add-6`).

## D8 — Normalization (the Windows clause)

- Content is stored LF-normalized (CRLF → LF) with trailing newline preserved as-is.
- `content-hash` is computed over the stored (normalized) bytes.
- Round-trip fidelity (`add-2`) means: retrieved content == submitted content after
  both sides are LF-normalized. Tests must normalize before comparing.

## D9 — Explore & inference (⚠ the one decision most worth Ethan's review)

**v0.2.1 explore performs a real inference call** via the Agent SDK (the `synthesis`
component owns this), authenticated by `CLAUDE_CODE_OAUTH_TOKEN` from env — the same
auth path the eval harness already uses. Rationale: the spec defines v0.2.1 explore as
"a call to a subagent consisting of the sources in full + guidance + the query"
(context-stuffing); a purely deterministic dummy would make `ret-3`/`agt-2`/`ws-4`
untestable, and the spec's own Ideation section blesses the OAuth-token path. The
inference handler's *plugin generation* remains deferred to v0.2.2.

- No usable credential → exit 8 (AUTH) with a message explaining how to provide
  it (amendment A3; originally exit 3). Credential resolution order and the
  reason a Claude Code login does not count are amendment A6.
- Explore is strictly read-only over the KB (`ret-2`).
- The model is **not** a library constant: the engine declares it and `init`
  writes it to `config.yml`, which the library reads back (amendment A4).

## D10 — Explore artifact format

In `--json` mode, one document:

```json
{
  "query": "…",
  "coverage": "full" | "partial" | "none",
  "synthesis": "…",                    // empty string when coverage is "none"
  "provenance": [ { "id": 3, "title": "…", "origin": "…" } ]
}
```

- Provenance lists every source the synthesis drew on; ids must resolve in the KB.
- `coverage: "none"` + empty synthesis is the `ret-3` contract: empty in, empty out —
  no training-data answers.
- Empty KB: no artifact at all — exit 4 with guidance toward `add-source` (`ret-1`).

## D11 — Write boundary (`xcut-2`)

The engine writes only within: the `--dir` target, and the OS temp dir. Nothing else —
verified by sandbox snapshot around the walking skeleton.

## D12 — Test-suite mechanics

- Deterministic phase-1 tests: `bun test testing/tests/` — plain `bun:test`, invoking
  the CLI **as a subprocess**, each in a fresh temp sandbox. No SDK, no tokens, except
  the two tests that exercise D9 (`ret-3` marked accordingly).
- Agentic evals: harness-driven (`testing/evals/`), per `testing/harness/DESIGN.md`.
- `assertKBCorrect(dir, expectedSources)` lives in `testing/tests/kb_assert.ts` and is
  imported by both suites — the reusable predicate the spec calls for.
- Tests are immutable once blessed. If one looks wrong, that is a conversation with
  Ethan and an amendment here — never an edit to green.

---
*Amendments:*
- **A1 (2026-07-19, Fable — surfaced by ws-6, ack'd with Ethan's contract green-light)**:
  D10 provenance entries also carry `author`: `{ "id", "title", "author", "origin" }`.
  Required because ws-6 asserts the modified author name is reflected in the next
  explore's provenance.
- **A2 (2026-07-19, informational)**: Ethan corrected the Logseq spec — inference
  handler v0.2.1 is Agent-SDK-only (plugin generation post-v0.2), which makes D9 the
  spec-aligned reading rather than a compromise. No contract text change needed.
- **A3 (2026-07-23, Fable — signed off by Ethan)**: D3 gains exit code **8 (AUTH)**,
  and a missing inference credential moves from 3 to 8. Rationale: exit 3 meant three
  different things (KB already exists, KB missing, no auth token), and `xcut-1` asks
  for one meaning per code. Cheap to fix now, while the surface area is small; an
  agent that sees 8 knows to fix credentials rather than to look for a knowledge base.
- **A4 (2026-07-23, Fable — signed off by Ethan)**: the explore model is an
  *instantiation* decision, not a library constant. The engine declares it
  (`EngineDef.exploreModel`), `init` writes it to `config.yml` under `inference:`,
  and `library/config.ts` reads it back at retrieval time. A missing file or key
  falls back to the library default, so knowledge bases created before the key
  existed keep working.
- **A6 (2026-07-28, Opus — signed off by Ethan)**: the inference credential is
  `CLAUDE_CODE_OAUTH_TOKEN`, minted by `claude setup-token`, and it is the
  *primary supported path* rather than a fallback. Resolution order, first match
  wins: (1) the process environment; (2) a `.env` in the **process cwd**. The
  knowledge-base directory is deliberately not searched — a knowledge base is
  meant to be copied and shared, and a credential inside one would travel with
  it. **Being logged into Claude Code does not satisfy this and cannot be made
  to**: Anthropic does not permit external programs to use `/login` credentials
  (Agent SDK overview), and Claude Code withholds the token from the environment
  of Bash-tool subprocesses, so a token exported in a shell never reaches a CLI
  an agent launches (verified experimentally against a control). Exit 8's
  message must therefore not tell the user to log in. Background, experiments
  and the rejected alternatives: `AUTH-FINDING.md`.
- **A5 (2026-07-23, Fable — signed off by Ethan)**: `--help` and `--verbose` join
  the global flags. Help is rendered from the capability declarations (each command
  declares a runnable `example`), so grammar and documentation cannot drift; it is
  answered before grammar validation and exits 0. Verbose output goes to stderr
  only — stdout stays a clean single document, protecting `--json` and phase-2
  `help-4`. No on-disk log in v0.2.1.
