import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/index.js';

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtDateES(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    description: 'Tu paquete está listo para ser retirado.',
    color: '#d4650a',
    bg: 'linear-gradient(135deg, #d4650a, #b85308)',
    icon: '📦',
    step: 0,
  },
  'en-camino': {
    label: 'En camino',
    description: 'Tu paquete está en ruta hacia ti.',
    color: '#0052FF',
    bg: 'linear-gradient(135deg, #0052FF, #0041CC)',
    icon: '🚚',
    step: 1,
  },
  entregado: {
    label: 'Entregado',
    description: 'Tu paquete fue entregado exitosamente.',
    color: '#22a85a',
    bg: 'linear-gradient(135deg, #22a85a, #1a9050)',
    icon: '✅',
    step: 2,
  },
  'no-entregado': {
    label: 'No entregado',
    description: 'No fue posible entregar tu paquete.',
    color: '#cc2244',
    bg: 'linear-gradient(135deg, #cc2244, #aa1836)',
    icon: '❌',
    step: -1,
  },
};

const REASON_LABELS = {
  nadie_en_casa:          'Nadie en casa',
  direccion_incorrecta:   'Dirección incorrecta',
  rechazado:              'Rechazado por cliente',
  otro:                   'Otro motivo',
};

/* ─── Timeline step indicator ────────────────────────────────── */
function Timeline({ currentStep, failed }) {
  const steps = [
    { label: 'Pendiente', icon: '📦', step: 0 },
    { label: 'En camino', icon: '🚚', step: 1 },
    { label: 'Entregado', icon: '✅', step: 2 },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0', position: 'relative' }}>
      {steps.map((s, i) => {
        const done = !failed && currentStep > s.step;
        const active = !failed && currentStep === s.step;
        const color = done ? '#22a85a' : active ? '#0052FF' : '#dbe3ef';
        const textColor = done ? '#22a85a' : active ? '#0052FF' : '#94a3b8';

        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: done ? '#22a85a' : active ? '#0052FF' : '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                border: `2px solid ${color}`,
                transition: 'all .3s',
                boxShadow: active ? `0 0 0 6px ${color}22` : 'none',
              }}>
                {done || active ? s.icon : <span style={{ fontSize: 14, color: '#94a3b8' }}>{i + 1}</span>}
              </div>
              <div style={{ fontSize: 11, fontWeight: active || done ? 700 : 400, color: textColor, whiteSpace: 'nowrap' }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 3,
                background: done ? '#22a85a' : '#e2e8f0',
                margin: '0 2px',
                marginBottom: 28,
                transition: 'background .3s',
                borderRadius: 2,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── TrackingView ───────────────────────────────────────────── */
export default function TrackingView() {
  const trackingId = (window.location.pathname.match(/^\/track\/(.+)$/) || [])[1] || '';

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!trackingId) { setError('ID de seguimiento no válido'); setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.trackPackage(trackingId);
      setPkg(data);
    } catch (err) {
      setError(err.message || 'No se encontró el paquete');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trackingId]);

  useEffect(() => { load(); }, [load]);

  const status = pkg ? (STATUS_CONFIG[pkg.status] || STATUS_CONFIG.pendiente) : null;
  const firstName = pkg ? (pkg.customerName || 'Cliente').split(' ')[0] : '';
  const failed = pkg?.status === 'no-entregado';

  /* ── Spinner ── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '3px solid #0052FF33',
          borderTopColor: '#0052FF',
          borderRadius: '50%',
          animation: 'spin .7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13, color: '#64748B' }}>Buscando tu paquete...</div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '40px 32px',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(15,23,42,.12)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginBottom: 8, fontFamily: 'Montserrat, sans-serif' }}>
            Paquete no encontrado
          </div>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 6 }}>
            {error}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
            ID: <span style={{ fontWeight: 600, color: '#0052FF' }}>{trackingId}</span>
          </div>
          <button
            onClick={() => load()}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg,#0052FF,#0041CC)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F1F5F9',
      fontFamily: 'Inter, sans-serif',
      animation: 'fadeIn .4s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Gradient header ── */}
      <div style={{
        background: status?.bg || 'linear-gradient(135deg,#0052FF,#0041CC)',
        padding: '32px 20px 48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG decoration */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.07)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          left: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.05)',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'rgba(255,255,255,.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 900,
            fontSize: 16,
            color: '#fff',
          }}>D</div>
          <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff' }}>DeliveryOS</span>
        </div>

        {/* Status icon */}
        <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>{status?.icon}</div>

        {/* Status badge */}
        <div style={{
          display: 'inline-block',
          padding: '5px 18px',
          borderRadius: 999,
          background: 'rgba(255,255,255,.2)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 10,
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,.3)',
        }}>
          {status?.label}
        </div>

        {/* Customer name */}
        <div style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#fff',
          fontFamily: 'Montserrat, sans-serif',
          marginBottom: 6,
        }}>
          Hola, {firstName}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.75)' }}>
          {status?.description}
        </div>
      </div>

      {/* ── White card ── */}
      <div style={{
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        marginTop: -20,
        padding: '0 20px 40px',
        minHeight: 400,
        boxShadow: '0 -4px 20px rgba(15,23,42,.06)',
      }}>

        {/* Tracking ID pill */}
        <div style={{ textAlign: 'center', paddingTop: 24, marginBottom: 4 }}>
          <span style={{
            display: 'inline-block',
            padding: '5px 16px',
            background: '#f1f5f9',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '.5px',
          }}>
            🔎 {trackingId}
          </span>
        </div>

        {/* Timeline */}
        <Timeline currentStep={status?.step ?? 0} failed={failed} />

        {/* Package details */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: '18px',
          marginBottom: 16,
          border: '1px solid #dbe3ef',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
            Detalles del envío
          </div>

          {[
            { icon: '📍', label: 'Dirección', value: pkg?.address },
            { icon: '🏘️', label: 'Comuna', value: pkg?.commune },
            pkg?.apt ? { icon: '🏢', label: 'Dpto/Piso', value: pkg?.apt } : null,
            pkg?.routeCode ? { icon: '🗺️', label: 'Ruta', value: pkg?.routeCode } : null,
          ].filter(Boolean).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 1 }}>{item.label}</div>
                <div style={{ fontSize: 14, color: '#0F172A', fontWeight: 500 }}>{item.value || '—'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Delivered info */}
        {pkg?.status === 'entregado' && (
          <div style={{
            background: '#22a85a0e',
            border: '1px solid #22a85a33',
            borderRadius: 16,
            padding: '16px 18px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: pkg?.photo1 ? 12 : 0 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#22a85a' }}>Entregado exitosamente</div>
                {pkg?.deliveredAt && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    {fmtDateES(pkg.deliveredAt)}
                  </div>
                )}
              </div>
            </div>
            {(pkg?.photo1 || pkg?.photo2) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {[pkg.photo1, pkg.photo2].filter(Boolean).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto de entrega ${i + 1}`}
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid #22a85a33' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* No-delivery info */}
        {pkg?.status === 'no-entregado' && (
          <div style={{
            background: '#cc22440e',
            border: '1px solid #cc224433',
            borderRadius: 16,
            padding: '16px 18px',
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>❌</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cc2244' }}>No fue posible entregar</div>
                {pkg?.noDeliveryReason && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    Motivo: {REASON_LABELS[pkg.noDeliveryReason] || pkg.noDeliveryReason}
                  </div>
                )}
              </div>
            </div>
            {pkg?.notes && (
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 10, paddingTop: 10, borderTop: '1px solid #cc224420' }}>
                {pkg.notes}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {pkg?.notes && pkg?.status !== 'no-entregado' && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #dbe3ef',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: '#64748B',
          }}>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>Nota: </span>
            {pkg.notes}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            width: '100%',
            padding: '14px',
            background: refreshing ? '#f1f5f9' : '#fff',
            border: '1.5px solid #dbe3ef',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            color: refreshing ? '#94a3b8' : '#0052FF',
            cursor: refreshing ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'Inter, sans-serif',
            transition: 'background .15s, color .15s',
          }}
        >
          {refreshing ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid #94a3b8', borderTopColor: '#0052FF', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
              Actualizando...
            </>
          ) : (
            <>🔄 Actualizar estado</>
          )}
        </button>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#0052FF,#00DAFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>D</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', fontFamily: 'Montserrat, sans-serif' }}>DeliveryOS</span>
          </div>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>Sistema de gestión de entregas</div>
        </div>
      </div>
    </div>
  );
}
