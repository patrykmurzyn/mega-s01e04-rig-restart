import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: '',
};

const night = '2026-10-28';
const app = () => createApp({ ...config, runsDir });
let runsDir: string;

async function putNight(name: string, contents: string) {
  await writeFile(join(runsDir, `${name}.jsonl`), contents, 'utf8');
}

async function jsonResponse(path: string) {
  const response = await app().request(path);
  return { response, body: (await response.json()) as unknown };
}

function tableRow(html: string, job: string) {
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  return rows.find((row) => row.includes(job));
}

function tableCells(row: string | undefined) {
  return (row?.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []);
}

describe('digest routes', () => {
  beforeEach(async () => {
    runsDir = await mkdtemp(join(tmpdir(), 'rig-digest-routes-'));
  });

  afterEach(async () => {
    await rm(runsDir, { recursive: true, force: true });
  });

  it('returns the same sorted rows from HTML and JSON, preserving offsets and null owners', async () => {
    await putNight(
      night,
      [
        JSON.stringify({ at: '2026-10-28T09:20:00-04:00', job: 'zeta', status: 'ok', owner: null }),
        JSON.stringify({ at: '2026-10-28T08:10:00+02:00', job: 'alpha', status: 'retry', owner: 'Ada' }),
        JSON.stringify({ at: '2026-10-28T08:11:00+02:00', job: 'alpha', status: 'retry', owner: 'Ada' }),
        JSON.stringify({ at: '2026-10-28T08:12:00+02:00', job: 'alpha', status: 'retry', owner: 'Ada' }),
        JSON.stringify({ at: '2026-10-28T08:13:00+02:00', job: 'alpha', status: 'fail', owner: 'Ada', error: 'disk unavailable' }),
        JSON.stringify({ at: '2026-10-28T08:14:00+02:00', job: 'alpha', status: 'retry', owner: 'Ada' }),
      ].join('\n'),
    );

    const { response, body } = await jsonResponse(`/api/digest/${night}`);
    const htmlResponse = await app().request(`/digest/${night}`);
    const html = await htmlResponse.text();
    const digest = body as {
      rows: Array<{ job: string; owner: string | null; retries: number; status: string; firstAt: string; lastAt: string }>;
      badLines: number;
    };

    expect(response.status).toBe(200);
    expect(htmlResponse.status).toBe(200);
    expect(digest.rows.map((row) => row.job)).toEqual(['alpha', 'zeta']);
    expect(digest.rows[0]).toMatchObject({
      owner: 'Ada',
      retries: 4,
      status: 'retry',
      firstAt: '2026-10-28T08:10:00+02:00',
      lastAt: '2026-10-28T08:14:00+02:00',
    });
    expect(digest.rows[1].owner).toBeNull();
    expect(digest.badLines).toBe(0);

    const alphaRow = tableRow(html, 'alpha');
    const zetaRow = tableRow(html, 'zeta');
    expect(alphaRow).toBeDefined();
    expect(zetaRow).toBeDefined();
    expect(html.indexOf(alphaRow!)).toBeLessThan(html.indexOf(zetaRow!));
    expect(zetaRow).toContain('—');
    expect(alphaRow).toContain('2026-10-28T08:10:00+02:00');
    expect(alphaRow).toContain('2026-10-28T08:14:00+02:00');
    expect(alphaRow).toContain('disk unavailable');
    expect(tableCells(alphaRow)[3]).toMatch(/class="warn"/);
    expect(tableCells(zetaRow)[4]).not.toMatch(/class="warn"/);
  });

  it('returns 404 for a night without a file in HTML and JSON', async () => {
    const html = await app().request(`/digest/${night}`);
    const { response: json } = await jsonResponse(`/api/digest/${night}`);

    expect(html.status).toBe(404);
    expect(json.status).toBe(404);
  });

  it('renders an empty night in HTML and returns an empty JSON digest', async () => {
    await putNight(night, '');

    const htmlResponse = await app().request(`/digest/${night}`);
    const html = await htmlResponse.text();
    const { response, body } = await jsonResponse(`/api/digest/${night}`);

    expect(htmlResponse.status).toBe(200);
    expect(html.toLowerCase()).toContain('nothing ran');
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ night, rows: [], badLines: 0 });
  });

  it('counts malformed lines while keeping valid rows available in HTML and JSON', async () => {
    await putNight(
      night,
      [
        JSON.stringify({ at: '2026-10-28T08:00:00+01:00', job: 'compile', status: 'ok', owner: null }),
        '{broken json',
        JSON.stringify({ at: '2026-10-28T08:01:00+01:00', job: 'test', status: 'ok', owner: 'Sam' }),
      ].join('\n'),
    );

    const htmlResponse = await app().request(`/digest/${night}`);
    const html = await htmlResponse.text();
    const { response, body } = await jsonResponse(`/api/digest/${night}`);

    expect(htmlResponse.status).toBe(200);
    expect(tableRow(html, 'compile')).toBeDefined();
    expect(tableRow(html, 'test')).toBeDefined();
    expect(html).toMatch(/(?:bad|malformed|invalid)[^<]{0,80}1|1[^<]{0,80}(?:bad|malformed|invalid)/i);
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      badLines: 1,
      rows: [{ job: 'compile', owner: null }, { job: 'test', owner: 'Sam' }],
    });
  });

  it('marks failed jobs and jobs with at least three retries in the rendered table', async () => {
    await putNight(
      night,
      [
        JSON.stringify({ at: '2026-10-28T08:00:00+01:00', job: 'failed', status: 'fail', owner: 'Lee', error: 'boom' }),
        JSON.stringify({ at: '2026-10-28T08:00:00+01:00', job: 'threshold', status: 'retry', owner: 'Lee' }),
        JSON.stringify({ at: '2026-10-28T08:01:00+01:00', job: 'threshold', status: 'retry', owner: 'Lee' }),
        JSON.stringify({ at: '2026-10-28T08:02:00+01:00', job: 'threshold', status: 'retry', owner: 'Lee' }),
        JSON.stringify({ at: '2026-10-28T08:00:00+01:00', job: 'below', status: 'retry', owner: 'Lee' }),
        JSON.stringify({ at: '2026-10-28T08:01:00+01:00', job: 'below', status: 'retry', owner: 'Lee' }),
      ].join('\n'),
    );

    const response = await app().request(`/digest/${night}`);
    const html = await response.text();

    expect(response.status).toBe(200);
    const failedRow = tableRow(html, 'failed');
    const thresholdRow = tableRow(html, 'threshold');
    const belowRow = tableRow(html, 'below');
    expect(failedRow).toBeDefined();
    expect(failedRow).toContain('boom');
    expect(tableCells(failedRow)[4]).toMatch(/class="warn"/);
    expect(thresholdRow).toBeDefined();
    expect(tableCells(thresholdRow)[3]).toMatch(/class="warn"/);
    expect(belowRow).toBeDefined();
    expect(belowRow).toContain('2');
    expect(tableCells(belowRow)[3]).not.toMatch(/class="warn"/);
  });
});
