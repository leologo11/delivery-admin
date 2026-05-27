import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth);

export async function syncRouteStats(routeId) {
  if (!routeId) return;
  try {
    const pkgs = await supabaseRequest(`/packages${qs({ route_id: `eq.${routeId}`, status: 'neq.eliminado', select: 'status,price' })}`);
    const stats = { total: pkgs.length, delivered: 0, failed: 0, pending: 0, totalAmount: 0, collectedAmount: 0 };
    pkgs.forEach(p => {
      stats.totalAmount += Number(p.price || 0);
      if (p.status === 'entregado') { stats.delivered++; stats.collectedAmount += Number(p.price || 0); }
      else if (p.status === 'no-entregado' || p.status === 'devuelto') stats.failed++;
      else stats.pending++;
    });
    await supabaseRequest(`/routes${qs({ id: `eq.${routeId}` })}`, { method: 'PATCH', body: JSON.stringify({ stats, updated_at: new Date().toISOString() }) });
  } catch {}
}

function normRoute(r) {
  return {
    _id: r.id, id: r.id, routeCode: r.route_code, name: r.name,
    date: r.date, driverId: r.driver_id, companyId: r.company_id,
    status: r.status, stats: r.stats || {}, notes: r.notes,
    shareToken: r.share_token,
    startPoint: r.start_point || {},
    distanceKm: r.distance_km,
    driverPayout: r.driver_payout,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const { status, driverId, companyId, from, to } = req.query;
    const params = { select: '*', order: 'date.desc', limit: 200 };
    if (req.user.role === 'driver') {
      params.driver_id = `eq.${req.user.id}`;
    } else {
      if (status) params.status = `eq.${status}`;
      if (driverId) params.driver_id = `eq.${driverId}`;
      if (companyId) params.company_id = `eq.${companyId}`;
    }
    let path = `/routes${qs(params)}`;
    const extra = [];
    if (from) extra.push(`date=gte.${new Date(`${from}T00:00:00`).toISOString()}`);
    if (to) extra.push(`date=lte.${new Date(`${to}T23:59:59`).toISOString()}`);
    if (extra.length) path += `${path.includes('?') ? '&' : '?'}${extra.join('&')}`;
    const rows = await supabaseRequest(path);
    res.json(rows.map(normRoute));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/routes/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}`, select: '*' })}`);
    if (!rows?.[0]) return res.status(404).json({ error: 'Ruta no encontrada' });
    res.json(normRoute(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/routes
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, date, driverId, companyId, notes } = req.body;
    const routeCode = `RT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const rows = await supabaseRequest('/routes', {
      method: 'POST',
      body: JSON.stringify({
        route_code: routeCode, name: name || null,
        date: date || new Date().toISOString(),
        driver_id: driverId || null, company_id: companyId || null,
        status: 'active', notes: notes || null,
        stats: { total: 0, delivered: 0, failed: 0, pending: 0, totalAmount: 0, collectedAmount: 0 },
      }),
    });
    res.status(201).json(normRoute(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/routes/:id
router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, date, driverId, companyId, status, notes, driverPayout, startPoint } = req.body;
    const payload = { updated_at: new Date().toISOString() };
    if (name !== undefined) payload.name = name;
    if (date !== undefined) payload.date = date;
    if (driverId !== undefined) payload.driver_id = driverId;
    if (companyId !== undefined) payload.company_id = companyId;
    if (status !== undefined) payload.status = status;
    if (notes !== undefined) payload.notes = notes;
    if (driverPayout !== undefined) payload.driver_payout = Number(driverPayout);
    if (startPoint !== undefined) payload.start_point = startPoint;
    const rows = await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(payload) });
    res.json(normRoute(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/routes/:id (soft: completed)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/routes/:id/share
router.post('/:id/share', requireRole('admin'), async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ share_token: token, updated_at: new Date().toISOString() }) });
    res.json({ token });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/share', requireRole('admin'), async (req, res) => {
  try {
    await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ share_token: null, updated_at: new Date().toISOString() }) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/routes/:id/driver-location
router.get('/:id/driver-location', async (req, res) => {
  try {
    const routes = await supabaseRequest(`/routes${qs({ id: `eq.${req.params.id}`, select: 'driver_id' })}`);
    const driverId = routes?.[0]?.driver_id;
    if (!driverId) return res.json({ location: null });
    const users = await supabaseRequest(`/app_users${qs({ id: `eq.${driverId}`, select: 'location,name' })}`);
    res.json({ location: users?.[0]?.location || null, driverName: users?.[0]?.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
