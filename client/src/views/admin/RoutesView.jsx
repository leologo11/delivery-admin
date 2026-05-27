import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtCLP(n) {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}
function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_MAP = {
  active:    { color: '#0052FF', bg: '#0052FF14', label: 'Activa' },
  paused:    { color: '#d4650a', bg: '#d4650a12', label: 'Pausada' },
  completed: { color: '#22a85a', bg: '#22a85a12', label: 'Completada' },
  cancelled: { color: '#cc2244', bg: '#cc224412', label: 'Cancelada' },
  draft:     { color: '#64748B', bg: '#64748B12', label: 'Borrador' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 999,
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.2px',
    }}>
      {s.label}
    </span>
  );
}

const PKG_STATUS_MAP = {
  pendiente:     { color: '#d4650a', bg: '#d4650a12', label: 'Pendiente' },
  entregado:     { color: '#22a85a', bg: '#22a85a12', label: 'Entregado' },
  'no-entregado':{ color: '#cc2244', bg: '#cc224412', label: 'No entregado' },
  'en-camino':   { color: '#0052FF', bg: '#0052FF14', label: 'En camino' },
};

function PkgStatusBadge({ status }) {
  const s = PKG_STATUS_MAP[status] || PKG_STATUS_MAP.pendiente;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

/* ─── Progress bar ───────────────────────────────────────────── */
function ProgressBar({ delivered, total }) {
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const color = pct >= 80 ? '#22a85a' : pct >= 40 ? '#0052FF' : '#d4650a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
        {delivered}/{total}
      </span>
    </div>
  );
}

/* ─── Icon buttons ───────────────────────────────────────────── */
function IconBtn({ title, onClick, color = '#64748B', bg = 'transparent', children, style }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: `1px solid ${hov ? color + '55' : '#dbe3ef'}`,
        background: hov ? color + '14' : bg,
        color: hov ? color : '#64748B',
        cursor: 'pointer',
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .15s',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ─── Modal backdrop ─────────────────────────────────────────── */
function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: width,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(15,23,42,.2)',
        animation: 'modalIn .2s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px',
          borderBottom: '1px solid #dbe3ef',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', fontFamily: 'Montserrat, sans-serif' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─── Field component ────────────────────────────────────────── */
function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}{required && <span style={{ color: '#cc2244', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #dbe3ef',
  borderRadius: 8,
  fontSize: 13,
  color: '#0F172A',
  background: '#fff',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

/* ─── Btn ────────────────────────────────────────────────────── */
function Btn({ onClick, loading, variant = 'primary', children, style, type = 'button' }) {
  const styles = {
    primary: { bg: 'linear-gradient(135deg,#0052FF,#0041CC)', color: '#fff', border: 'none', shadow: '0 2px 8px rgba(0,82,255,.3)' },
    danger:  { bg: 'transparent', color: '#cc2244', border: '1px solid #cc224440', shadow: 'none' },
    ghost:   { bg: 'transparent', color: '#64748B', border: '1px solid #dbe3ef', shadow: 'none' },
    success: { bg: 'linear-gradient(135deg,#22a85a,#1a9050)', color: '#fff', border: 'none', shadow: '0 2px 8px rgba(34,168,90,.25)' },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '9px 18px',
        background: s.bg,
        color: s.color,
        border: s.border,
        borderRadius: 9,
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? .6 : 1,
        boxShadow: s.shadow,
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading ? '...' : children}
    </button>
  );
}

/* ─── Share link modal ───────────────────────────────────────── */
function ShareModal({ open, onClose, shareUrl }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <Modal open={open} onClose={onClose} title="Compartir Ruta" width={420}>
      <p style={{ fontSize: 13, color: '#64748B', marginTop: 0 }}>
        Comparte este enlace con el cliente para seguimiento en tiempo real.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <input
          readOnly
          value={shareUrl || ''}
          style={{ ...inputStyle, flex: 1, background: '#f8fafc', color: '#64748B', fontSize: 12 }}
        />
        <Btn onClick={copy} variant={copied ? 'success' : 'primary'}>
          {copied ? 'Copiado' : 'Copiar'}
        </Btn>
      </div>
    </Modal>
  );
}

/* ─── Nueva Ruta modal ───────────────────────────────────────── */
function NewRouteModal({ open, onClose, onCreated, drivers, companies }) {
  const [form, setForm] = useState({ name: '', date: today(), driverId: '', companyId: '', notes: '' });
  const [saving, setSaving] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const route = await api.createRoute(form);
      toast.success('Ruta creada');
      onCreated(route);
      setForm({ name: '', date: today(), driverId: '', companyId: '', notes: '' });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al crear ruta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Ruta">
      <form onSubmit={submit}>
        <Field label="Nombre / Código" required>
          <input style={inputStyle} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Ej: RUT-2026-001" />
        </Field>
        <Field label="Fecha" required>
          <input type="date" style={inputStyle} value={form.date} onChange={e => setF('date', e.target.value)} />
        </Field>
        <Field label="Driver">
          <select style={selectStyle} value={form.driverId} onChange={e => setF('driverId', e.target.value)}>
            <option value="">Sin asignar</option>
            {(drivers || []).map(d => (
              <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Empresa">
          <select style={selectStyle} value={form.companyId} onChange={e => setF('companyId', e.target.value)}>
            <option value="">Sin empresa</option>
            {(companies || []).map(c => (
              <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Notas">
          <textarea
            style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
            value={form.notes}
            onChange={e => setF('notes', e.target.value)}
            placeholder="Observaciones opcionales..."
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>Crear Ruta</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Nuevo paquete modal ────────────────────────────────────── */
function NewPackageModal({ open, onClose, onCreated, routeId, prices }) {
  const defaultForm = { customerName: '', address: '', commune: '', apt: '', phone: '', price: '', notes: '', order: '' };
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function onCommuneChange(v) {
    setF('commune', v);
    // Auto-suggest price
    const match = (prices || []).find(p =>
      (p.commune || p.name || '').toLowerCase() === v.toLowerCase()
    );
    if (match) setF('price', match.price || match.basePrice || '');
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.customerName.trim()) { toast.error('El nombre del cliente es requerido'); return; }
    setSaving(true);
    try {
      const pkg = await api.createPackage({ ...form, routeId, price: Number(form.price) || 0 });
      toast.success('Paquete agregado');
      onCreated(pkg);
      setForm(defaultForm);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al crear paquete');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar Paquete" width={520}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <Field label="Nombre cliente" required>
            <input style={inputStyle} value={form.customerName} onChange={e => setF('customerName', e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Teléfono">
            <input style={inputStyle} value={form.phone} onChange={e => setF('phone', e.target.value)} placeholder="+56 9 XXXX XXXX" />
          </Field>
        </div>
        <Field label="Dirección" required>
          <input style={inputStyle} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="Av. Providencia 1234" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 14px' }}>
          <Field label="Comuna">
            <input style={inputStyle} value={form.commune} onChange={e => onCommuneChange(e.target.value)} placeholder="Providencia" />
          </Field>
          <Field label="Dpto/Piso">
            <input style={inputStyle} value={form.apt} onChange={e => setF('apt', e.target.value)} placeholder="Dpto 5B" />
          </Field>
          <Field label="Precio (CLP)">
            <input type="number" style={inputStyle} value={form.price} onChange={e => setF('price', e.target.value)} placeholder="0" />
          </Field>
        </div>
        <Field label="Notas">
          <input style={inputStyle} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Instrucciones de entrega..." />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>Agregar</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Import AI modal ────────────────────────────────────────── */
function ImportAIModal({ open, onClose, routeId, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setLoading(false);
    setConfirming(false);
  }

  async function doPreview() {
    if (!file) { toast.error('Selecciona un archivo'); return; }
    setLoading(true);
    try {
      const result = await api.importPreview(routeId, file);
      setPreview(result.packages || result || []);
    } catch (err) {
      toast.error(err.message || 'Error al previsualizar');
    } finally {
      setLoading(false);
    }
  }

  async function doConfirm() {
    if (!preview?.length) return;
    setConfirming(true);
    try {
      await api.importConfirm(routeId, preview);
      toast.success(`${preview.length} paquetes importados`);
      onImported(preview);
      reset();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al confirmar');
    } finally {
      setConfirming(false);
    }
  }

  function handleClose() { reset(); onClose(); }

  const thS = { padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #dbe3ef', background: '#f8fafc', textAlign: 'left' };
  const tdS = { padding: '8px 10px', fontSize: 12, color: '#1E293B', borderBottom: '1px solid #f1f5f9' };

  return (
    <Modal open={open} onClose={handleClose} title="Importar con IA" width={700}>
      {!preview ? (
        <div>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 0 }}>
            Sube una imagen, Excel o CSV con la lista de paquetes. La IA extraerá los datos automáticamente.
          </p>
          <div
            onClick={() => document.getElementById('ai-import-file').click()}
            style={{
              border: '2px dashed #dbe3ef',
              borderRadius: 12,
              padding: '32px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#fafbff',
              transition: 'border-color .15s',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
              {file ? file.name : 'Haz clic para seleccionar archivo'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Imagen (JPG, PNG), Excel (.xlsx) o CSV
            </div>
            <input
              id="ai-import-file"
              type="file"
              accept="image/*,.xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
            <Btn onClick={doPreview} loading={loading}>Previsualizar</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
              {preview.length} paquetes detectados
            </span>
            <Btn variant="ghost" onClick={reset} style={{ padding: '5px 12px', fontSize: 12 }}>← Atrás</Btn>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', borderRadius: 8, border: '1px solid #dbe3ef' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  <th style={thS}>#</th>
                  <th style={thS}>Nombre</th>
                  <th style={thS}>Dirección</th>
                  <th style={thS}>Comuna</th>
                  <th style={thS}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i}>
                    <td style={{ ...tdS, color: '#94a3b8' }}>{i + 1}</td>
                    <td style={tdS}>{p.customerName || p.name || '—'}</td>
                    <td style={tdS}>{p.address || '—'}</td>
                    <td style={tdS}>{p.commune || '—'}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: '#22a85a' }}>{fmtCLP(p.price || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
            <Btn variant="success" onClick={doConfirm} loading={confirming}>
              Confirmar importación
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ─── Pool assign modal ──────────────────────────────────────── */
function PoolModal({ open, onClose, routeId, onAssigned }) {
  const [pool, setPool] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getPoolPackages().then(r => {
      setPool(Array.isArray(r) ? r : r?.packages || []);
      setSelected(new Set());
    }).catch(err => toast.error(err.message)).finally(() => setLoading(false));
  }, [open]);

  function toggle(id) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function assign() {
    if (selected.size === 0) { toast.error('Selecciona al menos un paquete'); return; }
    setSaving(true);
    try {
      await api.bulkCreatePackages(routeId, [...selected].map(id => ({ poolId: id })));
      toast.success(`${selected.size} paquetes asignados`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al asignar');
    } finally {
      setSaving(false);
    }
  }

  const thS = { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #dbe3ef', background: '#f8fafc', textAlign: 'left' };
  const tdS = { padding: '8px 12px', fontSize: 13, color: '#1E293B', borderBottom: '1px solid #f1f5f9' };

  return (
    <Modal open={open} onClose={onClose} title="Asignar del Pool" width={620}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Cargando pool...</div>
      ) : pool.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No hay paquetes en el pool</div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
            {selected.size} seleccionados de {pool.length}
          </div>
          <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'auto', maxHeight: 380 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ ...thS, width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === pool.length && pool.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(pool.map(p => p._id || p.id)) : new Set())}
                    />
                  </th>
                  <th style={thS}>Cliente</th>
                  <th style={thS}>Dirección</th>
                  <th style={thS}>Comuna</th>
                  <th style={{ ...thS, textAlign: 'right' }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {pool.map(p => {
                  const id = p._id || p.id;
                  return (
                    <tr key={id} style={{ cursor: 'pointer', background: selected.has(id) ? '#0052FF08' : 'transparent' }} onClick={() => toggle(id)}>
                      <td style={tdS}>
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} onClick={e => e.stopPropagation()} />
                      </td>
                      <td style={{ ...tdS, fontWeight: 500 }}>{p.customerName || '—'}</td>
                      <td style={{ ...tdS, color: '#64748B' }}>{p.address || '—'}</td>
                      <td style={{ ...tdS, color: '#64748B' }}>{p.commune || '—'}</td>
                      <td style={{ ...tdS, textAlign: 'right', fontWeight: 600, color: '#22a85a' }}>{fmtCLP(p.price || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={assign} loading={saving}>Asignar {selected.size > 0 ? `(${selected.size})` : ''}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─── Package table (in slide-over) ─────────────────────────── */
function PackagesPanel({ routeId, onClose }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPool, setShowPool] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [prices, setPrices] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pkgs = await api.getPackages(routeId);
      setPackages(Array.isArray(pkgs) ? pkgs : pkgs?.packages || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => { load(); api.getPrices().then(r => setPrices(Array.isArray(r) ? r : r?.prices || [])).catch(() => {}); }, [load]);

  async function deletePkg(id) {
    if (!window.confirm('¿Eliminar paquete?')) return;
    try {
      await api.deletePackage(id);
      setPackages(prev => prev.filter(p => (p._id || p.id) !== id));
      toast.success('Paquete eliminado');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function startEdit(pkg) {
    setEditId(pkg._id || pkg.id);
    setEditForm({ customerName: pkg.customerName || '', address: pkg.address || '', commune: pkg.commune || '', price: pkg.price || '' });
  }

  async function saveEdit(id) {
    try {
      const updated = await api.updatePackage(id, editForm);
      setPackages(prev => prev.map(p => (p._id || p.id) === id ? { ...p, ...updated } : p));
      toast.success('Guardado');
      setEditId(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Drag reorder
  function onDragStart(e, idx) { setDragging(idx); e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e, idx) { e.preventDefault(); setDragOver(idx); }
  async function onDrop(e, idx) {
    e.preventDefault();
    if (dragging === null || dragging === idx) { setDragging(null); setDragOver(null); return; }
    const newList = [...packages];
    const [moved] = newList.splice(dragging, 1);
    newList.splice(idx, 0, moved);
    setPackages(newList);
    setDragging(null);
    setDragOver(null);
    try {
      await api.reorderPackages(newList.map((p, i) => ({ id: p._id || p.id, order: i })));
    } catch {
      toast.error('Error al reordenar');
    }
  }

  const filtered = packages.filter(p => filter === 'all' || p.status === filter);

  const thS = { padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #dbe3ef', background: '#f8fafc', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdS = { padding: '8px 12px', fontSize: 12, color: '#1E293B', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 'min(780px, 95vw)',
      background: '#fff',
      boxShadow: '-8px 0 40px rgba(15,23,42,.15)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideInRight .25s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #dbe3ef', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748B', lineHeight: 1, padding: 0 }}>←</button>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', flex: 1 }}>
          Paquetes de ruta
        </div>
        <Btn onClick={() => setShowPool(true)} variant="ghost" style={{ padding: '6px 12px', fontSize: 12 }}>+ Pool</Btn>
        <Btn onClick={() => setShowImport(true)} variant="ghost" style={{ padding: '6px 12px', fontSize: 12 }}>Importar IA</Btn>
        <Btn onClick={() => setShowAdd(true)} style={{ padding: '6px 14px', fontSize: 12 }}>+ Agregar</Btn>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, flexWrap: 'wrap' }}>
        {[['all','Todos'], ['pendiente','Pendiente'], ['entregado','Entregado'], ['no-entregado','No entregado'], ['en-camino','En camino']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: 'none',
              background: filter === v ? '#0052FF' : '#f1f5f9',
              color: filter === v ? '#fff' : '#64748B',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {l} {v === 'all' ? `(${packages.length})` : `(${packages.filter(p => p.status === v).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando paquetes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <div>No hay paquetes en este filtro</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ ...thS, width: 30 }}></th>
                <th style={{ ...thS, width: 36 }}>#</th>
                <th style={thS}>Cliente</th>
                <th style={thS}>Dirección</th>
                <th style={thS}>Comuna</th>
                <th style={{ ...thS, textAlign: 'right' }}>Precio</th>
                <th style={{ ...thS, textAlign: 'center' }}>Estado</th>
                <th style={{ ...thS, textAlign: 'center' }}>Acc.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pkg, idx) => {
                const id = pkg._id || pkg.id;
                const isEditing = editId === id;
                return (
                  <tr
                    key={id}
                    draggable
                    onDragStart={e => onDragStart(e, idx)}
                    onDragOver={e => onDragOver(e, idx)}
                    onDrop={e => onDrop(e, idx)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                    style={{
                      background: dragOver === idx ? '#0052FF08' : idx % 2 === 0 ? '#fff' : '#fafbff',
                      outline: dragOver === idx ? '2px solid #0052FF40' : 'none',
                      cursor: 'grab',
                    }}
                  >
                    <td style={{ ...tdS, color: '#94a3b8', textAlign: 'center', userSelect: 'none' }}>⠿</td>
                    <td style={{ ...tdS, color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={tdS}>
                      {isEditing ? (
                        <input
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 12 }}
                          value={editForm.customerName}
                          onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))}
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>{pkg.customerName || '—'}</span>
                      )}
                    </td>
                    <td style={tdS}>
                      {isEditing ? (
                        <input
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 12 }}
                          value={editForm.address}
                          onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                        />
                      ) : (
                        <span style={{ color: '#64748B' }}>{pkg.address || '—'}</span>
                      )}
                    </td>
                    <td style={tdS}>
                      {isEditing ? (
                        <input
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: 100 }}
                          value={editForm.commune}
                          onChange={e => setEditForm(p => ({ ...p, commune: e.target.value }))}
                        />
                      ) : (
                        <span style={{ color: '#64748B' }}>{pkg.commune || '—'}</span>
                      )}
                    </td>
                    <td style={{ ...tdS, textAlign: 'right', fontWeight: 600, color: '#22a85a' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          style={{ ...inputStyle, padding: '4px 8px', fontSize: 12, width: 80, textAlign: 'right' }}
                          value={editForm.price}
                          onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))}
                        />
                      ) : (
                        fmtCLP(pkg.price || 0)
                      )}
                    </td>
                    <td style={{ ...tdS, textAlign: 'center' }}><PkgStatusBadge status={pkg.status} /></td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <IconBtn title="Guardar" onClick={() => saveEdit(id)} color="#22a85a">✓</IconBtn>
                            <IconBtn title="Cancelar" onClick={() => setEditId(null)} color="#64748B">×</IconBtn>
                          </>
                        ) : (
                          <>
                            <IconBtn title="Editar" onClick={() => startEdit(pkg)} color="#0052FF">✎</IconBtn>
                            <IconBtn title="Eliminar" onClick={() => deletePkg(id)} color="#cc2244">🗑</IconBtn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <NewPackageModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        routeId={routeId}
        prices={prices}
        onCreated={pkg => setPackages(prev => [...prev, pkg])}
      />
      <ImportAIModal
        open={showImport}
        onClose={() => setShowImport(false)}
        routeId={routeId}
        onImported={pkgs => { setPackages(prev => [...prev, ...pkgs]); }}
      />
      <PoolModal
        open={showPool}
        onClose={() => setShowPool(false)}
        routeId={routeId}
        onAssigned={load}
      />
    </div>
  );
}

/* ─── Route Card ─────────────────────────────────────────────── */
function RouteCard({ route, onViewPackages, onEdit, onDelete, onShare }) {
  const total = route.total || route.totalPackages || 0;
  const delivered = route.delivered || route.deliveredPackages || 0;
  const failed = route.failed || route.failedPackages || 0;
  const pending = route.pending || route.pendingPackages || total - delivered - failed;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #dbe3ef',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(15,23,42,.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      transition: 'box-shadow .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.06)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 2 }}>
            {route.name || route.routeCode || `Ruta #${(route._id || route.id || '').slice(-4)}`}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            {route.date ? new Date(route.date + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
        <StatusBadge status={route.status} />
      </div>

      {/* Driver / company */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {route.driverName && (
          <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>👤</span> {route.driverName}
          </div>
        )}
        {route.companyName && (
          <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🏢</span> {route.companyName}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: total, color: '#0052FF' },
          { label: 'Entreg.', value: delivered, color: '#22a85a' },
          { label: 'Fallido', value: failed, color: '#cc2244' },
          { label: 'Pendiente', value: pending, color: '#d4650a' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 52, textAlign: 'center', padding: '6px 4px', background: s.color + '0d', borderRadius: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'Montserrat, sans-serif' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Amount */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#22a85a' }}>
        {fmtCLP(route.totalAmount || 0)} CLP
      </div>

      {/* Progress */}
      <ProgressBar delivered={delivered} total={total} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          onClick={() => onViewPackages(route)}
          style={{
            flex: 1,
            padding: '7px 10px',
            background: 'linear-gradient(135deg,#0052FF,#0041CC)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Ver paquetes
        </button>
        <IconBtn title="Editar ruta" onClick={() => onEdit(route)} color="#d4650a">✎</IconBtn>
        <IconBtn title="Compartir enlace" onClick={() => onShare(route)} color="#0052FF">🔗</IconBtn>
        <IconBtn title="Eliminar ruta" onClick={() => onDelete(route)} color="#cc2244">🗑</IconBtn>
      </div>
    </div>
  );
}

/* ─── Edit Route Modal ───────────────────────────────────────── */
function EditRouteModal({ open, onClose, route, onUpdated, drivers, companies }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (route) setForm({
      name: route.name || '',
      date: route.date || today(),
      status: route.status || 'active',
      driverId: route.driverId || route.driver?._id || '',
      companyId: route.companyId || route.company?._id || '',
      notes: route.notes || '',
    });
  }, [route]);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const id = route._id || route.id;
      const updated = await api.updateRoute(id, form);
      toast.success('Ruta actualizada');
      onUpdated(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Ruta">
      <form onSubmit={submit}>
        <Field label="Nombre / Código" required>
          <input style={inputStyle} value={form.name || ''} onChange={e => setF('name', e.target.value)} />
        </Field>
        <Field label="Fecha">
          <input type="date" style={inputStyle} value={form.date || ''} onChange={e => setF('date', e.target.value)} />
        </Field>
        <Field label="Estado">
          <select style={selectStyle} value={form.status || 'active'} onChange={e => setF('status', e.target.value)}>
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="draft">Borrador</option>
          </select>
        </Field>
        <Field label="Driver">
          <select style={selectStyle} value={form.driverId || ''} onChange={e => setF('driverId', e.target.value)}>
            <option value="">Sin asignar</option>
            {(drivers || []).map(d => <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Empresa">
          <select style={selectStyle} value={form.companyId || ''} onChange={e => setF('companyId', e.target.value)}>
            <option value="">Sin empresa</option>
            {(companies || []).map(c => <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Notas">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes || ''} onChange={e => setF('notes', e.target.value)} />
        </Field>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" loading={saving}>Guardar</Btn>
        </div>
      </form>
    </Modal>
  );
}

/* ─── RoutesView ─────────────────────────────────────────────── */
export default function RoutesView() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());

  // Modals / panels
  const [showNew, setShowNew] = useState(false);
  const [editRoute, setEditRoute] = useState(null);
  const [panelRoute, setPanelRoute] = useState(null);
  const [shareData, setShareData] = useState({ open: false, url: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await api.getRoutes(params);
      setRoutes(Array.isArray(r) ? r : r?.routes || []);
    } catch (err) {
      toast.error(err.message || 'Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    load();
    Promise.all([api.getUsers().catch(() => []), api.getCompanies().catch(() => [])]).then(([u, c]) => {
      setDrivers((Array.isArray(u) ? u : u?.users || []).filter(x => x.role === 'driver' || !x.role));
      setCompanies(Array.isArray(c) ? c : c?.companies || []);
    });
  }, [load]);

  async function deleteRoute(route) {
    const id = route._id || route.id;
    if (!window.confirm(`¿Eliminar ruta "${route.name || id}"?`)) return;
    try {
      await api.deleteRoute(id);
      setRoutes(prev => prev.filter(r => (r._id || r.id) !== id));
      toast.success('Ruta eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    }
  }

  async function shareRoute(route) {
    const id = route._id || route.id;
    try {
      const result = await api.generateShareLink(id);
      const token = result.token || result.shareToken;
      const url = token
        ? `${window.location.origin}/share/${token}`
        : result.url || result.shareUrl || '';
      setShareData({ open: true, url });
    } catch (err) {
      toast.error(err.message || 'Error al generar enlace');
    }
  }

  const STATUS_FILTERS = [
    { v: 'all', l: 'Todos' },
    { v: 'active', l: 'Activas' },
    { v: 'paused', l: 'Pausadas' },
    { v: 'completed', l: 'Completadas' },
    { v: 'cancelled', l: 'Canceladas' },
  ];

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Inter, sans-serif', minHeight: '100%' }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes modalIn { from { transform: translateY(-16px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
            Rutas
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            {routes.length} ruta{routes.length !== 1 ? 's' : ''} encontrada{routes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Btn onClick={() => setShowNew(true)}>+ Nueva Ruta</Btn>
      </div>

      {/* Filter bar */}
      <div style={{
        background: '#fff',
        border: '1px solid #dbe3ef',
        borderRadius: 12,
        padding: '14px 18px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                border: 'none',
                background: statusFilter === v ? '#0052FF' : '#f1f5f9',
                color: statusFilter === v ? '#fff' : '#64748B',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#dbe3ef', margin: '0 4px' }} />

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{ ...inputStyle, width: 140, padding: '6px 10px', fontSize: 12 }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{ ...inputStyle, width: 140, padding: '6px 10px', fontSize: 12 }}
          />
        </div>

        <button
          onClick={load}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            background: '#f1f5f9',
            border: '1px solid #dbe3ef',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#0052FF',
            cursor: 'pointer',
          }}
        >
          Buscar
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, padding: '18px 20px', height: 220, animation: 'pulse 1.4s infinite', opacity: .5 }} />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', marginBottom: 8 }}>No hay rutas</div>
          <div style={{ fontSize: 13 }}>Crea tu primera ruta con el botón "Nueva Ruta"</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {routes.map(route => (
            <RouteCard
              key={route._id || route.id}
              route={route}
              onViewPackages={r => setPanelRoute(r)}
              onEdit={r => setEditRoute(r)}
              onDelete={deleteRoute}
              onShare={shareRoute}
            />
          ))}
        </div>
      )}

      {/* Slide-over overlay */}
      {panelRoute && (
        <>
          <div
            onClick={() => setPanelRoute(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.3)', zIndex: 499, backdropFilter: 'blur(1px)' }}
          />
          <PackagesPanel
            routeId={panelRoute._id || panelRoute.id}
            onClose={() => setPanelRoute(null)}
          />
        </>
      )}

      {/* Modals */}
      <NewRouteModal
        open={showNew}
        onClose={() => setShowNew(false)}
        drivers={drivers}
        companies={companies}
        onCreated={r => setRoutes(prev => [r, ...prev])}
      />
      <EditRouteModal
        open={!!editRoute}
        onClose={() => setEditRoute(null)}
        route={editRoute}
        drivers={drivers}
        companies={companies}
        onUpdated={updated => {
          const id = updated._id || updated.id;
          setRoutes(prev => prev.map(r => (r._id || r.id) === id ? { ...r, ...updated } : r));
        }}
      />
      <ShareModal
        open={shareData.open}
        onClose={() => setShareData({ open: false, url: '' })}
        shareUrl={shareData.url}
      />
    </div>
  );
}
