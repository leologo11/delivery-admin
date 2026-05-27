import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { api } from '../../api/index.js';
import { toast } from '../../components/Toast.jsx';

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtCLP(n) {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

/** Interpolates red→green based on relative price (0=cheap=green, 1=expensive=red) */
function priceColor(price, minPrice, maxPrice) {
  if (maxPrice === minPrice) return '#0052FF';
  const t = (price - minPrice) / (maxPrice - minPrice);
  const r = Math.round(34 + (204 - 34) * t);
  const g = Math.round(168 + (34 - 168) * t);
  const b = Math.round(90 + (68 - 90) * t);
  return `rgb(${r},${g},${b})`;
}

/* ─── Fix Leaflet default icon ───────────────────────────────── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const inputStyle = {
  width: '100%',
  padding: '8px 11px',
  border: '1px solid #dbe3ef',
  borderRadius: 8,
  fontSize: 13,
  color: '#0F172A',
  background: '#fff',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
};

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ onClick, loading, variant = 'primary', children, style, type = 'button' }) {
  const styles = {
    primary: { bg: 'linear-gradient(135deg,#0052FF,#0041CC)', color: '#fff', border: 'none', shadow: '0 2px 8px rgba(0,82,255,.25)' },
    danger:  { bg: 'transparent', color: '#cc2244', border: '1px solid #cc224440', shadow: 'none' },
    ghost:   { bg: 'transparent', color: '#64748B', border: '1px solid #dbe3ef', shadow: 'none' },
    success: { bg: 'linear-gradient(135deg,#22a85a,#1a9050)', color: '#fff', border: 'none', shadow: '0 2px 8px rgba(34,168,90,.2)' },
    warn:    { bg: 'transparent', color: '#d4650a', border: '1px solid #d4650a44', shadow: 'none' },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '8px 14px',
        background: s.bg,
        color: s.color,
        border: s.border,
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? .65 : 1,
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

/* ─── Import Prices AI Modal ─────────────────────────────────── */
function ImportPricesModal({ open, onClose, onApply }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  function reset() { setText(''); setFile(null); setPreview(null); setLoading(false); setApplying(false); }
  function handleClose() { reset(); onClose(); }

  async function parse() {
    setLoading(true);
    try {
      let source;
      if (file) {
        const reader = new FileReader();
        source = await new Promise((res, rej) => {
          reader.onload = e => res(e.target.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
      } else if (text.trim()) {
        source = text.trim();
      } else {
        toast.error('Ingresa texto o selecciona un archivo');
        setLoading(false);
        return;
      }
      const result = await api.parsePricesAI(source);
      const prices = Array.isArray(result) ? result : result?.prices || result?.items || [];
      setPreview(prices);
    } catch (err) {
      toast.error(err.message || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!preview?.length) return;
    setApplying(true);
    try {
      await api.bulkUpsertPrices(preview);
      toast.success(`${preview.length} precios aplicados`);
      onApply(preview);
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Error al aplicar precios');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  const thS = { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', borderBottom: '1px solid #dbe3ef', background: '#f8fafc', textAlign: 'left' };
  const tdS = { padding: '8px 12px', fontSize: 13, color: '#1E293B', borderBottom: '1px solid #f1f5f9' };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(15,23,42,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #dbe3ef' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Importar Precios con IA</div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {!preview ? (
            <>
              <p style={{ fontSize: 13, color: '#64748B', marginTop: 0 }}>
                Pega una lista de comunas con precios, o sube una imagen/Excel. La IA extraerá los datos.
              </p>
              <Field label="Texto (pegado directo)">
                <textarea
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={'Providencia: $4500\nLas Condes: $5000\nSantiago Centro: $3500'}
                />
              </Field>
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, margin: '8px 0' }}>— o sube un archivo —</div>
              <div
                onClick={() => document.getElementById('price-import-file').click()}
                style={{ border: '2px dashed #dbe3ef', borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: '#fafbff' }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{file ? file.name : 'Seleccionar imagen o Excel'}</div>
                <input id="price-import-file" type="file" accept="image/*,.xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
                <Btn onClick={parse} loading={loading}>Extraer precios</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{preview.length} precios detectados</span>
                <Btn variant="ghost" onClick={() => setPreview(null)} style={{ padding: '4px 10px', fontSize: 11 }}>← Atrás</Btn>
              </div>
              <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'auto', maxHeight: 300 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={thS}>Comuna</th>
                      <th style={{ ...thS, textAlign: 'right' }}>Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p, i) => (
                      <tr key={i}>
                        <td style={tdS}>{p.commune || p.name || p.zona || '—'}</td>
                        <td style={{ ...tdS, textAlign: 'right', fontWeight: 600, color: '#22a85a' }}>{fmtCLP(p.price || p.basePrice || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
                <Btn variant="success" onClick={apply} loading={applying}>Aplicar precios</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Zone Edit Panel ────────────────────────────────────────── */
function ZoneEditPanel({ zone, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: '',
    basePrice: '',
    color: '#0052FF',
    tiersMode: 'auto',
    tiers: [
      { label: 'T1', minQty: 1, price: '' },
      { label: 'T2', minQty: 5, price: '' },
      { label: 'T3', minQty: 10, price: '' },
    ],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (zone) {
      setForm({
        name: zone.name || '',
        basePrice: zone.basePrice || zone.price || '',
        color: zone.color || '#0052FF',
        tiersMode: zone.tiersMode || 'auto',
        tiers: zone.tiers?.length
          ? zone.tiers.map(t => ({ label: t.label || '', minQty: t.minQty || 1, price: t.price || '' }))
          : [
              { label: 'T1', minQty: 1, price: '' },
              { label: 'T2', minQty: 5, price: '' },
              { label: 'T3', minQty: 10, price: '' },
            ],
      });
    }
  }, [zone]);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function setTier(i, k, v) {
    setForm(p => {
      const tiers = [...p.tiers];
      tiers[i] = { ...tiers[i], [k]: v };
      return { ...p, tiers };
    });
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    try {
      const id = zone._id || zone.id;
      const payload = {
        name: form.name,
        price: Number(form.basePrice) || 0,
        color: form.color,
        tiers: form.tiers.map(t => ({ ...t, minQty: Number(t.minQty), price: Number(t.price) || 0 })),
      };
      const updated = await api.updateZone(id, payload);
      toast.success('Zona guardada');
      onSaved(updated);
    } catch (err) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function deleteZone() {
    if (!window.confirm(`¿Eliminar zona "${zone.name}"?`)) return;
    setDeleting(true);
    try {
      await api.deleteZone(zone._id || zone.id);
      toast.success('Zona eliminada');
      onDeleted(zone._id || zone.id);
    } catch (err) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  const basePrice = Number(form.basePrice) || 0;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: 320,
      background: '#fff',
      borderLeft: '1px solid #dbe3ef',
      zIndex: 800,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 20px rgba(15,23,42,.1)',
      animation: 'slideInRight .22s ease',
    }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #dbe3ef', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B', lineHeight: 1 }}>←</button>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14, color: '#0F172A', flex: 1 }}>
          Editar Zona
        </div>
        <button
          onClick={deleteZone}
          disabled={deleting}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#cc2244', opacity: deleting ? .5 : 1 }}
        >
          🗑
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
        <Field label="Nombre de zona">
          <input style={inputStyle} value={form.name} onChange={e => setF('name', e.target.value)} />
        </Field>
        <Field label="Precio base (CLP)">
          <input type="number" style={inputStyle} value={form.basePrice} onChange={e => setF('basePrice', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={form.color}
              onChange={e => setF('color', e.target.value)}
              style={{ width: 40, height: 36, border: '1px solid #dbe3ef', borderRadius: 6, cursor: 'pointer', padding: 2 }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={form.color}
              onChange={e => setF('color', e.target.value)}
              placeholder="#0052FF"
            />
          </div>
        </Field>

        {/* Tiers */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Tramos de volumen</span>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'hidden' }}>
              {['auto', 'manual'].map(m => (
                <button
                  key={m}
                  onClick={() => setF('tiersMode', m)}
                  style={{
                    padding: '4px 10px',
                    background: form.tiersMode === m ? '#0052FF' : '#fff',
                    color: form.tiersMode === m ? '#fff' : '#64748B',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {m === 'auto' ? 'Auto %' : 'Manual'}
                </button>
              ))}
            </div>
          </div>
          {form.tiers.map((tier, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: '#0052FF14',
                color: '#0052FF',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {tier.label}
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}
                    value={tier.minQty}
                    onChange={e => setTier(i, 'minQty', e.target.value)}
                    placeholder="Min"
                    title="Cantidad mínima"
                  />
                </div>
                <div style={{ flex: 1.2 }}>
                  {form.tiersMode === 'auto' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        style={{ ...inputStyle, padding: '5px 8px', fontSize: 12, flex: 1 }}
                        value={tier.price}
                        onChange={e => setTier(i, 'price', e.target.value)}
                        placeholder="%desc"
                        title="% de descuento sobre precio base"
                      />
                      <span style={{ fontSize: 10, color: '#64748B', whiteSpace: 'nowrap' }}>
                        → {fmtCLP(basePrice * (1 - (Number(tier.price) || 0) / 100))}
                      </span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}
                      value={tier.price}
                      onChange={e => setTier(i, 'price', e.target.value)}
                      placeholder="Precio"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            {form.tiersMode === 'auto' ? 'Ingresa % de descuento sobre precio base' : 'Ingresa precio directo por tramo'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 18px', borderTop: '1px solid #dbe3ef', display: 'flex', gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn onClick={save} loading={saving} style={{ flex: 2 }}>Guardar zona</Btn>
      </div>
    </div>
  );
}

/* ─── SectorMap ──────────────────────────────────────────────── */
export default function SectorMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonsLayerRef = useRef(null);

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editZone, setEditZone] = useState(null);
  const [showImportPrices, setShowImportPrices] = useState(false);
  const [seeding, setSeeding] = useState(false);

  /* ── Init map ── */
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-33.45, -70.65],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    polygonsLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        polygonsLayerRef.current = null;
      }
    };
  }, []);

  /* ── Load zones ── */
  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getZones();
      setZones(Array.isArray(result) ? result : result?.zones || []);
    } catch (err) {
      toast.error(err.message || 'Error al cargar zonas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadZones(); }, [loadZones]);

  /* ── Render polygons on map ── */
  useEffect(() => {
    if (!mapInstanceRef.current || !polygonsLayerRef.current) return;

    polygonsLayerRef.current.clearLayers();

    if (zones.length === 0) return;

    const prices = zones.map(z => z.basePrice || z.price || 0).filter(p => p > 0);
    const minP = Math.min(...prices) || 0;
    const maxP = Math.max(...prices) || 1;

    zones.forEach(zone => {
      if (!zone.polygon && !zone.geometry) return;

      const geojson = zone.polygon || zone.geometry;
      const price = zone.basePrice || zone.price || 0;
      const fillColor = zone.color || priceColor(price, minP, maxP);

      try {
        const layer = L.geoJSON(geojson, {
          style: {
            color: fillColor,
            weight: 2,
            fillColor,
            fillOpacity: 0.3,
            opacity: 0.8,
          },
        });

        layer.bindTooltip(
          `<div style="font-family:Inter,sans-serif;font-size:12px;font-weight:600">
            <div style="color:#0F172A">${zone.name || '—'}</div>
            <div style="color:#22a85a;font-size:13px;font-weight:700">${fmtCLP(price)}</div>
          </div>`,
          { sticky: true, direction: 'top' }
        );

        layer.on('click', () => setEditZone(zone));
        layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.5 }));
        layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.3 }));

        layer.addTo(polygonsLayerRef.current);
      } catch {
        // Invalid GeoJSON — skip
      }
    });
  }, [zones]);

  /* ── Seed communes ── */
  const GEO_URL = 'https://raw.githubusercontent.com/robsalasco/precenso_2016_geojson_chile/master/Comunas_Metropolitana.geojson';

  async function seedCommunes() {
    if (!window.confirm('Descargará las comunas de la RM desde GitHub y las cargará en el mapa. ¿Continuar?')) return;
    setSeeding(true);
    try {
      // Fetch client-side (browser tiene acceso a GitHub; el servidor puede no tenerlo)
      let features;
      try {
        const r = await fetch(GEO_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        features = json.features;
        if (!features?.length) throw new Error('GeoJSON vacío o formato inesperado');
      } catch (fetchErr) {
        toast.error(`No se pudo descargar el GeoJSON: ${fetchErr.message}. Usa el botón "GeoJSON" para subir el archivo.`);
        return;
      }
      const result = await api.seedCommunes(features);
      toast.success(`${result?.created ?? features.length} comunas cargadas`);
      loadZones();
    } catch (err) {
      toast.error(err.message || 'Error al cargar comunas');
    } finally {
      setSeeding(false);
    }
  }

  async function seedCommunesFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json';
    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      setSeeding(true);
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const features = json.features || (Array.isArray(json) ? json : null);
        if (!features?.length) throw new Error('Archivo sin features GeoJSON válidas');
        const result = await api.seedCommunes(features);
        toast.success(`${result?.created ?? features.length} comunas cargadas desde archivo`);
        loadZones();
      } catch (err) {
        toast.error(err.message || 'Error al cargar comunas');
      } finally {
        setSeeding(false);
      }
    };
    input.click();
  }

  async function deleteAllCommunes() {
    if (!window.confirm('¿Eliminar TODAS las comunas? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteAllCommunes();
      toast.success('Comunas eliminadas');
      loadZones();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar comunas');
    }
  }

  const filteredZones = zones.filter(z =>
    !search || (z.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const prices = zones.map(z => z.basePrice || z.price || 0).filter(p => p > 0);
  const minP = Math.min(...prices) || 0;
  const maxP = Math.max(...prices) || 1;

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .leaflet-container { font-family: Inter, sans-serif; }
      `}</style>

      {/* ── Left panel ── */}
      <div style={{
        width: 320,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #dbe3ef',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #dbe3ef' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>
            Precios / Sectores
          </div>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {zones.length} zona{zones.length !== 1 ? 's' : ''} registrada{zones.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
            <input
              style={{ ...inputStyle, paddingLeft: 30 }}
              placeholder="Buscar zona..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn onClick={() => setShowImportPrices(true)} style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}>
            IA Precios
          </Btn>
          <Btn variant="ghost" onClick={seedCommunes} loading={seeding} style={{ flex: 1 }}>
            Cargar RM
          </Btn>
          <Btn variant="ghost" onClick={seedCommunesFromFile} loading={seeding} style={{ flex: 1 }} title="Cargar GeoJSON personalizado">
            GeoJSON
          </Btn>
          <Btn variant="danger" onClick={deleteAllCommunes} style={{ padding: '6px 10px', fontSize: 11 }}>
            🗑
          </Btn>
        </div>

        {/* Zone list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
          ) : filteredZones.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              {search ? 'Sin resultados' : 'Sin zonas. Carga comunas para comenzar.'}
            </div>
          ) : (
            filteredZones.map(zone => {
              const price = zone.basePrice || zone.price || 0;
              const color = zone.color || priceColor(price, minP, maxP);
              const isActive = editZone && (editZone._id || editZone.id) === (zone._id || zone.id);
              return (
                <div
                  key={zone._id || zone.id}
                  onClick={() => setEditZone(isActive ? null : zone)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: isActive ? '#0052FF08' : 'transparent',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: color,
                    flexShrink: 0,
                    border: isActive ? '2px solid #0052FF' : '2px solid transparent',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {zone.name || '—'}
                    </div>
                    {zone.tiers?.length > 0 && (
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                        {zone.tiers.length} tramo{zone.tiers.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#22a85a', whiteSpace: 'nowrap' }}>
                    {fmtCLP(price)}
                  </div>
                  <div style={{ fontSize: 14, color: '#94a3b8' }}>›</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 0 }} />

        {/* Edit panel overlay */}
        {editZone && (
          <ZoneEditPanel
            zone={editZone}
            onClose={() => setEditZone(null)}
            onSaved={updated => {
              const id = updated._id || updated.id;
              setZones(prev => prev.map(z => (z._id || z.id) === id ? { ...z, ...updated } : z));
              setEditZone(null);
            }}
            onDeleted={id => {
              setZones(prev => prev.filter(z => (z._id || z.id) !== id));
              setEditZone(null);
            }}
          />
        )}
      </div>

      {/* Import Prices AI Modal */}
      <ImportPricesModal
        open={showImportPrices}
        onClose={() => setShowImportPrices(false)}
        onApply={() => loadZones()}
      />
    </div>
  );
}
