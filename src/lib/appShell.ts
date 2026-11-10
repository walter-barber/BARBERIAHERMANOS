import { IS_BARBER_APP } from './appMode';

// App de los barberos: la página ocupa toda la pantalla del teléfono, y index.css deja libre
// el espacio de la barra de estado (hora, batería) y de la barra de abajo.
export function setupAppShell() {
  if (!IS_BARBER_APP) return;
  document.documentElement.classList.add('barber-app');
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}
