import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, uploadToCloudinary, deletePhoto } from '../utils/cloudinary.js';
import { syncRouteStats } from './deliveryRoutes.js';
import { geocodeAddress } from '../utils/geocode.js';
import { qs, supabaseRequest, supabaseCountedRequest } from '../utils/supabase.js';

const router = Router();

function norm(p) {
  return {
    _id: p.id, id: p.id, trackingId: p.tracking_id, routeId: p.route_id, companyId: p.company_id,
    customerName: p.customer_name, customerLastName: p.customer_last_name, customerPhone: p.customer_phone,
    address: p.address, commune: p.commune, aptFloor: p.apt_floor, zone: p.zone, price: Number(p.price || 0),
    lat: p.lat, lng: p.lng, order: p.stop_order, status: p.status, failReason: p.fail_reason, note: p.note,
    photoUrl: p.photo_url, photo2Url: p.photo2_url,
    photoUploadedAt: p.photo_uploaded_at, photo2UploadedAt: p.photo2_uploaded_at,
    deliveredAt: p.delivered_at, createdAt: p.created_at, updatedAt: p.updated_at,
  };
}

// PUBLIC tracking (no auth)
router.get('/track/:trackingId', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/packages${qs({ tracking_id: `eq.${req.params.trackingId.toUpperCase()}`, select: '*' })}`);
    const p = rows?.[0];
    if (!p) return res.status(404).json({ error: 'Paquete no encontrado' });
    res.json({ trackingId: p.tracking_id, status: p.status, customerName: p.customer_name, address: p.address, commune: p.commune, note: p.note, failReason: p.fail_reason, photoUrl: p.photo_url, deliveredAt: p.delivered_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.use(requireAuth);

// GET /api/packages/map
router.get('/map', requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = { select: '*', lat: 'not.is.null', lng: 'not.is.null', status: 'neq.eliminado', order: 'created_at.desc', limit: 10000 };
    let path = `/packages${qs(params)}`;
    const extra = [];
    if (from) extra.push(`created_at=gte.${new Date(`${from}T00:00:00`).toISOString()}`);
    if (to) extra.push(`created_at=lte.${new Date(`${to}T23:59:59`).toISOString()}`);
    if (extra.length) path += `&${extra.join('&')}`;
    const rows = await supabaseRequest(path);
    const routeIds = [...new Set(rows.map(p => p.route_id).filter(Boolean))];
    const routeMap = new Map();
    if (routeIds.length) {
      const rr = await supabaseRequest(`/routes${qs({ id: `in.(${routeIds.join(',')})`, select: 'id,route_code,status,driver_id' })}`);
      rr.forEach(r => routeMap.set(r.id, r));
    }
    res.json(rows.map(p => ({
      _id: p.id, id: p.id, trackingId: p.tracking_id,
      address: p.address, commune: p.commune,
      lat: Number(p.lat), lng: Number(p.lng),
      status: p.status, failReason: p.fail_reason,
      customerName: [p.customer_name, p.customer_last_name].filter(Boolean).join(' '),
      deliveredAt: p.delivered_at, createdAt: p.created_at,
      routeId: p.route_id, routeCode: routeMap.get(p.route_id)?.route_code,
      routeStatus: routeMap.get(p.route_id)?.status || null,
      companyId: p.company_id, price: Number(p.price || 0),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/packages/all
router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 60, status, routeId, companyId } = req.query;
    const params = { select: '*', order: 'created_at.desc', limit, offset: (Number(page) - 1) * Number(limit) };
    if (status && status !== 'todos') params.status = `eq.${status}`;
    if (routeId) params.route_id = `eq.${routeId}`;
    if (companyId) params.company_id = `eq.${companyId}`;
    const { rows, total } = await supabaseCountedRequest(`/packages${qs(params)}`);
    res.json({ packages: rows.map(norm), total, page: Number(page), limit: Number(limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/packages/pool
router.get('/pool', requireRole('admin'), async (req, res) => {
  try {
    const { search, companyId } = req.query;
    const params = { route_id: 'is.null', status: 'neq.eliminado', select: '*', order: 'created_at.desc', limit: 200 };
    if (companyId) params.company_id = `eq.${companyId}`;
    const rows = await supabaseRequest(`/packages${qs(params)}`);
    const q = search?.toLowerCase();
    const filtered = q ? rows.filter(p => [p.customer_name, p.customer_last_name, p.address, p.commune, p.tracking_id].filter(Boolean).join(' ').toLowerCase().includes(q)) : rows;
    res.json(filtered.map(norm));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/packages?routeId=xxx
router.get('/', async (req, res) => {
  try {
    const { routeId } = req.query;
    if (!routeId) return res.status(400).json({ error: 'routeId requerido' });
    const rows = await supabaseRequest(`/packages${qs({ route_id: `eq.${routeId}`, select: '*', order: 'stop_order.asc' })}`);
    res.json(rows.map(norm));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/packages
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const routeId = req.body.routeId || null;
    const companyId = req.body.companyId || null;
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });
    let stopOrder = 0;
    if (routeId) {
      const existing = await supabaseRequest(`/packages${qs({ route_id: `eq.${routeId}`, select: 'stop_order', order: 'stop_order.desc', limit: 1 })}`);
      stopOrder = existing.length > 0 ? (existing[0].stop_order ?? -1) + 1 : 0;
    }
    let lat = req.body.lat || null, lng = req.body.lng || null;
    if ((!lat || !lng) && req.body.address) {
      const geo = await geocodeAddress(req.body.address, req.body.commune);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }
    const rows = await supabaseRequest('/packages', {
      method: 'POST',
      body: JSON.stringify({
        tracking_id: `PKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        company_id: companyId, route_id: routeId,
        customer_name: req.body.customerName || '', customer_last_name: req.body.customerLastName || null,
        customer_phone: req.body.customerPhone || null, address: req.body.address,
        commune: req.body.commune || null, apt_floor: req.body.aptFloor || null, zone: req.body.zone || null,
        price: Number(req.body.price || 0), lat, lng, stop_order: stopOrder, status: 'pendiente', note: req.body.note || null,
      }),
    });
    if (routeId) await syncRouteStats(routeId);
    res.status(201).json(norm(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/packages/bulk
router.post('/bulk', requireRole('admin'), async (req, res) => {
  try {
    const { routeId: rawRouteId, companyId, packages } = req.body;
    if (!packages?.length) return res.status(400).json({ error: 'packages requeridos' });
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });
    const routeId = rawRouteId || null;
    let baseOrder = 0;
    if (routeId) {
      const existing = await supabaseRequest(`/packages${qs({ route_id: `eq.${routeId}`, select: 'stop_order', order: 'stop_order.desc', limit: 1 })}`);
      baseOrder = existing.length > 0 ? (existing[0].stop_order ?? -1) + 1 : 0;
    }
    const docs = packages.map((p, i) => ({
      tracking_id: `PKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      company_id: companyId, route_id: routeId,
      customer_name: p.customerName || '', customer_last_name: p.customerLastName || null,
      customer_phone: p.customerPhone || null, address: p.address,
      commune: p.commune || null, apt_floor: p.aptFloor || null, zone: p.zone || null,
      price: Number(p.price || 0), lat: p.lat || null, lng: p.lng || null,
      stop_order: baseOrder + i, status: 'pendiente', note: p.note || null,
    }));
    const created = await supabaseRequest('/packages', { method: 'POST', body: JSON.stringify(docs) });
    if (routeId) await syncRouteStats(routeId);
    res.status(201).json(created.map(norm));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/packages/:id
router.patch('/:id', async (req, res) => {
  try {
    const pkgs = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}`, select: '*' })}`);
    const pkg = pkgs?.[0];
    if (!pkg) return res.status(404).json({ error: 'No encontrado' });

    if (req.user.role === 'driver') {
      const routes = await supabaseRequest(`/routes${qs({ id: `eq.${pkg.route_id}`, select: 'driver_id,status' })}`);
      const route = routes?.[0];
      if (String(route?.driver_id) !== String(req.user.id)) return res.status(403).json({ error: 'Sin acceso' });
      if (route.status === 'completed') return res.status(403).json({ error: 'Ruta finalizada' });
      const update = {};
      const { status, note, failReason } = req.body;
      if (status) {
        if (pkg.status === 'entregado' && status !== 'entregado') return res.status(403).json({ error: 'No puedes revertir un paquete entregado' });
        update.status = status;
        if (status === 'entregado') { update.delivered_at = new Date().toISOString(); update.delivered_by = req.user.id; }
        if (status !== 'no-entregado') update.fail_reason = '';
      }
      if (note !== undefined) update.note = note;
      if (failReason !== undefined) update.fail_reason = failReason;
      update.updated_at = new Date().toISOString();
      const rows = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(update) });
      await syncRouteStats(pkg.route_id);
      return res.json(norm(rows[0]));
    }

    if (req.user.role === 'admin') {
      const update = {};
      const b = req.body;
      if (b.customerName !== undefined) update.customer_name = b.customerName;
      if (b.customerLastName !== undefined) update.customer_last_name = b.customerLastName;
      if (b.customerPhone !== undefined) update.customer_phone = b.customerPhone;
      if (b.address !== undefined) update.address = b.address;
      if (b.commune !== undefined) update.commune = b.commune;
      if (b.aptFloor !== undefined) update.apt_floor = b.aptFloor;
      if (b.zone !== undefined) update.zone = b.zone;
      if (b.price !== undefined) update.price = Number(b.price);
      if (b.lat !== undefined) update.lat = b.lat;
      if (b.lng !== undefined) update.lng = b.lng;
      if (b.note !== undefined) update.note = b.note;
      if (b.failReason !== undefined) update.fail_reason = b.failReason;
      if (b.routeId !== undefined) update.route_id = b.routeId;
      if (b.status !== undefined) {
        update.status = b.status;
        if (b.status === 'entregado' && !pkg.delivered_at) { update.delivered_at = new Date().toISOString(); update.delivered_by = req.user.id; }
      }
      update.updated_at = new Date().toISOString();
      const rows = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(update) });
      const oldRouteId = pkg.route_id;
      if (oldRouteId) await syncRouteStats(oldRouteId);
      if (b.routeId && b.routeId !== oldRouteId) await syncRouteStats(b.routeId);
      return res.json(norm(rows[0]));
    }

    res.status(403).json({ error: 'Sin permisos' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/packages/:id/photo
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const pkgs = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}`, select: 'id,route_id,photo_public_id,photo2_public_id' })}`);
    const pkg = pkgs?.[0];
    if (!pkg) return res.status(404).json({ error: 'No encontrado' });
    if (req.user.role === 'driver') {
      const routes = await supabaseRequest(`/routes${qs({ id: `eq.${pkg.route_id}`, select: 'driver_id' })}`);
      if (String(routes?.[0]?.driver_id) !== String(req.user.id)) return res.status(403).json({ error: 'Sin acceso' });
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const n = req.query.n === '2' ? 2 : 1;
    const update = {};
    if (n === 2) {
      if (pkg.photo2_public_id) await deletePhoto(pkg.photo2_public_id);
      const r = await uploadToCloudinary(req.file.buffer);
      update.photo2_url = r.secure_url; update.photo2_public_id = r.public_id; update.photo2_uploaded_at = new Date().toISOString();
    } else {
      if (pkg.photo_public_id) await deletePhoto(pkg.photo_public_id);
      const r = await uploadToCloudinary(req.file.buffer);
      update.photo_url = r.secure_url; update.photo_public_id = r.public_id; update.photo_uploaded_at = new Date().toISOString();
    }
    update.updated_at = new Date().toISOString();
    const rows = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(update) });
    const u = rows[0];
    res.json({ photoUrl: u.photo_url, photo2Url: u.photo2_url, photoUploadedAt: u.photo_uploaded_at, photo2UploadedAt: u.photo2_uploaded_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/packages/:id (soft)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const pkgs = await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}`, select: 'id,route_id' })}`);
    if (!pkgs?.[0]) return res.status(404).json({ error: 'No encontrado' });
    await supabaseRequest(`/packages${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ status: 'eliminado', updated_at: new Date().toISOString() }) });
    await syncRouteStats(pkgs[0].route_id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/packages/reorder/batch
router.patch('/reorder/batch', requireRole('admin'), async (req, res) => {
  try {
    await Promise.all((req.body.order || []).map(({ id, order: o }) =>
      supabaseRequest(`/packages${qs({ id: `eq.${id}` })}`, { method: 'PATCH', body: JSON.stringify({ stop_order: o, updated_at: new Date().toISOString() }) })
    ));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
