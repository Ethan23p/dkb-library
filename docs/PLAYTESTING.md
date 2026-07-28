# Trying out a Durable Knowledge Base

You will not be typing commands at a terminal. This installs a plugin into your
Claude Code, after which you just talk to Claude — it runs everything for you.

There is a prebuilt knowledge base, so you can ask a real question about real
sources within a minute of installing. Bringing your own material comes after,
once you have seen what the system does.

## Before you start

- [Claude Code](https://claude.com/claude-code), logged in.
- [Bun](https://bun.sh) installed (`bun --version` should print something).

## Install

In Claude Code:

```
/plugin marketplace add Ethan23p/dkb-library
/plugin install dkb@ethan-dkb
/plugin install dkb-demo@ethan-dkb
/reload-plugins
```

Two plugins: `dkb` is the system, `dkb-demo` is a pair of ready-made knowledge
bases to try it on. The demo is optional — skip it if you would rather start
with your own sources — but it is the fastest way to see what this is.

That is the whole setup. No build step, no ingestion wait.

## Ask something, immediately

Just say so:

> "I just installed this — what can I do?"

Claude will offer you a knowledge base and ask before it puts anything on your
disk. Setting one up is a directory copy: about half a megabyte, into your
current folder, and the copy is yours to keep. Anything you add or correct
afterwards stays in it.

Two corpora ship:

- **lhc** — *Could the LHC destroy the Earth?* Five real papers on whether the
  collider could produce a dangerous micro black hole: CERN's safety review, the
  astrophysical bounds drawn from white dwarfs and neutron stars, and Ord,
  Hillerbrand & Sandberg arguing that the *methodology* of such risk estimates
  is itself the weak link. The sources genuinely disagree, which is what makes
  them worth questioning. ~74k words.
- **saber** — *Putting computers in front of ordinary people.* How American
  Airlines built SABRE in 1960 and handed terminals to hourly reservation staff,
  cutting a ninety-minute booking to seconds — including where the company found
  its first programmers. ~5k words, so it answers faster.

You get `lhc` unless you ask otherwise, and you can have both side by side.

## Questions that show what it does

Ask whatever you actually want to know — but if you would like a starting
point, these three each expose something different:

**A question the sources answer well.** *"Could the LHC produce a black hole
that endangers Earth?"* A good answer names the entries it drew on — id, title,
author, origin — and you should be able to trace every claim back to one of
them.

**A question the sources disagree about.** *"Do any of these sources disagree
with each other?"* They do, sharply. The interesting property is that the
disagreement survives: a good answer lays out both positions with their
provenance rather than blending them into one confident verdict. Adjudicating is
your job, not the system's.

**A question the sources do not cover.** *"What do these say about quantum
computing?"* The right answer is "your sources don't cover this." That is the
feature, and it is worth triggering deliberately so you know the refusal is
real.

Every question reads **every source in full** — that is how this version works,
not a limitation to route around — so expect roughly 20–25 seconds of quiet
before an answer. Longer corpus, longer wait.

## Then bring your own

Once the demo has shown you the shape of it, the more interesting test is your
own material. Talk normally; you never write a config file or a JSON descriptor.

> "Let's start a knowledge base in this folder."

> "Add this article to it — it's from the FLF site, written by [author]."

> "What do my sources say about the risk arguments?"

> "That second source is misattributed; the author is actually [name]."

Claude will ask for what it genuinely needs — usually who wrote something and
where it came from — because those are what make a source usable as evidence
later. It won't guess them.

## What to expect

**Answers come only from your sources.** Ask something your sources don't cover
and you should get "your sources don't cover this," not a confident answer from
the model's own knowledge. That behavior is the point of the system; if you ever
catch it answering from general knowledge and presenting that as the knowledge
base's answer, that is the single most valuable bug you can report.

**Answers cite their sources.** Every synthesis names the entries it drew on.

**Nothing is destroyed.** Corrections are recorded on top of what was there
before; the old value stays in the log. There is no delete in this version.

**Plain text only, for now.** `.md` and `.txt`. Point Claude at a PDF and it
should tell you so and offer to convert it first, rather than failing quietly.

**Re-asking is cheap and correct.** After you correct something, ask your
question again rather than trusting the earlier answer — the system does its
thinking at the moment you ask, so a fresh answer reflects the correction.

**The demo knowledge base is yours.** It lives in your directory, not inside the
plugin, so plugin updates cannot touch it. Editing it is fair game — correct an
author, add a sixth source, see what changes.

## Worth reporting

- Anything that reads as invented: an author, an origin, a fact you can't trace
  to a source you added.
- An answer with no sources attached.
- An error message that left you unsure what to do next.
- Anywhere Claude made you do work it should have absorbed for you.
- Anything that felt like you were operating a program rather than talking to
  someone about your material.
