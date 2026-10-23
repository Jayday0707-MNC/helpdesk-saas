import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from './api';
import { StatusPill, STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, timeAgo } from './ui';

export default function Tickets() {
  const { me } = useOutletContext();
  const [tickets, setTickets] = useState(null);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const isStaff = me && (me.role === 'admin' || me.role === 'agent');

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    api(`/tickets?${params}`).then(setTickets).catch((e) => setError(e.message));
  }, [status, priority, reload]);

  const createTicket = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/tickets', { method: 'POST', body: { title, description, priority: newPriority } });
      setTitle('');
      setDescription('');
      setNewPriority('medium');
      setShowForm(false);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tickets</h1>
          <p className="sub">{isStaff ? 'Everything your team is handling.' : 'Your support requests.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'New ticket'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <form className="panel panel-pad new-ticket" onSubmit={createTicket}>
          <div className="two">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="prio">Priority</label>
              <select id="prio" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="desc">What is happening?</label>
            <textarea id="desc" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Create ticket</button>
        </form>
      )}

      <div className="filters">
        <div className="chips">
          <button className={`chip ${status === '' ? 'on' : ''}`} onClick={() => setStatus('')}>All</button>
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
      </div>

      <div className="panel">
        {tickets === null && <div className="empty">Loading tickets...</div>}
        {tickets && tickets.length === 0 && (
          <div className="empty">
            <strong>No tickets here</strong>
            {status || priority ? 'Try a different filter.' : 'Create the first ticket to get started.'}
          </div>
        )}
        {tickets && tickets.map((t) => (
          <Link key={t.id} to={`/tickets/${t.id}`} className={`row-ticket p-${t.priority}`}>
            <div>
              <div>
                <span className="t-id">#{t.id}</span>
                <span className="t-title">{t.title}</span>
              </div>
              <div className="t-meta">
                <span>{t.created_by_email}</span>
                <span>{timeAgo(t.created_at)}</span>
                {!t.assigned_to && <span>Unassigned</span>}
              </div>
            </div>
            <div className="t-right">
              <span className="ptag">{PRIORITY_LABEL[t.priority]}</span>
              <StatusPill status={t.status} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}