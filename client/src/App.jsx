import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken, clearToken } from './api';
import AuthPage from './AuthPage';
import Layout from './Layout';
import Tickets from './Tickets';
import Overview from './Overview';
import TicketDetail from './TicketDetail';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());

  const logout = () => {
    clearToken();
    setLoggedIn(false);
  };

  if (!loggedIn) return <AuthPage onLogin={() => setLoggedIn(true)} />;

  return (
    <Routes>
      <Route element={<Layout onLogout={logout} />}>
        <Route path="/" element={<Tickets />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}