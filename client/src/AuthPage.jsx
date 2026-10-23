import { useState } from 'react';
import { api, setToken } from './api';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isLogin = mode === 'login';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const path = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { orgName, email, password };
      const data = await api(path, { method: 'POST', body });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-side">
        <div className="brand">
          <span className="mark"><i /><i /><i /></span>
          Triage
        </div>
        <div>
          <h2>Support requests, sorted by what matters.</h2>
          <p>One shared queue for your team. Every workspace is private to its own organisation.</p>
        </div>
        <small style={{ color: '#8fa9ad' }}>Built with React, Express and PostgreSQL</small>
      </section>

      <section className="auth-main">
        <form className="auth-form" onSubmit={submit}>
          <h1>{isLogin ? 'Log in' : 'Create your workspace'}</h1>
          <p className="sub" style={{ marginBottom: 24 }}>
            {isLogin ? 'Welcome back.' : 'You will be the admin and can add your team afterwards.'}
          </p>

          {!isLogin && (
            <div className="field">
              <label htmlFor="org">Organisation name</label>
              <input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" minLength={isLogin ? undefined : 8}
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : isLogin ? 'Log in' : 'Create workspace'}
          </button>

          <p className="switch">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <button type="button" onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}>
              {isLogin ? 'Create a workspace' : 'Log in'}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}