// log — opt-in progress notes, stderr only.
//
// stdout is reserved for command output so that `--json` stays a single
// parseable document. Anything a human or agent might want to watch while a
// command runs goes here, and only when `--verbose` is passed.

let verbose = false;

/** Set once per invocation from the parsed `--verbose` global flag. */
export function setVerbose(on: boolean): void {
  verbose = on;
}

/** Write one progress note to stderr when verbose mode is on. */
export function note(message: string): void {
  if (verbose) process.stderr.write(`… ${message}\n`);
}
