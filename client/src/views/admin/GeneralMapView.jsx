import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Helpers ────────────────────────────────────────────────── */
function today() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const STATUS_COLORS = {
  entregado:      '#22a85a',
  'no-entregado': '#cc2244',
  pendiente:      '#d4650a',
  'en-camino':    '#0052FF',
};
const STATUS_OPACITY = {
  entregado:      0.9,
  'no-entregado': 0.85,
  pendiente:      0.75,
  'en-camino':    0.9,
};
const STATUS_LABELS = {
  entregado:      'Entregado',
  'no-entregado': 'No entregado',
  pendiente:      'Pendiente',
  'en-camino':    'En camino',
};

/* ─── Fix Leaflet default icon ───────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/* ─── Stats overlay ──────────────────────────────────────────── */
function StatsOverlay({ packages, statusFilter }) {
  const counts = {};
  const statuses = ['entregado', 'no-entregado', 'pendiente', 'en-camino'];
  statuses.forEach(s => { counts[s] = 0; });
  packages.forEach(p => {
    const s = p.status || 'pendiente';
    if (counts[s] !== undefined) counts[s]++;
    else counts.pendiente++;
  });

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 1000,
      background: 'rgba(255,255,255,.95)',
      border: '1px solid #dbe3ef',
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 4px 20px rgba(15,23,42,.15)',
      minWidth: 180,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>
        En mapa: {packages.length}
      </div>
      {statuses.map(s => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: STATUS_COLORS[s],
              border: statusFilter === s ? `2px solid ${STATUS_COLORS[s]}` : '2px solid transparent',
              boxShadow: statusFilter === s ? `0 0 6px ${STATUS_COLORS[s]}` : 'none',
            }} />
            <span style={{ fontSize: 12, color: '#1E293B' }}>{STATUS_LABELS[s]}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[s] }}>{counts[s]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── GeneralMapView ─────────────────────────────────────────── */
export default function GeneralMapView() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [packages, setPackages] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [statusFilter, setStatusFilter] = useState('todos');
  const [companyFilter, setCompanyFilter] = useState('');

  /* ── Init map ── */
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-33.45, -70.65],
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  /* ── Load packages ── */
  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: dateFrom, to: dateTo };
      if (companyFilter) params.companyId = companyFilter;
      const result = await api.getMapPackages(params);
      const pkgs = Array.isArray(result) ? result : result?.packages || [];
      setPackages(pkgs);
    } catch (err) {
      toast.error(err.message || 'Error al cargar paquetes');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, companyFilter]);

  useEffect(() => {
    loadPackages();
    api.getCompanies().then(r => setCompanies(Array.isArray(r) ? r : r?.companies || [])).catch(() => {});
  }, [loadPackages]);

  /* ── Render markers ── */
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = statusFilter === 'todos'
      ? packages
      : packages.filter(p => (p.status || 'pendiente') === statusFilter);

    filtered.forEach(pkg => {
      const lat = pkg.lat || pkg.latitude || pkg.geo?.lat;
      const lng = pkg.lng || pkg.longitude || pkg.geo?.lng;
      if (!lat || !lng) return;

      const status = pkg.status || 'pendiente';
      const color = STATUS_COLORS[status] || STATUS_COLORS.pendiente;
      const opacity = STATUS_OPACITY[status] || 0.75;

      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: opacity,
      });

      const customerName = pkg.customerName || pkg.name || 'Cliente';
      const firstName = customerName.split(' ')[0];
      const statusLabel = STATUS_LABELS[status] || status;

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;padding:4px 0">
          <div style="font-weight:700;font-size:14px;color:#0F172A;margin-bottom:6px">${customerName}</div>
          <div style="font-size:12px;color:#64748B;margin-bottom:3px">
            <span style="font-weight:600">Dirección:</span> ${pkg.address || '—'}
          </div>
          <div style="font-size:12px;color:#64748B;margin-bottom:3px">
            <span style="font-weight:600">Comuna:</span> ${pkg.commune || '—'}
          </div>
          <div style="font-size:12px;color:#64748B;margin-bottom:3px">
            <span style="font-weight:600">Tracking:</span> ${pkg.trackingId || pkg.tracking_id || '—'}
          </div>
          ${pkg.routeCode ? `<div style="font-size:12px;color:#64748B;margin-bottom:3px"><span style="font-weight:600">Ruta:</span> ${pkg.routeCode}</div>` : ''}
          <div style="margin-top:8px">
            <span style="display:inline-block;padding:2px 10px;border-radius:999px;background:${color}20;color:${color};font-size:11px;font-weight:700">${statusLabel}</span>
          </div>
        </div>
      `, { maxWidth: 260 });

      marker.addTo(markersLayerRef.current);
    });
  }, [packages, statusFilter]);

  const STATUS_PILLS = [
    { v: 'todos', l: 'Todos' },
    { v: 'entregado', l: 'Entregado' },
    { v: 'no-entregado', l: 'No entregado' },
    { v: 'pendiente', l: 'Pendiente' },
  ];

  const displayedPackages = statusFilter === 'todos'
    ? packages
    : packages.filter(p => (p.status || 'pendiente') === statusFilter);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'Inter, sans-serif' }}>

      {/* Top overlay bar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'calc(100% - 220px)',
      }}>
        {/* Controls card */}
        <div style={{
          background: 'rgba(255,255,255,.95)',
          border: '1px solid #dbe3ef',
          borderRadius: 12,
          padding: '12px 14px',
          boxShadow: '0 4px 20px rgba(15,23,42,.12)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 15, color: '#0F172A', whiteSpace: 'nowrap' }}>
            Mapa General
          </div>

          <div style={{ width: 1, height: 20, background: '#dbe3ef' }} />

          {/* Date range */}
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #dbe3ef', borderRadius: 7, fontSize: 12, color: '#0F172A', background: '#fff', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #dbe3ef', borderRadius: 7, fontSize: 12, color: '#0F172A', background: '#fff', cursor: 'pointer' }}
          />

          {/* Company filter */}
          {companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              style={{ padding: '5px 8px', border: '1px solid #dbe3ef', borderRadius: 7, fontSize: 12, color: '#0F172A', background: '#fff', cursor: 'pointer' }}
            >
              <option value="">Todas las empresas</option>
              {companies.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={loadPackages}
            disabled={loading}
            style={{
              padding: '5px 14px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg,#0052FF,#0041CC)',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {/* Status filter pills */}
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          {STATUS_PILLS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                border: 'none',
                background: statusFilter === v
                  ? (v === 'todos' ? '#0052FF' : STATUS_COLORS[v])
                  : 'rgba(255,255,255,.9)',
                color: statusFilter === v ? '#fff' : '#1E293B',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15,23,42,.1)',
                backdropFilter: 'blur(4px)',
                transition: 'all .15s',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Stats overlay top-right */}
      <StatsOverlay packages={displayedPackages} statusFilter={statusFilter} />

      {/* Loading indicator */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 1001,
          background: 'rgba(255,255,255,.9)',
          borderRadius: 12,
          padding: '16px 24px',
          boxShadow: '0 4px 20px rgba(15,23,42,.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 13,
          fontWeight: 600,
          color: '#0052FF',
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid #0052FF44',
            borderTopColor: '#0052FF',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
          }} />
          Cargando paquetes...
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-container { font-family: Inter, sans-serif; }
      `}</style>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{ flex: 1, width: '100%', minHeight: 400, zIndex: 0 }}
      />
    </div>
  );
}
