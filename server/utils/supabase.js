const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function supabaseRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase no configurado.');
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || `Supabase HTTP ${res.status}`);
  return data;
}

/* Returns { rows, total } using Supabase count=exact */
export async function supabaseCountedRequest(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase no configurado.');
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,count=exact',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || `Supabase HTTP ${res.status}`);
  // Content-Range: 0-59/500
  const cr = res.headers.get('content-range') || '';
  const total = parseInt(cr.split('/')[1] ?? '0', 10) || (Array.isArray(data) ? data.length : 0);
  return { rows: Array.isArray(data) ? data : [], total };
}

export function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function normalizeUser(row) {
  if (!row) return null;
  return {
    _id: row.id, id: row.id,
    name: row.name, email: row.email, role: row.role,
    companyId: row.company_id,
    active: row.active,
    phone: row.phone,
    vehicle: row.vehicle,
    licensePlate: row.license_plate,
    location: row.location || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
