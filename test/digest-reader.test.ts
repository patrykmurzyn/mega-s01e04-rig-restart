import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const night = '2026-10-28';
let runsDir: string;
const record = { at: '2026-10-28T23:00:02+01:00', job: 'job', status: 'ok', owner: 'rook' };

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-reader-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

function writeRecords(records: unknown[]) {
  writeFileSync(join(runsDir, `${night}.jsonl`), records.map((item) => JSON.stringify(item)).join('\n'));
}

describe('readNight', () => {
  it('reads the real night: five sorted jobs, one bad line and preserved offsets', () => {
    const digest = readNight('runs', night);
    expect(digest?.night).toBe(night);
    expect(digest?.badLines).toBe(1);
    expect(digest?.rows.map((row) => row.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
    expect(digest?.rows[0]).toEqual({
      job: 'digest/render', owner: null, runs: 1, retries: 0, status: 'ok', error: null,
      firstAt: '2026-10-29T05:41:09+01:00', lastAt: '2026-10-29T05:41:09+01:00',
    });
    expect(digest?.rows[1]).toEqual({
      job: 'fixtures/refresh', owner: 'rook', runs: 4, retries: 3, status: 'ok', error: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00', lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(digest?.rows[2]).toMatchObject({ runs: 8, retries: 1, status: 'ok', error: 'lock held' });
    expect(digest?.rows[3]).toMatchObject({ runs: 1, retries: 0, status: 'fail', error: 'quota exceeded' });
  });

  it('keeps the final owner/status and last encountered error in log order', () => {
    writeRecords([
      { ...record, status: 'retry', error: 'first', at: '2026-10-28T23:00:02+05:30' },
      { ...record, status: 'fail', error: 'last', at: '2026-10-28T20:00:02-04:00' },
      { ...record, owner: null, at: '2026-10-28T19:00:02-04:00' },
    ]);
    expect(readNight(runsDir, night)?.rows).toEqual([{
      job: 'job', owner: null, runs: 3, retries: 1, status: 'ok', error: 'last',
      firstAt: '2026-10-28T23:00:02+05:30', lastAt: '2026-10-28T19:00:02-04:00',
    }]);
  });

  it('counts malformed JSON and invalid schemas while continuing to later valid rows', () => {
    const invalid = [
      null, [], 42, {},
      { ...record, at: 'invalid' }, { ...record, at: 123 },
      { ...record, job: '  ' }, { ...record, job: null },
      { ...record, status: 'pending' }, { ...record, owner: undefined },
      { ...record, owner: 42 }, { ...record, error: null },
    ];
    const lines = [JSON.stringify({ ...record, job: 'z' }), '{broken',
      ...invalid.map((item) => JSON.stringify(item)), JSON.stringify({ ...record, job: 'a' })];
    writeFileSync(join(runsDir, `${night}.jsonl`), lines.join('\r\n') + '\r\n');
    expect(readNight(runsDir, night)).toMatchObject({
      night, badLines: invalid.length + 1, rows: [{ job: 'a', runs: 1 }, { job: 'z', runs: 1 }],
    });
  });

  it('distinguishes missing nights from empty or whitespace-only files', () => {
    expect(readNight(runsDir, night)).toBeNull();
    writeFileSync(join(runsDir, `${night}.jsonl`), '');
    expect(readNight(runsDir, night)).toEqual({ night, rows: [], badLines: 0 });
    writeFileSync(join(runsDir, `${night}.jsonl`), '\n \t\r\n');
    expect(readNight(runsDir, night)).toEqual({ night, rows: [], badLines: 0 });
  });

  it('rejects non-night paths and propagates other filesystem errors', () => {
    for (const value of ['../2026-10-28', '2026-10-28.jsonl', '/2026-10-28', '2026-10-28\0']) {
      expect(readNight(runsDir, value)).toBeNull();
    }
    mkdirSync(join(runsDir, `${night}.jsonl`));
    expect(() => readNight(runsDir, night)).toThrow();
  });
});
