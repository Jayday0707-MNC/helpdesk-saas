import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { api } from './api';
import { Avatar, StatusPill, STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, timeAgo } from './ui';

export default function TicketDetail() {
  const { id } = useParams();
  const { me } = useOutletContext();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const isStaff = !!me && (me.role === 'admin' || me.role === 'agent');

  const loadComments = () =>
    api(`/tickets/${id}/comments`).then(setComments).catch((e) => setError(e.message));

  useEffect(() => {
    api(`/tickets/${id}`).then(setTicket).catch((e) => setError(e.message));
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!isStaff) return;
    api('/users')
      .then((users) => setStaff(users.filter((u) => u.role === 'admin' || u.role === 'agent')))
      .catch((e) => setError(e.message));
  }, [isStaff]);

  const updateTicket = async (changes) => {
    setError('');
    try {
      setTicket(await api(`/tickets/${id}`, { method: 'PATCH', body: changes }));
    } catch (err) {
      setError(err.message);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api(`/tickets/${id}/comments`, { method: 'POST', body: { body } });
      setBody('');
      loadComments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!ticket) {
    return (
      <>
        <Link to="/" className="back">&larr; Tickets</Link>
        {error ? <p className="error">{error}</p> : <p className="muted">Loading ticket...</p>}
      </>
    );
  }

  return (
    <>
      <Link to="/" className="back">&larr; Tickets</Link>
      {error && <p className="error">{error}</p>}

      <div className="detail">
        <div className="stack">
          <section className="panel panel-pad">
            <h1>
              <span className="t-id">#{ticket.id}</span>
              {ticket.title}
            </h1>
            <div className="t-meta"><span>Opened {timeAgo(ticket.created_at)}</span></div>
            <p className="desc">{ticket.description || 'No description was added.'}</p>
          </section>

          <section className="panel panel-pad">
            <h2 className="section-title">
              {comments.length === 0 ? 'Conversation' : `Conversation (${comments.length})`}
            </h2>
            {comments.length === 0 && <p className="muted">No replies yet. Start the conversation below.</p>}

            {comments.map((c) => (
              <article className="msg" key={c.id}>
                <Avatar email={c.author_email} />
                <div>
                  <header>
                    <b>{c.author_email}</b>
                    <span className="role">{c.author_role}</span>
                    <span className="muted">{timeAgo(c.created_at)}</span>
                  </header>
                  <p>{c.body}</p>
                </div>
              </article>
            ))}

            <form className="composer" onSubmit={addComment}>
              <label htmlFor="reply">Reply</label>
              <textarea id="reply" rows="3" value={body} onChange={(e) => setBody(e.target.value)} required />
              <div className="actions">
                <button className="btn btn-primary" type="submit">Send reply</button>
              </div>
            </form>
          </section>
        </div>

        <aside className="panel panel-pad props">
          <div className="prop">
            <span className="label">Status</span>
            {isStaff ? (
              <select value={ticket.status} onChange={(e) => updateTicket({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            ) : (
              <StatusPill status={ticket.status} />
            )}
          </div>

          <div className="prop">
            <span className="label">Priority</span>
            {isStaff ? (
              <select value={ticket.priority} onChange={(e) => updateTicket({ priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            ) : (
              <span className={`ptag p-${ticket.priority}`}>{PRIORITY_LABEL[ticket.priority]}</span>
            )}
          </div>

          {isStaff && (
            <div className="prop">
              <span className="label">Assigned to</span>
              <select
                value={ticket.assigned_to || ''}
                onChange={(e) => updateTicket({ assigned_to: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Unassigned</option>
                {staff.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}