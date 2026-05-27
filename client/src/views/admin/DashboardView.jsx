import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/index.js';

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtCLP(n) {
  if (n == null || isNaN(n)) return '$0';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('es-CL').format(n);
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/* ─── Skeleton pulse ─────────────────────────────────────────── */
function Skel({ w = '100%', h = 20, r = 8 }) {
  return (
    <div style={{
      width: w,
      height: h,
      borderRadius: r,
      background: 'linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub, loading }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #dbe3ef',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      boxShadow: '0 1px 3px rgba(15,23,42,.08)',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {label}
        </span>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}14`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          {icon}
        </div>
      </div>
      {loading ? (
        <>
          <Skel h={32} w="60%" r={8} />
          <Skel h={14} w="40%" r={6} />
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, fontWeight: 800, color: color || '#0F172A', lineHeight: 1, fontFamily: 'Montserrat, sans-serif' }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: '#64748B' }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

/* ─── Bar Chart (CSS/divs) ───────────────────────────────────── */
function BarChart({ data, loading }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 4px' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
            <Skel w="100%" h={`${30 + Math.random() * 100}px`} r={4} />
            <Skel w="80%" h={10} r={3} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        Sin datos para el período
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.total || 0), 1);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Y-axis labels */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 160 }}>
        {data.map((d, i) => {
          const totalH  = ((d.total || 0) / maxVal) * 140;
          const delivH  = ((d.delivered || 0) / maxVal) * 140;
          return (
            <div
              key={i}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ ...d, index: i })}
              onMouseLeave={() => setTooltip(null)}
            >
              <div style={{ position: 'relative', width: '100%', height: 140, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {/* Total bar (bg) */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '80%',
                  height: totalH,
                  background: '#e2e8f0',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height .3s ease',
                }} />
                {/* Delivered bar (fg) */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '80%',
                  height: delivH,
                  background: tooltip?.index === i ? '#0047DD' : '#0052FF',
                  borderRadius: '4px 4px 0 0',
                  transition: 'height .3s ease, background .15s',
                  boxShadow: tooltip?.index === i ? '0 0 8px rgba(0,82,255,.4)' : 'none',
                }} />
              </div>
              <div style={{
                fontSize: 9,
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'clip',
                maxWidth: '100%',
                textAlign: 'center',
                transform: 'rotate(-40deg)',
                transformOrigin: 'center top',
                marginTop: 4,
              }}>
                {fmtDate(d.date)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#fff',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 600,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,.3)',
        }}>
          {fmtDate(tooltip.date)} — {tooltip.delivered || 0}/{tooltip.total || 0} entregas
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#e2e8f0' }} /> Total
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#0052FF' }} /> Entregados
        </div>
      </div>
    </div>
  );
}

/* ─── Donut Chart (SVG) ──────────────────────────────────────── */
function DonutChart({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Skel w={140} h={140} r={70} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          {[1,2,3].map(i => <Skel key={i} h={16} r={6} />)}
        </div>
      </div>
    );
  }

  const total = (data?.delivered || 0) + (data?.failed || 0) + (data?.pending || 0);
  if (total === 0) {
    return (
      <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        Sin datos
      </div>
    );
  }

  const segments = [
    { label: 'Entregado',    value: data.delivered || 0, color: '#22a85a' },
    { label: 'No entregado', value: data.failed    || 0, color: '#cc2244' },
    { label: 'Pendiente',    value: data.pending   || 0, color: '#d4650a' },
  ];

  const size   = 140;
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = 52;
  const innerR = 32;

  let cumAngle = -Math.PI / 2;
  const paths = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const xi1 = cx + innerR * Math.cos(cumAngle);
    const yi1 = cy + innerR * Math.sin(cumAngle);
    const xi2 = cx + innerR * Math.cos(cumAngle - angle);
    const yi2 = cy + innerR * Math.sin(cumAngle - angle);
    const large = angle > Math.PI ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi1} ${yi1}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${xi2} ${yi2}`,
      'Z',
    ].join(' ');
    return { ...seg, d, angle };
  });

  const pct = total > 0 ? Math.round(((data.delivered || 0) / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} stroke="#fff" strokeWidth={2} />
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: 'Montserrat, sans-serif' }}>{pct}%</div>
          <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600 }}>ENTREGA</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{seg.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{fmtNum(seg.value)}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>({total > 0 ? Math.round((seg.value/total)*100) : 0}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Horizontal bar chart (communes) ───────────────────────── */
function HorizontalBars({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skel w={90} h={14} r={4} />
            <div style={{ flex: 1 }}><Skel h={16} r={4} /></div>
            <Skel w={30} h={14} r={4} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin datos</div>;
  }

  const top = data.slice(0, 8);
  const maxVal = Math.max(...top.map(d => d.count || 0), 1);

  const palette = ['#0052FF','#0047DD','#003FCC','#0036BB','#0030AA','#00289F','#0022AA','#001EB8'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {top.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 100,
            fontSize: 12,
            color: '#1E293B',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
            textAlign: 'right',
          }}>
            {d.commune || d.name || '—'}
          </div>
          <div style={{ flex: 1, height: 18, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${((d.count || 0) / maxVal) * 100}%`,
              height: '100%',
              background: palette[i % palette.length],
              borderRadius: 4,
              transition: 'width .6s ease',
            }} />
          </div>
          <div style={{ width: 36, fontSize: 12, fontWeight: 700, color: '#0F172A', textAlign: 'right', flexShrink: 0 }}>
            {fmtNum(d.count)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Driver table ───────────────────────────────────────────── */
function DriverTable({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <Skel w="30%" h={16} r={4} />
            <Skel w="15%" h={16} r={4} />
            <Skel w="15%" h={16} r={4} />
            <Skel w="20%" h={16} r={4} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin datos</div>;
  }

  const sorted = [...data].sort((a, b) => (b.delivered || 0) - (a.delivered || 0));

  function rateBadge(rate) {
    const pct = Math.round(rate * 100);
    const color = pct >= 80 ? '#22a85a' : pct >= 60 ? '#d4650a' : '#cc2244';
    const bg    = pct >= 80 ? '#22a85a12' : pct >= 60 ? '#d4650a12' : '#cc224412';
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}>
        {pct}%
      </span>
    );
  }

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
  };
  const tdStyle = {
    padding: '10px 12px',
    fontSize: 13,
    color: '#1E293B',
    borderBottom: '1px solid #f1f5f9',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>Driver</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Entregas</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Tasa</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg,#0052FF,#00DAFF)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {(d.driverName || d.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 500 }}>{d.driverName || d.name || '—'}</span>
                </div>
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>
                {fmtNum(d.delivered || 0)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {rateBadge(d.deliveryRate || 0)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#22a85a' }}>
                {fmtCLP(d.revenue || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Routes table ───────────────────────────────────────────── */
function RoutesTable({ data, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
            <Skel w="20%" h={16} r={4} />
            <Skel w="15%" h={16} r={4} />
            <Skel w="20%" h={16} r={4} />
            <Skel flex="1" h={16} r={4} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Sin rutas activas</div>;
  }

  function statusBadge(status) {
    const map = {
      active:    { color: '#0052FF', bg: '#0052FF14', label: 'Activa'    },
      completed: { color: '#22a85a', bg: '#22a85a12', label: 'Completada' },
      pending:   { color: '#d4650a', bg: '#d4650a12', label: 'Pendiente' },
      cancelled: { color: '#cc2244', bg: '#cc224412', label: 'Cancelada' },
    };
    const c = map[status] || map.pending;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 700,
      }}>
        {c.label}
      </span>
    );
  }

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
  };
  const tdStyle = {
    padding: '10px 12px',
    fontSize: 13,
    color: '#1E293B',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Ruta</th>
            <th style={thStyle}>Estado</th>
            <th style={thStyle}>Driver</th>
            <th style={thStyle}>Progreso</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const pct = r.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0;
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbff' }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  {r.name || r.routeName || `Ruta #${r._id?.slice(-4) || i + 1}`}
                </td>
                <td style={tdStyle}>{statusBadge(r.status)}</td>
                <td style={{ ...tdStyle, color: '#64748B' }}>{r.driverName || r.driver || '—'}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      flex: 1,
                      height: 8,
                      background: '#e2e8f0',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: pct >= 80 ? '#22a85a' : '#0052FF',
                        borderRadius: 999,
                        transition: 'width .6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      {r.delivered || 0}/{r.total || 0}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Section Card ───────────────────────────────────────────── */
function Section({ title, children, style }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #dbe3ef',
      borderRadius: 14,
      padding: '20px 22px',
      boxShadow: '0 1px 3px rgba(15,23,42,.06)',
      ...style,
    }}>
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#0F172A',
        marginBottom: 16,
        letterSpacing: '-.1px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─── DashboardView ──────────────────────────────────────────── */
export default function DashboardView() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo,   setDateTo]   = useState(today());
  const [overview, setOverview] = useState(null);
  const [routes,   setRoutes]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: dateFrom, to: dateTo };
      const [ov, rt] = await Promise.all([
        api.getOverview(params).catch(() => ({})),
        api.getRoutesAnalytics(params).catch(() => []),
      ]);
      setOverview(ov || {});
      setRoutes(Array.isArray(rt) ? rt : rt?.routes || []);
    } catch {
      setOverview({});
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Derived values */
  const totalPkgs     = overview?.totalPackages    ?? 0;
  const deliveryRate  = overview?.deliveryRate     ?? 0;
  const revenue       = overview?.revenue          ?? 0;
  const activeRoutes  = overview?.activeRoutes     ?? 0;

  const rateColor = deliveryRate >= 0.80 ? '#22a85a' : deliveryRate >= 0.60 ? '#d4650a' : '#cc2244';
  const dailyData    = overview?.dailyDeliveries  || [];
  const distribution = overview?.distribution     || {};
  const topCommunes  = overview?.topCommunes       || [];
  const driverStats  = overview?.driverStats       || [];

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn .3s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Resumen operacional
          </p>
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Período:</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              padding: '7px 10px',
              border: '1px solid #dbe3ef',
              borderRadius: 8,
              fontSize: 13,
              color: '#0F172A',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>→</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={e => setDateTo(e.target.value)}
            style={{
              padding: '7px 10px',
              border: '1px solid #dbe3ef',
              borderRadius: 8,
              fontSize: 13,
              color: '#0F172A',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={fetchData}
            style={{
              padding: '7px 14px',
              background: 'linear-gradient(135deg, #0052FF, #0041CC)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 2px 8px rgba(0,82,255,.3)',
            }}
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Row 1: KPI cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard
          label="Paquetes Total"
          value={fmtNum(totalPkgs)}
          icon="📦"
          color="#0052FF"
          sub={`Período: ${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`}
          loading={loading}
        />
        <KpiCard
          label="Tasa de Entrega"
          value={`${Math.round(deliveryRate * 100)}%`}
          icon="✅"
          color={rateColor}
          sub={deliveryRate >= 0.80 ? 'Excelente' : deliveryRate >= 0.60 ? 'Regular' : 'Por mejorar'}
          loading={loading}
        />
        <KpiCard
          label="Ingresos"
          value={fmtCLP(revenue)}
          icon="💰"
          color="#22a85a"
          sub="Acumulado del período"
          loading={loading}
        />
        <KpiCard
          label="Rutas Activas"
          value={fmtNum(activeRoutes)}
          icon="🗺️"
          color="#d4650a"
          sub="Rutas en curso"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Bar chart + Donut ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Section title="📅 Entregas por día" style={{ flex: '3 1 380px' }}>
          <BarChart data={dailyData} loading={loading} />
        </Section>
        <Section title="🥧 Distribución de estados" style={{ flex: '2 1 240px' }}>
          <DonutChart data={distribution} loading={loading} />
        </Section>
      </div>

      {/* ── Row 3: Communes + Driver table ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Section title="📍 Top Comunas" style={{ flex: '1 1 320px' }}>
          <HorizontalBars data={topCommunes} loading={loading} />
        </Section>
        <Section title="👤 Rendimiento por Driver" style={{ flex: '1 1 320px' }}>
          <DriverTable data={driverStats} loading={loading} />
        </Section>
      </div>

      {/* ── Row 4: Routes table ── */}
      <Section title="🗺️ Rutas Activas">
        <RoutesTable data={routes} loading={loading} />
      </Section>
    </div>
  );
}
