// inference — the inference handler (CONTRACTS D9; spec: "inference handler").
//
// This module owns ALL agentic machinery in the library: it is the single
// place that touches the Agent SDK, the single place the model and prompt are
// configured, and it formalizes the contract for using agents in-program
// (provider = Agent-SDK subagent, structured JSON return). Consumers
// (retrieval/synthesis) call `runExploreInference` and never see the SDK.
//
// v0.2.1: Agent-SDK only, authenticated by CLAUDE_CODE_OAUTH_TOKEN — minted by
// `claude setup-token` and supplied either in the environment or via a .env in
// the working directory (A6, `resolveAuthToken`). Being logged into Claude Code
// is NOT sufficient: Anthropic does not permit external programs to use /login
// credentials, and the token is withheld from Bash-tool subprocesses anyway.
// See AUTH-FINDING.md. Plugin generation is post-v0.2.

import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { DkbError, ExitCode } from "./errors";
import { note } from "./log";

// The model is not hardcoded here: it is an instantiation decision, declared by
// the engine and written into config.yml at init (see config.ts, CONTRACTS A4).
// This module remains the one place the SDK itself is configured.

/** A source handed to the inference call, in full (context stuffing). */
export interface InferenceSource {
  id: number;
  title: string;
  author: string;
  origin: string;
  content: string;
}

/** The structured verdict demanded from the subagent. */
export interface ExploreVerdict {
  coverage: "full" | "partial" | "none";
  synthesis: string; // empty string when coverage is "none"
  /** Entity ids of the sources the synthesis actually drew on. */
  sourceIds: number[];
}

/**
 * Read `CLAUDE_CODE_OAUTH_TOKEN` out of a `.env` file, without pulling in a
 * dependency or mutating anything else. Deliberately minimal: `KEY=VALUE`, one
 * per line, `#` comments, optional surrounding quotes. Anything fancier belongs
 * in a real dotenv library, and we do not need one for a single key.
 */
function tokenFromEnvFile(dir: string): string | null {
  let text: string;
  try {
    text = readFileSync(path.join(dir, ".env"), "utf8");
  } catch {
    return null; // absent or unreadable is a normal case, not an error
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== "CLAUDE_CODE_OAUTH_TOKEN") continue;
    const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (value) return value;
  }
  return null;
}

/**
 * Resolve the inference credential (A6). Order, first match wins:
 *
 *   1. `CLAUDE_CODE_OAUTH_TOKEN` in the environment — a human running the CLI
 *      from their own terminal, plus every developer and CI path.
 *   2. `.env` in the **process cwd**.
 *
 * Step 2 is not redundant under Bun, which auto-loads `.env` into the
 * environment — but relying on that made the behaviour an accident of the
 * runtime rather than something the program promises. Reading it here makes it
 * explicit, testable, and true under any runtime.
 *
 * The knowledge-base directory is deliberately NOT searched. A knowledge base
 * is meant to be copied, hydrated and shared; a credential sitting inside one
 * would travel with it. Keep secrets attached to the operator, not the data.
 */
export function resolveAuthToken(): string | null {
  const fromEnv = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.trim();
  return tokenFromEnvFile(process.cwd());
}

/**
 * D9 + A3 + A6: no usable credential → exit 8 (AUTH) before any call is made.
 *
 * The message matters more than usual here. Being logged into Claude Code is
 * *not* sufficient and never was: Anthropic does not let external programs use
 * `/login` credentials, and Claude Code withholds `CLAUDE_CODE_OAUTH_TOKEN`
 * from the environment of Bash-tool subprocesses — so a token exported in a
 * shell does not reach a CLI that an agent launches. The old wording told
 * people to log in, which sent them in a circle. See AUTH-FINDING.md.
 */
export function requireAuthToken(): void {
  const token = resolveAuthToken();
  if (!token) {
    throw new DkbError(
      ExitCode.AUTH,
      "no inference auth token found (CLAUDE_CODE_OAUTH_TOKEN is not set, and no .env in this directory supplies it)",
      "run 'claude setup-token' to mint a token, then write CLAUDE_CODE_OAUTH_TOKEN=<token> into a .env file in this directory and re-run. Being logged into Claude Code is not sufficient on its own",
    );
  }
  // Carry a file-sourced token into the environment the SDK subprocess inherits.
  process.env.CLAUDE_CODE_OAUTH_TOKEN = token;
}

/** Build the explore prompt: guidance + the query + every source in full. */
function buildPrompt(userQuery: string, sources: InferenceSource[]): string {
  const sourceBlocks = sources
    .map(
      (s) =>
        `<source id="${s.id}" title=${JSON.stringify(s.title)} author=${JSON.stringify(s.author)} origin=${JSON.stringify(s.origin)}>\n${s.content}\n</source>`,
    )
    .join("\n\n");

  return [
    "You are the retrieval subagent of a Durable Knowledge Base. Your verdict must be grounded SOLELY in the sources provided below — never in your own training knowledge (Source Data First). If the sources do not cover the query, say so; do not fill gaps from memory.",
    "",
    `Query: ${userQuery}`,
    "",
    "Sources (the complete current knowledge base):",
    sourceBlocks,
    "",
    "Respond with ONLY a single JSON object, no prose, no code fences, exactly this shape:",
    '{"coverage": "full" | "partial" | "none", "synthesis": "…", "source_ids": [1, 2]}',
    "Rules:",
    '- "coverage" is your judgment of how well the sources cover the query: "full" (well covered), "partial" (some relevant material), "none" (nothing relevant).',
    '- "synthesis" answers the query using only the sources. When coverage is "none" it MUST be the empty string "".',
    '- "source_ids" lists the ids of the sources the synthesis actually drew on. Empty array when coverage is "none".',
  ].join("\n");
}

/** Extract and strictly validate the JSON verdict from the model's reply. */
function parseVerdict(raw: string, validIds: Set<number>): ExploreVerdict {
  const malformed = (why: string): DkbError =>
    new DkbError(
      ExitCode.UNEXPECTED,
      `inference returned a malformed verdict (${why})`,
      "re-run the explore; if it persists, report the query used as a bug against the library",
    );

  // Tolerate stray text around the object, but require exactly one object.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw malformed("no JSON object in reply");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw malformed("reply is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) throw malformed("not a JSON object");
  const v = parsed as Record<string, unknown>;

  if (v.coverage !== "full" && v.coverage !== "partial" && v.coverage !== "none") {
    throw malformed(`'coverage' must be full|partial|none, got ${JSON.stringify(v.coverage)}`);
  }
  if (typeof v.synthesis !== "string") throw malformed("'synthesis' must be a string");
  if (!Array.isArray(v.source_ids) || v.source_ids.some((n) => !Number.isInteger(n))) {
    throw malformed("'source_ids' must be an array of integer ids");
  }
  const sourceIds = (v.source_ids as number[]).filter((n, i, a) => a.indexOf(n) === i);
  for (const id of sourceIds) {
    if (!validIds.has(id)) throw malformed(`'source_ids' references unknown entity ${id}`);
  }

  // D10 contract enforcement: coverage "none" ⇒ empty synthesis, no provenance.
  // Dropping stray text here is contract enforcement, not fabrication.
  if (v.coverage === "none") {
    return { coverage: "none", synthesis: "", sourceIds: [] };
  }
  return { coverage: v.coverage, synthesis: v.synthesis, sourceIds };
}

/**
 * Run one explore inference: all sources in full + guidance + the query, to a
 * single-turn Agent-SDK subagent with NO tools (strictly read-only by
 * construction — D9/D11: the subagent cannot touch the KB or the filesystem).
 */
export async function runExploreInference(
  userQuery: string,
  sources: InferenceSource[],
  model: string,
): Promise<ExploreVerdict> {
  requireAuthToken();
  note(`explore inference: ${sources.length} source(s) in full → ${model}`);

  // D11: the SDK's own bookkeeping is pointed at the OS temp dir so nothing
  // is written outside the declared boundaries; sessions are not persisted.
  const configDir = mkdtempSync(path.join(tmpdir(), "dkb-inference-"));

  const options: Options = {
    model,
    tools: [], // pure synthesis over the stuffed context; no tool access
    maxTurns: 1,
    settingSources: [], // no user/project settings, no CLAUDE.md leakage
    persistSession: false,
    executable: "bun",
    cwd: configDir,
    env: {
      ...process.env,
      // Nested-session hygiene + single auth path (CLAUDE_CODE_OAUTH_TOKEN).
      CLAUDECODE: undefined,
      CLAUDE_CODE_ENTRYPOINT: undefined,
      ANTHROPIC_API_KEY: undefined,
      CLAUDE_CONFIG_DIR: configDir,
      // Every explore is a one-shot session in a throwaway config dir, so a
      // prompt cache written here can never be read back — measured:
      // cache_read_input_tokens is 0 on every call, including back-to-back
      // ones over the same corpus. Left on, the SDK still writes the whole
      // stuffed context to a 1-hour cache entry and bills the write premium
      // for storage nothing will ever hit. Turning it off measured ~44%
      // cheaper on a 187k-token corpus with no change in output quality.
      //
      // Revisit if explores ever become multi-turn or reuse a session — then
      // the cache would start paying for itself and this should come out.
      DISABLE_PROMPT_CACHING: "1",
    } as Record<string, string>,
  };

  let replyText: string | undefined;
  try {
    for await (const msg of query({ prompt: buildPrompt(userQuery, sources), options })) {
      if (msg.type === "result") {
        if (msg.subtype === "success") replyText = msg.result;
        else {
          throw new DkbError(
            ExitCode.UNEXPECTED,
            `inference call ended without a reply (${msg.subtype})`,
            "re-run the explore; if it persists, check that you are logged into Claude Code on this system",
          );
        }
      }
    }
  } catch (err) {
    if (err instanceof DkbError) throw err;
    throw new DkbError(
      ExitCode.UNEXPECTED,
      `inference call failed: ${err instanceof Error ? err.message : String(err)}`,
      "check that CLAUDE_CODE_OAUTH_TOKEN is valid (log into Claude Code again if needed) and re-run",
    );
  }

  if (replyText === undefined) {
    throw new DkbError(
      ExitCode.UNEXPECTED,
      "inference call produced no result message",
      "re-run the explore; if it persists, report it as a bug against the library",
    );
  }

  return parseVerdict(replyText, new Set(sources.map((s) => s.id)));
}
