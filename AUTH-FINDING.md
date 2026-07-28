# Auth finding — why `retrieve explore` exits 8 for a playtester

Working document. Written 2026-07-28, revised the same day after a documentation
pass and three experiments. Nothing here has been acted on in code:
`library/inference.ts` is untouched. Delete this file when the question is
settled.

Related: `SCRATCHPAD.md` (BLOCKING section), commits `d1df195` / `d4c71a5`,
CONTRACTS amendment A3 (exit 8 = AUTH), the D9 note in
`testing/evals/eval_walking_skeleton.ts`, and the probe at
`testing/probes/auth-config-dir.ts`.

---

## The question, framed properly

Not "why is our token missing" but: **what is the intended way for a program to
use the user's existing Claude Code credentials for autonomous execution?** Our
shape is a plugin CLI, invoked by the user's own Claude Code session through its
Bash tool, that makes one non-interactive Agent-SDK call. The same shape as a
skill with a `scripts/` directory that calls the SDK.

## The short answer

**There is no supported way to do what we are currently doing, and the obvious
workaround does not work either.** Specifically:

1. Anthropic does not offer a first-class mechanism for a third-party program to
   reuse an interactive claude.ai login, and says so explicitly.
2. `claude setup-token` — the documented path for scripts — **does not reach our
   CLI**, because Claude Code withholds the credential from Bash subprocesses.
   Verified experimentally; see below. This kills the "just document the setup
   step" option, which was my previous recommendation's fallback.
3. What still works is any credential the *engine itself* loads from disk, or
   moving synthesis out of the engine entirely.

## Verified facts

### Documented, quoted from primary sources

**Agent SDK overview** ([overview.md](https://code.claude.com/docs/en/agent-sdk/overview.md)),
verbatim, in the "Set your API key" step:

> Unless previously approved, Anthropic does not allow third party developers to
> offer claude.ai login or rate limits for their products, including agents
> built on the Claude Agent SDK. Please use the API key authentication methods
> described in this document instead.

Read narrowly this governs *offering* a login. Our case is a user running a
local tool against their own subscription — not quite the same thing, but the
spirit clearly points away from "a product that spends the user's claude.ai
quota." **This is a judgment call for Ethan, and possibly a question worth
putting to Anthropic**, not something to settle by reading tea leaves.

**Authentication precedence** ([authentication.md](https://code.claude.com/docs/en/authentication.md)),
in order:

1. Cloud provider credentials (`CLAUDE_CODE_USE_BEDROCK` / `_VERTEX` / `_FOUNDRY`)
2. `ANTHROPIC_AUTH_TOKEN`
3. `ANTHROPIC_API_KEY`
4. `apiKeyHelper` script output
5. `CLAUDE_CODE_OAUTH_TOKEN`
6. Subscription OAuth credentials from `/login` — the default for Pro/Max/Team

Also documented there: `apiKeyHelper` is a **settings-file** field (not a
`query()` option) that runs a shell script returning an API key, and it
"appl[ies] to the CLI and the surfaces that wrap it, including … the Agent SDK."
Credentials live in the macOS **Keychain**, or `~/.claude/.credentials.json` on
Linux/Windows (under `CLAUDE_CONFIG_DIR` when set), and are "managed through
`/login` and `/logout`" — i.e. reading them from another program is an
implementation detail, not a declared interface. `claude setup-token` mints a
one-year token that "authenticates with your Claude subscription and requires a
Pro, Max, Team, or Enterprise plan."

### Experimental, run here

| Experiment | Result |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` visible in a live Claude Code Bash tool env | **absent** |
| Set `CLAUDE_CODE_OAUTH_TOKEN` explicitly on a `claude -p` process, ask its Bash tool if it sees it | **`ABSENT_FROM_BASH`** |
| Control: set an ordinary `DKB_CONTROL_VAR` the same way | **present** (`control=control-value`) |
| Hydrated KB in a dir with no `.env`, documented command | **exit 8** |
| Same from inside the repo, where `.env` exists | works — Bun auto-loads `.env` |
| `CLAUDE_CONFIG_DIR` → real `~/.claude`, no token set (`testing/probes/auth-config-dir.ts`) | **`success`** |
| Incidental: dummy `ANTHROPIC_API_KEY` set alongside a valid OAuth token | nested session failed `Invalid API key` — confirms API key outranks OAuth token, as documented |

**The control is the important one.** An arbitrary environment variable passes
through to the Bash tool; the credential variable does not. So Claude Code
withholds it deliberately — this is not "it was never set on this machine."

**Correction to the previous revision of this document.** It listed "stripped at
the tool boundary" and "never set here" as undistinguished possibilities, and
noted that under the second, documenting `claude setup-token` would work. That
is now settled: it is the first, and documenting `setup-token` **would not have
worked**. Had we shipped that as the fix, judges would have followed the
instructions and still hit exit 8.

## Why the current design forces the failure

`library/inference.ts:136` creates a throwaway config dir per call and points
`CLAUDE_CONFIG_DIR` at it (the D11 boundary decision). The SDK spawns the Claude
Code CLI, which resolves credentials from that directory — finds an empty one —
so precedence entry 6 is unavailable and only an environment credential remains.
Meanwhile the engine's own environment has already had the credential removed by
the Bash tool that launched it. Both ends of the chain are closed.

The isolation and the auth requirement are one decision seen from two sides.

## Options

**(1) Engine-side credential on disk, loaded by the engine itself.** The user
runs `claude setup-token` once and puts the token in a `.env` the engine reads
(Bun auto-loads `.env` from cwd — this is exactly why every developer path
works today). Preserves the config-dir boundary completely; the SDK subprocess
still gets a throwaway dir, we just populate its env ourselves.
*Cost:* two manual steps for the judge, and it stores a long-lived subscription
token in a plaintext file — which is what our own repo already does, but that is
a developer choice, not something to ask a judge to do casually.

**(2) `apiKeyHelper` in a settings file we control.** Documented, applies to the
SDK, and would let us keep the throwaway config dir (we can write a
`settings.json` into it). *But* it returns an **API key**, which the judge does
not have — it solves credential *rotation*, not credential *absence*. Only
useful if we accept an API key as the input.

**(3) `ANTHROPIC_API_KEY`.** The sanctioned path per the overview note. Correct
and unambiguous — and a non-starter for a competition judge, who has a Claude
subscription, not a Console billing account.

**(4) Don't nest — move synthesis to the outer agent.** The CLI stops making an
SDK call: it emits the stuffed context plus the synthesis instructions, and the
Smart-Interface Agent (already authenticated, by definition) produces the
answer. Sidesteps auth entirely and needs no credential anywhere.
*Cost, and it is real:* provenance discipline becomes prompt-enforced rather
than program-enforced, and we lose the instrumentation (tokens, cost, model
pinning per KB) that currently lives in the inference handler. It also moves the
inference handler's job out of the library, which is a spec-level change — the
engine is specced to *own* operations and consult the inference handler.
Against that: it is closest to what the SDK docs actually model, and it keeps
JiT inference intact.

**(5) Point `CLAUDE_CONFIG_DIR` at the user's real `~/.claude`.** Works
(verified). Rejected by Ethan on boundary grounds, and it sits closest to the
line the overview note draws. Recorded as considered, not recommended.

## Recommendation

For the competition deadline: **(1)**, documented honestly as a one-time setup
step, because it is the only option that both works today and preserves the
boundary. It is two commands and a paste, and it should be the demo skill's job
to walk the judge through it and explain what the token is.

For v0.2.2: **(4) deserves a real design conversation.** If the outer agent is
the intended place for inference in this architecture, that is a cleaner answer
than any credential plumbing — but it trades away instrumentation and moves a
responsibility the spec currently assigns to the engine, so it is Ethan's call,
not an implementation detail.

Either way, `requireAuthToken()`'s message should change: it currently tells the
user to "log into Claude Code," which we now know is **not sufficient** and will
send them in a circle.

## Still open

1. **Is the Bash-tool credential withholding stable and intentional?** Verified
   behaviourally, undocumented. Worth not building anything load-bearing on its
   inverse.
2. **macOS.** Every experiment here is Windows. Option (1) is platform-neutral
   (it is just a file we read), which is a point in its favour; option (5) would
   need Keychain handling. `testing/probes/auth-config-dir.ts` is kept so a Mac
   can be checked.
3. **The policy question** — whether a locally-installed tool spending the
   user's own subscription quota is within the spirit of the overview note.
   Worth asking Anthropic directly rather than guessing.

Note for whoever picks this up: **do not use the `claude-api` skill** — it is
fatally bugged. Use the `claude-code-guide` agent or web search, and verify
rather than recalling.
