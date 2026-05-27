const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('dos_token');
}

async function req(method, path, body, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

const get    = (path)        => req('GET',    path);
const post   = (path, body, isFormData) => req('POST',   path, body, isFormData);
const put    = (path, body)  => req('PUT',    path, body);
const patch  = (path, body)  => req('PATCH',  path, body);
const del    = (path)        => req('DELETE', path);

function toQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // ─── Auth ──────────────────────────────────────────────────
  login(email, password) {
    return post('/auth/login', { email, password });
  },
  me() {
    return get('/auth/me');
  },
  seedAdmin(email, password) {
    return post('/auth/seed-admin', { email, password });
  },

  // ─── Companies ─────────────────────────────────────────────
  getCompanies() {
    return get('/companies');
  },
  createCompany(data) {
    return post('/companies', data);
  },
  updateCompany(id, data) {
    return patch(`/companies/${id}`, data);
  },
  deleteCompany(id) {
    return del(`/companies/${id}`);
  },

  // ─── Users ─────────────────────────────────────────────────
  getUsers() {
    return get('/users');
  },
  createUser(data) {
    return post('/users', data);
  },
  updateUser(id, data) {
    return patch(`/users/${id}`, data);
  },
  deleteUser(id) {
    return del(`/users/${id}`);
  },
  updateMyLocation(data) {
    return patch('/users/me/location', data);
  },

  // ─── Routes ────────────────────────────────────────────────
  getRoutes(params) {
    return get(`/routes${toQuery(params)}`);
  },
  getRoute(id) {
    return get(`/routes/${id}`);
  },
  createRoute(data) {
    return post('/routes', data);
  },
  updateRoute(id, data) {
    return put(`/routes/${id}`, data);
  },
  deleteRoute(id) {
    return del(`/routes/${id}`);
  },
  generateShareLink(id) {
    return post(`/routes/${id}/share`);
  },
  revokeShareLink(id) {
    return del(`/routes/${id}/share`);
  },
  getPublicRoute(token) {
    return get(`/public/routes/${token}`);
  },
  getDriverLocation(id) {
    return get(`/routes/${id}/driver-location`);
  },

  // ─── Packages ──────────────────────────────────────────────
  getAllPackages(params) {
    return get(`/packages/all${toQuery(params)}`);
  },
  getPackages(routeId) {
    return get(`/routes/${routeId}/packages`);
  },
  getPoolPackages(params) {
    return get(`/packages/pool${toQuery(params)}`);
  },
  createPackage(data) {
    return post('/packages', data);
  },
  bulkCreatePackages(routeId, packages) {
    return post(`/routes/${routeId}/packages/bulk`, { packages });
  },
  updatePackage(id, data) {
    return put(`/packages/${id}`, data);
  },
  deletePackage(id) {
    return del(`/packages/${id}`);
  },
  reorderPackages(order) {
    return post('/packages/reorder', { order });
  },
  uploadPhoto(pkgId, file, n) {
    const fd = new FormData();
    fd.append('photo', file);
    if (n !== undefined) fd.append('n', n);
    return post(`/packages/${pkgId}/photo`, fd, true);
  },
  trackPackage(trackingId) {
    return get(`/track/${trackingId}`);
  },
  getMapPackages(params) {
    return get(`/packages/map${toQuery(params)}`);
  },

  // ─── Prices ────────────────────────────────────────────────
  getPrices() {
    return get('/prices');
  },
  upsertPrice(data) {
    return post('/prices', data);
  },
  bulkUpsertPrices(items) {
    return post('/prices/bulk', { items });
  },
  updatePrice(id, data) {
    return put(`/prices/${id}`, data);
  },
  deletePrice(id) {
    return del(`/prices/${id}`);
  },

  // ─── Zones ─────────────────────────────────────────────────
  getZones() {
    return get('/zones');
  },
  createZone(data) {
    return post('/zones', data);
  },
  updateZone(id, data) {
    return patch(`/zones/${id}`, data);
  },
  deleteZone(id) {
    return del(`/zones/${id}`);
  },
  seedCommunes(features) {
    return post('/zones/seed-communes', { features });
  },
  deleteAllCommunes() {
    return del('/zones/communes');
  },
  parsePricesAI(source) {
    return post('/zones/parse-prices-ai', { source });
  },
  bulkZoneTiers(items) {
    return post('/zones/bulk-tiers', { items });
  },

  // ─── Import ────────────────────────────────────────────────
  importPreview(routeId, file) {
    const fd = new FormData();
    fd.append('file', file);
    return post(`/import/routes/${routeId}/preview`, fd, true);
  },
  importConfirm(routeId, packages, companyId) {
    return post(`/import/routes/${routeId}/confirm`, { packages, companyId });
  },
  importPoolPreview(file) {
    const fd = new FormData();
    fd.append('file', file);
    return post('/import/pool/preview', fd, true);
  },
  importPoolConfirm(packages, companyId) {
    return post('/import/pool/confirm', { packages, companyId });
  },

  // ─── Analytics ─────────────────────────────────────────────
  getOverview(params) {
    return get(`/analytics/overview${toQuery(params)}`);
  },
  getRoutesAnalytics(params) {
    return get(`/analytics/routes${toQuery(params)}`);
  },
};

export default api;
