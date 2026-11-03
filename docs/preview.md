# Digest preview

The manually dispatched GitHub Actions workflow exports the server-rendered digest for
`2026-10-28` as one self-contained HTML file and publishes it to GitHub Pages. The stable URL is:

<https://patrykmurzyn.github.io/mega-s01e04-rig-restart/>

## Published preview

The initial approved deployment succeeded in [run 41709935653](https://github.com/patrykmurzyn/mega-s01e04-rig-restart/actions/runs/41709935653). The course confirmed the reviewer saw the preview on 2026-11-03.

After review, the approved clean deployment succeeded in [run 41714163908](https://github.com/patrykmurzyn/mega-s01e04-rig-restart/actions/runs/41714163908). Public GET returned 200 and the same 2196-byte HTML as the local clean candidate (SHA-256 `6c5cbebf44a457d09748c4d8530d2730c1bcf64fd4e768f297b1ae64e4576407`). Its banner says “no marker set”; it contains no marker value, scripts, or external assets, and has five job rows. Evidence is retained in the private harness lesson log, outside this public repo: `restart-2026-11-03/logs/pages-clean-live-01.json`.

## Reproduce a clean export

In **Actions → Publish digest preview → Run workflow**, check **clean**. The job runs
`pnpm install --frozen-lockfile`, starts `src/server.ts` directly on port 8798 with the lane
marker variable unset, waits for health, and saves `/digest/2026-10-28` as `index.html`. It
checks for the “no marker set” banner, five table rows, absence of the configured marker, no
scripts, and no external assets before deploying. The workflow never echoes the marker value.
