import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { securityHeaders } from './middleware/security.js';

import authRoutes      from './routes/auth.js';
import userRoutes      from './routes/users.js';
import companyRoutes   from './routes/companies.js';
import routeRoutes     from './routes/deliveryRoutes.js';
import packageRoutes   from './routes/packages.js';
import importRoutes    from './routes/importAI.js';
import priceRoutes     from './routes/priceRoutes.js';
import zoneRoutes      from './routes/zoneRoutes.js';
import publicRoutes    from './routes/publicRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const app = express();
const PORT = process.env.PORT || 4000;
app.set('trust proxy', 1);
app.use(securityHeaders);

const corsOptions = {
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:5173', 'http://127.0.0.1:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use('/api', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/public',    publicRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/routes',    routeRoutes);
app.use('/api/packages',  packageRoutes);
app.use('/api/import',    importRoutes);
app.use('/api/prices',    priceRoutes);
app.use('/api/zones',     zoneRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno' });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), err => { if (err) next(err); });
  });
}

app.listen(PORT, () => console.log(`DeliveryOS en puerto ${PORT}`));
