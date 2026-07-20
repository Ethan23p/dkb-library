# LHC Micro-Black-Hole Fixture Corpus — Manifest

Fixture corpus for the DKB Library test suite / Epistack demo KB. Each source has a
`<slug>.md` (clean markdown, LF-only, H1 title first) and a `<slug>.import.json` sidecar.

Built 2026-07-19. Text is faithful source prose — no summarization or paraphrase.
Fetch pipeline: ar5iv HTML render where available (math preserved as LaTeX `$...$`
from MathML alttext); otherwise arXiv PDF via pdfminer.six with line-wrap reflow,
de-hyphenation, ligature normalization, and running-header/page-number removal.

| Slug | Canonical origin | Fetched from | Status | Depth | ~Words |
| --- | --- | --- | --- | --- | --- |
| giddings-mangano-2008 | https://arxiv.org/abs/0806.3381 | https://ar5iv.labs.arxiv.org/html/0806.3381 | fetched OK | full (incl. appendices & references) | 35,700 |
| lsag-report-2008 | https://arxiv.org/abs/0806.3414 | https://arxiv.org/pdf/0806.3414 (PDF; ar5iv has no render — redirects to abs) | fetched OK | full | 10,000 |
| jaffe-rhic-2000 | https://arxiv.org/abs/hep-ph/9910333 | https://arxiv.org/pdf/hep-ph/9910333 (PDF; ar5iv has no render) | fetched OK | full | 13,500 |
| koch-bleicher-2009 | https://arxiv.org/abs/0807.3349 | https://ar5iv.labs.arxiv.org/html/0807.3349 | fetched OK | full (incl. references) | 6,200 |
| ord-probing-improbable-2008 | https://arxiv.org/abs/0810.5515 | https://arxiv.org/pdf/0810.5515 (PDF; ar5iv has no render) | fetched OK | full | 8,500 |
| flf-appendices | https://docs.google.com/document/d/1wtKAjpvEiMWn-RpFDi_2Vqcvt5i3sCFPmUt3MtsKOjo | local copy: `G:\My Drive\Projects\Epistack Engine\Copy of PUBLIC Epistemic Case Study Competition - appendices.md` | copied OK | full — **administrative**: judging criteria, prize tiers, strong-example pointers, format/length rules; no LHC case-study content | 1,250 |

## Notes & known artifacts

- **giddings-mangano-2008 / koch-bleicher-2009** (ar5iv HTML): equations carried as
  LaTeX (`$...$`) from MathML alttext; figure captions kept as blockquotes; figures
  themselves omitted. Some inline footnote markers render as repeated digits near
  author names (e.g. "1 1 1 email") — cosmetic only.
- **lsag-report-2008 / jaffe-rhic-2000 / ord-probing-improbable-2008** (PDF
  extraction): paragraph reflow is heuristic, so an occasional heading may be merged
  into an adjacent paragraph; prose itself is verbatim.
- **jaffe-rhic-2000**: curly quotes in the source font extracted as U+FFFD and were
  normalized to straight double quotes.
- **ord-probing-improbable-2008**: the PDF's symbol font mapped math operators to
  ASCII punctuation; restored deterministically (`!` hard-space → space, `!!!` → ×,
  `"` → ≈, `#` → ≥, `$` → ≤). Superscript exponents extract flat ("10-9" means
  10^-9). Two bibliography entries have letter-spaced titles from the source PDF.
- **flf-appendices**: marked administrative — competition logistics, not case-study
  material; included for completeness of the Epistack provenance chain.
- No failures; no real-browser retries needed.
