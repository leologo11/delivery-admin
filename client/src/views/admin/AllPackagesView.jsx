import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Constants ─────────────────────────────────────────────── */
const PAGE_SIZE = 60;
const STATUSES = [
  { value: 'todos',        label: 'Todos',         color: '#64748B', bg: '#64748B14' },
  { value: 'pendiente',    label: 'Pendiente',      color: '#d4650a', bg: '#d4650a14' },
  { value: 'entregado',    label: 'Entregado',      color: '#22a85a', bg: '#22a85a14' },
  { value: 'no-entregado', label: 'No entregado',   color: '#cc2244', bg: '#cc224414' },
  { value: 'devuelto',     label: 'Devuelto',       color: '#0052FF', bg: '#0052FF14' },
  { value: 'eliminado',    label: 'Eliminado',      color: '#94a3b8', bg: '#94a3b814' },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.value, s]));

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCLP(n) {
  if (!n && n !== 0) return '—';
  return `$${Number(n).toLocaleString('es-CL')}`;
}

function Skel({ w = '100%', h = 14, r = 5 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['pendiente'];
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 999,
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

/* ─── Detail Drawer ──────────────────────────────────────────── */
function DetailDrawer({ pkg, onClose, onStatusChange, onDelete }) {
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function changeStatus(newStatus) {
    if (newStatus === pkg.status) return;
    setChanging(true);
    try {
      const token = localStorage.getItem('dos_token');
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onStatusChange(pkg.id, newStatus);
      toast.success('Estado actualizado');
    } catch (err) {
      toast.error(err.message || 'Error al cambiar estado');
    } finally {
      setChanging(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar paquete ${pkg.trackingId}?`)) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('dos_token');
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || `HTTP ${res.status}`); }
      onDelete(pkg.id);
      toast.success('Paquete eliminado');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
      setDeleting(false);
    }
  }

  const row = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, flexShrink: 0, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B', textAlign: 'right', wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,.3)',
          backdropFilter: 'blur(2px)',
          zIndex: 150,
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 380,
        background: '#fff',
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(15,23,42,.14)',
        animation: 'slideInRight .2s ease both',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', fontFamily: 'Montserrat,sans-serif' }}>
              Detalle del paquete
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontFamily: 'monospace' }}>
              {pkg.trackingId}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 8,
              width: 32, height: 32, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748B', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {/* Status badge + change */}
          <div style={{ marginTop: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>Estado</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUSES.filter(s => s.value !== 'todos').map(s => (
                <button
                  key={s.value}
                  onClick={() => changeStatus(s.value)}
                  disabled={changing || s.value === pkg.status}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 999,
                    background: s.value === pkg.status ? s.bg : '#f8fafc',
                    color: s.value === pkg.status ? s.color : '#94a3b8',
                    border: `1.5px solid ${s.value === pkg.status ? s.color + '44' : '#dbe3ef'}`,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: s.value === pkg.status ? 'default' : 'pointer',
                    opacity: changing ? 0.6 : 1,
                    transition: 'all .14s',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info rows */}
          <div style={{ marginTop: 16 }}>
            {row('Cliente', [pkg.customerName, pkg.customerLastName].filter(Boolean).join(' '))}
            {row('Teléfono', pkg.customerPhone)}
            {row('Dirección', pkg.address)}
            {row('Comuna', pkg.commune)}
            {row('Apto / Piso', pkg.aptFloor)}
            {row('Zona', pkg.zone)}
            {row('Precio', fmtCLP(pkg.price))}
            {row('Nota', pkg.note)}
            {pkg.failReason && row('Motivo no entrega', pkg.failReason)}
            {row('Entregado', pkg.deliveredAt ? fmtDate(pkg.deliveredAt) : null)}
            {row('Creado', fmtDate(pkg.createdAt))}
          </div>

          {/* Photos */}
          {(pkg.photoUrl || pkg.photo2Url) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Fotos de entrega
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pkg.photoUrl && (
                  <a href={pkg.photoUrl} target="_blank" rel="noreferrer">
                    <img
                      src={pkg.photoUrl}
                      alt="Foto entrega"
                      style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid #dbe3ef' }}
                    />
                  </a>
                )}
                {pkg.photo2Url && (
                  <a href={pkg.photo2Url} target="_blank" rel="noreferrer">
                    <img
                      src={pkg.photo2Url}
                      alt="Foto entrega 2"
                      style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid #dbe3ef' }}
                    />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px 0',
              background: '#cc224412',
              color: '#cc2244',
              border: '1px solid #cc224422',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2,
              padding: '10px 0',
              background: 'linear-gradient(135deg,#0052FF,#0041CC)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── New Package Modal ──────────────────────────────────────── */
const inputSt = { width: '100%', padding: '9px 12px', border: '1.5px solid #dbe3ef', borderRadius: 8, fontSize: 13, color: '#0F172A', background: '#f8fafc', outline: 'none', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' };
const labelSt = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' };

function NewPkgModal({ companies, prices, onClose, onCreated }) {
  const EMPTY = { companyId: '', customerName: '', customerLastName: '', address: '', commune: '', aptFloor: '', customerPhone: '', price: '', note: '' };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function onCommune(v) {
    setF('commune', v);
    const match = (prices || []).find(p => (p.commune || '').toLowerCase() === v.toLowerCase());
    if (match) setF('price', String(match.price || match.basePrice || ''));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.companyId) { toast.error('Selecciona una empresa'); return; }
    if (!form.customerName.trim()) { toast.error('Nombre del cliente requerido'); return; }
    if (!form.address.trim()) { toast.error('Dirección requerida'); return; }
    setSaving(true);
    try {
      const pkg = await api.createPackage({
        companyId: form.companyId,
        routeId: null,
        customerName: form.customerName.trim(),
        customerLastName: form.customerLastName.trim() || null,
        customerPhone: form.customerPhone.trim() || null,
        address: form.address.trim(),
        commune: form.commune.trim() || null,
        aptFloor: form.aptFloor.trim() || null,
        price: Number(form.price) || 0,
        note: form.note.trim() || null,
      });
      toast.success('Paquete creado en el pool');
      onCreated(pkg);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al crear paquete');
    } finally {
      setSaving(false);
    }
  }

  const F = ({ label, children }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,.2)', animation: 'scaleIn .18s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid #dbe3ef', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Montserrat,sans-serif' }}>Nuevo paquete (pool)</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <form onSubmit={submit}>
            <F label="Empresa *">
              <select value={form.companyId} onChange={e => setF('companyId', e.target.value)} style={{ ...inputSt, cursor: 'pointer' }} required>
                <option value="">Seleccionar empresa…</option>
                {companies.map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
              </select>
            </F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <F label="Nombre *">
                <input style={inputSt} value={form.customerName} onChange={e => setF('customerName', e.target.value)} placeholder="Juan" required onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
              <F label="Apellido">
                <input style={inputSt} value={form.customerLastName} onChange={e => setF('customerLastName', e.target.value)} placeholder="Pérez" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
            </div>
            <F label="Dirección *">
              <input style={inputSt} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Av. Providencia 1234" required onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
            </F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 10px' }}>
              <F label="Comuna">
                <input style={inputSt} value={form.commune} onChange={e => onCommune(e.target.value)} placeholder="Providencia" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
              <F label="Dpto/Piso">
                <input style={inputSt} value={form.aptFloor} onChange={e => setF('aptFloor', e.target.value)} placeholder="Dpto 5B" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
              <F label="Precio (CLP)">
                <input type="number" style={inputSt} value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
              <F label="Teléfono">
                <input style={inputSt} value={form.customerPhone} onChange={e => setF('customerPhone', e.target.value)} placeholder="+56 9 XXXX XXXX" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
              <F label="Nota">
                <input style={inputSt} value={form.note} onChange={e => setF('note', e.target.value)} placeholder="Instrucciones…" onFocus={e => e.target.style.borderColor='#0052FF'} onBlur={e => e.target.style.borderColor='#dbe3ef'} />
              </F>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #dbe3ef', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#64748B' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 22px', background: saving ? '#94a3b8' : 'linear-gradient(135deg,#0052FF,#0041CC)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creando…' : 'Crear paquete'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── AllPackagesView ────────────────────────────────────────── */
export default function AllPackagesView() {
  const [packages,  setPackages]  = useState([]);
  const [companies, setCompanies] = useState([]);
  const [prices,    setPrices]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [status,    setStatus]    = useState('todos');
  const [companyId, setCompanyId] = useState('');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const [showNew,   setShowNew]   = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (status !== 'todos') params.status = status;
      if (companyId) params.companyId = companyId;
      const data = await api.getAllPackages(params);
      setPackages(data.packages || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  }, [page, status, companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getCompanies().then(d => setCompanies(Array.isArray(d) ? d : d?.companies || [])).catch(() => {});
    api.getPrices().then(d => setPrices(Array.isArray(d) ? d : d?.prices || [])).catch(() => {});
  }, []);

  function applyFilter() {
    setPage(1);
    load(1);
  }

  function handleStatusChange(id, newStatus) {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    if (selected?.id === id) setSelected(p => ({ ...p, status: newStatus }));
  }

  function handleDelete(id) {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, status: 'eliminado' } : p));
    setSelected(null);
    setTotal(t => Math.max(0, t - 1));
  }

  const filtered = search
    ? packages.filter(p => {
        const q = search.toLowerCase();
        return [p.trackingId, p.customerName, p.customerLastName, p.address, p.commune]
          .filter(Boolean).join(' ').toLowerCase().includes(q);
      })
    : packages;

  const thStyle = {
    padding: '10px 12px',
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
    padding: '11px 12px',
    fontSize: 13,
    color: '#1E293B',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif', height: '100%' }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Montserrat,sans-serif' }}>
            Paquetes
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            {loading ? '…' : `${total.toLocaleString()} paquete${total !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            background: 'linear-gradient(135deg,#0052FF,#0041CC)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,82,255,.30)',
          }}
        >
          + Agregar paquete
        </button>
      </div>

      {/* Filters bar */}
      <div style={{
        background: '#fff',
        border: '1px solid #dbe3ef',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar tracking, cliente, dirección…"
          style={{
            flex: '1 1 220px',
            padding: '8px 12px',
            border: '1.5px solid #dbe3ef',
            borderRadius: 8,
            fontSize: 13,
            color: '#0F172A',
            background: '#f8fafc',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
          onFocus={e => e.target.style.borderColor = '#0052FF'}
          onBlur={e => e.target.style.borderColor = '#dbe3ef'}
        />

        {/* Status filter */}
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{
            padding: '8px 10px',
            border: '1.5px solid #dbe3ef',
            borderRadius: 8,
            fontSize: 13,
            color: '#0F172A',
            background: '#f8fafc',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Company filter */}
        <select
          value={companyId}
          onChange={e => { setCompanyId(e.target.value); setPage(1); }}
          style={{
            padding: '8px 10px',
            border: '1.5px solid #dbe3ef',
            borderRadius: 8,
            fontSize: 13,
            color: '#0F172A',
            background: '#f8fafc',
            outline: 'none',
            cursor: 'pointer',
            maxWidth: 180,
          }}
        >
          <option value="">Todas las empresas</option>
          {companies.map(c => (
            <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
          ))}
        </select>

        <button
          onClick={applyFilter}
          style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg,#0052FF,#0041CC)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Filtrar
        </button>
      </div>

      {/* Table card */}
      <div style={{
        flex: 1,
        background: '#fff',
        border: '1px solid #dbe3ef',
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(15,23,42,.07)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 14 }}>
                  <Skel w="12%" />
                  <Skel w="18%" />
                  <Skel w="22%" />
                  <Skel w="10%" />
                  <Skel w="9%" />
                  <Skel w="8%" />
                  <Skel w="10%" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Sin paquetes</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {search ? 'No hay resultados para la búsqueda.' : 'Cambia los filtros para ver paquetes.'}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tracking</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Dirección</th>
                  <th style={thStyle}>Comuna</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Creado</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Foto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id || i}
                    onClick={() => setSelected(p)}
                    style={{
                      background: selected?.id === p.id ? '#0052FF08' : i % 2 === 0 ? '#fff' : '#fafbff',
                      cursor: 'pointer',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (selected?.id !== p.id) e.currentTarget.style.background = '#f0f4ff'; }}
                    onMouseLeave={e => { if (selected?.id !== p.id) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbff'; }}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#0052FF', fontWeight: 600 }}>
                      {p.trackingId}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[p.customerName, p.customerLastName].filter(Boolean).join(' ') || '—'}
                      </div>
                      {p.customerPhone && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.customerPhone}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.address || '—'}
                      </div>
                      {p.aptFloor && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.aptFloor}</div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569' }}>
                      {p.commune || '—'}
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0F172A' }}>
                      {fmtCLP(p.price)}
                    </td>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 12 }}>
                      {fmtDate(p.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt=""
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1.5px solid #dbe3ef',
                          }}
                          onClick={e => { e.stopPropagation(); window.open(p.photoUrl, '_blank'); }}
                        />
                      ) : (
                        <span style={{ color: '#e2e8f0', fontSize: 16 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              Página {page} de {totalPages} · {total.toLocaleString()} paquetes
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }}
                disabled={page === 1}
                style={{
                  padding: '6px 14px',
                  background: page === 1 ? '#f8fafc' : '#0052FF',
                  color: page === 1 ? '#94a3b8' : '#fff',
                  border: '1px solid #dbe3ef',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }}
                disabled={page === totalPages}
                style={{
                  padding: '6px 14px',
                  background: page === totalPages ? '#f8fafc' : '#0052FF',
                  color: page === totalPages ? '#94a3b8' : '#fff',
                  border: '1px solid #dbe3ef',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer
          pkg={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {/* New Package Modal */}
      {showNew && (
        <NewPkgModal
          companies={companies}
          prices={prices}
          onClose={() => setShowNew(false)}
          onCreated={pkg => {
            setPackages(prev => [pkg, ...prev]);
            setTotal(t => t + 1);
          }}
        />
      )}
    </div>
  );
}
