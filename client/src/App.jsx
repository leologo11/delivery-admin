import React, { useState, useEffect } from 'react';
import { api } from './api/index.js';
import LoginView from './views/LoginView.jsx';
import AdminView from './views/admin/AdminView.jsx';
import DriverView from './views/DriverView.jsx';
import TrackingView from './views/TrackingView.jsx';

function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]       = useState('auth'); // 'auth' | 'admin' | 'driver' | 'track'

  // Check if this is a public tracking URL
  const pathname = window.location.pathname;
  const trackMatch = pathname.match(/^\/track\/(.+)$/);

  useEffect(() => {
    if (trackMatch) {
      setLoading(false);
      setView('track');
      return;
    }

    const token = localStorage.getItem('dos_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then(u => {
        setUser(u);
        setView(u.role === 'driver' ? 'driver' : 'admin');
      })
      .catch(() => {
        localStorage.removeItem('dos_token');
      })
      .finally(() => setLoading(false));
  }, []);

  function handleLogin(u) {
    setUser(u);
    setView(u.role === 'driver' ? 'driver' : 'admin');
  }

  function handleLogout() {
    localStorage.removeItem('dos_token');
    setUser(null);
    setView('auth');
  }

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid #0052FF44',
          borderTopColor: '#0052FF',
          borderRadius: '50%',
          animation: 'spin .8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Public tracking view
  if (view === 'track' && trackMatch) {
    return <TrackingView />;
  }

  // Not authenticated
  if (!user || view === 'auth') {
    return <LoginView onLogin={handleLogin} />;
  }

  // Driver view
  if (view === 'driver') {
    return <DriverView user={user} onLogout={handleLogout} />;
  }

  // Admin view
  return <AdminView user={user} setUser={setUser} onLogout={handleLogout} />;
}

export default App;
