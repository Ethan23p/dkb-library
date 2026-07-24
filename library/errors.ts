// errors — the single source-of-truth exit-code enumeration (CONTRACTS D3).
// Every component maps failures through this file; no other exit codes exist.

export enum ExitCode {
  OK = 0, // success
  UNEXPECTED = 1, // bug/panic — anything not classified below
  USAGE = 2, // unknown command/flag, malformed arguments
  STATE = 3, // KB already exists (init), KB missing (other commands)
  EMPTY_KB = 4, // retrieve against an initialized-but-empty KB
  VALIDATION = 5, // missing required metadata, malformed import JSON
  NOT_FOUND = 6, // entry id does not resolve
  FORBIDDEN = 7, // attempt to modify a privileged attribute
  AUTH = 8, // no usable inference credential (CONTRACTS A3)
}

/**
 * An error carrying a D3 exit code plus a "what to do next" step — every
 * non-zero exit's stderr must say what to do next (AI-legible requirement).
 */
export class DkbError extends Error {
  constructor(
    public readonly code: ExitCode,
    message: string,
    public readonly nextStep: string,
  ) {
    super(message);
    this.name = "DkbError";
  }

  /** stderr rendering: the message, then the next step. Never a stack trace. */
  render(): string {
    return `error: ${this.message}\nnext: ${this.nextStep}`;
  }
}
