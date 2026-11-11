import { useEffect, useState } from 'react';
import { RefreshCw, Download, BellOff, BellRing } from 'lucide-react';
import { onAppUpdate, applyWebUpdate, type AppUpdateState } from '../../lib/appUpdater';
import type { AppPushState } from '../../lib/appPush';

// Avisos de la app de los barberos arriba del portal: actualización lista, versión nueva para
// instalar encima, o los avisos de citas apagados en el teléfono.

export default function AppNotices({ push }: { push: AppPushState | null }) {
  const [update, setUpdate] = useState<AppUpdateState>({ webReady: false, apkUrl: null });
  const [applying, setApplying] = useState(false);
  useEffect(() => onAppUpdate(setUpdate), []);

  return (
    <div className="space-y-3 empty:hidden mb-4">
      {update.apkUrl ? (
        <div className="rounded-2xl border border-gold/40 bg-gold/[0.08] p-4">
          <p className="text-white font-semibold flex items-center gap-2"><Download size={17} className="text-gold" /> Hay una versión nueva de la app</p>
          <p className="text-zinc-400 text-sm mt-1">Descárgala, ábrela y toca <strong className="text-white">Actualizar</strong>. Se instala encima: no tienes que desinstalar nada.</p>
          <a href={update.apkUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-3 w-full min-h-[46px] rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2">
            <Download size={16} /> Descargar actualización
          </a>
        </div>
      ) : update.webReady ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 flex items-center gap-3">
          <RefreshCw size={20} className="text-emerald-400 shrink-0" />
          <p className="flex-1 text-sm text-zinc-200"><strong className="text-white">Actualización lista.</strong> Se aplica sola la próxima vez que vuelvas a la app.</p>
          <button
            type="button"
            disabled={applying}
            onClick={() => { setApplying(true); applyWebUpdate().catch(() => setApplying(false)); }}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
          >
            {applying ? 'Actualizando…' : 'Actualizar ahora'}
          </button>
        </div>
      ) : null}

      {push === 'denied' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
          <p className="text-white font-semibold flex items-center gap-2"><BellOff size={17} className="text-amber-300" /> Los avisos de citas están apagados</p>
          <p className="text-zinc-400 text-sm mt-1">
            Para que te llegue «Te agendaron una cita»: abre <strong className="text-white">Ajustes del teléfono → Apps → Barbería Hermanos → Notificaciones</strong> y actívalas. Luego cierra y abre la app.
          </p>
        </div>
      )}
    </div>
  );
}

/** Línea para «Mi perfil»: si los avisos de este teléfono están activos. */
export function AppPushStatus({ push }: { push: AppPushState | null }) {
  if (push !== 'on') return null;
  return (
    <p className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5 text-sm text-emerald-300 flex items-center gap-2">
      <BellRing size={16} /> Avisos activados: te llega una notificación cuando te agendan una cita.
    </p>
  );
}
