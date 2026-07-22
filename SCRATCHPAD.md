# SCRATCHPAD — Rounding out v0.2.1 (the MVI gap)

Working doc. Responds to the Logseq Roadmap notes to Claude (Scope › Roadmap ›
"bridging the MVI gap" › **block 54389, "Guide for Claude"**, graph
`Logseq-DB-Aurelius`) and stages the WIP artifacts for iteration.

**Nothing here is executed yet.** This is the staging ground — Ethan reads,
reacts, then I land the pieces in follow-ups. The one exception I'd act on
without ceremony is the self-doc scrub (§7), since it's explicitly directed and
low-risk.

Legend: 🟢 drafted, ready to iterate · 🟡 needs an Ethan decision · ⚪ Ethan owns / deferred

---

## 0. The notes, and where each is answered

| Roadmap note | My response | Section |
|---|---|---|
| 54383 — tear down engineering-loop scaffolding | Plan + exact file list; hold for your nod | §1 🟡 |
| 54386 — draft a minimal Smart-Interface Agent | Full first draft below | §2 🟢 |
| 54304/54385/54390 — `--help`, logging, errors; how many commands; effective additions | 4 commands; concrete `--help` proposal; exit-code observation | §3 🟢🟡 |
| 54372/54393/54394 — assess the 0.2.1 engine + config | "Thin is right"; engine shape + `config.yml` draft | §4 🟢🟡 |
| 54397/54391/54398 — plugin/skill "access path"; check the docs | Docs checked; recommend a skills-dir plugin; body = §2 | §5 🟢🟡 |
| 54373 — playtester setup & management steps (you collect sources) | Draft steps below | §6 🟢 |
| 54396 — you're handling the demo KB | Acknowledged | ⚪ |
| 54399 — agt-5 done, remove from self-docs | Scrub list | §7 🟢 |
| 54400/54401/54402 — deadline: don't stress, scrub timeline from self-docs | Scrub list | §7 🟢 |

---

## 1. Take down the engineering-loop scaffolding 🟡 [54383]

The loop was a means, not a monument. What made a fresh instance "think it's in
the loop" is concentrated in a few places. Proposed disposition:

| Artifact | What it is now | Proposed disposition |
|---|---|---|
| `CLAUDE.md` §"Build-loop infrastructure (the orchestrator's lifelines)" + §"Loop protocol" | The amnesiac-orchestrator / reddest-failure / dispatch-subagents framing | **Cut.** This is the scaffolding proper. |
| `LOOP.md` | Orchestrator state ledger (bootstrap read-order, task queue, decision/session logs) | **Retire** → move to `docs/archive/LOOP.md` (history worth keeping; it's the build narrative) rather than delete. |
| `docs/CONTRACTS.md` | "Blessed interface decisions; tests derive from these; implementations move to meet tests" | **Keep, re-frame.** The decisions (grammar, exit codes, schemas) are still true and useful as a design reference. Strip the "tests are immutable, move code to meet them" loop language; keep it as `docs/DECISIONS.md`-style reference. |
| `testing/tests/` | Phase-1 logic suite, framed as "THE project status" | **Keep the tests** (real regression value), **drop the framing.** They become an ordinary test suite, not the loop's oracle. |
| `docs/SPEC_SNAPSHOT.md` | Dated spec compilation for subagent briefs | **Does not exist in `docs/`** (only `CONTRACTS.md` + `showcase/`). Already gone or never committed — nothing to do beyond removing references to it. |

Also scrub the loop vocabulary from `CLAUDE.md`'s "Working conventions" and
"Technical components" only where it says "test cases are tagged," "the suite IS
the project status," etc. Keep: vocabulary, core principles, repo layout, the
Logseq-as-source-of-truth rule, the eval-harness pointer.

**Open question 🟡:** delete vs. archive `LOOP.md`? I lean archive — the decision
log is the only record of *why* several implementation choices were made
(e.g. the `{readwrite:true}` sqlite fix, the auth-gate ordering). Your call.

---

## 2. Smart-Interface Agent — minimal draft 🟢 [54386]

Design intent: this is the one first-class entity with zero implementation, and
its v0.2.1 job is *"solid instructional content that lets a fresh Claude turn
user input into CLI commands, with expectations and boundaries."* I've written it
**SKILL.md-shaped on purpose** — it doubles as the body of the plugin/skill in §5,
so the "access path" and the interface agent are the same artifact.

Draft below (fenced so we can iterate on wording without it being live yet):

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

You are the interface between a person and their DKB. The person should never
have to learn the CLI; you turn what they say into commands, run them, and relay
results in plain language. You also absorb any step the CLI would ask *them* to
take and instead ask *them* only for what you genuinely need (a file, a title, a
confirmation).

## What a DKB is (say this if they ask, briefly)
A durable, append-only store of **source data kept verbatim**. The system never
treats its own generated text as evidence — every answer is grounded in
first-hand sources and carries provenance. Synthesis happens *at retrieval time*,
with a current model, so nuance is preserved and nothing is a stale interpretation
of an interpretation.

## Running the CLI
The engine is a CLI. Invoke it as `<run> <command> …`. In this repo that's
`bun engines/epistack/main.ts <command>`; when installed as a plugin it's on your
PATH as `dkb <command>`. **Pre-verify before relying on a command you haven't run
this session** — a quick `--help` (once implemented) or a dry read of this guide.
Add `--json` to any command when you want to parse the result instead of reading prose.

### Commands (v0.2.1)
- `init` — create a new KB in the current (or `--dir <path>`) directory. Non-destructive; refuses if one exists.
- `add-source --json-import <file>` — ingest one source. `<file>` is a small JSON descriptor (shape below). One source per call.
- `retrieve explore <query…>` — ask a question; get a synthesized answer built only from the sources, with provenance.
- `modify-entry --id <n> --attribute <a> --value <v>` — change one metadata attribute of an entry (e.g. fix an author). Never touches source content.

Global flags: `--dir <path>` (target KB dir), `--json` (machine-readable output).

### add-source import JSON
```json
{
  "content_path": "relative/or/absolute/path.md",
  "metadata": {
    "title": "…",            // required
    "author": "…",           // required
    "origin": "…",           // required — the URL or path; the provenance anchor
    "contributor": "…",      // optional — who brought it in
    "justification": "…"     // optional — why it counts as evidence
  }
}
```
Use `"content": "…inline text…"` instead of `content_path` for pasted text.
Exactly one of the two. v0.2.1 accepts `.md`/`.txt` only. The original file on
disk is never modified.

## Boundaries — hold these
- **Source-data-first.** Never answer from your own knowledge and present it as
  the KB's. If `retrieve explore` reports no coverage, relay *that* — do not
  substitute what you happen to know. "Empty in, empty out" is correct behavior,
  not a failure to paper over.
- **Always relay provenance.** When you pass along an explore result, include the
  cited sources (id, title, author, origin). An answer without provenance is not
  a usable answer here.
- **Metadata is not evidence.** Attributes/metadata are hand-holds for search;
  they are never part of the source data. `modify-entry` can fix metadata; it
  cannot touch `source/content`.
- **Ingestion is the user's judgment call.** This system doesn't magically
  process arbitrary inputs. If they hand you something outside `.md`/`.txt`, say
  so plainly and offer to help convert it *first*, separately.

## Reading exit codes (so you can self-correct, not just report failure)
0 ok · 1 unexpected bug · 2 usage (bad command/flag) · 3 state (KB already exists,
or KB missing, or auth token absent) · 4 empty KB (nothing added yet) · 5
validation (bad/missing metadata or malformed import JSON) · 6 not-found (bad id)
· 7 forbidden (tried to modify a privileged attribute). Every failure prints a
`next:` line — follow it.

## Auth
`retrieve explore` runs a real subagent and needs `CLAUDE_CODE_OAUTH_TOKEN` in the
environment (you get this free if the user is logged into Claude Code on this
machine). If exit 3 mentions auth, tell them how to log in rather than failing silently.
````

**Notes for iteration:**
- The exit-3 overload (state *and* auth) is real (see §3) — the guide papers over
  it verbally, but it'd read cleaner if auth had its own code.
- Undecided 🟡: name the skill `dkb` (generic, library-level) or `epistack`
  (this engine)? I lean `dkb` so it generalizes past this one engine.

---

## 3. CLI: `--help`, logging, errors 🟢🟡 [54304 / 54385 / 54390]

**How many commands? → Four**, all implemented, plus two global flags:

| Command | Flags | Purpose |
|---|---|---|
| `init` | (globals only) | initialize a KB in the target dir |
| `add-source` | `--json-import <file>` | ingest one source via import JSON |
| `retrieve explore` | (globals only) | context-stuffed synthesis with provenance |
| `modify-entry` | `--id`, `--attribute`, `--value` | modify one metadata attribute |
| *global* | `--dir <path>`, `--json` | valid on every command |

**What exists today:** `--json` is a real single-document output mode on every
command ✅. Errors go to stderr with a `next:` step and a clean 0–7 exit-code
enumeration ✅. No-command and unknown-command already print the usage list ✅.

**What's missing / the minimal additions:**

1. **`--help` (the named gap).** Today `<command> --help` errors as an unknown
   flag (exit 2). Minimal fix: treat `--help` as a global no-value flag that, for
   any command, prints that command's summary + flags + one runnable example,
   exit 0. Cheap because the grammar is already declarative data in
   `cli.ts` (`COMMANDS`) — `--help` renders from the same table, no per-command
   branching. The spec even names `DKB retrieve --help` as the canonical
   pre-verify example (Interfaces › CLI, block 53225), so this closes a
   spec-referenced hole.
   - Suggested example strings live next to each `CommandDecl` (add an `example`
     field to the table).
2. **Bare `<command>` with no `--help`** (e.g. `retrieve` alone) already errors
   usefully; leave it.
3. **Logging 🟡.** The spec asks for "at least minimal logging." The harness
   already captures the stats that matter (turns, tool calls, tokens, wall-clock,
   exit tally) *externally*. Proposal: keep the engine quiet on stdout (so `--json`
   stays a clean single document — future phase-2 test `help-4`), and add an
   opt-in `--verbose` that writes step notes to **stderr** only. Minimal, and it
   doesn't pollute the parseable channel. Open Q: do you want any on-disk log, or
   is stderr + harness stats enough for v0.2.1? I lean "enough."
4. **Effective addition worth flagging 🟡 — exit-code overload.** Exit `3`
   (`STATE`) currently means three distinct things: KB-already-exists (init),
   KB-missing (other commands), *and* auth-token-absent (`inference.ts:40`). The
   eventual phase-2 test `xcut-1` wants each non-zero code to mean exactly one
   thing. Cleanest fix: give auth its own code (e.g. `8 AUTH`). **This edits the
   blessed exit-code taxonomy (CONTRACTS D3) → your sign-off.** Not required for
   v0.2.1 to be "done," but it's the single highest-value CLI correctness nit.

Scope note: full help/grammar polish (did-you-mean, `intro`, complete `--json`
coverage) is explicitly phase-2 per the test inventory. This section is *minimal*
on purpose — just `--help` + a quiet `--verbose`, and a flag on the exit-code nit.

---

## 4. Engine v0.2.1 + config 🟢🟡 [54372 / 54393 / 54394]

**Assessment: thin is correct.** The library owns every mechanism by design; the
engine is the instantiation. So a "full 0.2.1 engine" isn't *more code* — it's the
engine owning exactly the things that vary per instantiation, and nothing else.
Today `engines/epistack/main.ts` (37 lines) owns: title, convention seed, and
`main()` wiring. That's nearly right. The one design question worth resolving:

**What should the engine own that the library currently hardcodes?**
- `EXPLORE_MODEL = "claude-haiku-4-5"` lives in `library/inference.ts:21`. The
  spec frames the inference handler as *"one place of configuration"* the engine
  *consults*. So the model choice is arguably an **instantiation decision** that
  belongs to the engine (via config), not baked into the library. 🟡
- Proposal: the engine passes an inference config into the library; `config.yml`
  surfaces it so it's inspectable and swappable without touching library code.

**`config.yml` — what it looks like.** Today `init` writes (accurate):
```yaml
# Epistack — engine configuration (generated by init)
title: Epistack
paths:
  kb: kb.sqlite
  convention: convention.md
versions:
  dkb-library: 1
  kb-schema: 1
```
Proposed v0.2.1 shape (adds the inference block; everything else unchanged):
```yaml
title: Epistack
paths:
  kb: kb.sqlite
  convention: convention.md
inference:
  explore-model: claude-haiku-4-5   # the model behind `retrieve explore`
  # auth: CLAUDE_CODE_OAUTH_TOKEN from env (Agent-SDK, v0.2.1)
versions:
  dkb-library: 1
  kb-schema: 1
```
So the "full 0.2.1 engine" = `main.ts` (title + convention seed + inference
defaults + `runCli`) **+** `config.yml` as the readable surface of those choices.
Small, but it makes the engine genuinely *own its configuration* instead of the
library holding the model constant. 🟡 Confirm you want the model lifted to config
in v0.2.1 (vs. leaving it in the library until v0.2.2).

---

## 5. Plugin / skill "access path" 🟢🟡 [54397 / 54391 / 54398]

Checked the docs (`code.claude.com/docs/en/plugins`, `.../skills`). Findings that
matter for us:

- **Skills** = a `SKILL.md` (frontmatter `description` → Claude auto-invokes when
  relevant; `disable-model-invocation: true` makes it explicit-only). Live in
  `.claude/skills/<name>/` (project) or `~/.claude/skills/` (personal). Supporting
  files (scripts, the CLI) can sit in the skill dir.
- **Plugins** = a directory with `.claude-plugin/plugin.json` (name, description,
  version, author) + `skills/`, `agents/`, and notably **`bin/` — executables put
  on the Bash `PATH` while the plugin is enabled.** Installed via `--plugin-dir
  ./path` (dev), `--plugin-url <zip>`, or a marketplace. `claude plugin init`
  scaffolds a **skills-directory plugin** that auto-loads from `~/.claude/skills/`
  with no install step.

**The "access path" you described** — *"a way to install it + slight guidance so
that if someone says 'let's work on a DKB', Claude doesn't say 'Huh?'"* — maps
cleanly onto a **single-skill plugin**:

```
dkb-plugin/
├── .claude-plugin/plugin.json     # name: "dkb", description, version
├── skills/dkb/SKILL.md            # ← the §2 interface guide, verbatim
└── bin/dkb                        # tiny wrapper → `bun <lib>/engines/epistack/main.ts "$@"`
```
- The `SKILL.md` `description` is what stops the "Huh?" — it triggers on "make a
  DKB / add this source / what do my sources say…".
- `bin/dkb` puts the CLI on PATH so the skill body can say `dkb explore …`
  instead of a long `bun …` path.
- Ship it as a skills-dir plugin (`claude plugin init dkb`) for zero-friction
  local use; a marketplace entry is a post-v0.2 nicety.

🟡 Decisions: (a) skill/plugin name `dkb` vs `epistack` (see §2); (b) `bin/dkb`
wrapper assumes Bun on the user's machine — fine for a playtester, worth stating
as a prereq. (c) Scope tension to settle: CLAUDE.md currently says "plugin
deferred" for v0.2.1, but the roadmap lists packaging *under* v0.2.1. This
skill-wrapper is cheap and is exactly what makes the demo "installable into their
Claude Code" — I recommend pulling it *into* v0.2.1. Your call.

---

## 6. Playtester setup & management steps 🟢 [54373]

You collect the sources (⚪ 54396); here's the "hand this to a playtester" draft.
Assumes Bun installed and logged into Claude Code on the same machine.

````markdown
# Setting up your Durable Knowledge Base (playtester guide)

## One-time setup
1. Have Bun installed and be logged into Claude Code on this machine
   (that's what authorizes the explore step — no API key needed).
2. From an empty folder where you want the KB to live, initialize it:
   `bun <repo>/engines/epistack/main.ts init`
   → creates `config.yml`, `kb.sqlite`, `convention.md`. It won't overwrite an
   existing KB.

## Adding a source
1. Put the source text in a `.md` or `.txt` file.
2. Write a small `import.json` next to it:
   ```json
   { "content_path": "my-source.md",
     "metadata": { "title": "…", "author": "…", "origin": "https://… or path" } }
   ```
   (`origin` is the link back to where it came from — always include it.)
3. `bun <repo>/engines/epistack/main.ts add-source --json-import import.json`
   → echoes the entry id. Repeat per source.

## Asking questions
`bun <repo>/engines/epistack/main.ts retrieve explore "your question"`
→ a synthesized answer built *only* from your sources, with the sources it used
listed. If it says the KB doesn't cover something, that's honest — it won't make
things up.

## Fixing metadata
`… modify-entry --id <n> --attribute source/author --value "Correct Name"`
→ changes metadata only; the original source text is never altered, and the old
value stays recoverable in the log.

## Good to know
- Nothing is ever deleted — the KB is append-only, so every change is on record.
- Add `--json` to any command for machine-readable output.
- Every error prints a `next:` line telling you what to do.
````

Once the skill/plugin (§5) lands, all the `bun <repo>/…` invocations collapse to
`dkb …` and most of this becomes "just talk to Claude" — but the explicit CLI
steps are the right playtester fallback and prove the path works.

---

## 7. Housekeeping — self-doc scrub 🟢 [54399 / 54400–54402]

Directed and low-risk; I'll execute these on your nod (or now, if you say go):

- **agt-5 [54399]** — you've reviewed the transcript, it's fine. Remove the "open
  agt-5 / human transcript review" item from: `LOOP.md` task queue, `CLAUDE.md`
  Testing section (the `agt-5` human-milestone mention), and any memory note that
  frames it as pending.
- **Deadline / timeline [54401]** — scrub all timeline/deadline/schedule mentions
  from self-docs: `CLAUDE.md` ("Epistack deadline ~Jul 25 2026" in the phase
  block), `LOOP.md` (task-queue deadline refs), and the `dkb-library-project`
  memory ("Epistack deadline ~Jul 25 2026"). Replace with a neutral "submission is
  ongoing (Alpha in; iterating toward beta / full v0.2.1)" where context needs it,
  per 54402.
- Already fixed this session: the stale graph-name index line (`Logseq-DB-desktop-2`
  → `Logseq-DB-Aurelius`).

---

## Suggested order once you've reacted
1. Land §7 scrub + §1 takedown (clears the loop framing so the repo reads as a
   product, not a build harness).
2. §2 Smart-Interface draft → iterate wording with you.
3. §5 wrap it as the skill/plugin (body = §2), + §3 `--help`.
4. §4 config/model decision (small).
5. §6 goes out with your demo KB.

Open decisions collected for you: **§1** archive-vs-delete LOOP.md · **§2/§5**
name `dkb` vs `epistack` · **§3** exit-code 3 overload (D3 change) + logging depth
· **§4** lift `explore-model` to config now? · **§5** pull plugin packaging into
v0.2.1?
