---
name: dkb-demo
description: >-
  Set up and run a prebuilt demo knowledge base for the DKB system — a real,
  pre-ingested corpus so someone can try the tool without assembling sources
  first. Use when the user wants to try, demo, evaluate, or playtest a Durable
  Knowledge Base, asks what this system does, says they just installed it, or
  wants to switch between the available demo corpora. Triggers include "try the
  demo", "I just installed this — what can I do", "show me what this does",
  "switch to the other knowledge base".
---

# DKB demo — running a playtest

Someone is trying this system out, probably for the first time, possibly to
judge it. Your job is to get them from "installed" to "looking at a real,
sourced answer" without making them learn anything first.

**You drive. They talk.** They should never have to type a CLI command, look up
a flag, or read a directory layout. Ask, run, relay.

## Step 1 — set up a knowledge base, with their permission

The demo ships prebuilt knowledge bases inside the plugin. A plugin directory is
temporary — Claude Code replaces it on every update — so before anything can be
explored, one has to be **copied into a directory the user owns**.

That copy writes files to their disk, so **ask before you do it**. Tell them
plainly what will happen and where:

> I'll set up a demo knowledge base for you — that means copying about half a
> megabyte (a small database and two text files) into `<the actual cwd>`, in a
> new folder called `demo-lhc`. It's yours afterwards; nothing else on your
> system is touched. Sound good?

Say the *real* working directory, not a placeholder — run `pwd` if you are not
certain where you are. If they would rather it went somewhere else, pass
`--dir <path>`.

Once they agree:

```
dkb-demo use lhc
```

Then tell them where it landed and that it is theirs to keep. If the command
exits 3 because the directory already exists, that is not an error to work
around — they already have a copy. Use it.

## Step 2 — offer the two corpora

Default to **lhc**, but say what the other one is, because it is genuinely a
different flavour of interesting and some people will prefer it:

- **lhc** — *Could the LHC destroy the Earth?* Five real papers on whether the
  collider could produce a dangerous micro black hole: the CERN safety review,
  the astrophysical bounds from white dwarfs and neutron stars, and — the
  interesting part — Ord, Hillerbrand & Sandberg arguing that the *methodology*
  of such risk estimates is itself the weak link. The sources genuinely
  disagree, which is what makes it worth asking questions about.
- **saber** — *Putting computers in front of ordinary people.* How American
  Airlines built SABRE in 1960 and handed terminals to hourly reservation
  staff, cutting a 90-minute booking to seconds. It is a story about what
  happens to work, and to the workers, when a computer arrives — including
  American recruiting its first programmers out of its own reservations
  department.

Switching is another `dkb-demo use <name>`, with the same ask-first courtesy.
Both can exist side by side; they are separate directories.

## Step 3 — explore, and set expectations first

Explore with the `dkb` command, pointed at the hydrated copy:

```
dkb --dir ./demo-lhc retrieve explore "their question"
```

Two things to say *before* the first one, so a silent pause does not read as a
hang: every question reads **every source in full** — that is how the system
works, not a quirk — and it takes **20–25 seconds**. It runs through their own
Claude Code, so there is nothing extra to sign up for.

Relay the synthesis **and its provenance**. An answer without its sources is not
a usable answer here; the entry ids, titles, and origins are the point, not
decoration.

## Good first questions

These make the system look like itself. Offer a couple; do not read the list out.

**lhc**
- "Could the LHC produce a black hole that endangers Earth?"
- "Do any of these sources disagree with each other?" — they do, sharply.
- "What's the strongest single piece of evidence that there's no danger?"

**saber**
- "What changed for the people doing reservation work?"
- "Where did American Airlines find programmers in 1960?"

**Either — and worth doing deliberately:**
- Ask something the corpus genuinely does not cover: *"What does this say about
  quantum computing?"* The honest **"your sources don't cover this"** is the
  feature. Frame it that way before you run it, then let the result speak.

## Boundaries — hold these

- **Never answer from your own knowledge and let it read as the knowledge
  base's answer.** You know things about the LHC and about SABRE. That
  knowledge is not in their knowledge base, and blurring the two destroys the
  only thing this system is offering. If you add context of your own, say
  plainly that it is yours.
- **The copy is theirs.** Anything they add or correct lives in their
  directory. Never suggest editing anything inside the plugin.
- **Don't oversell.** This is v0.2.1, a walking skeleton. Retrieval is
  context-stuffing every source into one call; there is no vector search, no
  graph search, no ranking. If someone asks about scale, that is the honest
  answer — the design defers inference to retrieval time on purpose, and the
  small-corpus case is the one it currently serves well.

## When something goes wrong

Every failure prints an `error:` line and a `next:` line; follow the `next:`
line, it is written for you. Exit `8` means they are not logged into Claude
Code — tell them to log in and retry, and do **not** answer the question
yourself in the meantime. Exit `3` from `dkb-demo use` means the copy already
exists, which is usually good news.
