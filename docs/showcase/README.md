# Showcase — an agent drives the knowledge base, end to end

The acceptance eval for the current version: a Claude agent with **no prior
knowledge of this tool** is dropped into a sandbox with the Epistack CLI and
two source papers on LHC micro-black-hole safety. Over six user turns it must
initialize a knowledge base, handle a query while the KB is still empty,
ingest the sources, answer a substantive physics question with provenance,
correct a piece of metadata, and answer again fresh. Automated checks
("gates") verify the knowledge base's actual state between turns; an
independent judge (Opus) grades the transcript against the project's
principles.

**Result: 18/18 gates pass · judge verdict pass · $0.70 · 4 minutes.**

Two layers below this page, matching the project's own ethos — interpretation
on top, source data preserved underneath:
**[the full walkthrough](./walking-skeleton.md)** (every message verbatim,
with context) and **[the unedited artifacts](https://github.com/Ethan23p/dkb-library/tree/main/docs/showcase/unedited/)** (machine
transcripts, gate results, judge verdicts, stats — exactly as the harness
wrote them, one passing run and one failing run).

## The moments worth your ninety seconds

### 1. Disagreement surfaced, not smoothed over

The two fixture sources genuinely disagree on the demo question — whether
"slow enough not to matter for billions of years" is the same thing as
"safe." The default failure mode of any synthesis layer is to blend
disagreeing sources into one confident answer. Instead, the synthesis said:

> **On whether "slow" = "safe":** The two sources diverge here. Koch et al. implicitly equate slow theoretical growth with safety. Ord, Hillerbrand & Sandberg directly push back on that equivalence — they distinguish:
> - **P(X|A)** — probability of disaster *given the argument/theory is sound*
> - **P(X)** — the *actual* probability of disaster

Both positions, both provenances, no adjudication — the judgment stays with
the reader. The difference between what a theory predicts and whether the
theory can be trusted survived retrieval intact, which is the epistemics
this project is about. (Fittingly, the demo topic is one of the
competition's own case studies.)

### 2. Values held under failure

The first run *failed* — an eval-environment bug kept the auth token from the
sandboxed engine, so every retrieval died with exit 3. Facing a physics
question it could easily have answered from training data, the agent said:

> I don't want to substitute my own outside knowledge for what the knowledge base would actually retrieve from those two sources — so I'll hold off on answering the substantive question until `retrieve` can actually run.

Source Data First isn't a slogan in a spec; it's what the system did when the
easy path was fabrication. The failing run is preserved unedited alongside
the pass.

### 3. Fresh inference, not stale interpretation

After a metadata edit, the user re-asked the original question. The agent
**re-ran retrieval rather than patching its earlier answer**, and the fresh
result accurately carried the corrected metadata in its provenance —
the interpretation is deliberately not the stored artifact; what's
durable is the evidence trail beneath it. The judge singled this out:

> Synthesis was deferred to retrieval time via `retrieve explore`, and after the metadata edit the assistant re-ran retrieval rather than patching a stale prior interpretation.

### 4. A CLI that teaches its own grammar

The agent was given no documentation. It learned the entire interface from
the CLI's error messages, which are written for exactly this:

> ```
> Exit code 2
> error: unknown subcommand 'micro black holes at the LHC' for 'retrieve'
> next: use: retrieve <explore> …
> ```

Every non-zero exit says what to do next. Fifteen bash commands, and the
six "failures" among them were all successful discovery — this is what
"AI agents as first-class interface citizens" looks like in practice.

### 5. Provenance that survives change

The user corrected an author line; the ledger recorded the change as a new
entry rather than overwriting the old one — the prior value stays in the log
forever — and the very next retrieval's provenance carried the corrected
attribution. Between turns, gates verified the source files were
byte-identical to before ingestion and the full ledger history was intact.
Durability is checked, not assumed.

## The judge's scorecard

Two layers of verification, deliberately different in kind: the 18 gates are
deterministic checks on real KB state (file existence, byte-identity, ledger
datoms) and don't depend on any model's opinion; the judge grades the
transcript's *alignment with the principles*, the part no deterministic
check can reach.

| Principle | Score |
|---|---|
| Source Data First | 5/5 |
| Just-in-Time Intelligence | 5/5 |
| AI as Interface | 5/5 |
| No training-data leakage | 5/5 |
| Ergonomics | 4/5 |

> Clean walking-skeleton run: init → discover fixtures → read convention/import shape → add-source ×2 → retrieve explore → modify-entry → re-retrieve. Grounding and no-leakage are both strong; the assistant consistently relays CLI output with provenance and defers synthesis to retrieval. Only minor ergonomic friction (repeated unsupported --help calls, initial wrong-path Reads), all self-corrected. Passes.

Full justifications, per-gate results, and cost/token stats are in
[`unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json`](https://github.com/Ethan23p/dkb-library/blob/main/docs/showcase/unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json).

---

**Next:** [the full walkthrough, every message verbatim →](./walking-skeleton.md)
