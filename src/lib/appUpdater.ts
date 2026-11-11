import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { IS_BARBER_APP, APP_KEY, apiUrl } from './appMode';

// Actualizaciones de la app de los barberos sin desinstalar:
// - Pantallas y funciones (casi todos los cambios): se descargan solas en segundo plano y se aplican
//   con «Actualizar ahora» o la próxima vez que el barbero vuelve a la app.
// - Cambios internos (íconos, permisos, complementos): hace falta un APK nuevo; la app avisa y lo
//   descarga, y Android lo instala encima del anterior (misma firma).
// Las versiones se publican con `npm run app:publicar` en el almacenamiento privado «app» y
// api/app-update.js las entrega solo a la app (con su llave).

export const WEB_VERSION: string = __APP_WEB_VERSION__;

export interface AppUpdateState {
  /** Hay pantallas nuevas descargadas, listas para aplicar */
  webReady: boolean;
  /** Enlace del APK nuevo cuando la versión instalada es más vieja */
  apkUrl: string | null;
}

const listeners = new Set<(s: AppUpdateState) => void>();
let state: AppUpdateState = { webReady: false, apkUrl: null };
let pendingBundleId: string | null = null;
const setState = (next: Partial<AppUpdateState>) => {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
};

export function onAppUpdate(fn: (s: AppUpdateState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => { listeners.delete(fn); };
}

/** Aplica las pantallas nuevas (la app se recarga). */
export async function applyWebUpdate() {
  if (pendingBundleId) await CapacitorUpdater.set({ id: pendingBundleId });
}

let started = false;

/** Se llama al abrir la app: confirma que esta versión arrancó bien y busca actualizaciones. */
export function startAppUpdater(getBarberId: () => string | null) {
  if (!IS_BARBER_APP || !Capacitor.isNativePlatform() || started) return;
  started = true;
  // Si una versión nueva no llega a este punto, el complemento vuelve sola a la anterior
  CapacitorUpdater.notifyAppReady().catch(() => undefined);

  const check = async () => {
    const barberId = getBarberId();
    if (!barberId || pendingBundleId) return;
    try {
      const res = await fetch(apiUrl('/api/app-update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberId, key: APP_KEY }),
      });
      if (!res.ok) return;
      const info = await res.json() as { web?: { version: string; url: string }; apk?: { build: number; url: string } };

      // ¿APK nuevo? (cambios internos)
      const installed = Number((await App.getInfo()).build) || 0;
      if (info.apk && info.apk.build > installed) {
        setState({ apkUrl: info.apk.url });
        return; // las pantallas nuevas vienen dentro del APK nuevo
      }

      // ¿Pantallas nuevas? Solo si son de esta misma versión del APK o más nuevas
      if (info.web && info.web.version > WEB_VERSION) {
        const bundle = await CapacitorUpdater.download({ url: info.web.url, version: info.web.version });
        pendingBundleId = bundle.id;
        setState({ webReady: true });
      }
    } catch (err) {
      console.error('No se pudo buscar actualizaciones', err);
    }
  };

  check();
  // Al volver a la app: si ya está descargada se aplica; si no, se vuelve a buscar
  App.addListener('resume', () => {
    if (pendingBundleId) applyWebUpdate();
    else check();
  });
}
