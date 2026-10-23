export const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const PRIORITIES = ['high', 'medium', 'low'];

export const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};
export const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

export function StatusPill({ status }) {
  return (
    <span className={`pill s-${status}`}>
      <i />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export function Avatar({ email = '?' }) {
  return <span className="avatar">{email.slice(0, 2).toUpperCase()}</span>;
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString();
}