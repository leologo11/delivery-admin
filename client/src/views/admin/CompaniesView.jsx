import React, { useState, useEffect } from 'react';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Helpers ────────────────────────────────────────────────── */
const EMPTY_FORM = { name: '', rut: '', contactPerson: '', contactPhone: '', contactEmail: '' };

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

/* ─── Modal ──────────────────────────────────────────────────── */
function CompanyModal({ initial, onSave, onClose }) {
  const isEdit = !!initial?._id;
  const [form, setForm] = useState(initial ? {
    name:          initial.name          || '',
    rut:           initial.rut           || '',
    contactPerson: initial.contactPerson || '',
    contactPhone:  initial.contactPhone  || '',
    contactEmail:  initial.contactEmail  || '',
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 14,
    border: '1.5px solid #dbe3ef',
    borderRadius: 9,
    fontFamily: 'Inter, sans-serif',
    color: '#0F172A',
    background: '#f8fafc',
    outline: 'none',
    transition: 'border-color .14s',
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 18,
        padding: '28px 28px',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 24px 60px rgba(15,23,42,.18)',
        animation: 'scaleIn .18s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
            {isEdit ? 'Editar empresa' : 'Nueva empresa'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Empresa S.A."
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0052FF'}
                onBlur={e  => e.target.style.borderColor = '#dbe3ef'}
              />
            </div>
            <div>
              <label style={labelStyle}>RUT</label>
              <input
                value={form.rut}
                onChange={e => set('rut', e.target.value)}
                placeholder="12.345.678-9"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0052FF'}
                onBlur={e  => e.target.style.borderColor = '#dbe3ef'}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Contacto</label>
            <input
              value={form.contactPerson}
              onChange={e => set('contactPerson', e.target.value)}
              placeholder="Nombre del contacto"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#0052FF'}
              onBlur={e  => e.target.style.borderColor = '#dbe3ef'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input
                value={form.contactPhone}
                onChange={e => set('contactPhone', e.target.value)}
                placeholder="+56 9 1234 5678"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0052FF'}
                onBlur={e  => e.target.style.borderColor = '#dbe3ef'}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => set('contactEmail', e.target.value)}
                placeholder="empresa@mail.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#0052FF'}
                onBlur={e  => e.target.style.borderColor = '#dbe3ef'}
              />
            </div>
          </div>

          {error && (
            <div style={{ padding: '9px 12px', background: '#cc224412', border: '1px solid #cc224440', borderRadius: 8, color: '#cc2244', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px', background: 'transparent', border: '1px solid #dbe3ef',
                borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                color: '#64748B', fontFamily: 'Inter, sans-serif',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 22px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg,#0052FF,#0041CC)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(0,82,255,.3)',
              }}
            >
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Confirm delete dialog ──────────────────────────────────── */
function ConfirmDialog({ company, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15,23,42,.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '28px 28px', width: '100%', maxWidth: 380,
        boxShadow: '0 24px 60px rgba(15,23,42,.18)',
        animation: 'scaleIn .18s ease both',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 8 }}>
          Eliminar empresa
        </div>
        <div style={{ color: '#64748B', fontSize: 14, marginBottom: 22 }}>
          ¿Seguro que deseas eliminar <strong>{company.name}</strong>? Esta acción no se puede deshacer.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{
            padding: '9px 20px', background: 'transparent', border: '1px solid #dbe3ef',
            borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748B', fontFamily: 'Inter, sans-serif',
          }}>
            Cancelar
          </button>
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

/* ─── CompaniesView ──────────────────────────────────────────── */
export default function CompaniesView() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | { mode:'add' } | { mode:'edit', company }
  const [delTarget, setDelTarget] = useState(null);
  const [search,    setSearch]    = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.getCompanies();
      setCompanies(Array.isArray(data) ? data : data?.companies || []);
    } catch (err) {
      toast.error(err.message || 'Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    if (modal?.mode === 'edit') {
      const updated = await api.updateCompany(modal.company._id, form);
      setCompanies(p => p.map(c => c._id === updated._id ? updated : c));
      toast.success('Empresa actualizada');
    } else {
      const created = await api.createCompany(form);
      setCompanies(p => [...p, created]);
      toast.success('Empresa creada');
    }
  }

  async function handleDelete() {
    try {
      await api.deleteCompany(delTarget._id);
      setCompanies(p => p.filter(c => c._id !== delTarget._id));
      toast.success('Empresa eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDelTarget(null);
    }
  }

  const filtered = companies.filter(c => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.rut?.toLowerCase().includes(q)  ||
      c.contactEmail?.toLowerCase().includes(q)
    );
  });

  const thStyle = {
    padding: '11px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: '.5px',
    borderBottom: '1px solid #dbe3ef',
    background: '#f8fafc',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '12px 14px',
    fontSize: 13,
    color: '#1E293B',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
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
            Empresas
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} registrada{companies.length !== 1 ? 's' : ''}
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
          <span style={{ fontSize: 16 }}>+</span> Nueva empresa
        </button>
      </div>

      {/* Table card */}
      <div style={{
        background: '#fff', border: '1px solid #dbe3ef',
        borderRadius: 14, boxShadow: '0 1px 3px rgba(15,23,42,.07)',
        overflow: 'hidden',
      }}>
        {/* Search bar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUT o email…"
            style={{
              width: '100%', maxWidth: 340,
              padding: '8px 12px',
              border: '1px solid #dbe3ef', borderRadius: 8,
              fontSize: 13, color: '#0F172A', background: '#f8fafc',
              outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                <Skel w="22%" />
                <Skel w="14%" />
                <Skel w="16%" />
                <Skel w="14%" />
                <Skel w="18%" />
                <Skel w="10%" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            {search ? 'Sin resultados para la búsqueda' : 'No hay empresas registradas. Crea la primera.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>RUT</th>
                  <th style={thStyle}>Contacto</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Email</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c._id || i}
                    style={{ background: i % 2 === 0 ? '#fff' : '#fafbff' }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg,#0052FF14,#00DAFF14)',
                          border: '1px solid #0052FF22',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0052FF',
                          flexShrink: 0,
                        }}>
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        {c.name}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: '#64748B', fontFamily: 'monospace', fontSize: 12 }}>
                      {c.rut || '—'}
                    </td>
                    <td style={tdStyle}>{c.contactPerson || '—'}</td>
                    <td style={{ ...tdStyle, color: '#64748B' }}>{c.contactPhone || '—'}</td>
                    <td style={{ ...tdStyle, color: '#0052FF' }}>
                      {c.contactEmail ? (
                        <a href={`mailto:${c.contactEmail}`} style={{ color: '#0052FF', textDecoration: 'none' }}>
                          {c.contactEmail}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setModal({ mode: 'edit', company: c })}
                          title="Editar"
                          style={{
                            padding: '5px 12px',
                            background: '#0052FF14',
                            color: '#0052FF',
                            border: '1px solid #0052FF22',
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDelTarget(c)}
                          title="Eliminar"
                          style={{
                            padding: '5px 12px',
                            background: '#cc224412',
                            color: '#cc2244',
                            border: '1px solid #cc224422',
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
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
        <CompanyModal
          initial={modal.mode === 'edit' ? modal.company : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {delTarget && (
        <ConfirmDialog
          company={delTarget}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
