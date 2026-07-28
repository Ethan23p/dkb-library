// Probe: can the Agent SDK authenticate from the user's existing Claude Code
// login when CLAUDE_CODE_OAUTH_TOKEN is absent?
//
// `library/inference.ts` points CLAUDE_CONFIG_DIR at a fresh throwaway dir
// (D11 boundary hygiene), which leaves the spawned CLI with no stored
// credentials — so the env token becomes the only auth path, and a merely
// logged-in user gets exit 8. This asks whether the login alone suffices when
// the subprocess is allowed to see the real config dir.
//
// Run:  bun testing/probes/auth-config-dir.ts
// Run it from a directory with NO .env as well — inside the repo, Bun
// auto-loads .env and would hand the token back through process.env.
//
// Expected if the login suffices: `RESULT subtype: success`.
// Background and open questions: AUTH-FINDING.md (repo root).

import { query } from "@anthropic-ai/claude-agent-sdk";

// Strip before the spread below, so nothing leaks in via process.env.
delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
delete process.env.ANTHROPIC_API_KEY;

const home = process.env.USERPROFILE ?? process.env.HOME;
if (!home) {
  console.error("error: neither USERPROFILE nor HOME is set");
  console.error("next: run this from a normal user shell");
  process.exit(2);
}

try {
  const q = query({
    prompt: "Reply with exactly: OK",
    options: {
      model: "claude-haiku-4-5-20251001",
      maxTurns: 1,
      tools: [],
      settingSources: [],
      executable: "bun",
      env: {
        ...process.env,
        CLAUDECODE: undefined,
        CLAUDE_CODE_ENTRYPOINT: undefined,
        CLAUDE_CODE_OAUTH_TOKEN: undefined,
        ANTHROPIC_API_KEY: undefined,
        // The one variable under test.
        CLAUDE_CONFIG_DIR: `${home}/.claude`,
      },
    },
  });

  for await (const m of q as AsyncIterable<any>) {
    if (m.type === "result") {
      console.log(
        "RESULT subtype:", m.subtype,
        "| is_error:", m.is_error,
        "|", JSON.stringify(m.result ?? "").slice(0, 120),
      );
    }
  }
} catch (e: unknown) {
  console.log("THREW:", String(e).slice(0, 300));
}
