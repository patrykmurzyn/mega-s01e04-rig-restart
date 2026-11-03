import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, ReadNight } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  owner: string | null;
  status: DigestStatus;
  error?: string;
};

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.at === 'string'
    && Number.isFinite(Date.parse(record.at))
    && typeof record.job === 'string'
    && record.job.trim().length > 0
    && (typeof record.owner === 'string' || record.owner === null)
    && (record.status === 'ok' || record.status === 'retry' || record.status === 'fail')
    && (record.error === undefined || typeof record.error === 'string');
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;

  let contents: string;
  try {
    contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }

  const jobs = new Map<string, DigestRow>();
  let badLines = 0;
  for (const line of contents.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      badLines++;
      continue;
    }
    if (!isRunRecord(record)) {
      badLines++;
      continue;
    }

    const existing = jobs.get(record.job);
    if (!existing) {
      jobs.set(record.job, {
        job: record.job,
        owner: record.owner,
        runs: 1,
        retries: record.status === 'retry' ? 1 : 0,
        status: record.status,
        error: record.error ?? null,
        firstAt: record.at,
        lastAt: record.at,
      });
      continue;
    }
    existing.owner = record.owner;
    existing.runs++;
    if (record.status === 'retry') existing.retries++;
    existing.status = record.status;
    if (record.error !== undefined) existing.error = record.error;
    existing.lastAt = record.at;
  }

  const rows = [...jobs.values()].sort((a, b) => a.job < b.job ? -1 : a.job > b.job ? 1 : 0);
  return { night, rows, badLines };
};
