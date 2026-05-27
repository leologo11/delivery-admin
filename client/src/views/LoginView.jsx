import React, { useState } from 'react';
import { api } from '../api/index.js';
import { toast } from '../components/Toast.jsx';

/* ─── Logo ────────────────────────────────────────────────────── */
function Logo({ size = 52 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.26),
      background: 'linear-gradient(135deg, #0052FF 0%, #00DAFF 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 24px rgba(0,82,255,.40)',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 900,
        fontSize: Math.round(size * 0.46),
        color: '#fff',
        lineHeight: 1,
        letterSpacing: '-1px',
      }}>D</span>
    </div>
  );
}

/* ─── Seed Admin Modal ────────────────────────────────────────── */
function SeedAdminModal({ onClose }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSeed(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.seedAdmin(email, password);
      setDone(true);
      toast.success('Admin creado. Ya puedes iniciar sesión.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #dbe3ef',
    borderRadius: 10,
    fontFamily: 'Inter, sans-serif',
    color: '#0F172A',
    background: '#f4f7ff',
    outline: 'none',
    transition: 'border-color .15s',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15,23,42,.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(15,23,42,.20)',
        animation: 'scaleIn .2s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>Crear Admin Inicial</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Solo funciona si no hay admins</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B', padding: 4 }}
          >×</button>
        </div>

        {done ? (
          <div style={{
            padding: '14px 16px',
            background: '#22a85a12',
            border: '1px solid #22a85a44',
            borderRadius: 10,
            color: '#22a85a',
            fontWeight: 600,
            fontSize: 14,
            textAlign: 'center',
          }}>
            Admin creado correctamente. Cierra y entra con tus credenciales.
          </div>
        ) : (
          <form onSubmit={handleSeed} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="Email del admin"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
            {error && (
              <div style={{ fontSize: 13, color: '#cc2244', padding: '8px 10px', background: '#cc224412', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 4, height: 40 }}
            >
              {loading ? 'Creando…' : 'Crear Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── LoginView ───────────────────────────────────────────────── */
export default function LoginView({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showSeed, setShowSeed] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (!res.token || !res.user) throw new Error('Respuesta inválida del servidor');
      localStorage.setItem('dos_token', res.token);
      toast.success(`Bienvenido, ${res.user.name}`);
      onLogin(res.user);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    border: '1.5px solid #dbe3ef',
    borderRadius: 10,
    fontFamily: 'Inter, sans-serif',
    color: '#0F172A',
    background: '#f8fafc',
    transition: 'border-color .15s, box-shadow .15s',
    outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -200,
        right: -200,
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,82,255,.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -150,
        left: -150,
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,218,255,.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,.25)',
        animation: 'slideUp .3s ease both',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Logo size={60} />
          </div>
          <h1 style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: 26,
            color: '#0F172A',
            letterSpacing: '-0.5px',
            margin: 0,
          }}>
            DeliveryOS
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 6 }}>
            Gestión de entregas
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#0052FF'; e.target.style.boxShadow = '0 0 0 3px #0052FF14'; }}
              onBlur={e  => { e.target.style.borderColor = '#dbe3ef'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#0052FF'; e.target.style.boxShadow = '0 0 0 3px #0052FF14'; }}
              onBlur={e  => { e.target.style.borderColor = '#dbe3ef'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#cc224412',
              border: '1px solid #cc224444',
              borderRadius: 10,
              color: '#cc2244',
              fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ height: 46, fontSize: 15, marginTop: 4, borderRadius: 12 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                  display: 'inline-block',
                }} />
                Ingresando…
              </span>
            ) : 'Iniciar sesión'}
          </button>
        </form>

        {/* Seed link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => setShowSeed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'color .15s',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
            onMouseEnter={e => e.target.style.color = '#64748B'}
            onMouseLeave={e => e.target.style.color = '#94a3b8'}
          >
            Primera vez — crear admin
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showSeed && <SeedAdminModal onClose={() => setShowSeed(false)} />}
    </div>
  );
}
