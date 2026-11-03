# Approved morning-digest implementation

Human approved split, fields and repo operations on 2026-11-03.

Use existing Hono/JSX Layout and inline CSS; no client JavaScript. One shared reader feeds HTML, JSON and board counts. Preserve original timestamp offsets. Null owners render as —. Missing nights return 404; empty nights render nothing ran; malformed records are counted. runs/ stays read-only.

1. Reader worker first commits shared types, then implements aggregation and tests.
2. After shared types, page/API/board/test workers proceed in parallel, one issue per branch/worktree. Parent integrates route changes sequentially.
3. pnpm test and pnpm typecheck, then export actual HTML by command.
4. Separate human permission before publication to stable HTTPS URL. Send course same repo and URL on every claim.
5. Wait for actual review. Separate human permission before marker removal and overwrite of that exact URL. Archive plan only when cleanup holds.

Issues:
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/1
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/2
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/3
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/4
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/5
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/6
- https://github.com/patrykmurzyn/mega-s01e04-rig-restart/issues/7
