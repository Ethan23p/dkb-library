// Harness types — the contract for eval definitions.
// Deliberately SDK-free: eval definitions import only from harness/runtime.ts,
// and everything they touch is defined here in plain TS.

export interface ScenarioDefinition {
  name: string;
  sandbox?: {
    /** Directory copied into the fresh temp sandbox (resolved relative to the eval file's cwd if relative). */
    fixtures?: string;
  };
  agent: {
    model: string;
    systemPrompt?: string;
    /** Base toolset for the in-loop agent. Default: ['Bash', 'Read']. */
    tools?: string[];
    /**
     * Local plugin directories to load for the session, so an eval can test the
     * shipped skills and commands rather than a prompt that stands in for them.
     * Paths only — the runtime owns the SDK's config shape. Relative paths
     * resolve against the eval process's cwd.
     */
    plugins?: string[];
    /**
     * Which skills the session may invoke — `'all'`, or names (`plugin:skill`
     * for plugin-qualified ones). Enabling skills is what makes a loaded plugin
     * reachable; without it the agent can see a plugin's bin/ on PATH but has
     * no way to invoke its SKILL.md. Naming them explicitly also keeps whatever
     * else is installed on the developer's machine out of the run.
     */
    skills?: string[] | "all";
    /** Runaway brake: max agentic turns (maps to SDK maxTurns for the whole session). */
    maxTurnsPerMessage?: number;
    /** Runaway brake: max spend for the whole scenario. */
    maxBudgetUsd?: number;
  };
  turns: TurnDef[];
  /** Stop sending further turns after a turn whose gate failed. Default: false (run all turns). */
  haltOnGateFailure?: boolean;
  /** Overall scenario wall-clock timeout in ms. Default: 5 minutes. */
  timeoutMs?: number;
  /** Optional LLM-as-judge slot; receives the full raw transcript. */
  grade?: (transcript: CapturedMessage[]) => Promise<GradeVerdict>;
}

export interface TurnDef {
  user: string;
  /** Runs after the agent finishes responding to this turn. Assertions are collected, never thrown. */
  gate?: (ctx: GateContext) => void | Promise<void>;
}

export interface GateContext {
  /** Absolute path into the sandbox. */
  sandboxPath(rel: string): string;
  /** Parsed view of the just-finished turn. */
  lastTurn: TurnView;
  /** Every SDK message captured so far, ordered. */
  transcript: CapturedMessage[];
  /** Record a labeled pass/fail outcome. */
  assert(cond: boolean, label: string): void;
  /** Record an unconditional failure. */
  fail(label: string): void;
  /** Run a subprocess in the sandbox (for KB introspection etc.). */
  exec(cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

/** One SDK message as captured: opaque payload plus capture metadata. */
export interface CapturedMessage {
  seq: number;
  ts: string; // ISO timestamp at capture
  message: unknown; // the raw SDK message, JSON-serializable
}

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError: boolean;
  /** Bash exit code when extractable from the structured tool result. */
  exitCode?: number;
}

/** Parsed view of one user-turn round trip. */
export interface TurnView {
  index: number; // 0-based
  user: string;
  assistantText: string;
  toolCalls: ToolCall[];
  /** Commands extracted from Bash tool_use inputs, in order. */
  bashCommands: string[];
  toolResults: ToolResult[];
  /** From the turn's result message. */
  numTurns: number;
  costUsd: number;
  durationMs: number;
  usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number };
  resultSubtype: string; // 'success' | error subtypes
  isError: boolean;
}

export interface GateResult {
  turn: number; // 0-based turn index
  label: string;
  pass: boolean;
}

export interface Stats {
  turns: number;
  agentTurnsPerMessage: number[];
  toolCallCount: number;
  bashCommandCount: number;
  /** Tally of Bash exit codes where extractable, e.g. { "0": 5, "1": 1 }. */
  bashExitCodes: Record<string, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalCostUsd: number;
  wallClockMsPerTurn: number[];
  wallClockMsTotal: number;
  /** Sandbox top-level listing before the session vs after. */
  sandboxBefore: string[];
  sandboxAfter: string[];
}

export interface GradeVerdict {
  pass: boolean;
  [key: string]: unknown;
}

export interface ScenarioResult {
  pass: boolean;
  gates: GateResult[];
  stats: Stats;
  artifactsDir: string;
  transcript: CapturedMessage[];
  turns: TurnView[];
  gradeVerdict?: GradeVerdict;
  /** Fatal runtime error (timeout, SDK failure), if any. */
  error?: string;
}
