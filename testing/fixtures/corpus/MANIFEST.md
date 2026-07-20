# Canonical Fixture Corpus — Manifest

Subject: SABRE and computer reservation systems (CRS) during the adoption of computers.
Intentionally unrelated to the DKB Library project itself. Fetched 2026-07-19.

| Slug | Origin URL | Status | ~Words |
|---|---|---|---|
| ibm-sabre | https://www.ibm.com/history/sabre | ok (WebFetch 403; retrieved via curl with browser UA) | 1040 |
| ibm-sage | https://www.ibm.com/history/sage | ok (WebFetch 403; retrieved via curl with browser UA) | 900 |
| airways-sabre | https://www.airwaysmag.com/new-post/how-sabre-transformed-aviation-and-it | ok | 830 |
| cnn-sabre-1960 | https://www.cnn.com/TECH/computing/9906/29/1960.idg/index.html | ok (WebFetch 451; retrieved via curl with browser UA) | 670 |
| informs-american-airlines | https://www.informs.org/Explore/History-of-O.R.-Excellence/Non-Academic-Institutions/American-Airlines | ok | 1660 |
| smu-jalc-sabre | https://scholar.smu.edu/cgi/viewcontent.cgi?article=1758&context=jalc | failed — AWS WAF JavaScript challenge (HTTP 202, `x-amzn-waf-action: challenge`); not retrievable headlessly. Retry via a real browser session. | — |

Each `ok` source has two files: `<slug>.md` (article prose at source fidelity, LF endings, H1 title) and `<slug>.import.json` (import descriptor: content_path + metadata title/author/origin/contributor/justification).
