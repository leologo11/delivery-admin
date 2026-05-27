import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/analytics/overview?from=&to=
router.get('/overview', async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const fromDate = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = to ? new Date(`${to}T23:59:59`) : now;

    const dateFilter = `created_at=gte.${fromDate.toISOString()}&created_at=lte.${toDate.toISOString()}`;

    const [packages, routes, drivers] = await Promise.all([
      supabaseRequest(`/packages?select=status,price,commune,delivered_at,company_id,route_id&status=neq.eliminado&${dateFilter}&limit=50000`),
      supabaseRequest(`/routes?select=id,status,stats,driver_id,date&${dateFilter.replace(/created_at/g, 'date')}&limit=5000`),
      supabaseRequest(`/app_users${qs({ role: 'eq.driver', active: 'eq.true', select: 'id,name' })}`),
    ]);

    // Totales generales
    const total = packages.length;
    const delivered = packages.filter(p => p.status === 'entregado').length;
    const failed = packages.filter(p => p.status === 'no-entregado' || p.status === 'devuelto').length;
    const pending = packages.filter(p => p.status === 'pendiente').length;
    const revenue = packages.filter(p => p.status === 'entregado').reduce((s, p) => s + Number(p.price || 0), 0);
    const totalRevenue = packages.reduce((s, p) => s + Number(p.price || 0), 0);
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    // Rutas activas (no completed/cancelled)
    const activeRoutes = routes.filter(r => r.status === 'active' || r.status === 'paused').length;

    // Tendencia diaria — últimos 30 días
    const dailyMap = {};
    packages.forEach(p => {
      const day = (p.delivered_at || p.status === 'pendiente' ? p.created_at : p.created_at)?.slice(0, 10);
      if (!day) return;
      if (!dailyMap[day]) dailyMap[day] = { date: day, total: 0, delivered: 0, revenue: 0 };
      dailyMap[day].total++;
      if (p.status === 'entregado') { dailyMap[day].delivered++; dailyMap[day].revenue += Number(p.price || 0); }
    });
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

    // Por estado
    const byStatus = [
      { status: 'entregado', label: 'Entregado', count: delivered, color: '#22a85a' },
      { status: 'no-entregado', label: 'No entregado', count: failed, color: '#cc2244' },
      { status: 'pendiente', label: 'Pendiente', count: pending, color: '#f57c00' },
    ];

    // Top comunas por volumen
    const communeMap = {};
    packages.forEach(p => {
      if (!p.commune) return;
      if (!communeMap[p.commune]) communeMap[p.commune] = { commune: p.commune, total: 0, delivered: 0, revenue: 0 };
      communeMap[p.commune].total++;
      if (p.status === 'entregado') { communeMap[p.commune].delivered++; communeMap[p.commune].revenue += Number(p.price || 0); }
    });
    const topCommunes = Object.values(communeMap).sort((a, b) => b.total - a.total).slice(0, 10);

    // Performance por driver
    const driverMap = {};
    drivers.forEach(d => { driverMap[d.id] = { id: d.id, name: d.name, total: 0, delivered: 0, failed: 0, revenue: 0 }; });
    routes.forEach(r => {
      if (!r.driver_id || !driverMap[r.driver_id] || !r.stats) return;
      const s = r.stats;
      driverMap[r.driver_id].total += s.total || 0;
      driverMap[r.driver_id].delivered += s.delivered || 0;
      driverMap[r.driver_id].failed += s.failed || 0;
      driverMap[r.driver_id].revenue += s.collectedAmount || 0;
    });
    const driverPerformance = Object.values(driverMap)
      .filter(d => d.total > 0)
      .map(d => ({ ...d, rate: d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0 }))
      .sort((a, b) => b.delivered - a.delivered)
      .slice(0, 10);

    res.json({
      summary: { total, delivered, failed, pending, revenue, totalRevenue, deliveryRate, activeRoutes },
      daily, byStatus, topCommunes, driverPerformance,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/routes?from=&to=
router.get('/routes', async (req, res) => {
  try {
    const { from, to } = req.query;
    const now = new Date();
    const fromDate = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = to ? new Date(`${to}T23:59:59`) : now;
    const dateFilter = `date=gte.${fromDate.toISOString()}&date=lte.${toDate.toISOString()}`;

    const routes = await supabaseRequest(`/routes?select=*&${dateFilter}&order=date.desc&limit=200`);
    const driverIds = [...new Set(routes.map(r => r.driver_id).filter(Boolean))];
    const driverMap = new Map();
    if (driverIds.length) {
      const users = await supabaseRequest(`/app_users${qs({ id: `in.(${driverIds.join(',')})`, select: 'id,name' })}`);
      users.forEach(u => driverMap.set(u.id, u.name));
    }

    res.json(routes.map(r => ({
      id: r.id, routeCode: r.route_code, name: r.name, date: r.date,
      status: r.status, stats: r.stats || {},
      driverName: driverMap.get(r.driver_id) || null,
      driverPayout: r.driver_payout,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
