import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from './api';

export default function Layout({ onLogout }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api('/auth/me').then(setMe).catch(() => {});
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark"><i /><i /><i /></span>
          Triage
        </div>

        <div className="workspace">
          <small>Workspace</small>
          <strong>{me ? me.org_name : '...'}</strong>
        </div>

        <nav className="nav">
          <NavLink to="/" end>Tickets</NavLink>
          <NavLink to="/overview">Overview</NavLink>
        </nav>

        <div className="sidebar-foot">
          {me && (
            <div className="me">
              {me.email}
              <small>{me.role}</small>
            </div>
          )}
          <button className="btn-out" onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <Outlet context={{ me }} />
      </main>
    </div>
  );
}