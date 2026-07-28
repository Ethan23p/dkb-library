# Auth finding — why `retrieve explore` exits 8 for a playtester

Working document, 2026-07-28. Written so a fresh instance can research this
cold. Nothing here has been acted on in code: `library/inference.ts` is
untouched. Delete this file when the question is settled.

Related: `SCRATCHPAD.md` (BLOCKING section), commit `d1df195`, CONTRACTS
amendment A3 (exit 8 = AUTH), and the D9 note in
`testing/evals/eval_walking_skeleton.ts`.

---

## The short version

`CLAUDE_CODE_OAUTH_TOKEN` **is** the right mechanism — that part of the design
is not in question. The problem is narrower and duller: **nothing puts that
variable in a playtester's environment**, and the engine treats its absence as
fatal before trying anything else.

Two different things got quietly equated in `library/inference.ts:9-11`:

> *"authenticated by `CLAUDE_CODE_OAUTH_TOKEN` from env — the user is assumed
> to be logged into Claude Code on this system"*

Being **logged into Claude Code** and **having that token in the environment**
are separate states. A login writes credentials to disk. Exporting the token is
a deliberate extra step (`claude setup-token`), meant for headless and CI use —
exactly the case where there is no interactive login to draw on. A judge who
runs `/plugin install` has done the first and not the second.

## What was assumed

1. A user logged into Claude Code has `CLAUDE_CODE_OAUTH_TOKEN` available to
   processes they launch. **False** for the ordinary logged-in case.
2. Therefore requiring it up front (`requireAuthToken()`, exit 8 before any
   call) costs nothing and fails fast. **True mechanically, but it converts a
   recoverable situation into a hard stop** — the engine never reaches the code
   that could have authenticated another way.
3. The green test suite covers this path. **It does not.** Every developer path
   — `bun test`, `demo/build.ts`, the ws eval — runs with the repo's gitignored
   `.env` on the cwd, which Bun auto-loads into `process.env`. The token is
   always present locally, and never present for an installed user.

## What was actually observed

All on Windows 11, 2026-07-28, this repo's worktree.

| Check | Result |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` in a live Claude Code Bash tool env | **absent** |
| `~/.claude/.credentials.json` on the same machine | **present**, 3837 bytes |
| Hydrated `saber` in a dir with no `.env`, ran the documented command | **exit 8**, `no inference auth token found` |
| Same, from inside the repo (where `.env` exists) | works — Bun loads `.env` |

So the failure is real and reproducible on the installed path, and invisible on
the development path.

### A correction to my earlier claim

I said Claude Code *scrubs* `CLAUDE_CODE_OAUTH_TOKEN` from Bash subprocesses.
**I only verified that it is absent, not that it is removed.** Two candidate
explanations, and I did not distinguish them:

- **(i)** Claude Code strips it from tool subprocess environments deliberately,
  so a nested agent cannot spend the parent's credential. This is what the D9
  note in `eval_walking_skeleton.ts` asserts — but that note is inherited, and I
  did not re-derive it.
- **(ii)** It was simply never set in this machine's environment in the first
  place — it lives only in the repo `.env` — so there is nothing to strip.

**This is worth settling, because it changes the fix.** Under (ii), telling
users to run `claude setup-token` and export the variable would actually work,
and option (c) below becomes viable. Under (i) it would not survive the Bash
tool boundary, and only a credential-side fix works. A quick discriminator: set
the variable in a parent shell, launch `claude` from it, and have it echo the
variable from its Bash tool.

## What "point the app at `~/.claude`" means

Concretely, and why it is not as odd as it sounds.

The Agent SDK does not talk to the API directly — it **spawns the Claude Code
CLI as a subprocess**. That subprocess resolves credentials the same way any
Claude Code invocation does: from its config directory, which is
`CLAUDE_CONFIG_DIR` if set and `~/.claude` otherwise. That directory is where a
login deposits `.credentials.json`.

`library/inference.ts:136` creates a fresh throwaway directory per call and
points `CLAUDE_CONFIG_DIR` at it:

```ts
// D11: the SDK's own bookkeeping is pointed at the OS temp dir so nothing
// is written outside the declared boundaries; sessions are not persisted.
const configDir = mkdtempSync(path.join(tmpdir(), "dkb-inference-"));
```

That is a deliberate, defensible boundary decision — and it is also precisely
what makes the env token *mandatory*. The subprocess is handed an empty config
directory, so it finds no stored credentials, so the only remaining auth path is
the environment variable. The isolation and the auth requirement are the same
decision viewed from two sides.

"Pointing at `~/.claude`" just means letting that subprocess see the config
directory the user actually logged into, so it can use the credential that is
already sitting there.

**Probe result** (`testing/probes/auth-config-dir.ts`, kept in the repo so it can
be re-run — notably on macOS. Run twice here: once inside the repo, once from a
directory with no `.env`, to rule out Bun's auto-loading):

> With `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_API_KEY` both explicitly unset,
> and `CLAUDE_CONFIG_DIR` pointed at the real `~/.claude`, an Agent-SDK call
> returned `subtype: success`.

So the login the docs promise is sufficient really is sufficient. The engine
currently refuses to look at it.

## Options

- **(a) Fall back to the user's config dir.** Try the real `~/.claude` when no
  token is set; keep exit 8 for when neither works. Preserves A3's meaning.
  Cost: gives up part of D11 — the SDK writes its bookkeeping into the user's
  config dir rather than a temp dir. `settingSources: []` still prevents user
  settings and `CLAUDE.md` from leaking into the prompt, so the *controlled
  prompt* property survives; it is the *filesystem boundary* that loosens.
- **(b) Drop `requireAuthToken()`** and let the SDK's own auth failure surface
  as exit 8. Simpler, but the failure arrives later and less legibly, which cuts
  against the AI-legible-CLI principle.
- **(c) Leave the code; document the env var as a prerequisite.** Cheapest, and
  **only viable under explanation (ii) above.** Puts a manual `setup-token` step
  in front of every judge, against the "~5 min on a fresh machine" premise.
- **(d) Copy only `.credentials.json` into the throwaway dir.** Keeps D11's
  isolation *and* uses the existing login — plausibly the best of both. Not
  probed. Risks: the CLI may refresh and rewrite tokens, so a refresh would be
  written to a temp dir and lost (harmless, or a re-auth loop — unknown); and it
  assumes credentials are a file at all.

My recommendation remains **(a)** for v0.2.1, with **(d)** worth a probe first
if the isolation matters more than the diff size.

## Open questions for the research pass

1. **Scrubbing or never-set?** The discriminator above. Settles whether (c) is
   real.
2. **macOS.** My probe is Windows-only. macOS Claude Code stores credentials in
   the **Keychain**, not `.credentials.json` — so (d) may be Windows/Linux-only,
   and even (a) needs confirming on a Mac. Judges will not all be on Windows.
   This is the biggest portability unknown.
3. **Does `CLAUDE_CONFIG_DIR` at `~/.claude` cause any write the user would
   notice** — session files, history, telemetry — given `persistSession: false`?
4. **Token refresh under (d):** does the spawned CLI rewrite credentials, and
   does losing that write break anything?
5. **Is there a documented SDK-level auth option** that takes a credential
   directly, avoiding the config-dir dance entirely? Worth checking current SDK
   docs rather than assuming the two paths are the only ones.

Note for whoever researches this: **do not use the `claude-api` skill** — it is
fatally bugged. Use the `claude-code-guide` agent or web search, and verify
rather than recalling.
