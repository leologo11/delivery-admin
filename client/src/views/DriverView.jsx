import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { api } from '../api/index.js';
import { toast } from '../components/Toast.jsx';

/* ─── Fix Leaflet default icon ───────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtCLP(n) {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

const STATUS_MAP = {
  pendiente:     { color: '#d4650a', bg: '#d4650a15', label: 'Pendiente', icon: '⏳' },
  entregado:     { color: '#22a85a', bg: '#22a85a15', label: 'Entregado', icon: '✓' },
  'no-entregado':{ color: '#cc2244', bg: '#cc224415', label: 'No entregado', icon: '✕' },
  'en-camino':   { color: '#0052FF', bg: '#0052FF15', label: 'En camino', icon: '🚚' },
};

const ROUTE_STATUS = {
  active:    { color: '#0052FF', bg: '#0052FF14', label: 'Activa' },
  paused:    { color: '#d4650a', bg: '#d4650a12', label: 'Pausada' },
  completed: { color: '#22a85a', bg: '#22a85a12', label: 'Completada' },
};

const NO_DELIVERY_REASONS = [
  { v: 'nadie_en_casa', l: 'Nadie en casa' },
  { v: 'direccion_incorrecta', l: 'Dirección incorrecta' },
  { v: 'rechazado', l: 'Rechazado por cliente' },
  { v: 'otro', l: 'Otro' },
];

/* ─── DeliveryModal (slide-up) ───────────────────────────────── */
function DeliveryModal({ pkg, onClose, onSaved }) {
  const [status, setStatus] = useState(pkg?.status || 'pendiente');
  const [reason, setReason] = useState(pkg?.noDeliveryReason || '');
  const [note, setNote] = useState(pkg?.notes || '');
  const [photos, setPhotos] = useState([null, null]);
  const [photoUrls, setPhotoUrls] = useState([pkg?.photo1 || null, pkg?.photo2 || null]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pkg) {
      setStatus(pkg.status || 'pendiente');
      setReason(pkg.noDeliveryReason || '');
      setNote(pkg.notes || '');
      setPhotoUrls([pkg.photo1 || null, pkg.photo2 || null]);
      setPhotos([null, null]);
    }
  }, [pkg]);

  function pickPhoto(n) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      setPhotos(prev => { const a = [...prev]; a[n] = f; return a; });
      const url = URL.createObjectURL(f);
      setPhotoUrls(prev => { const a = [...prev]; a[n] = url; return a; });
    };
    input.click();
  }

  async function save() {
    setSaving(true);
    const id = pkg._id || pkg.id;
    try {
      const payload = { status, notes: note };
      if (status === 'no-entregado') payload.noDeliveryReason = reason;
      await api.updatePackage(id, payload);
      // Upload photos
      for (let i = 0; i < 2; i++) {
        if (photos[i]) {
          try { await api.uploadPhoto(id, photos[i], i + 1); } catch { /* non-critical */ }
        }
      }
      toast.success(status === 'entregado' ? 'Marcado como entregado' : 'Estado actualizado');
      onSaved({ ...pkg, status, notes: note, noDeliveryReason: reason });
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!pkg) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 900 }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 901,
        background: '#fff',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 36px',
        maxHeight: '85vh',
        overflowY: 'auto',
        animation: 'slideUp .3s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 -8px 40px rgba(15,23,42,.2)',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#dbe3ef', margin: '0 auto 16px', cursor: 'pointer' }} onClick={onClose} />

        {/* Package info */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
            {pkg.customerName || 'Cliente'}
          </div>
          <div style={{ fontSize: 14, color: '#64748B' }}>{pkg.address || '—'}</div>
          {pkg.apt && <div style={{ fontSize: 13, color: '#94a3b8' }}>{pkg.apt}</div>}
          {pkg.commune && <div style={{ fontSize: 13, color: '#94a3b8' }}>{pkg.commune}</div>}
        </div>

        {/* Status buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <button
            onClick={() => setStatus('entregado')}
            style={{
              padding: '16px 12px',
              borderRadius: 14,
              border: `2px solid ${status === 'entregado' ? '#22a85a' : '#dbe3ef'}`,
              background: status === 'entregado' ? '#22a85a' : '#fff',
              color: status === 'entregado' ? '#fff' : '#64748B',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all .2s',
            }}
          >
            <span style={{ fontSize: 20 }}>✓</span>
            Entregado
          </button>
          <button
            onClick={() => setStatus('no-entregado')}
            style={{
              padding: '16px 12px',
              borderRadius: 14,
              border: `2px solid ${status === 'no-entregado' ? '#cc2244' : '#dbe3ef'}`,
              background: status === 'no-entregado' ? '#cc2244' : '#fff',
              color: status === 'no-entregado' ? '#fff' : '#64748B',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all .2s',
            }}
          >
            <span style={{ fontSize: 20 }}>✕</span>
            No entregado
          </button>
        </div>

        {/* Reason selector */}
        {status === 'no-entregado' && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Motivo:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {NO_DELIVERY_REASONS.map(r => (
                <button
                  key={r.v}
                  onClick={() => setReason(r.v)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `1.5px solid ${reason === r.v ? '#cc2244' : '#dbe3ef'}`,
                    background: reason === r.v ? '#cc224410' : '#fff',
                    color: reason === r.v ? '#cc2244' : '#1E293B',
                    fontSize: 14,
                    fontWeight: reason === r.v ? 700 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all .15s',
                  }}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Fotos:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[0, 1].map(n => (
              <div key={n}>
                {photoUrls[n] ? (
                  <div
                    onClick={() => pickPhoto(n)}
                    style={{ position: 'relative', cursor: 'pointer' }}
                  >
                    <img
                      src={photoUrls[n]}
                      alt={`Foto ${n + 1}`}
                      style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid #dbe3ef', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(15,23,42,.7)', color: '#fff', borderRadius: 6, padding: '2px 7px', fontSize: 11
                    }}>
                      Cambiar
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => pickPhoto(n)}
                    style={{
                      width: '100%',
                      height: 110,
                      border: '2px dashed #dbe3ef',
                      borderRadius: 10,
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: '#94a3b8',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>📷</span>
                    Foto {n + 1}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Nota:</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Observaciones de entrega..."
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #dbe3ef',
              borderRadius: 10,
              fontSize: 14,
              color: '#0F172A',
              background: '#fff',
              boxSizing: 'border-box',
              minHeight: 80,
              resize: 'none',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
            }}
          />
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving || (status === 'no-entregado' && !reason)}
          style={{
            width: '100%',
            padding: '16px',
            background: saving ? '#94a3b8' : status === 'entregado' ? 'linear-gradient(135deg,#22a85a,#1a9050)' : status === 'no-entregado' ? 'linear-gradient(135deg,#cc2244,#aa1836)' : 'linear-gradient(135deg,#0052FF,#0041CC)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: (saving || (status === 'no-entregado' && !reason)) ? 'not-allowed' : 'pointer',
            opacity: (saving || (status === 'no-entregado' && !reason)) ? .6 : 1,
            transition: 'all .2s',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </>
  );
}

/* ─── Mini Map ───────────────────────────────────────────────── */
function MiniMap({ packages, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-33.45, -70.65],
      zoom: 11,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM', maxZoom: 19,
    }).addTo(map);

    const bounds = [];
    packages.forEach(pkg => {
      const lat = pkg.lat || pkg.latitude || pkg.geo?.lat;
      const lng = pkg.lng || pkg.longitude || pkg.geo?.lng;
      if (!lat || !lng) return;
      const status = pkg.status || 'pendiente';
      const colors = { entregado: '#22a85a', 'no-entregado': '#cc2244', pendiente: '#d4650a', 'en-camino': '#0052FF' };
      const c = colors[status] || '#d4650a';
      L.circleMarker([lat, lng], { radius: 8, fillColor: c, color: '#fff', weight: 2, fillOpacity: 0.85 })
        .bindPopup(`<b>${pkg.customerName || '—'}</b><br>${pkg.address || '—'}`)
        .addTo(map);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [packages]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.6)', zIndex: 800 }} />
      <div style={{
        position: 'fixed',
        inset: '5vh 5vw',
        borderRadius: 20,
        overflow: 'hidden',
        zIndex: 801,
        boxShadow: '0 24px 64px rgba(15,23,42,.35)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ background: '#0F172A', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Mapa de ruta</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20 }}>×</button>
        </div>
        <div ref={mapRef} style={{ flex: 1 }} />
      </div>
    </>
  );
}

/* ─── Package Card ───────────────────────────────────────────── */
function PkgCard({ pkg, index, onClick }) {
  const status = STATUS_MAP[pkg.status || 'pendiente'] || STATUS_MAP.pendiente;
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 10,
        boxShadow: '0 2px 8px rgba(15,23,42,.08)',
        border: `1.5px solid ${status.color}33`,
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(.98)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(15,23,42,.06)'; }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,.08)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg,#0052FF,#00DAFF)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontFamily: 'Montserrat, sans-serif',
          }}>
            {index + 1}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{pkg.customerName || 'Cliente'}</div>
        </div>
        <span style={{
          padding: '3px 10px',
          borderRadius: 999,
          background: status.bg,
          color: status.color,
          fontSize: 11,
          fontWeight: 700,
        }}>
          {status.icon} {status.label}
        </span>
      </div>
      <div style={{ fontSize: 14, color: '#64748B', marginBottom: 3 }}>
        {pkg.address || '—'}{pkg.apt ? `, ${pkg.apt}` : ''}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>{pkg.commune || ''}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pkg.phone && (
            <a
              href={`tel:${pkg.phone}`}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: 14, color: '#0052FF', fontWeight: 600, textDecoration: 'none', padding: '4px 10px', background: '#0052FF14', borderRadius: 8 }}
            >
              📞
            </a>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: '#22a85a' }}>{fmtCLP(pkg.price || 0)}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── DriverView ─────────────────────────────────────────────── */
export default function DriverView({ user, onLogout }) {
  const [route, setRoute] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabFilter, setTabFilter] = useState('todos');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const locationTimerRef = useRef(null);

  /* ── Load route ── */
  useEffect(() => {
    async function load() {
      try {
        const routes = await api.getRoutes();
        const all = Array.isArray(routes) ? routes : routes?.routes || [];
        const active = all.find(r => r.status === 'active' || r.status === 'paused');
        if (active) {
          setRoute(active);
          const pkgs = await api.getPackages(active._id || active.id);
          setPackages(Array.isArray(pkgs) ? pkgs : pkgs?.packages || []);
        }
      } catch (err) {
        toast.error(err.message || 'Error al cargar ruta');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* ── Location tracking ── */
  useEffect(() => {
    if (!navigator.geolocation) return;
    function sendLocation() {
      navigator.geolocation.getCurrentPosition(pos => {
        api.updateMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      });
    }
    sendLocation();
    locationTimerRef.current = setInterval(sendLocation, 30000);
    return () => clearInterval(locationTimerRef.current);
  }, []);

  function handleSaved(updated) {
    setPackages(prev => prev.map(p => (p._id || p.id) === (updated._id || updated.id) ? { ...p, ...updated } : p));
    setSelectedPkg(null);
  }

  const TABS = [
    { v: 'todos', l: 'Todos' },
    { v: 'pendiente', l: 'Pendiente' },
    { v: 'entregado', l: 'Entregado' },
    { v: 'no-entregado', l: 'No entregado' },
  ];

  const filtered = tabFilter === 'todos' ? packages : packages.filter(p => (p.status || 'pendiente') === tabFilter);
  const delivered = packages.filter(p => p.status === 'entregado').length;
  const total = packages.length;
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;
  const routeStatus = route ? (ROUTE_STATUS[route.status] || ROUTE_STATUS.active) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F1F5F9',
      fontFamily: 'Inter, sans-serif',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
    }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#0F172A 0%,#1e293b 100%)',
        padding: '20px 18px 18px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(15,23,42,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>Hola, {user?.name?.split(' ')[0] || 'Driver'}</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff' }}>
              {route ? (route.name || route.routeCode || 'Ruta activa') : 'Sin ruta'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {route && (
              <button
                onClick={() => setShowMap(true)}
                style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                🗺️
              </button>
            )}
            <button
              onClick={onLogout}
              style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(204,34,68,.2)', border: '1px solid rgba(204,34,68,.3)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}
              title="Cerrar sesión"
            >
              ↩
            </button>
          </div>
        </div>

        {route && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                padding: '3px 10px',
                borderRadius: 999,
                background: routeStatus?.bg,
                color: routeStatus?.color,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {routeStatus?.label}
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>
                {route.date ? new Date(route.date + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
              </span>
            </div>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? '#22a85a' : '#0052FF', borderRadius: 999, transition: 'width .4s ease' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 80 ? '#4ade80' : '#93c5fd', whiteSpace: 'nowrap' }}>
                {delivered}/{total} ({pct}%)
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div style={{ padding: '16px 14px', paddingBottom: 32 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #0052FF44', borderTopColor: '#0052FF', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !route ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>😴</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Sin ruta asignada hoy</div>
            <div style={{ fontSize: 14, color: '#64748B' }}>
              Hola {user?.name || 'driver'}, no tienes rutas activas en este momento.
            </div>
          </div>
        ) : (
          <>
            {/* Tab filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {TABS.map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => setTabFilter(v)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: 'none',
                    background: tabFilter === v ? '#0052FF' : '#fff',
                    color: tabFilter === v ? '#fff' : '#64748B',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(15,23,42,.08)',
                  }}
                >
                  {l} ({v === 'todos' ? packages.length : packages.filter(p => (p.status || 'pendiente') === v).length})
                </button>
              ))}
            </div>

            {/* Package cards */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div>No hay paquetes en este filtro</div>
              </div>
            ) : (
              filtered.map((pkg, i) => (
                <PkgCard
                  key={pkg._id || pkg.id}
                  pkg={pkg}
                  index={packages.indexOf(pkg)}
                  onClick={() => setSelectedPkg(pkg)}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Delivery modal */}
      {selectedPkg && (
        <DeliveryModal
          pkg={selectedPkg}
          onClose={() => setSelectedPkg(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Mini map */}
      {showMap && (
        <MiniMap
          packages={packages}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
