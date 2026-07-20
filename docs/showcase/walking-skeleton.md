# The walking-skeleton eval — full walkthrough

*New here? Start with [the overview](./README.md) for what this is and the
moments that matter most.*

This is a tidied presentation of the passing run (run 2, 2026-07-19): a
single Claude agent (Sonnet), with no prior knowledge of the tool, driving
the full knowledge-base lifecycle over six scripted user turns, with
automated checks ("gates") between turns and an independent judge (Opus)
grading the transcript against the project's core principles. Nothing here is
paraphrased beyond formatting — **every user and assistant message below is
verbatim from the run**; the raw artifacts are in
[`./unedited/`](./unedited/) exactly as the harness wrote them.

**Result: 18/18 gates pass · judge verdict pass ·
sourceDataFirst 5, jitIntelligence 5, aiAsInterface 5, noLeakage 5, ergonomics 4 ·
$0.70 · 249 s.** The judge's verbatim justifications are in
[the overview](./README.md) and
[`unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json`](./unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json).

---

## Turn 1 — initialize

> **User:** Hey Claude! Let's get a knowledge base initialized right here in this directory.

The agent, never having seen this CLI, probes it first (`--help`, which the
walking skeleton doesn't support yet — the exit-2 error itself lists the valid
commands), then runs `init`. The engine creates `config.yml`, `kb.sqlite`, and
`convention.md`.

> **Assistant:** Done! The knowledge base has been initialized in this directory:
>
> ```
> Initialized Epistack knowledge base in ...\dkb-eval-walking-skeleton-dzgrtK
>   config.yml, kb.sqlite, convention.md created.
> ```
>
> It created three files:
> - **config.yml** — KB configuration
> - **kb.sqlite** — the underlying database
> - **convention.md** — presumably documenting conventions for the KB
>
> Next step per the tool's own suggestion is to add a source via `add-source --json-import <file>`. Want me to go ahead and check `add-source --help` so we're ready to ingest something once you have a source in mind?

*Gates: config.yml / kb.sqlite / convention.md exist; ledger state verified correct and empty.*

## Turn 2 — query the empty KB

> **User:** Before we add anything — what does the knowledge base have to say about micro black holes at the LHC?

The agent discovers the `retrieve explore` grammar by reading the CLI's error
messages, then runs the query. The engine refuses with exit 4 — the KB is
empty — and says exactly what to do next. Crucially, the agent **relays the
system's answer instead of answering the physics question itself**:

> **Assistant:** The knowledge base is empty right now — it says explicitly:
>
> > the knowledge base is initialized but contains no sources yet
>
> So there's nothing yet on micro black holes at the LHC or anything else. Since we just ran `init`, no sources have been ingested. To get an answer, we'd need to add a source first via `add-source --json-import <file>` (following the shape documented in `convention.md`).
>
> Want me to check `convention.md` to see the expected import format, so we're ready when you have source material to add?

*Gates: the agent actually asked the system; graceful failure relayed with guidance; KB still empty; retrieve was read-only.*

## Turn 3 — ingest the sources

> **User:** Right, it's empty! Please add the two sources sitting in this directory — you'll find an import descriptor (.import.json) next to each document.

The agent lists the directory, reads `convention.md` and both import
descriptors to check they're well-formed, then ingests both papers (Koch,
Bleicher & Stöcker's *Exclusion of black hole disaster scenarios at the LHC*
and Ord, Hillerbrand & Sandberg's *Probing the Improbable*). Each ingestion
lands as one ledger transaction carrying a content hash.

> **Assistant:** Both descriptors look well-formed against the convention. Adding them now.
> Both sources are now in the knowledge base:
>
> 1. **Entry 2** — *Exclusion of black hole disaster scenarios at the LHC* (Koch, Bleicher, Stöcker) — arxiv.org/abs/0807.3349
> 2. **Entry 3** — *Probing the Improbable: Methodological Challenges for Risks with Low Probabilities and High Stakes* (Ord, Hillerbrand, Sandberg) — arxiv.org/abs/0810.5515
>
> Both were tagged with the `fixture-corpus` contributor and the same justification: canonical LHC micro-black-hole safety literature for this demo KB.
>
> Want me to go ahead and re-run the "micro black holes at the LHC" retrieval now that there's content to draw on?

*Gates: ledger state correct with both sources; both input files byte-identical to before (ingestion is read-only over its inputs).*

## Turn 4 — substantive retrieval

> **User:** If a micro black hole formed at the LHC and did not evaporate, how fast would it actually grow — and is 'slow enough not to matter for billions of years' the same thing as 'safe'?

One command: `retrieve explore "<the question>"`. The engine reads the full
sources into a fresh inference call *at retrieval time* — no pre-computed
embeddings or cached interpretations — and returns a synthesis with a
coverage rating (`partial`) and provenance. The agent relays it:

> **Assistant:** Here's what the knowledge base says (coverage: **partial**):
>
> **On growth rate:** Koch, Bleicher & Stöcker derive differential equations (their eqs. 10–12) governing how a micro black hole would accrete matter, depending on the number of extra spatial dimensions, ambient density, and accretion parameters. In the relevant limiting case, they calculate that a mini black hole accreting the Earth would take **many times longer than the age of the universe**. They bolster this with an astrophysical check: the continued existence of old white dwarfs and neutron stars implies cosmic-ray-produced black holes (which would form under similar physics) can't be growing fast enough to have consumed those objects already.
>
> **On whether "slow" = "safe":** The two sources diverge here. Koch et al. implicitly equate slow theoretical growth with safety. Ord, Hillerbrand & Sandberg directly push back on that equivalence — they distinguish:
> - **P(X|A)** — probability of disaster *given the argument/theory is sound*
> - **P(X)** — the *actual* probability of disaster
>
> They argue you can't just report P(X|A) as if it's the whole story: you also have to weigh **P(¬A)** — the chance the underlying theory, model, or calculation is wrong — and P(X|disaster-conditional-on-theory-failure). The KB notes their striking result: even being *very confident* in the theory (P(¬A) as low as 10⁻⁴), you still get unacceptably high disaster probabilities unless the "if the theory is wrong" disaster probability is implausibly tiny. Given extinction-level stakes, they conclude that "slow growth predicted by theory" is **not methodologically equivalent to "safe"** — it omits the risk that the theory itself is mistaken.
>
> **Provenance:**
> - [2] *Exclusion of black hole disaster scenarios at the LHC* — Koch, Bleicher, Stöcker (arxiv.org/abs/0807.3349)
> - [3] *Probing the Improbable* — Ord, Hillerbrand, Sandberg (arxiv.org/abs/0810.5515)
>
> Let me know if you'd like me to dig into the coverage gaps (it flagged this as only "partial").

*Gates: the agent asked the KB rather than answering from its own knowledge; substantive synthesis relayed; provenance traces to the actual ingested sources.*

## Turn 5 — non-destructive modify

> **User:** Small correction: the author line on the black-hole-exclusion paper should read exactly "B. Koch, M. Bleicher & H. Stöcker (FIAS)". Please update that metadata.

The agent checks the convention to confirm `source/author` is mutable, then
runs `modify-entry`. The ledger never overwrites: the change is recorded as
one new transaction, and the prior value stays in the log forever.

> **Assistant:** That paper is entry `2`, and per the convention, `source/author` is mutable. I'll update it.
> Done — entry 2's author updated:
>
> - **Before:** Benjamin Koch, Marcus Bleicher, Horst Stöcker
> - **After:** B. Koch, M. Bleicher & H. Stöcker (FIAS)
>
> Recorded as tx 6; the prior value is retained in the ledger, so full history is preserved.

*Gates: modification landed; full ledger state (including retained history) verified correct.*

## Turn 6 — fresh retrieval after the edit

> **User:** Thanks. Same question as before, fresh from the knowledge base please: If a micro black hole formed at the LHC and did not evaporate, how fast would it actually grow — and is 'slow enough not to matter for billions of years' the same thing as 'safe'?

The agent **re-runs retrieval rather than patching its earlier answer** —
the judge singled this out as JiT Intelligence working as intended. The fresh
synthesis differs in emphasis from turn 4's (each explore is a live inference
over the sources, not a cache hit), and the provenance now carries the
corrected author line:

> **Assistant:** Here's the fresh result (**coverage: partial**), now reflecting the corrected author metadata in provenance:
>
> **Growth rate, if it didn't evaporate:**
>
> Source 2 (Koch, Bleicher & Stöcker) gives two growth equations, and the answer depends heavily on unknown parameters:
> - **Nucleon-interaction model** (Eq. 10): M₁(x) ≥ x·π·r_p²·ρ·α + M_f
> - **Area-based accretion model** (Eq. 12): dM₂(x)/dx = ρ·A(M)
>
> Depending on assumptions:
> - If the number of extra spatial dimensions **d ≤ 6** (standard assumptions): growth could be significant within Earth's lifetime.
> - If **d > 6**: growth would be "too slow to do any harm within the lifetime of the earth."
> - If the accretion efficiency **α < 10⁻⁷** (extremely low): "the accretion of the earth by a mini black hole would take many times longer than the age of the universe."
>
> So the honest answer is: *it depends on parameters we don't fully know* — but under the paper's preferred assumptions, growth is negligible on cosmological timescales.
>
> **Is "slow for billions of years" the same as "safe"?**
>
> **No** — the KB is explicit that these are not equivalent, for two distinct reasons:
>
> 1. **Koch et al.'s own empirical cross-check**: they don't just trust the equations — they argue that if black holes grew even slowly, cosmic-ray collisions (which have hit Earth at comparable or higher energies throughout its history) should have already produced black holes that would have destroyed old white dwarfs and neutron stars. Since such old (>1 Gyr) white dwarfs are observed intact, this is used as an independent constraint against the "dangerous but slow" scenario.
>
> 2. **Ord et al.'s methodological caveat**: even a theoretically well-supported "slow growth" prediction only tells you the disaster probability *conditional on the theory/model/calculation being correct*. It doesn't account for the probability that the theory, model, or calculation itself is flawed — and folding that uncertainty in can materially raise the actual risk estimate. So "predicted to be harmlessly slow" ≠ "actually safe."
>
> **Provenance:**
> - [2] *Exclusion of black hole disaster scenarios at the LHC* — B. Koch, M. Bleicher & H. Stöcker (FIAS) (arxiv.org/abs/0807.3349)
> - [3] *Probing the Improbable* — Toby Ord, Rafaela Hillerbrand, Anders Sandberg (arxiv.org/abs/0810.5515)

*Gates: the agent re-queried the KB; the corrected author name ("FIAS") surfaced in the final relayed explore; retrieval left the KB unchanged.*

---

## Also worth reading: run 1, the honest failure

Run 2 was preceded by a failing run — kept unedited in
[`./unedited/run-1-fail-2026-07-20T03-37-37Z/`](./unedited/run-1-fail-2026-07-20T03-37-37Z/) —
where a bug in the eval environment (the auth token never reached the
sandboxed engine) made every `retrieve explore` fail with exit 3. The engine
behaved exactly as specified in a broken environment, and the agent held the
project's values under failure. Facing a physics question it could easily
have answered from training data, it said:

> I don't want to substitute my own outside knowledge for what the knowledge base would actually retrieve from those two sources — so I'll hold off on answering the substantive question until `retrieve` can actually run.

The failure was diagnosed from the transcript, the environment fixed (and one
gate that had false-passed was *tightened*, never loosened), and run 2
dispatched. Both runs are here because the failure is as much a demonstration
of the system's principles as the pass.

## Numbers (run 2)

21 tool calls · 15 bash commands · exit codes: 8×0, 6×2, 1×4 ·
5.3k output tokens · $0.70 total · 249 s wall clock.
Full stats and the complete judge verdict: [`unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json`](./unedited/run-2-pass-2026-07-20T03-44-53Z/summary.json).
