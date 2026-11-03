import type { Status } from '../status.js';

export function StatusBoard({ status }: { status: Status }) {
  return (
    <>
      <h1>status</h1>
      <table>
        <tbody>
          <tr><th>adapter</th><td>{status.adapter}</td></tr>
          <tr><th>installed</th><td>{status.installed}</td></tr>
          <tr>
            <th>last beat</th>
            <td>{status.lastBeat ? `${status.lastBeat.at} · pid ${status.lastBeat.pid}` : <span class="warn">none</span>}</td>
          </tr>
        </tbody>
      </table>
      <h2>nights on disk</h2>
      {status.nights.length === 0 ? (
        <p class="mute">nothing in runs/</p>
      ) : (
        <ul>
          {status.nights.map((n) => (
            <li>
              <a href={`/digest/${n}`}>{n}</a>
              {status.digests[n] && (() => {
                const digest = status.digests[n];
                const counts = digest.rows.reduce(
                  (total, row) => ({ ...total, [row.status]: total[row.status] + 1 }),
                  { ok: 0, retry: 0, fail: 0 },
                );
                return (
                  <>
                    {' · '}{counts.ok} ok jobs · {counts.retry} retry jobs · {counts.fail} fail jobs
                    {digest.badLines > 0 && ` · ${digest.badLines} bad lines`}
                  </>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
