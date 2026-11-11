// Actualizaciones de la app de los barberos (la app pregunta al abrirse).
//
//   POST { barberId, key }  (key = llave de la app, «app:…»)
//   → { web: { version, url }, apk: { build, url } }  — enlaces que vencen en 30 minutos
//
// Todo está en el almacenamiento privado «app» de Supabase (el repositorio es público y la app entra
// sin PIN). Lo sube `npm run app:publicar`:
//   app/version.json        { "web": "202611111530", "webFile": "web-202611111530.zip", "apk": 3 }
//   app/web-<versión>.zip   pantallas nuevas (actualización en vivo)
//   app/BarberiaHermanos.apk
//
// Variables de entorno en Vercel: APP_SUPABASE_URL (o VITE_SUPABASE_URL), APP_SUPABASE_SERVICE_ROLE_KEY

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^app:[A-Za-z0-9_-]{20,100}$/;
const APP_ORIGINS = ['https://localhost', 'capacitor://localhost'];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (APP_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const supabaseUrl = process.env.APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.APP_SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'No configurado' });
  const service = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  // Solo la app (con su llave) puede pedir las actualizaciones
  const { barberId, key } = req.body ?? {};
  if (typeof barberId !== 'string' || !UUID_RE.test(barberId) || typeof key !== 'string' || !KEY_RE.test(key)) {
    return res.status(400).json({ error: 'INVALID' });
  }
  const login = await fetch(`${supabaseUrl}/rest/v1/rpc/barber_login`, {
    method: 'POST',
    headers: service,
    body: JSON.stringify({ p_barber_id: barberId, p_pin: key }),
  });
  if (!login.ok || (await login.json()) !== 'OK') return res.status(401).json({ error: 'NO_AUTORIZADO' });

  const v = await fetch(`${supabaseUrl}/storage/v1/object/app/version.json`, { headers: service });
  if (!v.ok) return res.status(200).json({}); // todavía no se ha publicado nada
  const version = await v.json();

  const sign = async (file) => {
    const r = await fetch(`${supabaseUrl}/storage/v1/object/sign/app/${encodeURIComponent(file)}`, {
      method: 'POST',
      headers: service,
      body: JSON.stringify({ expiresIn: 1800 }),
    });
    if (!r.ok) return null;
    const { signedURL } = await r.json();
    return `${supabaseUrl}/storage/v1${signedURL}`;
  };

  const out = {};
  if (version.web && version.webFile) {
    const url = await sign(version.webFile);
    if (url) out.web = { version: String(version.web), url };
  }
  if (version.apk) {
    const url = await sign('BarberiaHermanos.apk');
    if (url) out.apk = { build: Number(version.apk), url: `${url}&download=${encodeURIComponent('Barberia Hermanos.apk')}` };
  }
  return res.status(200).json(out);
}
