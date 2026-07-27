// config — reading the engine's config.yml back off disk (CONTRACTS D4, A4).
//
// config.yml is written by `init` from the EngineDef and is the engine's own
// declaration of how this knowledge base runs. The library reads it rather than
// hardcoding instantiation choices; model selection in particular belongs to
// the engine, not to the library's inference handler.
//
// The reader is deliberately narrow: a handful of known keys, not a YAML
// engine. It never fails a command — a missing file or key falls back to the
// library default, so knowledge bases initialized before a key existed keep
// working.

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

/** Library fallback when the engine declares no model. */
export const DEFAULT_EXPLORE_MODEL = "claude-sonnet-5";

export const CONFIG_FILENAME = "config.yml";

/**
 * Read `inference.explore-model` from the KB's config.yml.
 * Returns the library default when the file, the block, or the key is absent.
 */
export function readExploreModel(dir: string): string {
  const configPath = path.join(dir, CONFIG_FILENAME);
  if (!existsSync(configPath)) return DEFAULT_EXPLORE_MODEL;
  let inInference = false;
  for (const line of readFileSync(configPath, "utf8").split("\n")) {
    if (/^\S/.test(line)) inInference = line.trimEnd() === "inference:";
    else if (inInference) {
      const match = /^\s+explore-model:\s*(\S.*?)\s*$/.exec(line);
      if (match) return match[1];
    }
  }
  return DEFAULT_EXPLORE_MODEL;
}
