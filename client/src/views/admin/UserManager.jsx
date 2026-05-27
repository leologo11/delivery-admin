import React, { useState, useEffect } from 'react';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Skeleton ───────────────────────────────────────────────── */
function Skel({ w = '100%', h = 16, r = 6 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

/* ─── Role badge ─────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const map = {
    admin:     { bg: '#0052FF14', color: '#0052FF', label: 'Admin'  },
    driver:    { bg: '#22a85a12', color: '#22a85a', label: 'Driver' },
    superadmin:{ bg: '#d4650a12', color: '#d4650a', label: 'Super'  },
  };
  const c = map[role] || map.admin;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px',
      borderRadius: 999,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 700,
    }}>
      {c.label}
    </span>
  );
}

/* ─── User Modal (create / edit) ─────────────────────────────── */
const EMPTY = { name:'', email:'', password:'', role:'driver', phone:'', vehicle:'', licensePlate:'' };

function UserModal({ initial, onSave, onClose, currentUser }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(isEdit ? {
    name:         initial.name         || '',
    email:        initial.email        || '',
    password:     '',
    role:         initial.role         || 'driver',
    phone:        initial.phone        || '',
    vehicle:      initial.vehicle      || '',
    licensePlate: initial.licensePlate || '',
  } : { ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [showPass, setShowPass] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())  { setError('El nombre es obligatorio'); return; }
    if (!form.email.trim()) { setError('El email es obligatorio'); return; }
    if (!isEdit && !form.password) { setError('La contraseña es obligatoria'); return; }
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', fontSize: 14,
    border: '1.5px solid #dbe3ef', borderRadius: 9,
    fontFamily: 'Inter, sans-serif', color: '#0F172A', background: '#f8fafc',
    outline: 'none', transition: 'border-color .14s',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' };
  const focusIn  = e => e.target.style.borderColor = '#0052FF';
  const focusOut = e => e.target.style.borderColor = '#dbe3ef';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18,
        padding: '28px 28px', width: '100%', maxWidth: 500,
        boxShadow: '0 24px 60px rgba(15,23,42,.18)',
        animation: 'scaleIn .18s ease both',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Juan Pérez" required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@mail.com" required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>

          {/* Password + Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{isEdit ? 'Nueva contraseña' : 'Contraseña *'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                  required={!isEdit}
                  minLength={form.password ? 6 : undefined}
                  style={{ ...inputStyle, paddingRight: 38 }}
                  onFocus={focusIn} onBlur={focusOut}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8',
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Rol *</label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusIn} onBlur={focusOut}
              >
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+56 9 1234 5678" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Vehicle fields (driver only) */}
          {form.role === 'driver' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Vehículo</label>
                <input value={form.vehicle} onChange={e => set('vehicle', e.target.value)} placeholder="Moto, Van, Camioneta…" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>Patente</label>
                <input value={form.licensePlate} onChange={e => set('licensePlate', e.target.value.toUpperCase())} placeholder="AB-CD-12" style={{ ...inputStyle, textTransform: 'uppercase' }} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '9px 12px', background: '#cc224412', border: '1px solid #cc224440', borderRadius: 8, color: '#cc2244', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', background: 'transparent', border: '1px solid #dbe3ef',
              borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              color: '#64748B', fontFamily: 'Inter, sans-serif',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '9px 22px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#0052FF,#0041CC)',
              color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(0,82,255,.3)',
            }}>
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete confirmation ─────────────────────────────────────── */
function ConfirmDelete({ user: u, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); await onConfirm(); setLoading(false); }
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '28px 28px', width: '100%', maxWidth: 380,
        boxShadow: '0 24px 60px rgba(15,23,42,.18)',
        animation: 'scaleIn .18s ease both', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 8 }}>
          Eliminar usuario
        </div>
        <div style={{ color: '#64748B', fontSize: 14, marginBottom: 22 }}>
          ¿Eliminar a <strong>{u.name}</strong>? Esta acción no se puede deshacer.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '9px 20px', background: 'transparent', border: '1px solid #dbe3ef',
            borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B', fontFamily: 'Inter, sans-serif',
          }}>Cancelar</button>
          <button onClick={handle} disabled={loading} style={{
            padding: '9px 22px', background: '#cc2244', color: '#fff',
            border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── UserManager ────────────────────────────────────────────── */
const ROLES = ['all', 'admin', 'driver'];
const ROLE_LABELS = { all: 'Todos', admin: 'Admins', driver: 'Drivers' };

export default function UserManager({ user: currentUser }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | {mode:'add'} | {mode:'edit', user}
  const [delTarget, setDelTarget] = useState(null);
  const [roleTab,   setRoleTab]   = useState('all');
  const [search,    setSearch]    = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (err) {
      toast.error(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    if (modal?.mode === 'edit') {
      const updated = await api.updateUser(modal.user._id, form);
      setUsers(p => p.map(u => u._id === updated._id ? updated : u));
      toast.success('Usuario actualizado');
    } else {
      const created = await api.createUser(form);
      setUsers(p => [...p, created]);
      toast.success('Usuario creado');
    }
  }

  async function handleDelete() {
    try {
      await api.deleteUser(delTarget._id);
      setUsers(p => p.filter(u => u._id !== delTarget._id));
      toast.success('Usuario eliminado');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDelTarget(null);
    }
  }

  const filtered = users.filter(u => {
    if (roleTab !== 'all' && u.role !== roleTab) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q)  ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  const thStyle = {
    padding: '11px 14px',
    fontSize: 11, fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '.5px',
    borderBottom: '1px solid #dbe3ef', background: '#f8fafc',
    textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '12px 14px',
    fontSize: 13, color: '#1E293B',
    borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle',
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
            Usuarios
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            background: 'linear-gradient(135deg,#0052FF,#0041CC)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 2px 10px rgba(0,82,255,.30)',
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> Nuevo usuario
        </button>
      </div>

      {/* Table card */}
      <div style={{
        background: '#fff', border: '1px solid #dbe3ef',
        borderRadius: 14, boxShadow: '0 1px 3px rgba(15,23,42,.07)',
        overflow: 'hidden',
      }}>
        {/* Toolbar: role tabs + search */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Role filter tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
            {ROLES.map(r => {
              const active = roleTab === r;
              const cnt = r === 'all' ? users.length : users.filter(u => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRoleTab(r)}
                  style={{
                    padding: '5px 12px',
                    background: active ? '#fff' : 'transparent',
                    border: active ? '1px solid #dbe3ef' : '1px solid transparent',
                    borderRadius: 7,
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? '#0F172A' : '#64748B',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .14s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {ROLE_LABELS[r]}
                  <span style={{
                    marginLeft: 6,
                    background: active ? '#0052FF14' : '#e2e8f0',
                    color: active ? '#0052FF' : '#94a3b8',
                    borderRadius: 999, fontSize: 11, fontWeight: 700,
                    padding: '1px 6px',
                  }}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email…"
            style={{
              flex: 1, maxWidth: 280,
              padding: '8px 12px',
              border: '1px solid #dbe3ef', borderRadius: 8,
              fontSize: 13, color: '#0F172A', background: '#f8fafc',
              outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>

        {/* Table content */}
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <Skel w="20%" />
                <Skel w="22%" />
                <Skel w="10%" />
                <Skel w="14%" />
                <Skel w="14%" />
                <Skel w="12%" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {search ? 'Sin resultados para la búsqueda' : 'No hay usuarios en esta categoría.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Vehículo / Patente</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: u.role === 'driver'
                            ? 'linear-gradient(135deg,#22a85a,#16a34a)'
                            : 'linear-gradient(135deg,#0052FF,#00DAFF)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                        {currentUser?._id === u._id && (
                          <span style={{ fontSize: 10, color: '#0052FF', fontWeight: 600, background: '#0052FF14', padding: '1px 6px', borderRadius: 999 }}>
                            Tú
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#64748B' }}>{u.email}</td>
                    <td style={tdStyle}><RoleBadge role={u.role} /></td>
                    <td style={{ ...tdStyle, color: '#64748B' }}>{u.phone || '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748B', fontSize: 12 }}>
                      {u.vehicle || u.licensePlate
                        ? <span>{u.vehicle || ''}{u.vehicle && u.licensePlate ? ' · ' : ''}{u.licensePlate || ''}</span>
                        : '—'
                      }
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setModal({ mode: 'edit', user: u })}
                          style={{
                            padding: '5px 12px',
                            background: '#0052FF14', color: '#0052FF',
                            border: '1px solid #0052FF22',
                            borderRadius: 7, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDelTarget(u)}
                          disabled={currentUser?._id === u._id}
                          title={currentUser?._id === u._id ? 'No puedes eliminarte a ti mismo' : 'Eliminar'}
                          style={{
                            padding: '5px 12px',
                            background: currentUser?._id === u._id ? '#f1f5f9' : '#cc224412',
                            color: currentUser?._id === u._id ? '#94a3b8' : '#cc2244',
                            border: `1px solid ${currentUser?._id === u._id ? '#dbe3ef' : '#cc224422'}`,
                            borderRadius: 7, fontSize: 12, fontWeight: 600,
                            cursor: currentUser?._id === u._id ? 'not-allowed' : 'pointer',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <UserModal
          initial={modal.mode === 'edit' ? modal.user : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
          currentUser={currentUser}
        />
      )}

      {delTarget && (
        <ConfirmDelete
          user={delTarget}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
