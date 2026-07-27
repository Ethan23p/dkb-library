// build — regenerate the shipped demo knowledge bases from the fixture corpora.
//
// DEVELOPER TOOL. A playtester never runs this: they install the plugin and
// hydrate a prebuilt KB with `dkb-demo use <name>`. This script exists so the
// committed kb.sqlite files are *reproducible* — anyone can re-run it against
// the same sources and audit what the demo is built from, rather than trusting
// a hand-forged binary blob.
//
//   bun demo/build.ts            # rebuild all corpora
//   bun demo/build.ts lhc        # rebuild one
//
// Design notes:
//
//   - Ingestion is driven through the CLI as a subprocess, the same path a user
//     takes. The build therefore exercises the shipped code rather than a
//     private shortcut, and a regression in `add-source` breaks the build.
//   - The fixture markdown is read IN PLACE from testing/fixtures/. Nothing is
//     copied into demo/ — the corpora already ship with the repo, and content
//     lands verbatim inside the ledger regardless. The only new bytes here are
//     the two kb.sqlite files.
//   - Each demo KB declares its own model, which is a per-KB instantiation
//     decision expressed exactly where CONTRACTS A4 puts it: the KB's own
//     config.yml. See the `model` field on each corpus below for the reasoning.
//   - Verification is not optional. Every build re-derives each source's
//     content hash from the fixture on disk and compares it against what the
//     ledger stored. A demo KB that does not match its sources is not shippable.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { Ledger, KB_FILENAME } from "../library/ledger";

const REPO_ROOT = path.resolve(import.meta.dir, "..");
const CLI_ENTRY = path.join(REPO_ROOT, "engines", "epistack", "main.ts");
const OUT_ROOT = path.join(REPO_ROOT, "demo", "kbs");

interface Corpus {
  /** Directory name under demo/kbs/, and the name users pass to `dkb-demo use`. */
  name: string;
  /** Source fixture directory, read in place. */
  fixtures: string;
  /** One-line description, echoed at build time. */
  blurb: string;
  /** Written into this KB's config.yml — a per-KB instantiation decision (A4). */
  model: string;
}

// The demo runs on someone else's usage limit, so model choice is a budget
// decision as much as a quality one. The corpora are two orders of magnitude
// apart in size, so they get different answers:
//
//   lhc   — 187k tokens per question. On Opus 5 that measured $1.30 a question,
//           which is too much to spend of a judge's allowance for a demo.
//           Sonnet 5 is strong enough for synthesis over stuffed context and
//           brings it back inside budget.
//   saber — 11.5k tokens per question. Opus 5 costs about a dime here, so the
//           corpus that is small enough to afford the best model gets it.
const CORPORA: Corpus[] = [
  {
    name: "lhc",
    fixtures: path.join(REPO_ROOT, "testing", "fixtures", "corpus-lhc"),
    blurb: "LHC micro-black-hole safety — the risk-assessment literature",
    model: "claude-sonnet-5",
  },
  {
    name: "saber",
    fixtures: path.join(REPO_ROOT, "testing", "fixtures", "corpus"),
    blurb: "SABRE — airline reservations and early commercial computing",
    model: "claude-opus-5",
  },
];

// ---------------------------------------------------------------------------

function sha256Hex(s: string): string {
  return createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
}

/** D8: content is stored LF-normalized, and hashed as stored. */
function norm(s: string): string {
  return s.replaceAll("\r\n", "\n");
}

function run(args: string[], cwd: string): void {
  const proc = Bun.spawnSync(["bun", CLI_ENTRY, ...args], {
    cwd,
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) {
    const out = proc.stdout.toString() + proc.stderr.toString();
    throw new Error(`dkb ${args.join(" ")} exited ${proc.exitCode}\n${out.trim()}`);
  }
}

/**
 * Pin this KB's explore-model in its own config.yml.
 *
 * The guard tests the pattern rather than comparing before/after: when a corpus
 * asks for the same model the engine already defaults to, the rewrite is a
 * legitimate no-op, and treating "text unchanged" as "line missing" would fail
 * a perfectly good build.
 */
function setExploreModel(dir: string, model: string): void {
  const configPath = path.join(dir, "config.yml");
  const before = readFileSync(configPath, "utf8");
  const line = /^(\s+explore-model:\s*).*$/m;
  if (!line.test(before)) {
    throw new Error(
      `could not set explore-model in ${configPath} — the generated config.yml has no ` +
        `'explore-model:' line; reconcile demo/build.ts with library/init.ts`,
    );
  }
  writeFileSync(configPath, before.replace(line, `$1${model}`));
}

/** Every *.import.json in the fixture dir, in a stable order (so entry ids are deterministic). */
function sidecars(fixtureDir: string): string[] {
  return readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".import.json"))
    .sort()
    .map((f) => path.join(fixtureDir, f));
}

/**
 * Re-derive every source's hash from the fixture on disk and compare against
 * the ledger. Also checks the entry count and that no content is empty.
 */
function verify(kbDir: string, expected: { title: string; hash: string }[]): void {
  const ledger = Ledger.open(path.join(kbDir, KB_FILENAME), { readonly: true });
  try {
    const state = ledger.currentState();
    const sources = [...state.entries()]
      .filter(([, attrs]) => attrs.has("source/content-hash"))
      .map(([id, attrs]) => ({
        id,
        title: attrs.get("source/title") ?? "(untitled)",
        hash: attrs.get("source/content-hash")!,
        content: attrs.get("source/content") ?? "",
      }))
      .sort((a, b) => a.id - b.id);

    if (sources.length !== expected.length) {
      throw new Error(`expected ${expected.length} sources in ${kbDir}, found ${sources.length}`);
    }
    for (const s of sources) {
      if (s.content.length === 0) throw new Error(`entry ${s.id} (${s.title}) stored empty content`);
      if (sha256Hex(s.content) !== s.hash) {
        throw new Error(`entry ${s.id} (${s.title}): stored content does not match its own hash`);
      }
      const match = expected.find((e) => e.hash === s.hash);
      if (!match) {
        throw new Error(
          `entry ${s.id} (${s.title}) has hash ${s.hash.slice(0, 12)}… which matches no fixture file`,
        );
      }
      console.log(`    ok  [${s.id}] ${s.title} — ${s.hash.slice(0, 12)}…`);
    }
  } finally {
    ledger.close();
  }
}

function build(corpus: Corpus): void {
  const outDir = path.join(OUT_ROOT, corpus.name);
  console.log(`\n▸ ${corpus.name} — ${corpus.blurb}`);
  console.log(`  sources: ${path.relative(REPO_ROOT, corpus.fixtures)}`);

  if (!existsSync(corpus.fixtures)) {
    throw new Error(`fixture corpus not found: ${corpus.fixtures}`);
  }
  const imports = sidecars(corpus.fixtures);
  if (imports.length === 0) throw new Error(`no *.import.json files in ${corpus.fixtures}`);

  // Rebuild from scratch — init refuses to overwrite, by design.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  run(["init", "--dir", outDir], REPO_ROOT);
  setExploreModel(outDir, corpus.model);

  const expected: { title: string; hash: string }[] = [];
  for (const sidecar of imports) {
    const doc = JSON.parse(readFileSync(sidecar, "utf8"));
    const contentFile = path.resolve(path.dirname(sidecar), doc.content_path);
    expected.push({
      title: doc.metadata.title,
      hash: sha256Hex(norm(readFileSync(contentFile, "utf8"))),
    });
    // The sidecar is read in place; content_path resolves against its own dir.
    run(["add-source", "--json-import", sidecar, "--dir", outDir], REPO_ROOT);
    console.log(`  added  ${path.basename(sidecar, ".import.json")}`);
  }

  console.log(`  verifying ${expected.length} sources against their fixtures…`);
  verify(outDir, expected);

  const bytes = readFileSync(path.join(outDir, KB_FILENAME)).length;
  const words = expected.length;
  console.log(
    `  built  ${path.relative(REPO_ROOT, outDir)} — ${words} sources, ` +
      `${(bytes / 1024).toFixed(0)} KiB, explore-model ${corpus.model}`,
  );
}

// ---------------------------------------------------------------------------

const requested = process.argv.slice(2);
const targets = requested.length
  ? CORPORA.filter((c) => requested.includes(c.name))
  : CORPORA;

if (targets.length === 0) {
  console.error(`error: no such corpus: ${requested.join(", ")}`);
  console.error(`next: use one of: ${CORPORA.map((c) => c.name).join(", ")}`);
  process.exit(2);
}

for (const corpus of targets) build(corpus);
console.log(`\ndone — ${targets.length} knowledge base(s) rebuilt under demo/kbs/`);
