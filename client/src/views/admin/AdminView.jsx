import React, { useState } from 'react';
import { ToastProvider } from '../../components/Toast.jsx';
import DashboardView    from './DashboardView.jsx';
import CompaniesView    from './CompaniesView.jsx';
import UserManager      from './UserManager.jsx';
import RoutesView       from './RoutesView.jsx';
import GeneralMapView   from './GeneralMapView.jsx';
import SectorMap        from './SectorMap.jsx';
import AllPackagesView  from './AllPackagesView.jsx';

/* ─── Logo ───────────────────────────────────────────────────── */
function SidebarLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '28px 20px 24px' }}>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #0052FF 0%, #00DAFF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,82,255,.35)',
      }}>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
          fontSize: 18,
          color: '#fff',
          lineHeight: 1,
        }}>D</span>
      </div>
      <span style={{
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 800,
        fontSize: 17,
        color: '#fff',
        letterSpacing: '-0.3px',
      }}>DeliveryOS</span>
    </div>
  );
}

/* ─── Nav items config ───────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard'          },
  { id: 'packages',  icon: '📦', label: 'Paquetes'           },
  { id: 'routes',    icon: '🗺️', label: 'Rutas'              },
  { id: 'map',       icon: '🌍', label: 'Mapa General'       },
  { id: 'sectors',   icon: '💰', label: 'Precios / Sectores' },
  { id: 'companies', icon: '🏢', label: 'Empresas'           },
  { id: 'users',     icon: '👥', label: 'Usuarios'           },
];

/* ─── Role badge ─────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const colors = {
    admin:    { bg: '#0052FF22', color: '#60a5fa' },
    driver:   { bg: '#22a85a22', color: '#4ade80' },
    superadmin: { bg: '#d4650a22', color: '#fb923c' },
  };
  const c = colors[role] || colors.admin;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: c.bg,
      color: c.color,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {role}
    </span>
  );
}

/* ─── AdminView ──────────────────────────────────────────────── */
export default function AdminView({ user, setUser, onLogout }) {
  const [view, setView] = useState('dashboard');

  function renderView() {
    switch (view) {
      case 'dashboard': return <DashboardView user={user} />;
      case 'packages':  return <AllPackagesView />;
      case 'routes':    return <RoutesView />;
      case 'map':       return <GeneralMapView />;
      case 'sectors':   return <SectorMap />;
      case 'companies': return <CompaniesView />;
      case 'users':     return <UserManager user={user} />;
      default:          return <DashboardView user={user} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,.06)',
        overflow: 'hidden',
      }}>
        <SidebarLogo />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  marginBottom: 2,
                  background: active ? 'rgba(0,82,255,.18)' : 'transparent',
                  border: active ? '1px solid rgba(0,82,255,.30)' : '1px solid transparent',
                  borderRadius: 10,
                  color: active ? '#fff' : '#94a3b8',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .15s ease',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; } }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#0052FF',
                    boxShadow: '0 0 6px #0052FF',
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{
          padding: '16px 12px',
          borderTop: '1px solid rgba(255,255,255,.06)',
        }}>
          {/* User card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,.04)',
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0052FF, #00DAFF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}>
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e2e8f0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user?.name || 'Usuario'}
              </div>
              <RoleBadge role={user?.role || 'admin'} />
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid rgba(204,34,68,.30)',
              borderRadius: 10,
              color: '#f87171',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all .15s ease',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(204,34,68,.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>↩</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#F1F5F9',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {renderView()}
      </main>

      <ToastProvider />
    </div>
  );
}
