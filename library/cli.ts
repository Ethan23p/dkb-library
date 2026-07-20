// cli — command grammar and dispatch (CONTRACTS D1, D2, D3).
//
// The grammar derives from the capability declarations below, not from
// hand-written branching — commands, subcommands, and flags are data. The
// engine contributes only its title, paths, and convention seed (D1); the
// library owns everything after the entry point.

import * as path from "node:path";
import { DkbError, ExitCode } from "./errors";
import { initKb, type EngineDef } from "./init";
import { addSource } from "./ingestion";
import { modifyEntry } from "./modify";
import { explore } from "./retrieval";

interface FlagSpec {
  /** true if the flag consumes a value token. */
  takesValue: boolean;
}

interface CommandDecl {
  /** v0.2.1 walking skeleton: declared-but-unimplemented commands exit UNEXPECTED. */
  implemented: boolean;
  flags: Record<string, FlagSpec>;
  /** Allowed subcommand for the second positional, if any. */
  subcommands?: string[];
  summary: string;
}

/** Global flags, valid on every command (D2). */
const GLOBAL_FLAGS: Record<string, FlagSpec> = {
  "--dir": { takesValue: true },
  "--json": { takesValue: false },
};

/** The v0.2.1 capability declarations — the grammar's single source. */
const COMMANDS: Record<string, CommandDecl> = {
  init: {
    implemented: true,
    flags: {},
    summary: "initialize a knowledge base in the target dir",
  },
  "add-source": {
    implemented: true,
    flags: { "--json-import": { takesValue: true } },
    summary: "ingest one source via import JSON",
  },
  retrieve: {
    implemented: true,
    flags: {},
    subcommands: ["explore"],
    summary: "context-stuffed synthesis with provenance",
  },
  "modify-entry": {
    implemented: true,
    flags: {
      "--id": { takesValue: true },
      "--attribute": { takesValue: true },
      "--value": { takesValue: true },
    },
    summary: "modify one metadata attribute of an entry",
  },
};

function usageLine(): string {
  return Object.entries(COMMANDS)
    .map(([name, c]) => `  ${name}${c.subcommands ? ` <${c.subcommands.join("|")}>` : ""} — ${c.summary}`)
    .join("\n");
}

export interface ParsedInvocation {
  command: string;
  positionals: string[]; // after the command name
  flags: Map<string, string | true>;
  dir: string;
  json: boolean;
}

/** Parse argv against the declared grammar. Unknown command/flag → USAGE (2). */
export function parseArgs(argv: string[], cwd: string): ParsedInvocation {
  const [commandName, ...rest] = argv;
  if (!commandName || commandName.startsWith("--")) {
    throw new DkbError(
      ExitCode.USAGE,
      "no command given",
      `invoke one of:\n${usageLine()}`,
    );
  }
  const decl = COMMANDS[commandName];
  if (!decl) {
    throw new DkbError(
      ExitCode.USAGE,
      `unknown command '${commandName}'`,
      `invoke one of:\n${usageLine()}`,
    );
  }

  const flags = new Map<string, string | true>();
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith("--")) {
      const spec = GLOBAL_FLAGS[token] ?? decl.flags[token];
      if (!spec) {
        throw new DkbError(
          ExitCode.USAGE,
          `unknown flag '${token}' for command '${commandName}'`,
          `valid flags: ${[...Object.keys(GLOBAL_FLAGS), ...Object.keys(decl.flags)].join(", ")}`,
        );
      }
      if (spec.takesValue) {
        const value = rest[++i];
        if (value === undefined) {
          throw new DkbError(
            ExitCode.USAGE,
            `flag '${token}' requires a value`,
            `pass '${token} <value>'`,
          );
        }
        flags.set(token, value);
      } else {
        flags.set(token, true);
      }
    } else {
      positionals.push(token);
    }
  }

  if (decl.subcommands) {
    const sub = positionals[0];
    if (!sub || !decl.subcommands.includes(sub)) {
      throw new DkbError(
        ExitCode.USAGE,
        sub
          ? `unknown subcommand '${sub}' for '${commandName}'`
          : `'${commandName}' requires a subcommand`,
        `use: ${commandName} <${decl.subcommands.join("|")}> …`,
      );
    }
  }

  const dirFlag = flags.get("--dir");
  return {
    command: commandName,
    positionals,
    flags,
    dir: typeof dirFlag === "string" ? path.resolve(cwd, dirFlag) : cwd,
    json: flags.get("--json") === true,
  };
}

/** A required value-taking flag: absent → USAGE (2) with the fix spelled out. */
function requireStringFlag(inv: ParsedInvocation, flag: string): string {
  const value = inv.flags.get(flag);
  if (typeof value !== "string") {
    throw new DkbError(
      ExitCode.USAGE,
      `'${inv.command}' requires '${flag} <value>'`,
      `re-run as: ${inv.command} ${flag} <value> …`,
    );
  }
  return value;
}

/**
 * Run one CLI invocation for an engine. Returns the D3 exit code; writes
 * human/JSON output to stdout and failure guidance to stderr. Never throws,
 * never prints a stack trace.
 */
export async function runCli(engine: EngineDef, argv: string[], cwd = process.cwd()): Promise<number> {
  try {
    const inv = parseArgs(argv, cwd);
    const decl = COMMANDS[inv.command];

    if (!decl.implemented) {
      // Recognized by the grammar, not yet built in this walking-skeleton cycle.
      throw new DkbError(
        ExitCode.UNEXPECTED,
        `'${inv.command}' is a valid ${engine.title} command but is not implemented yet in this build`,
        "init, add-source, and modify-entry work so far (v0.2.1 walking skeleton in progress); check LOOP.md for build status",
      );
    }

    switch (inv.command) {
      case "init": {
        const res = initKb(inv.dir, engine);
        if (inv.json) {
          process.stdout.write(
            JSON.stringify({ ok: true, dir: res.dir, artifacts: ["config.yml", "kb.sqlite", "convention.md"] }) + "\n",
          );
        } else {
          process.stdout.write(
            `Initialized ${engine.title} knowledge base in ${res.dir}\n` +
              `  config.yml, kb.sqlite, convention.md created. Next: add-source --json-import <file>\n`,
          );
        }
        return ExitCode.OK;
      }
      case "add-source": {
        const importPath = requireStringFlag(inv, "--json-import");
        const res = addSource(inv.dir, path.resolve(cwd, importPath));
        if (inv.json) {
          process.stdout.write(
            JSON.stringify({ ok: true, id: res.id, tx: res.tx, title: res.title, "content-hash": res.contentHash }) +
              "\n",
          );
        } else {
          process.stdout.write(
            `Added source '${res.title}' as entry ${res.id} (tx ${res.tx})\n` +
              `  content-hash ${res.contentHash}. Next: retrieve explore <query>\n`,
          );
        }
        return ExitCode.OK;
      }
      case "retrieve": {
        // Grammar guarantees positionals[0] is a valid subcommand ("explore").
        const queryText = inv.positionals.slice(1).join(" ").trim();
        if (queryText.length === 0) {
          throw new DkbError(
            ExitCode.USAGE,
            "'retrieve explore' requires a query",
            "re-run as: retrieve explore <query>",
          );
        }
        const artifact = await explore(inv.dir, queryText);
        if (inv.json) {
          process.stdout.write(JSON.stringify(artifact) + "\n");
        } else {
          const provenanceLines =
            artifact.provenance.length > 0
              ? artifact.provenance
                  .map((p) => `  [${p.id}] ${p.title} — ${p.author} (${p.origin})`)
                  .join("\n")
              : "  (none)";
          process.stdout.write(
            `Coverage: ${artifact.coverage}\n\n` +
              (artifact.synthesis.length > 0
                ? `${artifact.synthesis}\n\n`
                : "No synthesis: the knowledge base does not cover this query.\n\n") +
              `Provenance:\n${provenanceLines}\n`,
          );
        }
        return ExitCode.OK;
      }
      case "modify-entry": {
        const idRaw = requireStringFlag(inv, "--id");
        const attribute = requireStringFlag(inv, "--attribute");
        const value = requireStringFlag(inv, "--value");
        const id = Number(idRaw);
        if (!Number.isInteger(id)) {
          throw new DkbError(
            ExitCode.USAGE,
            `'--id' must be an integer entity id, got '${idRaw}'`,
            "pass the integer id echoed by add-source, e.g. --id 4",
          );
        }
        const res = modifyEntry(inv.dir, id, attribute, value);
        if (inv.json) {
          process.stdout.write(
            JSON.stringify({
              ok: true,
              id: res.id,
              attribute: res.attribute,
              previous: res.previous ?? null,
              value: res.value,
              tx: res.tx,
            }) + "\n",
          );
        } else {
          process.stdout.write(
            `Modified entry ${res.id}: ${res.attribute} ` +
              (res.previous !== undefined ? `'${res.previous}' -> '${res.value}'` : `set to '${res.value}'`) +
              ` (tx ${res.tx}; prior value retained in the log)\n`,
          );
        }
        return ExitCode.OK;
      }
      default:
        // Unreachable while the declarations above are exhaustive.
        throw new DkbError(
          ExitCode.UNEXPECTED,
          `command '${inv.command}' is declared implemented but has no handler`,
          "this is a library bug — report it in LOOP.md",
        );
    }
  } catch (err) {
    if (err instanceof DkbError) {
      process.stderr.write(err.render() + "\n");
      return err.code;
    }
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `error: unexpected failure: ${message}\nnext: re-run the command; if it persists, report it in LOOP.md\n`,
    );
    return ExitCode.UNEXPECTED;
  }
}

export type { EngineDef };
