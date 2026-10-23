import { useEffect, useState } from 'react';
import { api } from './api';
import { STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL } from './ui';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/tickets/stats/summary').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p className="muted">Loading overview...</p>;

  const { total, unassigned, byStatus, byPriority } = stats;
  const pct = (n) => (total ? (n / total) * 100 : 0);
  const maxPriority = Math.max(1, ...Object.values(byPriority));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="sub">Where your tickets stand right now.</p>
        </div>
      </div>

      <div className="stack">
        <section className="panel panel-pad">
          <div className="headline">
            <div>
              <div className="big">{total}</div>
              <small>Total tickets</small>
            </div>
            <div>
              <div className="big">{unassigned}</div>
              <small>Waiting for an owner</small>
            </div>
          </div>

          <div className="seg" role="img" aria-label="Tickets by status">
            {STATUSES.map((s) => (
              <span key={s} className={`s-${s}`} style={{ width: `${pct(byStatus[s])}%` }} />
            ))}
          </div>
          <div className="legend">
            {STATUSES.map((s) => (
              <div key={s} className={`s-${s}`}>
                <b>{byStatus[s]}</b>
                <span><i />{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel-pad">
          <h2 className="section-title">By priority</h2>
          {PRIORITIES.map((p) => (
            <div key={p} className={`bar-row p-${p}`}>
              <span>{PRIORITY_LABEL[p]}</span>
              <div className="track">
                <span style={{ width: `${(byPriority[p] / maxPriority) * 100}%` }} />
              </div>
              <b>{byPriority[p]}</b>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}