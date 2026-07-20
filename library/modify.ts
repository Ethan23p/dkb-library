// modify — the modify capability (CONTRACTS D5, D6).
//
// Modification is never destructive: one new transaction carrying the
// retraction of the current datom plus the assertion of the new value. The
// prior value stays recoverable in the log forever. Content and its hash are
// immutable — Source Data First.

import * as path from "node:path";
import { DkbError, ExitCode } from "./errors";
import { KB_FILENAME, Ledger, type DatomInput } from "./ledger";

/** D6: attributes that may never be modified. */
const IMMUTABLE_ATTRIBUTES = ["source/content", "source/content-hash", "source/date-added"];

export interface ModifyResult {
  id: number;
  attribute: string;
  previous: string | undefined;
  value: string;
  tx: number;
}

/** Modify one metadata attribute of entity `id` in the KB at `dir`. */
export function modifyEntry(
  dir: string,
  id: number,
  attribute: string,
  value: string,
): ModifyResult {
  if (IMMUTABLE_ATTRIBUTES.includes(attribute)) {
    throw new DkbError(
      ExitCode.FORBIDDEN,
      `'${attribute}' is immutable — source data and its derived attributes are never modified (Source Data First)`,
      "to correct source content, add the corrected text as a new source; mutable attributes: source/title, source/author, source/origin, source/contributor, source/justification",
    );
  }

  const ledger = Ledger.open(path.join(dir, KB_FILENAME));
  try {
    const attrs = ledger.currentState().get(id);
    if (!attrs || attrs.size === 0) {
      throw new DkbError(
        ExitCode.NOT_FOUND,
        `no entry with id ${id} exists in the current state of this knowledge base`,
        "list current entries (e.g. via retrieve) to find valid ids; ids are the integers echoed by add-source",
      );
    }

    // D5: retract the current datom (if any) + assert the new value, one tx.
    const previous = attrs.get(attribute);
    const datoms: DatomInput[] = [];
    if (previous !== undefined) {
      datoms.push({ e: id, a: attribute, v: previous, added: 0 });
    }
    datoms.push({ e: id, a: attribute, v: value, added: 1 });
    const tx = ledger.transact(datoms);
    return { id, attribute, previous, value, tx };
  } finally {
    ledger.close();
  }
}
