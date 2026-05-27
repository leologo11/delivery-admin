import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { geocodeAddress, sleep } from '../utils/geocode.js';
import { qs, supabaseRequest } from '../utils/supabase.js';
import { syncRouteStats } from './deliveryRoutes.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const IMPORT_PROMPT = `Eres un asistente que extrae datos de paquetes de delivery desde documentos o imágenes.
Extrae TODOS los destinatarios que encuentres y devuelve SOLO un JSON array con objetos:
{
  "customerName": "nombre",
  "customerLastName": "apellido o null",
  "customerPhone": "teléfono o null",
  "address": "dirección completa",
  "commune": "comuna o null",
  "aptFloor": "depto/piso o null",
  "note": "nota especial o null"
}
NO incluyas precio, coordenadas ni otros campos. Solo los 7 campos indicados.
Si algún campo es ilegible o no existe, usa null. Devuelve SOLO el array JSON, sin texto adicional.`;

// POST /api/import/pool/preview — preview packages (no routeId = pool)
router.post('/pool/preview', upload.single('file'), async (req, res) => {
  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    let content;
    const mime = req.file?.mimetype || '';
    const name = (req.file?.originalname || '').toLowerCase();

    if (req.file && mime.startsWith('image/')) {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const mediaType = allowed.includes(mime) ? mime : 'image/jpeg';
      content = [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: req.file.buffer.toString('base64') } },
        { type: 'text', text: IMPORT_PROMPT },
      ];
    } else if (req.file && name.match(/\.(xlsx|xls)$/)) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      content = `${IMPORT_PROMPT}\n\nDatos:\n${csv.slice(0, 12000)}`;
    } else if (req.file) {
      content = `${IMPORT_PROMPT}\n\nDatos CSV:\n${req.file.buffer.toString('utf-8').slice(0, 12000)}`;
    } else if (req.body?.text) {
      content = `${IMPORT_PROMPT}\n\nLista:\n${String(req.body.text).slice(0, 12000)}`;
    } else {
      return res.status(400).json({ error: 'Requiere archivo o texto' });
    }

    const msg = await client.messages.create({ model: 'claude-opus-4-7', max_tokens: 8192, messages: [{ role: 'user', content }] });
    const text = msg.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No se pudieron extraer datos. Intenta con otro formato.');
    const packages = JSON.parse(match[0]);
    res.json({ packages, count: packages.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/import/pool/confirm — confirm and save to pool
router.post('/pool/confirm', async (req, res) => {
  try {
    const { packages, companyId } = req.body;
    if (!packages?.length) return res.status(400).json({ error: 'packages requerido' });
    if (!companyId) return res.status(400).json({ error: 'companyId requerido' });

    const docs = [];
    for (const p of packages) {
      let lat = null, lng = null;
      if (p.address) {
        const geo = await geocodeAddress(p.address, p.commune);
        if (geo) { lat = geo.lat; lng = geo.lng; }
        await sleep(300);
      }
      docs.push({
        tracking_id: `PKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        company_id: companyId, route_id: null,
        customer_name: p.customerName || '', customer_last_name: p.customerLastName || null,
        customer_phone: p.customerPhone || null, address: p.address || '',
        commune: p.commune || null, apt_floor: p.aptFloor || null,
        price: Number(p.price || 0), lat, lng, stop_order: 0, status: 'pendiente', note: p.note || null,
      });
    }

    const created = await supabaseRequest('/packages', { method: 'POST', body: JSON.stringify(docs) });
    res.status(201).json({ count: created.length, packages: created.map(p => ({ id: p.id, trackingId: p.tracking_id })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/import/:routeId/preview — preview for a specific route
router.post('/:routeId/preview', upload.single('file'), async (req, res) => {
  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    let content;
    const mime = req.file?.mimetype || '';
    const name = (req.file?.originalname || '').toLowerCase();

    if (req.file && mime.startsWith('image/')) {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      content = [
        { type: 'image', source: { type: 'base64', media_type: allowed.includes(mime) ? mime : 'image/jpeg', data: req.file.buffer.toString('base64') } },
        { type: 'text', text: IMPORT_PROMPT },
      ];
    } else if (req.file && name.match(/\.(xlsx|xls)$/)) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      content = `${IMPORT_PROMPT}\n\nDatos:\n${XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]).slice(0, 12000)}`;
    } else if (req.file) {
      content = `${IMPORT_PROMPT}\n\nDatos:\n${req.file.buffer.toString('utf-8').slice(0, 12000)}`;
    } else {
      return res.status(400).json({ error: 'Requiere archivo' });
    }

    const msg = await client.messages.create({ model: 'claude-opus-4-7', max_tokens: 8192, messages: [{ role: 'user', content }] });
    const text = msg.content[0].text.trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No se pudieron extraer datos.');
    res.json({ packages: JSON.parse(match[0]) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/import/:routeId/confirm
router.post('/:routeId/confirm', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { packages, companyId } = req.body;
    if (!packages?.length) return res.status(400).json({ error: 'packages requerido' });

    const existing = await supabaseRequest(`/packages${qs({ route_id: `eq.${routeId}`, select: 'stop_order', order: 'stop_order.desc', limit: 1 })}`);
    let baseOrder = existing.length > 0 ? (existing[0].stop_order ?? -1) + 1 : 0;

    const docs = [];
    for (const p of packages) {
      let lat = null, lng = null;
      if (p.address) {
        const geo = await geocodeAddress(p.address, p.commune);
        if (geo) { lat = geo.lat; lng = geo.lng; }
        await sleep(300);
      }
      docs.push({
        tracking_id: `PKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        company_id: companyId || null, route_id: routeId,
        customer_name: p.customerName || '', customer_last_name: p.customerLastName || null,
        customer_phone: p.customerPhone || null, address: p.address || '',
        commune: p.commune || null, apt_floor: p.aptFloor || null,
        price: Number(p.price || 0), lat, lng, stop_order: baseOrder++, status: 'pendiente', note: p.note || null,
      });
    }

    const created = await supabaseRequest('/packages', { method: 'POST', body: JSON.stringify(docs) });
    await syncRouteStats(routeId);
    res.status(201).json({ count: created.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
