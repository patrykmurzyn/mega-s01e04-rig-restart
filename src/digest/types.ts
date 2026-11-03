export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  status: DigestStatus;
  error: string | null;
  firstAt: string;
  lastAt: string;
};

export type NightDigest = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

/**
 * Implemented by readNight in ./reader.js.
 * Reads runsDir/<YYYY-MM-DD>.jsonl synchronously; missing/invalid night => null.
 * Rows are sorted by job (code-point order). Runs count every valid record;
 * retries count retry records. Owner/status and firstAt/lastAt follow log order.
 * Error is the last error encountered, or null, even after a later success.
 * Timestamp strings retain their original offset. Blank lines are ignored;
 * malformed JSON or records with an invalid schema increment badLines.
 * An empty file returns a digest with rows: [] and badLines: 0.
 * Filesystem errors other than a missing file are propagated.
 */
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
