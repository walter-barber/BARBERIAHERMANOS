// Descargar la app de los barberos (Android) desde el panel o el portal del barbero.
//
//   POST { barberId, pin }                       → barbero con su PIN
//   POST {} con «Authorization: Bearer <sesión>»  → administrador con su sesión del panel
//   Respuesta: { url } — enlace de descarga que vence en 10 minutos
//
// La app NO se publica con la web (el repositorio es público y quien tenga la app entra sin PIN):
// está en el almacenamiento privado de Supabase, carpeta «app», archivo BarberiaHermanos.apk.
// Para publicar una versión nueva se reemplaza ese archivo en Supabase → Storage → app.
//
// Variables de entorno en Vercel: APP_SUPABASE_URL (o VITE_SUPABASE_URL), APP_SUPABASE_SERVICE_ROLE_KEY

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'app';
const FILE = 'BarberiaHermanos.apk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.APP_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'No configurado' });
  const service = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  // ¿Quién la pide? Un administrador con su sesión, o un barbero con su PIN
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  let allowed = false;
  if (bearer) {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    allowed = r.ok && (await r.json()) === true;
  } else {
    const { barberId, pin } = req.body ?? {};
    if (typeof barberId === 'string' && UUID_RE.test(barberId) && typeof pin === 'string' && /^\d{4}$/.test(pin)) {
      const r = await fetch(`${supabaseUrl}/rest/v1/rpc/barber_login`, {
        method: 'POST',
        headers: service,
        body: JSON.stringify({ p_barber_id: barberId, p_pin: pin }),
      });
      allowed = r.ok && (await r.json()) === 'OK';
    }
  }
  if (!allowed) return res.status(401).json({ error: 'NO_AUTORIZADO' });

  const sign = await fetch(`${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${FILE}`, {
    method: 'POST',
    headers: service,
    body: JSON.stringify({ expiresIn: 600 }),
  });
  if (!sign.ok) {
    console.error('app-download: no se pudo firmar', sign.status, await sign.text());
    return res.status(404).json({ error: 'SIN_APP' });
  }
  const { signedURL } = await sign.json();
  const url = `${supabaseUrl}/storage/v1${signedURL}&download=${encodeURIComponent('Barberia Hermanos.apk')}`;
  return res.status(200).json({ url });
}
