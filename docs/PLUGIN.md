# Packaging the engine as a Claude Code plugin

This repository is simultaneously the DKB library, the Epistack engine, and a
Claude Code plugin that installs both. This document records *how* that works,
so a future agent can change the packaging without re-deriving the mechanics
from scratch.

Primary sources (fetch these if anything here looks stale):

- Plugin reference — <https://code.claude.com/docs/en/plugins-reference>
- Creating plugins — <https://code.claude.com/docs/en/plugins>
- Marketplaces — <https://code.claude.com/docs/en/plugin-marketplaces>
- Skills — <https://code.claude.com/docs/en/skills>

## What a plugin is

A plugin is a directory of components that Claude Code loads. Components live in
conventional locations at the plugin root and are auto-discovered; the manifest
is optional metadata, not a registry. The only directory that is *not* at the
root is `.claude-plugin/`, which holds the manifest itself.

The pieces this repo uses:

| Path | Role |
|---|---|
| `.claude-plugin/plugin.json` | Manifest. `name` is the only required field; it namespaces the plugin's components. |
| `.claude-plugin/marketplace.json` | Catalog, so the repo can distribute itself (see below). |
| `skills/dkb/SKILL.md` | The Smart-Interface Agent. Loads into context when relevant; also invokable as `/dkb:dkb`. |
| `bin/dkb` | Executable. Claude Code puts a plugin's `bin/` on the Bash tool's `PATH` while the plugin is enabled, so `dkb …` works as a bare command. |

Components Claude Code also looks for but this plugin does not ship: `agents/`,
`hooks/hooks.json`, `.mcp.json`, `.lsp.json`, `commands/`, `output-styles/`.

Note that a `CLAUDE.md` at the plugin root is *not* loaded as context for the
installing user. Instructions reach Claude through skills, agents, and hooks —
which is why the interface guide is a SKILL.md and not prose in a readme.

## Why the plugin is the repository root

A marketplace entry's `source` can point at a subdirectory (`./plugins/foo`), so
the plugin could have lived in its own folder. It does not, because `bin/dkb`
executes `engines/epistack/main.ts` from the same tree: keeping the plugin root
and the repo root identical means the installed plugin directory contains the
library and engine it runs, with no build step and no vendoring.

The cost is that plugin-shaped directories (`skills/`, `bin/`, `.claude-plugin/`)
sit alongside library source at the top level. That is the trade accepted for
v0.2.1.

## How installation works

A marketplace is a catalog file listing plugins and where to fetch each one. A
repository that contains `.claude-plugin/marketplace.json` can serve as its own
marketplace, which is what makes a two-command install from GitHub possible:

```
/plugin marketplace add Ethan23p/dkb-library
/plugin install dkb@ethan-dkb
/reload-plugins
```

`ethan-dkb` is the `name` in `marketplace.json`; `dkb` is the plugin entry's
`name`. Both are public-facing and appear in the install command, so renaming
either breaks existing installs — change `displayName` instead when you only
want a different label.

Users pick up later changes with `/plugin marketplace update`. Because
`plugin.json` sets an explicit `version`, `/plugin update` only offers an update
when that field is bumped — pushing commits without bumping it has no effect.

For local development, skip the marketplace round-trip:

```
claude --plugin-dir /path/to/dkb-library
claude plugin validate /path/to/dkb-library
```

## Path resolution inside the plugin

`${CLAUDE_PLUGIN_ROOT}` is the absolute path to the plugin's installed
directory, and is substituted in hook and MCP-server command strings.
`bin/dkb` reads it from the environment but falls back to resolving its own
location, so the wrapper works identically from a plain `git clone`.

Treat the plugin root as ephemeral: it changes on every update, and the previous
version's directory is cleaned up after roughly two weeks. Never write state
there — a knowledge base lives wherever the user ran `dkb init`, never inside
the plugin.

## Runtime prerequisite

The wrapper requires Bun on the user's PATH and says so with an exit code and a
`next:` line if it is missing. The plugin does not install or vendor a runtime.
