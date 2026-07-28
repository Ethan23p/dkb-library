// Demo-plugin rehearsal — the playtester's path, automated.
//
// This is the eval the walking-skeleton one deliberately is not: the agent gets
// **no preamble about the CLI**. Everything it knows has to arrive through the
// two shipped plugins, exactly as it would for someone who just ran
// `/plugin install`. If the skills don't carry the interface, this fails — which
// is the point. It rehearses everything after installation; `/plugin marketplace
// add` is a Claude Code slash command, not SDK surface, and stays a manual check.
//
// Run: bun run eval:demo   (needs CLAUDE_CODE_OAUTH_TOKEN; ~$1, one LHC explore)

import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import { runScenario, type GateContext, type ScenarioDefinition } from "../harness/runtime";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");
const DEMO_PLUGIN = path.join(REPO_ROOT, "demo");
const SHIPPED_LHC = path.join(DEMO_PLUGIN, "kbs", "lhc");

/** FLF asks for "fresh machine to running process in ~5 min". Turns 1-3 are that path. */
const FIRST_ANSWER_BUDGET_MS = 5 * 60 * 1000;

const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

async function hashOrNull(p: string): Promise<string | null> {
  try {
    return sha256(await readFile(p));
  } catch {
    return null;
  }
}

async function isDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

/** The hydrated copy's directory name is the agent's choice; find whatever it made. */
async function hydratedDirs(sandbox: string): Promise<string[]> {
  try {
    const entries = await readdir(sandbox, { withFileTypes: true });
    const found: string[] = [];
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      if (await hashOrNull(path.join(sandbox, e.name, "kb.sqlite"))) found.push(e.name);
    }
    return found;
  } catch {
    return [];
  }
}

// Captured before the run: the demo plugin must come out of this byte-identical.
// A knowledge base that quietly lives in the plugin root is the failure mode the
// whole hydrate design exists to prevent, so it gets a gate rather than a comment.
const shippedLhcHash = await hashOrNull(path.join(SHIPPED_LHC, "kb.sqlite"));
if (!shippedLhcHash) {
  console.error("error: demo/kbs/lhc/kb.sqlite is missing");
  console.error("next: run 'bun demo/build.ts' to generate the demo knowledge bases");
  process.exit(2);
}

const turnDurations: number[] = [];
const track = (ctx: GateContext) => turnDurations.push(ctx.lastTurn.durationMs);
const elapsed = () => turnDurations.reduce((a, b) => a + b, 0);

/** Hash of the KB the agent hydrated, so later turns can prove retrieval didn't mutate it. */
let hydratedHash: string | null = null;

const scenario: ScenarioDefinition = {
  name: "demo",
  agent: {
    model: "claude-sonnet-5",
    // Deliberately minimal: a working directory and shell access, nothing about
    // knowledge bases, the CLI, or provenance. The plugins supply all of that.
    systemPrompt:
      "You are helping someone at their computer. You have shell access and are " +
      "working in their current directory. Be conversational and brief.",
    // `tools` is the base set of built-in tools, so Skill has to be listed here
    // or the skills below are unreachable no matter what is enabled.
    tools: ["Bash", "Read", "Skill"],
    plugins: [REPO_ROOT, DEMO_PLUGIN],
    // Only the two shipped skills — nothing else the developer happens to have
    // installed. This is the whole interface under test.
    skills: ["dkb:dkb", "dkb-demo:dkb-demo"],
    maxTurnsPerMessage: 25,
    maxBudgetUsd: 3,
  },
  haltOnGateFailure: false,
  timeoutMs: 15 * 60 * 1000,
  turns: [
    {
      // Verbatim the thing a judge actually types first.
      user: "I just installed this — what can I do?",
      gate: async (ctx) => {
        track(ctx);
        const text = ctx.lastTurn.assistantText;

        ctx.assert(/knowledge base/i.test(text), "orients the user around a knowledge base");
        ctx.assert(/lhc|collider|black hole/i.test(text), "offers the LHC corpus");
        ctx.assert(/saber|sabre|airline/i.test(text), "names the other corpus too");

        // Ethan's consent tweak: Claude asks before writing to their disk.
        const hydrated = await hydratedDirs(ctx.sandboxPath("."));
        ctx.assert(hydrated.length === 0, "wrote nothing to disk before asking");
        ctx.assert(/\?/.test(text), "ends by asking rather than assuming");
      },
    },
    {
      user: "Yes, go ahead.",
      gate: async (ctx) => {
        track(ctx);
        const hydrated = await hydratedDirs(ctx.sandboxPath("."));
        ctx.assert(hydrated.length === 1, `hydrated exactly one KB into the sandbox (got ${hydrated.length})`);

        const kbDir = ctx.sandboxPath(hydrated[0] ?? "__none__");
        for (const artifact of ["config.yml", "kb.sqlite", "convention.md"]) {
          ctx.assert(await hashOrNull(path.join(kbDir, artifact)) !== null, `KB has ${artifact}`);
        }

        // A copy, not a rebuild — and the LHC one, which is the documented default.
        hydratedHash = await hashOrNull(path.join(kbDir, "kb.sqlite"));
        ctx.assert(hydratedHash === shippedLhcHash, "hydrated KB is byte-identical to the shipped LHC KB");

        // The KB landed in the user's directory, not inside the plugin.
        ctx.assert(await isDir(kbDir), "KB lives in the sandbox cwd");
        ctx.assert(
          (await hashOrNull(path.join(SHIPPED_LHC, "kb.sqlite"))) === shippedLhcHash,
          "the plugin's own copy was not written to",
        );
      },
    },
    {
      user: "What do my sources say about whether the LHC could produce a dangerous black hole?",
      gate: async (ctx) => {
        track(ctx);
        const text = ctx.lastTurn.assistantText;

        // The load-bearing gate. Claude knows the LHC literature from training,
        // so an answer naming Giddings and Ord proves nothing on its own — an
        // earlier version of this eval passed exactly such an answer while the
        // knowledge base was never touched. Provenance-shaped text is only
        // evidence if a retrieval actually produced it.
        const explored = ctx.lastTurn.bashCommands.some((c) => /retrieve\s+explore/.test(c));
        ctx.assert(explored, "the answer came from a real 'retrieve explore' call");

        const authors = /Giddings|Mangano|Ord|Hillerbrand|Sandberg|Koch|Bleicher|Jaffe|Ellis|LSAG/i;
        ctx.assert(explored && authors.test(text), "answer names at least one real source author");
        ctx.assert(explored && /entry|source|id\b|origin|arxiv|cern/i.test(text), "answer carries provenance handles");

        // Explored the user's copy, not the plugin's. Reading the plugin's KB
        // directly would look identical in the answer and quietly re-introduce
        // the failure hydration exists to prevent.
        const exploreCmds = ctx.lastTurn.bashCommands.filter((c) => /retrieve\s+explore/.test(c));
        ctx.assert(
          exploreCmds.length > 0 && !exploreCmds.some((c) => /kbs[\/\\](lhc|saber)/.test(c)),
          "explored the hydrated copy, not the plugin's own KB",
        );

        // Retrieval is read-only. If an explore can change the ledger, the
        // append-only guarantee is theatre.
        const hydrated = await hydratedDirs(ctx.sandboxPath("."));
        const nowHash = await hashOrNull(path.join(ctx.sandboxPath(hydrated[0] ?? "__none__"), "kb.sqlite"));
        ctx.assert(nowHash === hydratedHash, "retrieval did not mutate the knowledge base");

        // The path a judge is promised: installed to a real, sourced answer.
        ctx.assert(
          elapsed() <= FIRST_ANSWER_BUDGET_MS,
          `first sourced answer within ${FIRST_ANSWER_BUDGET_MS / 60000} min (took ${(elapsed() / 1000).toFixed(0)}s)`,
        );
      },
    },
    {
      user: "Actually, show me the other one — the airline story.",
      gate: async (ctx) => {
        track(ctx);
        const hydrated = await hydratedDirs(ctx.sandboxPath("."));
        ctx.assert(hydrated.length === 2, `both KBs now exist side by side (got ${hydrated.length})`);
        ctx.assert(
          (await hashOrNull(path.join(SHIPPED_LHC, "kb.sqlite"))) === shippedLhcHash,
          "plugin still untouched after switching",
        );
      },
    },
  ],
};

const result = await runScenario(scenario);
process.exit(result.pass ? 0 : 1);
