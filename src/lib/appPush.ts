import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';
import { IS_BARBER_APP } from './appMode';

// Avisos de la app de los barberos («Te agendaron una cita»), con Firebase.
// Se activan solos al entrar al perfil: Android pide «Permitir» una vez y el teléfono queda
// registrado para ese barbero. api/notify-push.js (con api/_fcm.js) envía los avisos.
// El teléfono se guarda en barber_push_subscriptions como uno de la web, con p256dh = 'fcm-app'.

const ENDPOINT_PREFIX = 'https://fcm.googleapis.com/v1/app-token/';
const TOKEN_KEY = 'app-push-token';

export type AppPushState = 'on' | 'denied' | 'unavailable';

export const appPushAvailable = () => IS_BARBER_APP && Capacitor.getPlatform() === 'android';

function savedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* sin almacenamiento */ }
}

async function subscribe(barberId: string, pin: string, token: string) {
  const { data, error } = await supabase.rpc('barber_push_subscribe', {
    p_barber_id: barberId,
    p_pin: pin,
    p_endpoint: ENDPOINT_PREFIX + token,
    p_p256dh: 'fcm-app',
    p_auth: 'fcm-app',
    p_device: 'App Android',
  });
  if (error || data !== 'OK') throw error ?? new Error(String(data));
  saveToken(token);
}

/** Activa los avisos para este barbero en este teléfono. Se puede llamar cada vez que entra. */
export async function enableAppPush(barberId: string, pin: string): Promise<AppPushState> {
  if (!appPushAvailable()) return 'unavailable';

  // Canal «Citas nuevas»: sonido de máquina de motilar (res/raw/maquina.wav) y aparece arriba en la pantalla.
  // Android no deja cambiar el sonido de un canal ya creado: por eso es un canal nuevo y se borra el viejo.
  await PushNotifications.createChannel({
    id: 'citas_maquina',
    name: 'Citas nuevas',
    description: 'Cuando te agendan una cita (suena la máquina)',
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: 'maquina.wav',
  }).catch(() => undefined);
  await PushNotifications.deleteChannel({ id: 'citas' }).catch(() => undefined);

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return 'denied';

  await PushNotifications.removeAllListeners();
  const registered = new Promise<void>((resolve, reject) => {
    PushNotifications.addListener('registration', ({ value }) => {
      subscribe(barberId, pin, value).then(resolve, reject);
    });
    PushNotifications.addListener('registrationError', (err) => reject(new Error(err.error)));
  });
  await PushNotifications.register();
  await registered;
  return 'on';
}

/** Al cerrar sesión: este teléfono deja de recibir los avisos de ese barbero. */
export async function disableAppPush(barberId: string, pin: string): Promise<void> {
  const token = savedToken();
  if (!appPushAvailable() || !token) return;
  saveToken(null);
  await supabase.rpc('barber_push_unsubscribe', { p_barber_id: barberId, p_pin: pin, p_endpoint: ENDPOINT_PREFIX + token });
}
