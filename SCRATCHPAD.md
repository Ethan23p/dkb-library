# SCRATCHPAD — Rounding out v0.2.1

Responds to the Roadmap notes to Claude (Logseq: Scope › Roadmap › "bridging the
MVI gap" › block 54389). Staging only — nothing here is executed until Ethan
reacts. Acknowledged without further comment: Ethan owns the demo KB (54396).

---

## 1. Take down the engineering-loop scaffolding [54383]

| Artifact | Disposition |
|---|---|
| `CLAUDE.md` build-loop + loop-protocol sections | **Cut** — this is the scaffolding proper. Also drop "the suite IS the project status" framing elsewhere in the file. |
| `LOOP.md` | **Archive** to `docs/archive/LOOP.md`. |
| `docs/CONTRACTS.md` | **Keep as a design reference**; strip the tests-are-immutable/move-code-to-meet-them loop language. |
| `testing/tests/` | **Keep** — ordinary regression suite now, not the loop's oracle. |
| `docs/SPEC_SNAPSHOT.md` | Doesn't exist on disk anymore; just remove references. |

Keep in `CLAUDE.md`: vocabulary, principles, repo layout, Logseq-as-source-of-truth, eval-harness pointer.

**Fable's Recommendation:** archive LOOP.md rather than delete — its decision log
is the only record of *why* several implementation choices were made (the sqlite
`{readwrite:true}` fix, auth-gate ordering).

## 2. Smart-Interface Agent — minimal draft [54386]

Written SKILL.md-shaped on purpose: it doubles as the plugin body in §4, so the
interface agent and the "access path" are one artifact.

````markdown
---
name: dkb
description: >-
  Create, add to, explore, and maintain a Durable Knowledge Base (DKB). Use
  whenever the user wants to build or work on a knowledge base, ingest sources,
  or ask questions answered strictly from their own collected sources with full
  provenance. Triggers: "make a DKB", "add this source", "what do my sources say
  about X", "let's work on the knowledge base".
---

# Durable Knowledge Base — interface guide

You are the interface between a person and their DKB. They should never have to
learn the CLI; you turn what they say into commands, run them, and relay results
in plain language. Absorb any step the CLI would ask *them* to take — ask them
only for what you genuinely need (a file, a title, a confirmation).

## What a DKB is (if asked, briefly)
A durable, append-only store of source data kept verbatim. The system never
treats its own generated text as evidence — every answer is grounded in
first-hand sources and carries provenance. Synthesis happens at retrieval time,
with a current model, so nothing is a stale interpretation of an interpretation.

## Running the CLI
In this repo: `bun engines/epistack/main.ts <command>`; installed as a plugin:
`dkb <command>`. Pre-verify any command you haven't run this session. Add
`--json` when you want to parse the result.

### Commands (v0.2.1)
- `init` — create a KB in the current (or `--dir <path>`) directory. Non-destructive.
- `add-source --json-import <file>` — ingest one source (descriptor shape below).
- `retrieve explore <query…>` — a synthesized answer built only from the sources, with provenance.
- `modify-entry --id <n> --attribute <a> --value <v>` — change one metadata attribute. Never touches source content.

Global flags: `--dir <path>`, `--json`.

### add-source import JSON
```json
{
  "content_path": "path/to/source.md",
  "metadata": {
    "title": "…",            // required
    "author": "…",           // required
    "origin": "…",           // required — URL or path; the provenance anchor
    "contributor": "…",      // optional
    "justification": "…"     // optional — why it counts as evidence
  }
}
```
Use `"content": "…"` instead of `content_path` for pasted text — exactly one of
the two. v0.2.1 accepts `.md`/`.txt` only. Input files are never modified.

## Boundaries — hold these
- **Source-data-first.** Never answer from your own knowledge and present it as
  the KB's. "No coverage" is a correct answer — relay it, don't substitute.
- **Always relay provenance** (id, title, author, origin). An answer without it
  is not a usable answer here.
- **Metadata is not evidence.** Attributes are hand-holds for search.
  `modify-entry` can fix metadata; it cannot touch `source/content`.
- **Ingestion is the user's judgment call.** Outside `.md`/`.txt`, say so and
  offer to convert first, separately.

## Exit codes
0 ok · 1 unexpected · 2 usage · 3 state (KB exists / KB missing / auth absent) ·
4 empty KB · 5 validation · 6 not-found · 7 forbidden. Every failure prints a
`next:` line — follow it.

## Auth
`retrieve explore` needs `CLAUDE_CODE_OAUTH_TOKEN` (free if logged into Claude
Code on this machine). On an auth exit 3, tell the user how to log in.
````

**Fable's Recommendation:** name it `dkb`, not `epistack` — the skill describes
the library pattern and generalizes past this one engine.

## 3. CLI: `--help`, logging, errors [54304 / 54385 / 54390]

**How many commands? Four** (`init`, `add-source`, `retrieve explore`,
`modify-entry`) plus globals `--dir`, `--json`. Already real: `--json` as a
single-document mode, stderr errors with `next:` steps, a clean 0–7 exit enum,
usage lists on unknown/no command.

**Effective additions, minimal:**

1. **`--help`** — today it errors as an unknown flag. Fix: a global no-value flag
   rendering summary + flags + one runnable example from the existing declarative
   `COMMANDS` table in `cli.ts` (add an `example` field), exit 0. The spec names
   `DKB retrieve --help` as the canonical pre-verify (block 53225).
2. **Logging** — keep stdout clean (protects `--json` and phase-2 `help-4`); add
   opt-in `--verbose` writing step notes to stderr only.
   **Fable's Recommendation:** no on-disk log in v0.2.1; stderr + harness stats
   suffice.
3. **Exit-code overload** — exit 3 (`STATE`) currently means KB-exists, KB-missing,
   *and* auth-absent (`inference.ts:40`); phase-2 `xcut-1` wants one meaning per
   code. **Fable's Recommendation:** add `8 AUTH` now — it's the highest-value
   CLI correctness nit and cheap while surface area is small. Requires amending
   CONTRACTS D3, so it needs your sign-off.

Deliberately excluded (phase 2): did-you-mean, `intro`, full `--json` coverage.

## 4. Engine v0.2.1 + config [54372 / 54393 / 54394]

**Thin is correct.** The library owns mechanisms; the engine owns what varies per
instantiation. `main.ts` (37 lines: title, convention seed, wiring) is nearly
right. One misplacement: `EXPLORE_MODEL = "claude-haiku-4-5"` is hardcoded at
`library/inference.ts:21`, but the spec frames the inference handler as one place
of configuration the engine *consults* — model choice is an instantiation
decision.

`config.yml` today (accurate) + proposed addition:

```yaml
title: Epistack
paths:
  kb: kb.sqlite
  convention: convention.md
inference:                          # ← proposed addition
  explore-model: claude-haiku-4-5
versions:
  dkb-library: 1
  kb-schema: 1
```

**Fable's Recommendation:** lift the model into config now — it's the whole
substance of "write the engine v0.2.1," a small change, and it makes the engine
genuinely own its configuration.

## 5. Plugin / skill "access path" [54397 / 54391 / 54398]

Docs checked (`code.claude.com/docs/en/plugins`, `.../skills`). Relevant
mechanics: a plugin is a directory with `.claude-plugin/plugin.json` +
`skills/<name>/SKILL.md`; **`bin/` executables go on the Bash PATH while
enabled**; `claude plugin init` scaffolds a skills-dir plugin that auto-loads
with no install step; `--plugin-dir` for dev.

Your "access path" maps onto a single-skill plugin:

```
dkb-plugin/
├── .claude-plugin/plugin.json   # name: "dkb"
├── skills/dkb/SKILL.md          # ← §2, verbatim
└── bin/dkb                      # wrapper → bun <lib>/engines/epistack/main.ts "$@"
```

The SKILL.md `description` is what stops the "Huh?"; `bin/dkb` lets everything
say `dkb …` instead of a long `bun` path. Prereq to state: Bun on the user's
machine.

**Fable's Recommendation:** pull this into v0.2.1 (CLAUDE.md currently says
deferred; the roadmap lists it under v0.2.1). It's cheap, and it's exactly what
makes the demo "installable into their Claude Code."

## 6. Playtester setup & management steps [54373]

````markdown
# Setting up your Durable Knowledge Base

## One-time setup
1. Have Bun installed and be logged into Claude Code on this machine.
2. From an empty folder: `bun <repo>/engines/epistack/main.ts init`
   → creates `config.yml`, `kb.sqlite`, `convention.md`. Won't overwrite.

## Adding a source
1. Put the source text in a `.md` or `.txt` file.
2. Write an `import.json` next to it:
   ```json
   { "content_path": "my-source.md",
     "metadata": { "title": "…", "author": "…", "origin": "https://… or path" } }
   ```
3. `bun <repo>/engines/epistack/main.ts add-source --json-import import.json`
   → echoes the entry id. Repeat per source.

## Asking questions
`bun <repo>/engines/epistack/main.ts retrieve explore "your question"`
→ an answer built only from your sources, with the sources listed. "Not covered"
is honest — it won't make things up.

## Fixing metadata
`… modify-entry --id <n> --attribute source/author --value "Correct Name"`
→ metadata only; source text is never altered; the old value stays in the log.

## Good to know
- Append-only: nothing is ever deleted; every change is on record.
- `--json` on any command for machine-readable output.
- Every error prints a `next:` line telling you what to do.
````

Once §5 lands, the `bun <repo>/…` invocations collapse to `dkb …`.

## 7. Self-doc scrub [54399 / 54400–54402]

Execute on your nod:
- **agt-5** — remove the pending-review item from LOOP.md, CLAUDE.md, and any
  memory framing it as open.
- **Deadline/timeline** — scrub from CLAUDE.md, LOOP.md, and the
  `dkb-library-project` memory; where context needs it, "submission ongoing
  (Alpha in; iterating toward full v0.2.1)."
- Already fixed: stale graph-name index line (→ `Logseq-DB-Aurelius`).

---

## Suggested order
1. §7 scrub + §1 takedown (repo reads as a product, not a build harness).
2. §2 interface draft → iterate with you.
3. §5 package it + §3 `--help`.
4. §4 config lift.
5. §6 ships with your demo KB.

Decisions needing Ethan (recommendations inline above): LOOP.md archive-vs-delete
· skill name · `8 AUTH` (D3 amendment) · logging depth · model-to-config now ·
plugin packaging into v0.2.1.
