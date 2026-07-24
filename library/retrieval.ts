// retrieval — the explore capability (CONTRACTS D2, D3, D9, D10).
//
// v0.2.1 method of search: context-window stuffing. Read ALL current sources
// (content + metadata) from the ledger, hand them in full to the inference
// handler with the query, and shape the structured verdict into the D10
// artifact. Just-in-Time Intelligence: synthesis happens here, at retrieval
// time, over source data at source fidelity — never ahead of it.
//
// Strictly read-only: the KB is opened readonly and this module performs no
// ledger writes of any kind (ret-2: kb.sqlite is byte-identical afterwards).

import * as path from "node:path";
import { readExploreModel } from "./config";
import { DkbError, ExitCode } from "./errors";
import { KB_FILENAME, Ledger } from "./ledger";
import { note } from "./log";
import { requireAuthToken, runExploreInference, type InferenceSource } from "./inference";

/** D10 (incl. Amendment A1): one provenance entry per source drawn on. */
export interface ProvenanceEntry {
  id: number;
  title: string;
  author: string;
  origin: string;
}

/** The D10 explore artifact. */
export interface ExploreArtifact {
  query: string;
  coverage: "full" | "partial" | "none";
  synthesis: string; // empty string when coverage is "none"
  provenance: ProvenanceEntry[];
}

/** Read every current source from the KB at `dir`, readonly. */
function readSources(dir: string): InferenceSource[] {
  const ledger = Ledger.open(path.join(dir, KB_FILENAME), { readonly: true });
  try {
    const sources: InferenceSource[] = [];
    for (const [e, attrs] of ledger.currentState()) {
      const content = attrs.get("source/content");
      if (content === undefined) continue; // entity 0 / non-source entities
      sources.push({
        id: e,
        title: attrs.get("source/title") ?? "",
        author: attrs.get("source/author") ?? "",
        origin: attrs.get("source/origin") ?? "",
        content,
      });
    }
    return sources.sort((a, b) => a.id - b.id);
  } finally {
    ledger.close();
  }
}

/**
 * Explore the KB at `dir` with `userQuery`. Fails EMPTY_KB (4) on a KB with
 * no sources, AUTH (8) when inference auth is absent — both before any
 * inference is attempted.
 */
export async function explore(dir: string, userQuery: string): Promise<ExploreArtifact> {
  const sources = readSources(dir);
  note(`read ${sources.length} current source(s) from the ledger`);
  if (sources.length === 0) {
    throw new DkbError(
      ExitCode.EMPTY_KB,
      "the knowledge base is initialized but contains no sources yet",
      "add a source first: add-source --json-import <file> (see convention.md for the import shape), then retry the explore",
    );
  }

  requireAuthToken(); // D9/A3: exit 8 with guidance before attempting the call

  const verdict = await runExploreInference(userQuery, sources, readExploreModel(dir));

  const byId = new Map(sources.map((s) => [s.id, s]));
  const provenance: ProvenanceEntry[] = verdict.sourceIds.map((id) => {
    const s = byId.get(id)!; // ids validated against the source set by the handler
    return { id: s.id, title: s.title, author: s.author, origin: s.origin };
  });

  return {
    query: userQuery,
    coverage: verdict.coverage,
    synthesis: verdict.synthesis,
    provenance,
  };
}
