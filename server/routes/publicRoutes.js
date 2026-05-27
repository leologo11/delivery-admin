import { Router } from 'express';
import { qs, supabaseRequest } from '../utils/supabase.js';

const router = Router();

// GET /api/public/route/:token — link compartido de ruta
router.get('/route/:token', async (req, res) => {
  try {
    const routes = await supabaseRequest(`/routes${qs({ share_token: `eq.${req.params.token}`, select: '*' })}`);
    const route = routes?.[0];
    if (!route) return res.status(404).json({ error: 'Link no encontrado o revocado' });
    const packages = await supabaseRequest(`/packages${qs({ route_id: `eq.${route.id}`, status: 'neq.eliminado', select: '*', order: 'stop_order.asc' })}`);
    res.json({
      route: { id: route.id, routeCode: route.route_code, name: route.name, date: route.date, status: route.status, stats: route.stats },
      packages: packages.map(p => ({
        id: p.id, trackingId: p.tracking_id,
        customerName: [p.customer_name, p.customer_last_name].filter(Boolean).join(' '),
        address: p.address, commune: p.commune,
        status: p.status, deliveredAt: p.delivered_at, failReason: p.fail_reason,
        lat: p.lat, lng: p.lng, order: p.stop_order,
      })),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
