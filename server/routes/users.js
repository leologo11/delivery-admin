import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { normalizeUser, qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/app_users${qs({ select: '*', order: 'name.asc' })}`);
    res.json(rows.map(normalizeUser));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone, vehicle, licensePlate, companyId } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role requeridos' });
    const passwordHash = await bcrypt.hash(password, 10);
    const rows = await supabaseRequest('/app_users', {
      method: 'POST',
      body: JSON.stringify({ name, email: email.toLowerCase().trim(), password_hash: passwordHash, role, phone: phone || null, vehicle: vehicle || null, license_plate: licensePlate || null, company_id: companyId || null, active: true }),
    });
    res.status(201).json(normalizeUser(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, email, password, role, phone, vehicle, licensePlate, companyId, active } = req.body;
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (email !== undefined) payload.email = email.toLowerCase().trim();
    if (password) payload.password_hash = await bcrypt.hash(password, 10);
    if (role !== undefined) payload.role = role;
    if (phone !== undefined) payload.phone = phone;
    if (vehicle !== undefined) payload.vehicle = vehicle;
    if (licensePlate !== undefined) payload.license_plate = licensePlate;
    if (companyId !== undefined) payload.company_id = companyId;
    if (active !== undefined) payload.active = active;
    payload.updated_at = new Date().toISOString();
    const rows = await supabaseRequest(`/app_users${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(payload) });
    res.json(normalizeUser(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await supabaseRequest(`/app_users${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me/location', requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;
    await supabaseRequest(`/app_users${qs({ id: `eq.${userId}` })}`, { method: 'PATCH', body: JSON.stringify({ location: { lat, lng, updatedAt: new Date().toISOString() }, updated_at: new Date().toISOString() }) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
