# SCRATCHPAD — Demo knowledge base as a second plugin

Working plan **and live status**. Written 2026-07-27, branch
`worktree-demo-kb-plugin`. Delete or archive before merge — `CLAUDE.md` has a
matching conditional section that goes away with it.

---

## STATUS — read this first

> **Resume pointer:** Stage 1 **complete and committed**. Stage 2 is blocked on
> one decision from Ethan: the measured cost of an LHC explore is **~$1.30**,
> not the sub-dollar figure D2b assumed. See "Open decision: LHC demo cost"
> below — do not write the Stage 2 notice wording until it is settled.

If you are a fresh instance picking this up: the decisions below are **settled
and signed off** — do not relitigate them, execute them. Work one stage at a
time, in order. After each stage, update the ledger below *and* the resume
pointer above, then check in with Ethan if the stage is marked ✋.

| Stage | State | Notes |
|---|---|---|
| 0 — Plan & decisions | ✅ done | Decisions recorded below; open questions all resolved 2026-07-27 |
| 0b — Pre-tweaks | ✅ done | Default explore model Haiku 4.5 → **Sonnet 5** (`library/config.ts`, `engines/epistack/main.ts`); `claude-api` skill banned in `CLAUDE.md`; this status block added |
| 1 — Skeleton + `demo/build.ts` | ✅ done | Both KBs built, hash-verified, committed. Suite green (12/12). Cost measured — see open decision |
| 2 — Hydration + switching UX ✋ | 🚧 blocked | needs the LHC-cost decision first; still checks in with Ethan at the end |
| 3 — Skill-level default wiring | ⬜ not started | |
| 4 — Documentation sweep | ⬜ not started | |
| 5 — Verification via harness ✋ | ⬜ not started | ends with Ethan's manual marketplace-install eyeball |

**Ledger conventions.** One line per stage, appended under "Execution log" at
the bottom as each completes: what was built, what was verified, anything
surprising. Do not rewrite history there — append. If a decision has to change
mid-flight, say so explicitly in the log and flag it to Ethan; the decisions
above stay as written so the divergence is visible.

---

## The ask

Judges (and playtesters) currently install the `dkb` plugin and are handed an
empty system. FLF's appendices tell judges: *"Run it, don't just read it"* and
ask for a *"~one-click runnable demo (fresh machine to running process in ~5
min)"*. An empty KB is not a demo — nobody is going to assemble their own corpus
before forming an opinion.

So: ship a second, installable plugin carrying **pre-ingested demo knowledge
bases** — LHC micro-black-hole risk (default) and SABRE airline reservations
(the switchable second) — and update the docs to route people through it.

## What exists already (verified, not assumed)

- A KB is just a **directory** holding three artifacts: `config.yml`,
  `kb.sqlite`, `convention.md`. `library/init.ts` writes exactly those.
- The CLI has **no notion of a default or registered KB**. `--dir` resolves
  against cwd; absent it, cwd *is* the KB (`library/cli.ts:204-209`).
- Two corpora exist as source `.md` + `.import.json` sidecars:
  - `testing/fixtures/corpus-lhc/` — 5 sources, ~74k words (~100k tokens).
    Giddings–Mangano, LSAG report, Jaffe (RHIC), Koch–Bleicher, Ord. Plus a
    `flf-appendices` entry that lives in `docs/` now, not the corpus.
  - `testing/fixtures/corpus/` — 5 sources, ~5k words. SABRE/SAGE. This is the
    canonical fixture corpus; **the phase-1 test suite and the walking-skeleton
    eval read both directories directly** (`testing/tests/helpers.ts:16`,
    `testing/evals/eval_walking_skeleton.ts:17`). They must not move.
- `docs/PLUGIN.md` states plainly: **the plugin root is ephemeral — never write
  state there.** Any design that has the user's corrections landing inside an
  installed plugin directory is wrong and will silently lose their work on the
  next `/plugin update`.

## Design decisions (the two that actually matter)

### D1 — How the demo KB gets to the user: hydrate, don't operate in place

The demo plugin ships the corpus and a **hydrate** step that materializes a real
KB into a user-owned directory. The user's `modify-entry` calls and additions
then land in *their* directory and survive plugin updates.

**DECIDED: hydrate into the user's cwd** (`./demo-lhc/`, `./demo-saber/`), not a
hidden `~/.dkb/`. The KB is then visible in front of them — they can open
`convention.md`, see `kb.sqlite` exist, watch the directory be a real thing. The
agent must say where it landed and that it belongs to them; the demo skill
carries that as an operational note, and PLAYTESTING.md states it in prose.

What the demo plugin ships is **only the three generated artifacts per corpus** —
`demo/kbs/lhc/{config.yml,kb.sqlite,convention.md}` and the same for `saber`.
Hydration is a directory copy: instant, byte-identical, no inference, no
Bun-side work. That is what makes "~5 min on a fresh machine" trivially true.

**No fixture duplication.** The source `.md` + `.import.json` files are **not**
copied into `demo/`. `demo/build.ts` reads them in place from
`testing/fixtures/corpus-lhc/` and `testing/fixtures/corpus/`, which already
ship with the repo (and therefore with the root plugin, since its `source` is
`"./"`). The only new bytes on disk are the two `kb.sqlite` files, which are
genuinely new information. Content is verbatim inside the ledger either way, so
a second copy of the markdown would buy nothing.

The prebuilt `kb.sqlite` is a **build artifact checked into the repo**, produced
by `demo/build.ts` so it is reproducible rather than mysterious. Ingest
timestamps land in the ledger; that is fine and honest.

**`demo/build.ts` is developer-facing, not playtester-facing** — see the
clarifications section near the bottom.

### D2 — What "the primary plugin defaults to the LHC KB" means mechanically

There is no global config to hold a default, so the default has to live
somewhere. Options considered:

- **(a) Skill-level default.** The `dkb` skill learns: "if the user has the demo
  installed and isn't in a KB directory, the demo KB at `~/.dkb/demo-lhc` is the
  one they mean; pass `--dir`." Zero code change, zero contract change. Weakness:
  it is instruction, not enforcement — a fresh agent could ignore it.
- **(b) `DKB_DIR` environment fallback in `parseArgs`.** ~4 lines: `--dir` wins,
  else `$DKB_DIR`, else cwd. Deterministic, testable, and gives "switch to
  SABER" a crisp meaning. But it **changes CLI grammar → `docs/CONTRACTS.md`
  amendment → needs Ethan's sign-off** (per CLAUDE.md, never a silent edit).
- **(c) Point `--dir` at the plugin root.** Rejected — violates the ephemerality
  rule in `docs/PLUGIN.md`; user corrections would be destroyed on update.

**DECIDED (Ethan, 2026-07-27): (a), skill level. No CLI change, no CONTRACTS
amendment.** The `dkb` skill gains a *Playtesting context* section framing the
tool as currently serving playtesters: they will almost certainly be operating
against a demo KB rather than a bare tool, so the agent should establish which
KB is in play before doing anything, and default to the LHC one.

### D2b — The demo KBs run on Opus 5, and say so before spending

**DECIDED (Ethan):** buy performance during the demo at the cost of well under a
dollar of the judge's usage. The lever is already in the right place —
`explore-model` lives in each KB's own `config.yml` and is read at retrieval
(`library/config.ts:25`), so **`demo/build.ts` writes `claude-opus-5` into the
demo KBs' configs while the Epistack engine default stays `claude-sonnet-5`.**
No library change, no engine change; it reads as exactly what it is — a per-KB
instantiation decision.

The user is told before it happens. Wording to be finalized in Stage 1 against
**verified** Opus 5 pricing — do not estimate, and **do not use the `claude-api`
skill (currently fatally bugged)**; use the `claude-code-guide` agent or web
search. Shaped like:

> Heads up: exploring this KB reads all five papers in full — about 100k tokens
> in one agent call, several times a typical Claude Code turn — and runs on Opus
> 5 for answer quality. It bills through your own Claude Code, roughly $X of
> API-equivalent usage. Say the word and I'll run it.

Placement: the demo skill instructs the agent to say this before the *first*
explore of a session (not every one — that becomes noise), and `dkb-demo use`
prints it once at hydration time. Noted risk: someone driving the demo KB
through the *primary* skill alone bypasses the notice. Acceptable — the
`config.yml` is right there and the cost is sub-dollar.

### D3 — Where the second plugin lives

Same repo, new subdirectory `demo/`, added as a second entry in the existing
`.claude-plugin/marketplace.json` (`source: "./demo"`). One marketplace add, two
installs. No second repo to keep in sync.

Caveat worth naming: the primary plugin's `source` is `"./"`, i.e. **the whole
repo already ships the corpora today**, and would also ship `demo/`. The second
plugin is therefore about *presentation and an explicit opt-in*, not about
withholding bytes — unless we also decide to trim what the root plugin carries
(possible via marketplace `source` config; not planned for this pass).

## Stages

Each stage is independently reviewable; I check in between them where marked.

### Stage 1 — Skeleton + build script
- `demo/.claude-plugin/plugin.json` (`name: dkb-demo`, version `0.2.1`).
- `demo/build.ts` — for each corpus: init a temp KB, add every source via the
  existing `.import.json` sidecars, verify entry count + content hashes, then
  write the three artifacts into `demo/kbs/<name>/`.
- Run it; commit the generated `demo/kbs/lhc/` and `demo/kbs/saber/`.
- Sanity: `dkb --dir demo/kbs/lhc retrieve explore "..."` returns a grounded
  answer with provenance. (One real inference call — Opus 5 over ~100k tokens;
  this is the measurement that sets the notice's cost wording.)

### Stage 2 — Hydration + switching UX
- `demo/bin/dkb-demo` (bash, mirroring `bin/dkb`'s shape and error style):
  - `dkb-demo list` — the available demo KBs, one line each.
  - `dkb-demo use <lhc|saber> [--dir <path>]` — copy into `./demo-<name>/` under
    the user's cwd (refuse rather than overwrite; `--force` to re-copy), print
    the resulting path, the Opus-5/token notice, and the exact next command.
  - `dkb-demo path <name>` — print the hydrated path, for the agent to feed to
    `--dir`.
  - Same exit-code vocabulary as `dkb` (0/2/3), `error:` + `next:` lines.
- `demo/skills/dkb-demo/SKILL.md` — the interface guide: what each corpus is,
  which questions make the system look like itself (and which expose its
  limits), how to switch, and the hard rule that the demo KB is the user's copy.
  Includes the **offer-both** framing Ethan sketched: open on LHC by default,
  but name SABRE as the alternative in a way that makes it sound worth trying —
  the sociology of one of the first companies to put computers in front of
  ordinary hourly employees for massive efficiency gains.
- Register the plugin in `.claude-plugin/marketplace.json`.

**→ check in with Ethan here** (UX shape and corpus blurbs before docs harden).

### Stage 3 — Default-KB wiring (skill layer only)
- Add a **Playtesting context** section to `skills/dkb/SKILL.md`: this plugin is
  currently serving playtesters and judges, not being handed over as a bare
  tool; assume a demo KB is in play, establish which one first, default to LHC,
  mention SABRE as switchable, and carry the Opus-5/token notice.
- No `library/cli.ts` change, no `CONTRACTS.md` amendment. (Written down so a
  later reader knows it was considered and declined, not overlooked.)

### Stage 4 — Documentation sweep
- `docs/PLAYTESTING.md` — restructure around the demo: install both plugins,
  ask a question within a minute, *then* the "bring your own source" path.
  Include 3–5 seed questions with what a good answer looks like.
- `README.md` — install block gains the demo line; status line updated
  ("remaining: a demo knowledge base" is then done).
- `docs/index.md` (the published write-up) — the install/try section, matching
  the judges' path in the appendices.
- `docs/PLUGIN.md` — a section on the two-plugin layout, hydration, and *why*
  state never lives in a plugin root.
- `demo/README.md` — short; what the corpora are, how to rebuild them.
- Check `docs/showcase/` and `engines/epistack/README.md` for stale claims.

### Stage 5 — Verification, via the harness

**The harness can do the rehearsal.** Checked rather than assumed:
`testing/harness/DESIGN.md:118` records that the SDK's `Options` accepts
`plugins` (and `skills`), noted at the time as "available later for v0.2.2
plugin-interface evals". `runtime.ts:109-117` does not plumb it through yet —
that is **one optional field in `types.ts` and one line in `runtime.ts`**. The
sandbox is already a fresh temp dir used as the session cwd, and
`settingSources: []` already isolates from Ethan's own config, which is exactly
the fresh-machine property we want.

So: `testing/evals/eval_demo.ts` — a real playtester rehearsal, automated.

- Runtime change: `agent.plugins?: string[]` → SDK `plugins`, pointing at the
  local `demo/` and repo-root plugin dirs.
- Scripted turns as a naive judge would type them: *"I just installed this —
  what can I do?"* → *"What do my sources say about whether the LHC could
  produce a dangerous black hole?"* → *"Actually, show me the other one."*
- Gates: the demo KB materialized **in the sandbox cwd** (not the plugin dir);
  the answer carries entry ids + origins; no source content was mutated; the
  Opus-5 notice appeared before the first explore; wall-clock recorded against
  the ~5-minute budget.
- The agent gets **no system-prompt preamble about the CLI** — the whole point
  is testing whether the shipped skills carry it. That is a stronger test than
  the walking-skeleton eval, which primes the agent.

**What the harness genuinely cannot cover:** `/plugin marketplace add` and
`/plugin install` are Claude Code slash commands, not SDK surface. So this
rehearses everything *after* install. That residue is two documented commands,
and it is the part **Ethan should eyeball manually** — a real
`/plugin marketplace add` from GitHub in a scratch directory, once, at the end.
I'll flag when it's ready and say exactly what to look for.

Also in this stage:
- `bun test testing/tests/` still green (fixtures untouched — expected no-op,
  but prove it).
- `claude plugin validate` on both plugin roots.
- Commit, push, draft PR.

## Risks / things I expect to bite

- **Context size.** LHC is ~100k tokens stuffed whole, now into Opus 5. Fits
  comfortably; costs more and takes longer than SABRE's ~7k. LHC stays the
  default (Ethan, decided). Measure real latency in Stage 1 — if a first
  question takes long enough to read as broken, the fix is *feedback*, not a
  smaller corpus: the notice tells them it's a big read, and `--verbose` exists.
  Trimming Giddings–Mangano's own appendices (it is 35.7k of the 74k words) is
  the last-resort lever, and I'd rather not — cutting a source's tail to make a
  demo faster is exactly the "source at source fidelity" compromise the project
  is built to refuse.
  *(Note: that paper's internal appendices are a separate thing from
  `docs/flf-appendices.md`, the competition's administrative doc — the latter is
  excluded from the demo KB per the scope check, which is settled.)*
- **SQLite portability.** `kb.sqlite` is a binary in git; needs a `.gitattributes`
  entry so it is never touched by CRLF normalization. Verify it opens on a
  fresh clone.
- **Bash portability.** `bin/dkb` is bash and the demo wrapper must be too —
  Claude Code's Bash tool provides bash on every platform, so this is a
  cross-platform choice, not a Windows one. Must handle spaces in paths, since
  the *development* checkout lives under `E:\Hume General\`. Nothing in the
  design is Windows-specific; see clarifications.
- **Naming.** `dkb-demo@ethan-dkb` is public-facing and permanent once installed
  (per PLUGIN.md). Decide the name deliberately in Stage 1.

## Resolved (Ethan, 2026-07-27)

1. **Default-KB mechanism** — skill level (D2a). No CLI change, no CONTRACTS
   amendment.
2. **Default corpus** — LHC, with SABRE offered as a named, appealing
   alternative rather than a footnote.
3. **Hydration target** — the user's cwd, stated plainly to them.
4. **Plugin name** — `dkb-demo@ethan-dkb` (existing marketplace, second entry).
5. **`flf-appendices`** — excluded from the demo KB.
6. **Model** — Opus 5 for the demo KBs via their own `config.yml`, with an
   up-front cost/size notice (D2b).
7. **Stage 5** — automated via the harness with a small `plugins` pass-through;
   the marketplace-install step stays a one-time manual eyeball by Ethan.

Nothing outstanding. Awaiting the green light to start Stage 1.

## Open decision: LHC demo cost (raised 2026-07-27, Stage 1)

D2b was written on an estimate — "well under a dollar", Ethan's sketch said
~$0.30. **Measured, it is ~$1.30 per LHC question.** The numbers below are read
off the Agent SDK's own `total_cost_usd` and `usage`, not derived:

| KB | Input tokens | Output | Wall clock | Cost/question |
|---|---|---|---|---|
| **lhc** (5 sources, 74k words) | 186,915 | 2.4k–4.5k | 38–62 s | **$1.30** |
| **saber** (5 sources, 5.3k words) | 11,549 | 1.3k | 21 s | **$0.10** |

Two things drive it beyond the estimate:

1. **The corpus tokenizes denser than a word-count suggests.** 74k words →
   187k tokens, not the ~100k the plan assumed. Claude 4.7+ models use a newer
   tokenizer that produces ~30% more tokens for the same text (verified on the
   pricing docs), and academic papers with heavy math and notation are worse
   than prose.
2. **Every call pays a cache-*write* premium for a cache nobody reads.** The SDK
   writes the whole stuffed context as a 1-hour cache entry (2× base input
   price) on every single call, and `cache_read_input_tokens` is **0** every
   time. Each CLI invocation is a fresh SDK session with a fresh
   `CLAUDE_CONFIG_DIR` (`library/inference.ts:136`), so the cache never gets
   hit. We are paying the premium for storage we never use — at base input
   price the same call would be ≈$0.99.

Ethan's stated intent — *"less than a dollar of the Judge's usage limit"* — is
therefore not met by LHC-on-Opus as specced. Options, cheapest first:

- **(a) SABRE becomes the default; LHC is the opt-in "big one."** $0.10 a
  question, 21 s, and SABRE is the more charming corpus for a cold judge anyway.
  LHC stays one command away, with its cost stated. Weakness: reverses a
  decision Ethan already made deliberately.
- **(b) Keep LHC default on Opus 5, tell the truth: ~$1.30.** No code change;
  the notice just quotes the real number. Weakness: overshoots the stated budget
  by ~4×, on the judge's dime.
- **(c) LHC defaults to Sonnet 5, SABRE to Opus 5.** Sonnet 5 is on
  introductory pricing through 2026-08-31 ($2/MTok in), so LHC lands ≈$0.79 —
  and reverts to ≈$1.16 on Sep 1, which is *during* judging. Fragile.
- **(d) Suppress the unused cache write.** Saves ~24% (→ ≈$0.99) and is strictly
  free performance, but needs a knob in the SDK we have not confirmed exists.
  Worth investigating regardless of which option wins — it is wasted money in
  every scenario.

**Recommendation: (a) + (d).** A judge's first question should be fast and cheap
enough that they ask a second one; SABRE answers in 21 s for a dime and shows
the same machinery. LHC is where the system looks *impressive* — five real
papers, genuine disagreement between them — so it stays prominent and one
command away, honestly priced. That preserves the spirit of Ethan's decision
(buy quality where it counts) while respecting the budget he actually named.

## Clarifications (asked 2026-07-27)

**`demo/build.ts` is a developer tool, not part of the playtester's motion.** It
runs once, here, on my machine (or Ethan's) to *generate* `demo/kbs/*` from the
fixture corpora; the output is committed. A playtester never sees it and never
runs it. Its value is that the shipped `kb.sqlite` is reproducible — anyone can
re-run it and get the same KB from the same sources, so the demo KB is not a
hand-forged binary blob nobody can audit.

**`bin/dkb` and `build.ts` are not the same motion.** `bin/dkb` is the runtime
wrapper Claude Code puts on PATH; it execs the engine and is what actually runs
during a demo. `build.ts` is a build script invoked directly with Bun. They meet
only in that `build.ts` drives the same engine to do its ingesting.

So the playtester's motion is: install plugin → `dkb-demo use lhc` (a copy) →
talk to Claude, which runs `dkb`. No build step, no ingestion wait.

**Nothing here assumes Windows.** The demo KB artifacts are SQLite + two text
files — platform-neutral. The wrappers are bash, which Claude Code's Bash tool
provides everywhere. The Windows notes in the risks section are about the
*development* environment (a checkout path with a space in it, and CRLF
normalization on commit), not about the user. A macOS or Linux judge follows the
identical path, and there is no "rely on the pre-existing installs" fallback
needed — there is only one path.

## Execution log

Append one entry per completed stage: what was built, what was verified, what
surprised. Newest at the bottom.

- **2026-07-27 — Stage 0 (plan).** Plan drafted, five open questions raised,
  all resolved by Ethan the same day. Verified rather than assumed: KB = a
  directory of three artifacts; CLI has no default-KB concept; plugin root is
  documented as ephemeral; both fixture corpora are read in place by the phase-1
  suite and the ws eval, so they must not move.
- **2026-07-27 — Stage 0b (pre-tweaks).** Default explore model Haiku 4.5 →
  Sonnet 5 in `library/config.ts:17` and `engines/epistack/main.ts`. Checked
  first that `docs/CONTRACTS.md` A4 defines the *mechanism* and names no model,
  so no amendment is required. `claude-api` skill banned in `CLAUDE.md` working
  conventions (fatally bugged; use `claude-code-guide` or web search).
  `CLAUDE.md` gained a conditional pointer to this file, self-cleaning: it is
  scoped to "if SCRATCHPAD.md exists at the repo root", so deleting the
  scratchpad at merge retires the instruction. Status block + this log added.
  **Not yet run:** `bun test` against the model change — first action of Stage 1.
- **2026-07-27 — Stage 1 (skeleton + build).** Built
  `demo/.claude-plugin/plugin.json` (`dkb-demo`, 0.2.1) and `demo/build.ts`, and
  generated `demo/kbs/{lhc,saber}/`. Ingestion is driven through the CLI as a
  subprocess, so the build exercises the shipped path; fixtures are read in
  place (`content_path` resolves against the sidecar's own directory), so
  nothing is duplicated. Every build re-derives each source's sha256 from the
  fixture on disk and compares it to the ledger — both corpora verified 5/5.
  `.gitattributes` gained `*.sqlite binary`; git confirms both KBs commit as
  `Bin`.
  **Test fix (Ethan-approved):** `SMALL_SLUG` repointed from the removed
  `flf-appendices` to `airways-sabre`; `helpers.ts` gained a `CORPUS` constant
  and an optional corpus argument on `stageFixture`/`fixtureMeta` (defaulting to
  `CORPUS_LHC`, so the four existing call sites are untouched). Note the query
  had to flip with it: the source is now SABRE, so the zero-coverage question is
  the LHC one. Suite **12/12 green including `ret-3`**, which is the first time
  the Sonnet 5 default has been exercised by the suite.
  **Surprises, both cost-related — see "Open decision" above.** The LHC corpus
  is 187k tokens, not the ~100k estimated, and every call pays a 1-hour
  cache-*write* premium for a cache that is never read
  (`cache_read_input_tokens: 0` on every invocation). Real cost is $1.30/question
  for LHC, $0.10 for SABRE. Measured by temporarily logging the SDK's `usage`
  and `total_cost_usd` in `library/inference.ts`; the instrumentation was
  reverted and the file is byte-identical to HEAD.
  Sanity check passed: LHC explore returned `Coverage: full` with a genuinely
  strong synthesis and all five sources cited with correct provenance.
