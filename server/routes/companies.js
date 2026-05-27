import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth);

function norm(r) {
  return { _id: r.id, id: r.id, name: r.name, rut: r.rut, address: r.address, contactPerson: r.contact_person, contactEmail: r.contact_email, contactPhone: r.contact_phone, notes: r.notes, active: r.active, createdAt: r.created_at };
}

router.get('/', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/companies${qs({ select: '*', order: 'name.asc', active: 'eq.true' })}`);
    res.json(rows.map(norm));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, rut, address, contactPerson, contactEmail, contactPhone, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const rows = await supabaseRequest('/companies', { method: 'POST', body: JSON.stringify({ name: name.trim(), rut, address, contact_person: contactPerson, contact_email: contactEmail, contact_phone: contactPhone, notes }) });
    res.status(201).json(norm(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, rut, address, contactPerson, contactEmail, contactPhone, notes, active } = req.body;
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (rut !== undefined) payload.rut = rut;
    if (address !== undefined) payload.address = address;
    if (contactPerson !== undefined) payload.contact_person = contactPerson;
    if (contactEmail !== undefined) payload.contact_email = contactEmail;
    if (contactPhone !== undefined) payload.contact_phone = contactPhone;
    if (notes !== undefined) payload.notes = notes;
    if (active !== undefined) payload.active = active;
    payload.updated_at = new Date().toISOString();
    const rows = await supabaseRequest(`/companies${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(payload) });
    res.json(norm(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await supabaseRequest(`/companies${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }) });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
