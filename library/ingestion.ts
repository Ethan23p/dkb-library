// ingestion — the add-source capability (CONTRACTS D6, D7, D8).
//
// Source Data First: content is stored verbatim (LF-normalized per D8), the
// hash is derived over the stored bytes, and the input files on disk are never
// touched. One source per import JSON; one ledger transaction per ingest.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { DkbError, ExitCode } from "./errors";
import { KB_FILENAME, Ledger, type DatomInput } from "./ledger";

/** D6 required metadata fields (beyond content itself). */
const REQUIRED_METADATA = ["title", "author", "origin"] as const;
/** D6 optional metadata fields. */
const OPTIONAL_METADATA = ["contributor", "justification"] as const;
/** v0.2.1 accepted content: plain text only (D7). */
const ACCEPTED_EXTENSIONS = [".md", ".txt"];

export interface AddSourceResult {
  id: number;
  tx: number;
  title: string;
  contentHash: string;
}

/** D8: CRLF → LF, trailing newline preserved as-is. */
export function lfNormalize(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
}

/** Parse + validate the D7 import JSON, naming each problem (exit 5). */
function parseImportJson(importPath: string): {
  content: string | undefined;
  contentPath: string | undefined;
  metadata: Record<string, string>;
} {
  if (!existsSync(importPath)) {
    throw new DkbError(
      ExitCode.NOT_FOUND,
      `import file not found: ${importPath}`,
      "pass '--json-import <file>' pointing at an existing import JSON (see convention.md for the shape)",
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(importPath, "utf8"));
  } catch (err) {
    throw new DkbError(
      ExitCode.VALIDATION,
      `import file is not valid JSON: ${importPath} (${err instanceof Error ? err.message : String(err)})`,
      "fix the JSON syntax; expected shape: { \"content_path\" | \"content\", \"metadata\": { title, author, origin, … } }",
    );
  }
  const problems: string[] = [];
  const doc = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    problems.push("top level must be a JSON object");
  }

  const hasContentPath = typeof doc.content_path === "string" && doc.content_path.length > 0;
  const hasContent = typeof doc.content === "string";
  if (hasContentPath === hasContent) {
    problems.push(
      hasContent
        ? "'content_path' and 'content' are mutually exclusive — provide exactly one"
        : "exactly one of 'content_path' or 'content' (inline string) is required",
    );
  }
  if (hasContentPath) {
    const ext = path.extname(doc.content_path as string).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      problems.push(
        `'content_path' has extension '${ext || "(none)"}' — v0.2.1 accepts plain text only (${ACCEPTED_EXTENSIONS.join(", ")})`,
      );
    }
  }

  const metadata: Record<string, string> = {};
  const meta = doc.metadata;
  if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
    problems.push("'metadata' object is required");
  } else {
    const m = meta as Record<string, unknown>;
    for (const field of REQUIRED_METADATA) {
      if (typeof m[field] === "string" && (m[field] as string).length > 0) {
        metadata[field] = m[field] as string;
      } else {
        problems.push(`'metadata.${field}' is required and must be a non-empty string`);
      }
    }
    for (const field of OPTIONAL_METADATA) {
      if (m[field] !== undefined) {
        if (typeof m[field] === "string") metadata[field] = m[field] as string;
        else problems.push(`'metadata.${field}' must be a string when present`);
      }
    }
  }

  if (problems.length > 0) {
    throw new DkbError(
      ExitCode.VALIDATION,
      `import JSON failed validation (${importPath}):\n  - ${problems.join("\n  - ")}`,
      "correct each field above and re-run add-source; see convention.md for the source attribute conventions",
    );
  }
  return {
    content: hasContent ? (doc.content as string) : undefined,
    contentPath: hasContentPath ? (doc.content_path as string) : undefined,
    metadata,
  };
}

/**
 * Ingest one source into the KB at `dir` from the import JSON at `importPath`.
 * A relative `content_path` resolves against the import file's directory.
 * Read-only over the input files; writes only via ledger.transact (D11).
 */
export function addSource(dir: string, importPath: string): AddSourceResult {
  const resolvedImport = path.resolve(importPath);
  const parsed = parseImportJson(resolvedImport);

  let content: string;
  if (parsed.contentPath !== undefined) {
    const contentFile = path.resolve(path.dirname(resolvedImport), parsed.contentPath);
    if (!existsSync(contentFile)) {
      throw new DkbError(
        ExitCode.NOT_FOUND,
        `content file not found: ${contentFile} (from 'content_path' in ${resolvedImport})`,
        "fix 'content_path' — relative paths resolve against the import file's directory",
      );
    }
    content = readFileSync(contentFile, "utf8");
  } else {
    content = parsed.content!;
  }

  const stored = lfNormalize(content);
  const contentHash = sha256Hex(stored);

  const ledger = Ledger.open(path.join(dir, KB_FILENAME));
  try {
    const id = ledger.nextEntityId();
    const datoms: DatomInput[] = [
      { e: id, a: "source/content", v: stored, added: 1 },
      { e: id, a: "source/content-hash", v: contentHash, added: 1 },
      { e: id, a: "source/date-added", v: new Date().toISOString(), added: 1 },
    ];
    for (const [field, value] of Object.entries(parsed.metadata)) {
      datoms.push({ e: id, a: `source/${field}`, v: value, added: 1 });
    }
    const tx = ledger.transact(datoms);
    return { id, tx, title: parsed.metadata.title, contentHash };
  } finally {
    ledger.close();
  }
}
