// App móvil de los barberos (Android e iOS, con Capacitor). Se compila con `npm run build:app`,
// que lee .env.app. La web normal no trae nada de esto: ahí IS_BARBER_APP es false.
//
// En la app el barbero entra a su perfil con un toque: en vez del PIN se manda la llave de la app,
// que la base de datos acepta (supabase/migrations/20261118000000_app_barberos.sql).

export const IS_BARBER_APP = import.meta.env.VITE_BARBER_APP === '1';

/** Llave que reemplaza al PIN en la app. Vacía en la web. */
export const APP_KEY: string = IS_BARBER_APP ? String(import.meta.env.VITE_BARBER_APP_KEY ?? '') : '';

// En la app las páginas salen del teléfono, así que las funciones de /api/ se piden a la web publicada
const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');
export const apiUrl = (path: string) => `${API_BASE}${path}`;

// El barbero que entró queda guardado en el teléfono: al abrir la app va directo a su perfil
const SAVED_KEY = 'app-barbero';
export function savedBarberId(): string | null {
  try { return localStorage.getItem(SAVED_KEY); } catch { return null; }
}
export function saveBarberId(id: string | null) {
  try {
    if (id) localStorage.setItem(SAVED_KEY, id);
    else localStorage.removeItem(SAVED_KEY);
  } catch { /* sin almacenamiento: tocará escoger el perfil otra vez */ }
}
