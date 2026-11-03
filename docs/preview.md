# Digest preview

The manually dispatched GitHub Actions workflow exports the server-rendered digest for
`2026-10-28` as one self-contained HTML file and publishes it to GitHub Pages. The stable URL is:

<https://patrykmurzyn.github.io/mega-s01e04-rig-restart/>

## Before the first run

A repository maintainer must enable GitHub Pages with **GitHub Actions** as the build and
deployment source, then add the repository Actions secret `LANE_MARKER`. The value is supplied
only to the server process and is never printed or included in the workflow log. The workflow
has not been run as part of preparing this change.

## Publish the marked preview

In **Actions → Publish digest preview → Run workflow**, leave **clean** unchecked. The job runs
`pnpm install --frozen-lockfile`, starts `src/server.ts` directly on port 8798, waits for health,
and saves `/digest/2026-10-28` as `index.html`. It requires five table rows, the configured lane
marker, no scripts, and no external assets before deploying the artifact.

Send the stable URL to the reviewer after the deployment succeeds. The HTML is generated during
the workflow and is not committed to the repository.

## Remove the marker after review

After review is complete, run the same workflow with **clean** checked. That export unsets
`LANE_MARKER` before starting the server, checks for the “no marker set” banner and absence of the
configured marker, then deploys over the same URL. The workflow never echoes the marker value.
