import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const PRICE_PROMPT = `Eres un asistente que extrae listas de precios de delivery por comuna en Chile.
Devuelve SOLO un JSON array con objetos {commune, price}.
Ejemplo: [{"commune":"Santiago","price":4500},{"commune":"Las Condes","price":3500}]`;

const GEO_URL = 'https://raw.githubusercontent.com/robsalasco/precenso_2016_geojson_chile/master/Comunas_Metropolitana.geojson';
const TIER_COLOR = p => p <= 2000 ? '#2a9940' : p <= 3500 ? '#66bb6a' : p <= 5000 ? '#f57c00' : p <= 7000 ? '#e53935' : '#7b1fa2';

function norm(s) { return (s || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function titleCase(s) { return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
function communeName(p) { return p?.NOM_COMUNA || p?.NOMBRE || p?.nombre || p?.name || p?.Comuna || ''; }
function toZone(z) { return { _id: z.id, id: z.id, name: z.name, price: Number(z.price || 0), tiers: z.tiers || [], color: z.color, source: z.source, polygon: z.polygon, createdAt: z.created_at, updatedAt: z.updated_at }; }

router.get('/', async (req, res) => {
  try {
    const rows = await supabaseRequest(`/zones${qs({ select: '*', order: 'source.asc,name.asc' })}`);
    res.json(rows.map(toZone));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const rows = await supabaseRequest('/zones', { method: 'POST', body: JSON.stringify({ name: req.body.name, price: Number(req.body.price || 0), tiers: req.body.tiers || [], color: req.body.color || '#0052FF', source: req.body.source || 'custom', polygon: req.body.polygon }) });
    res.status(201).json(toZone(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const payload = {};
    if (req.body.name !== undefined) payload.name = req.body.name;
    if (req.body.price !== undefined) payload.price = Number(req.body.price);
    if (req.body.tiers !== undefined) payload.tiers = req.body.tiers;
    if (req.body.color !== undefined) payload.color = req.body.color;
    if (req.body.polygon !== undefined) payload.polygon = req.body.polygon;
    payload.updated_at = new Date().toISOString();
    const rows = await supabaseRequest(`/zones${qs({ id: `eq.${req.params.id}` })}`, { method: 'PATCH', body: JSON.stringify(payload) });
    if (!rows?.[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(toZone(rows[0]));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await supabaseRequest(`/zones${qs({ id: `eq.${req.params.id}` })}`, { method: 'DELETE' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/communes/all', requireRole('admin'), async (req, res) => {
  try {
    const rows = await supabaseRequest(`/zones${qs({ source: 'eq.commune', select: 'id' })}`);
    await supabaseRequest(`/zones${qs({ source: 'eq.commune' })}`, { method: 'DELETE' });
    res.json({ deleted: rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/seed-communes', requireRole('admin'), async (req, res) => {
  try {
    let features;
    if (Array.isArray(req.body?.features) && req.body.features.length > 0) {
      features = req.body.features;
    } else {
      const r = await fetch(GEO_URL, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error('No se pudo descargar el mapa de comunas');
      features = (await r.json()).features;
    }
    const configs = await supabaseRequest(`/price_configs${qs({ select: '*' })}`);
    const priceMap = {};
    configs.forEach(c => { priceMap[norm(c.commune)] = Number(c.price || 0); });
    const getPrice = name => priceMap[norm(name)] || 3500;
    let created = 0, skipped = 0, errors = 0;
    for (const feat of features) {
      const rawName = communeName(feat.properties);
      if (!rawName) continue;
      const name = titleCase(rawName);
      const exists = await supabaseRequest(`/zones${qs({ name: `ilike.${name}`, source: 'eq.commune', select: 'id' })}`);
      if (exists?.length) { skipped++; continue; }
      let polygon;
      if (feat.geometry?.type === 'Polygon') polygon = feat.geometry;
      else if (feat.geometry?.type === 'MultiPolygon') {
        const largest = feat.geometry.coordinates.reduce((a, b) => a[0].length >= b[0].length ? a : b);
        polygon = { type: 'Polygon', coordinates: largest };
      } else continue;
      const price = getPrice(name);
      try {
        await supabaseRequest('/zones', { method: 'POST', body: JSON.stringify({ name, price, tiers: [], color: TIER_COLOR(price), source: 'commune', polygon }) });
        created++;
      } catch { errors++; }
    }
    res.json({ created, skipped, errors, total: features.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/parse-prices-ai', requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    let content;
    if (req.file) {
      const mime = req.file.mimetype;
      const name = req.file.originalname.toLowerCase();
      if (mime.startsWith('image/')) {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        content = [{ type: 'image', source: { type: 'base64', media_type: allowed.includes(mime) ? mime : 'image/jpeg', data: req.file.buffer.toString('base64') } }, { type: 'text', text: PRICE_PROMPT }];
      } else if (name.match(/\.(xlsx|xls)$/)) {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        content = `${PRICE_PROMPT}\n\n${XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]).slice(0, 8000)}`;
      } else {
        content = `${PRICE_PROMPT}\n\n${req.file.buffer.toString('utf-8').slice(0, 8000)}`;
      }
    } else if (req.body?.text) {
      content = `${PRICE_PROMPT}\n\n${String(req.body.text).slice(0, 8000)}`;
    } else {
      return res.status(400).json({ error: 'Requiere archivo o texto' });
    }
    const msg = await client.messages.create({ model: 'claude-opus-4-7', max_tokens: 4096, messages: [{ role: 'user', content }] });
    const match = msg.content[0].text.trim().match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No se pudieron extraer precios');
    const items = JSON.parse(match[0]);
    res.json({ items, count: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-tiers', requireRole('admin'), async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Array requerido' });
    const zones = await supabaseRequest(`/zones${qs({ source: 'eq.commune', select: 'id,name' })}`);
    let updated = 0;
    for (const item of items) {
      const zone = zones.find(z => norm(z.name) === norm(item.commune));
      if (!zone) continue;
      await supabaseRequest(`/zones${qs({ id: `eq.${zone.id}` })}`, { method: 'PATCH', body: JSON.stringify({ price: Number(item.price), tiers: item.tiers || [], updated_at: new Date().toISOString() }) });
      updated++;
    }
    await supabaseRequest('/price_configs?on_conflict=commune', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(items.map(({ commune, price }) => ({ commune: String(commune).trim(), price: Number(price), zone: '', updated_at: new Date().toISOString() }))),
    }).catch(() => {});
    res.json({ ok: true, updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
