# Trying out a Durable Knowledge Base

You will not be typing commands at a terminal. This installs a plugin into your
Claude Code, after which you just talk to Claude — it runs everything for you.

## Before you start

- [Claude Code](https://claude.com/claude-code), logged in.
- [Bun](https://bun.sh) installed (`bun --version` should print something).

## Install

In Claude Code:

```
/plugin marketplace add Ethan23p/dkb-library
/plugin install dkb@ethan-dkb
/reload-plugins
```

That is the whole setup. Claude now knows how to build and query a knowledge
base, and has the `dkb` command available.

## Use it

Talk normally. Claude handles the mechanics — you never write a config file or
a JSON descriptor.

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

## Worth reporting

- Anything that reads as invented: an author, an origin, a fact you can't trace
  to a source you added.
- An answer with no sources attached.
- An error message that left you unsure what to do next.
- Anywhere Claude made you do work it should have absorbed for you.
- Anything that felt like you were operating a program rather than talking to
  someone about your material.
