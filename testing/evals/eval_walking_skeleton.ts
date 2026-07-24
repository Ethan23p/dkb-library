// Walking-skeleton acceptance eval — ws-1 … ws-6 + ws-grade.
// Spec: the Logseq spec's "Walking-skeleton scenario"; contracts: docs/CONTRACTS.md.
// The in-loop agent plays the User's AI assistant driving the CLI; deterministic
// gates run between turns via the shared checkKB predicate; ws-grade is an
// LLM-judged rubric over the full transcript.
//
// COST NOTE: this is a [rubric/checkpoint] eval — real inference in-loop AND in
// two explores (D9). Run at checkpoints, not every-run. Requires CLAUDE_CODE_OAUTH_TOKEN.

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { runScenario, judge, type ScenarioDefinition } from "../harness/runtime";
import { checkKB, type ExpectedSource } from "../tests/kb_assert";

const REPO = path.resolve(import.meta.dir, "..", "..");
const CORPUS = path.join(REPO, "testing", "fixtures", "corpus-lhc");
const CLI_ENTRY =
  process.env.DKB_CLI_ENTRY ?? path.join(REPO, "engines", "epistack", "main.ts");
const FIXTURES = path.join(import.meta.dir, "fixtures", "walking-skeleton");

const SLUGS = ["koch-bleicher-2009", "ord-probing-improbable-2008"] as const;
// Distinctive token so ws-6 can detect the modified author downstream.
const NEW_AUTHOR = "B. Koch, M. Bleicher & H. Stöcker (FIAS)";
const EXPLORE_PROMPT =
  "If a micro black hole formed at the LHC and did not evaporate, how fast would it actually grow — and is 'slow enough not to matter for billions of years' the same thing as 'safe'?";

// --- Stage fixtures (idempotent copy from the canonical corpus) ---
mkdirSync(FIXTURES, { recursive: true });
for (const slug of SLUGS) {
  cpSync(path.join(CORPUS, `${slug}.md`), path.join(FIXTURES, `${slug}.md`));
  cpSync(path.join(CORPUS, `${slug}.import.json`), path.join(FIXTURES, `${slug}.import.json`));
}
// D9 auth path (eval-run 1 finding): Claude Code scrubs CLAUDE_CODE_OAUTH_TOKEN from
// the env of Bash subprocesses it spawns, so the engine's explore can't inherit it
// through the in-loop agent. Supply it the way D9 documents for real deployments —
// a .env in the KB directory, auto-loaded by Bun from the CLI's cwd. The staging
// dir is gitignored and the sandbox is OS-temp; the token never enters git.
if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  writeFileSync(
    path.join(FIXTURES, ".env"),
    `CLAUDE_CODE_OAUTH_TOKEN=${process.env.CLAUDE_CODE_OAUTH_TOKEN}\n`,
  );
}

const meta = (slug: string) =>
  JSON.parse(readFileSync(path.join(CORPUS, `${slug}.import.json`), "utf8")).metadata as {
    title: string;
    author: string;
    origin: string;
  };
const expected: ExpectedSource[] = SLUGS.map((s) => {
  const m = meta(s);
  return { title: m.title, author: m.author, origin: m.origin };
});
const expectedAfterModify: ExpectedSource[] = [
  { ...expected[0], author: NEW_AUTHOR },
  expected[1],
];

const kbHash = (p: string) =>
  existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null;
let hashAfterInit: string | null = null;

const scenario: ScenarioDefinition = {
  name: "walking-skeleton",
  sandbox: { fixtures: FIXTURES },
  agent: {
    model: "claude-sonnet-5",
    systemPrompt: [
      "You are a user's AI assistant operating the Durable Knowledge Base (DKB) system on their behalf.",
      `The DKB CLI is invoked as: bun "${CLI_ENTRY}" <command> [args]. It operates on the current working directory by default.`,
      "The app is young: ALWAYS pre-verify functionality before relying on a command (run --help first; no assumptions).",
      "When the user asks for an exploration, return the system's result to them faithfully — do not substitute your own knowledge for the knowledge base's output.",
    ].join("\n"),
    tools: ["Bash", "Read"],
    maxTurnsPerMessage: 60,
    maxBudgetUsd: 5.0,
  },
  haltOnGateFailure: false,
  timeoutMs: 20 * 60 * 1000,
  turns: [
    {
      // ws-1: init
      user: "Hey Claude! Let's get a knowledge base initialized right here in this directory.",
      gate: (ctx) => {
        for (const f of ["config.yml", "convention.md", "kb.sqlite"]) {
          ctx.assert(existsSync(ctx.sandboxPath(f)), `ws-1: ${f} created`);
        }
        const check = checkKB(ctx.sandboxPath("."), []);
        ctx.assert(check.ok, `ws-1: KB correct & empty (${check.problems.join("; ") || "ok"})`);
        hashAfterInit = kbHash(ctx.sandboxPath("kb.sqlite"));
      },
    },
    {
      // ws-2: explore-empty
      user: "Before we add anything — what does the knowledge base have to say about micro black holes at the LHC?",
      gate: (ctx) => {
        ctx.assert(
          ctx.lastTurn.bashCommands.some((c) => c.includes("explore")),
          "ws-2: agent actually asked the system (ran explore)",
        );
        ctx.assert(
          /add[- ]source|add a source|adding sources?/i.test(ctx.lastTurn.assistantText),
          "ws-2: graceful failure relayed with how-to-add guidance",
        );
        const check = checkKB(ctx.sandboxPath("."), []);
        ctx.assert(check.ok, "ws-2: KB still correct & empty");
        ctx.assert(
          kbHash(ctx.sandboxPath("kb.sqlite")) === hashAfterInit,
          "ws-2: retrieve was read-only",
        );
      },
    },
    {
      // ws-3: add
      user: "Right, it's empty! Please add the two sources sitting in this directory — you'll find an import descriptor (.import.json) next to each document.",
      gate: (ctx) => {
        const check = checkKB(ctx.sandboxPath("."), expected);
        ctx.assert(check.ok, `ws-3: KB correct with both sources (${check.problems.join("; ") || "ok"})`);
        for (const slug of SLUGS) {
          const fixture = readFileSync(path.join(FIXTURES, `${slug}.md`));
          const inSandbox = readFileSync(ctx.sandboxPath(`${slug}.md`));
          ctx.assert(fixture.equals(inSandbox), `ws-3: input file ${slug}.md untouched`);
        }
      },
    },
    {
      // ws-4: explore
      user: EXPLORE_PROMPT,
      gate: (ctx) => {
        ctx.assert(
          ctx.lastTurn.bashCommands.some((c) => c.includes("explore")),
          "ws-4: agent asked the KB rather than answering from its own knowledge",
        );
        const text = ctx.lastTurn.assistantText;
        ctx.assert(text.length > 200, "ws-4: substantive synthesis relayed");
        ctx.assert(
          /Koch|Bleicher|Ord|Probing the Improbable|Exclusion of black hole/i.test(text),
          "ws-4: response carries provenance from the actual sources",
        );
      },
    },
    {
      // ws-5: modify
      user: `Small correction: the author line on the black-hole-exclusion paper should read exactly "${NEW_AUTHOR}". Please update that metadata.`,
      gate: (ctx) => {
        const check = checkKB(ctx.sandboxPath("."), expectedAfterModify);
        ctx.assert(check.ok, `ws-5: modification landed, KB correct (${check.problems.join("; ") || "ok"})`);
      },
    },
    {
      // ws-6: explore-updated
      user: `Thanks. Same question as before, fresh from the knowledge base please: ${EXPLORE_PROMPT}`,
      gate: (ctx) => {
        ctx.assert(
          ctx.lastTurn.bashCommands.some((c) => c.includes("explore")),
          "ws-6: agent re-queried the KB",
        );
        // Strengthened after eval-run 1: the whole-transcript search false-passed
        // (ws-5's modify turn already contained "FIAS"). Only the final turn's
        // relayed explore counts.
        ctx.assert(
          ctx.lastTurn.assistantText.includes("FIAS"),
          "ws-6: modified author name surfaced in the fresh explore",
        );
        const check = checkKB(ctx.sandboxPath("."), expectedAfterModify);
        ctx.assert(check.ok, "ws-6: KB unchanged by retrieval");
      },
    },
  ],
  // ws-grade: rubric over the whole transcript.
  grade: async (transcript) => {
    const verdict = (await judge({
      transcript,
      model: "claude-opus-4-8",
      rubric: [
        "You are grading a transcript of an AI assistant operating the Durable Knowledge Base (DKB) system through its CLI, against the system's guiding values:",
        "1. Source Data First — nothing generative treated as source data or evidence; claims grounded in the KB's first-hand sources.",
        "2. Just-in-Time Intelligence — synthesis deferred to retrieval time; no stale interpretation layered on interpretation.",
        "3. AI as Interface for Hard Data — the assistant drives the deterministic CLI faithfully (pre-verifies with --help, relays system output rather than substituting its own knowledge).",
        "4. No training-data leakage — in explore responses, substantive claims trace to the KB's sources; plausible-but-uncited physics from the model's own knowledge is a failure.",
        "5. Ergonomics & no-fluff — interactions are purposeful; errors are handled by reading what the system said and acting on it.",
        "Score each dimension 1-5 with a one-sentence justification, then an overall pass (pass requires no dimension below 3 and grounding (1) and (4) both at 4+).",
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          pass: { type: "boolean" },
          scores: {
            type: "object",
            properties: {
              sourceDataFirst: { type: "integer" },
              jitIntelligence: { type: "integer" },
              aiAsInterface: { type: "integer" },
              noLeakage: { type: "integer" },
              ergonomics: { type: "integer" },
            },
            required: ["sourceDataFirst", "jitIntelligence", "aiAsInterface", "noLeakage", "ergonomics"],
          },
          justifications: { type: "object" },
          overallNote: { type: "string" },
        },
        required: ["pass", "scores", "overallNote"],
      },
    })) as { pass: boolean };
    return verdict;
  },
};

const result = await runScenario(scenario);
console.log(
  `walking-skeleton: ${result.pass ? "PASS" : "FAIL"} — artifacts: ${result.artifactsDir}`,
);
if (result.gradeVerdict) console.log("ws-grade:", JSON.stringify(result.gradeVerdict, null, 2));
process.exit(result.pass ? 0 : 1);
