export async function geocodeAddress(address, commune) {
  if (!address) return null;
  const query = [address, commune].filter(Boolean).join(', ');
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3&lang=es&lat=-33.45&lon=-70.65`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DeliveryOS/1.0' }, signal: AbortSignal.timeout(7000) });
    if (res.ok) {
      const data = await res.json();
      const feat = (data.features || []).find(f => {
        const cc = (f.properties?.countrycode || '').toUpperCase();
        return cc === 'CL' || (f.properties?.country || '').toLowerCase().includes('chile');
      }) || data.features?.[0];
      if (feat) return { lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] };
    }
  } catch {}
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent([address, commune, 'Chile'].filter(Boolean).join(', '))}&format=json&limit=1&countrycodes=cl`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DeliveryOS/1.0' }, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
