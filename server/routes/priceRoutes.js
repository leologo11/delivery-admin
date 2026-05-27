import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/price_configs${qs({ select: '*', order: 'commune.asc' })}`);
    res.json(rows.map(r => ({ _id: r.id, id: r.id, commune: r.commune, price: Number(r.price || 0), zone: r.zone || '', createdAt: r.created_at, updatedAt: r.updated_at })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { commune, price, zone } = req.body;
    const rows = await supabaseRequest('/price_configs?on_conflict=commune', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ commune: String(commune).trim(), price: Number(price || 0), zone: zone || '' }),
    });
    res.status(201).json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/bulk', requireRole('admin'), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array requerido' });
    const rows = await supabaseRequest('/price_configs?on_conflict=commune', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(items.map(({ commune, price, zone }) => ({ commune: String(commune).trim(), price: Number(price || 0), zone: zone || '', updated_at: new Date().toISOString() }))),
    });
    res.json(rows);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { price, zone } = req.body;
    const payload = { updated_at: new Date().toISOString() };
    if (price !== undefined) payload.price = Number(price);
    if (zone !== undefined) payload.zone = zone;
    const rows = await supabaseRequest(`/price_configs${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(payload) });
    res.json(rows[0]);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await supabaseRequest(`/price_configs${qs({ id: `eq.${req.params.id}` })}`, { method: 'DELETE' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
