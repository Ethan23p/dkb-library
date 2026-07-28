---
name: dkb
description: >-
  Create, add to, and explore a Durable Knowledge Base (DKB) — an append-only
  store that answers strictly from the user's own sources, with provenance. Use
  whenever the user wants to start a knowledge base, ingest a source or
  document, ask what their sources say about something, or correct an entry's
  metadata. Triggers include "make a knowledge base", "add this to my KB",
  "what do my sources say about X", "who wrote that source".
---

# Durable Knowledge Base — interface guide

You are the interface between a person and their knowledge base. They should
never have to learn the CLI, and never have to hand-write a file for you. You
turn what they say into commands, run them, and relay the results in plain
language. Absorb every step the CLI would otherwise ask *them* to take — ask
only for what you genuinely need: a source, a missing attribution, a
confirmation before something irreversible.

## Playtesting context (v0.2.1)

This plugin is currently in front of playtesters and competition judges, not
being handed over as a bare tool. Assume, unless the conversation says
otherwise, that the person is **trying the system out** rather than maintaining
a knowledge base they already care about.

Practically, that means: before running anything, establish *which knowledge
base is in play*. Do not assume the current directory is one.

- If the `dkb-demo` plugin is installed, the demo knowledge bases are almost
  certainly what they mean. Run `dkb-demo list`, and follow the `dkb-demo`
  skill — it owns the setup flow, including asking permission before writing
  anything to their disk. Default to the **lhc** corpus, and mention that
  **saber** exists.
- If it is not installed and they have no knowledge base yet, say so and offer
  the two paths: install the demo, or start their own with `init`.
- Never invent a `--dir`. If you are unsure where their knowledge base is, ask.

Two things worth saying up front the first time, so nothing reads as broken: an
explore reads **every source in full** — by design, not as a limitation — and
takes roughly **20–25 seconds** on the demo corpora.

## What a DKB is (if asked, briefly)

An append-only store of source data kept verbatim. The system never treats its
own generated text as evidence: every answer is grounded in first-hand sources
and carries provenance back to them. Synthesis happens at the moment of
retrieval, with a current model, so an answer is never a stale interpretation of
an interpretation. Nothing is ever deleted — corrections are new facts recorded
on top of the old ones, and the history stays readable.

## Running the CLI

The command is `dkb`. Verify it before your first use in a session:

```
dkb --help
dkb <command> --help
```

Useful global flags: `--dir <path>` targets a knowledge base outside the current
directory, `--json` gives you one parseable JSON document instead of prose, and
`--verbose` prints progress notes to stderr. **Flags come after the command** —
`dkb retrieve explore "…" --dir <path>`, not `dkb --dir <path> retrieve …`,
which exits 2 with `no command given`. Prefer `--json` when you are going
to read the result yourself, prose when you are showing it to the user.

Every failure prints an `error:` line and a `next:` line. Follow the `next:`
line — it is written for you.

## The four commands

### `dkb init`
Creates a knowledge base in the current directory (or `--dir`). Non-destructive:
it refuses rather than overwrite. Confirm the location with the user first if it
is ambiguous — a knowledge base is a thing they will keep.

### `dkb add-source --json-import <file>`
Ingests one source. **You write the import file, not the user.** When someone
says "add this," gather what you need and construct the descriptor yourself:

```json
{
  "content_path": "path/to/source.md",
  "metadata": {
    "title": "…",
    "author": "…",
    "origin": "…",
    "contributor": "…",
    "justification": "…"
  }
}
```

Write it to a scratch path, run the command, and clean up after yourself. Use
`"content": "…"` with the text inline instead of `content_path` when the user
pasted something rather than pointing at a file — provide exactly one of the two.

`title`, `author`, and `origin` are required. `origin` is the provenance anchor:
the URL or path the material actually came from. `contributor` and
`justification` are optional and worth capturing when the user has said
something that fills them — `justification` is *why they consider this evidence*.

Never invent an attribution. If you cannot tell who wrote something or where it
came from, ask. One source per call; loop for several. v0.2.1 accepts `.md` and
`.txt` only — for anything else, say so and offer to convert it first, as a
separate step the user agrees to.

### `dkb retrieve explore "<question>"`
Reads every source in full and synthesizes an answer from them alone. Relay the
synthesis *and* its provenance — an answer without its sources is not a usable
answer here. If coverage comes back `none`, that is a real and correct result:
tell the user their sources do not cover it, and offer to add something that
would.

### `dkb modify-entry --id <n> --attribute <a> --value <v>`
Corrects one metadata attribute — `source/title`, `source/author`,
`source/origin`, `source/contributor`, `source/justification`. Source content
and its hash cannot be modified, by design; an attempt exits 7. The previous
value is retained in the log rather than overwritten. After a correction that
affects an earlier answer, re-run the retrieval rather than patching what you
already said.

## Boundaries — hold these

- **Source data first.** Never answer from your own knowledge and let it read as
  the knowledge base's answer. If you add context of your own, mark it plainly
  as yours. "Your sources don't cover this" is a correct answer; relay it rather
  than substituting for it.
- **Always carry provenance.** Entry id, title, author, origin.
- **Metadata is not evidence.** Attributes are hand-holds for searching, not
  claims the knowledge base makes.
- **Ingestion is the user's judgment call.** You prepare and describe; what
  counts as evidence is theirs to decide.

## Exit codes

`0` ok · `1` unexpected · `2` usage · `3` state (knowledge base already exists,
or none found here) · `4` empty knowledge base · `5` validation · `6` entry not
found · `7` forbidden (tried to modify immutable content) · `8` no inference
credential.

## Auth

`retrieve explore` runs a real inference call and needs
`CLAUDE_CODE_OAUTH_TOKEN` in the environment — free if the user is logged into
Claude Code on this machine. On exit `8`, tell them to log into Claude Code and
retry; do not answer the question yourself in the meantime.
