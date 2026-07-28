# Epistack Convention

This is the live, evolving set of best practices around attributes and
metadata for this knowledge base. It is **not a rigid schema**: attributes are
hand-holds for AI agents searching the graph, and this document is expected to
diverge and grow as the knowledge base is used. When conventions shift, source
data can be re-assessed transparently — the ledger keeps all history.

## Initial conventions: source attributes

| Attribute              | Required | Mutable | Notes |
|------------------------|----------|---------|-------|
| `source/content`       | yes      | never   | verbatim source data, LF-normalized |
| `source/content-hash`  | derived  | never   | sha256 hex over the stored content |
| `source/title`         | yes      | yes     | |
| `source/author`        | yes      | yes     | |
| `source/origin`        | yes      | yes     | URL or path — the provenance anchor |
| `source/contributor`   | no       | yes     | who brought the source in |
| `source/justification` | no       | yes     | why the contributor considers it evidence |
| `source/date-added`    | derived  | no      | from the ingest transaction timestamp |

Provenance carries the weight here: origin, author, and the contributor's
justification are what make a source usable as evidence. Attributes are never
part of the source data itself.
