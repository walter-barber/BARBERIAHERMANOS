// Avisos a la app de los barberos (Android) con Firebase Cloud Messaging (API HTTP v1).
//
// El teléfono de la app se guarda en barber_push_subscriptions igual que uno de la web, pero con
// p256dh = 'fcm-app' y el token de Firebase al final de endpoint (APP_ENDPOINT_PREFIX + token).
//
// Variable de entorno en Vercel: FIREBASE_SERVICE_ACCOUNT_B64 — el archivo de la cuenta de servicio
// de Firebase (firebase-admin.json) en base64. Nunca va en el repositorio.

import crypto from 'node:crypto';

export const APP_ENDPOINT_PREFIX = 'https://fcm.googleapis.com/v1/app-token/';
export const isAppSubscription = (s) => s?.p256dh === 'fcm-app';

let account;
let cachedToken = null;

function serviceAccount() {
  if (account !== undefined) return account;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    account = raw ? JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) : null;
  } catch (err) {
    console.error('FIREBASE_SERVICE_ACCOUNT_B64 no es válido', err);
    account = null;
  }
  return account;
}

const b64url = (s) => Buffer.from(s).toString('base64url');

/** Permiso de Google para enviar avisos (dura una hora; se guarda mientras la función siga viva). */
async function accessToken(sa) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${signature}` }),
  });
  if (!r.ok) throw new Error(`Google no dio permiso: ${r.status} ${await r.text()}`);
  const data = await r.json();
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/**
 * Envía un aviso a un teléfono de la app.
 * Devuelve 'ok', 'gone' (la app se desinstaló o el token venció: hay que borrarlo) o 'error'.
 */
export async function sendAppPush(endpoint, payload) {
  const sa = serviceAccount();
  if (!sa) {
    console.error('Avisos de la app sin configurar (falta FIREBASE_SERVICE_ACCOUNT_B64)');
    return 'error';
  }
  const token = endpoint.slice(APP_ENDPOINT_PREFIX.length);
  try {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken(sa)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: { url: String(payload.url ?? ''), tag: String(payload.tag ?? '') },
          android: {
            priority: 'HIGH',
            ttl: '3600s',
            notification: { channel_id: 'citas', sound: 'default', tag: payload.tag || undefined, default_vibrate_timings: true },
          },
        },
      }),
    });
    if (r.ok) return 'ok';
    const text = await r.text();
    if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT.*registration/i.test(text)) return 'gone';
    console.error('Firebase no envió el aviso', r.status, text);
    return 'error';
  } catch (err) {
    console.error('No se pudo enviar el aviso a la app', err);
    return 'error';
  }
}
