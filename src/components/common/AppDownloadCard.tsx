import { useState } from 'react';
import { Smartphone, Download, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiUrl, IS_BARBER_APP } from '../../lib/appMode';

// «App de los barberos»: descargar la app de Android desde el panel o desde el portal del barbero.
// El enlace lo da api/app-download.js solo a un administrador con sesión o a un barbero con su PIN,
// y vence en 10 minutos (la app entra a los perfiles sin PIN: no debe quedar a la vista de todos).

interface Props {
  /** Portal del barbero: se pide con su PIN. Sin esto, con la sesión del administrador. */
  barber?: { id: string; pin: string };
}

const isIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function AppDownloadCard({ barber }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  if (IS_BARBER_APP) return null; // ya está dentro de la app

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!barber) {
        const { data } = await supabase.auth.getSession();
        if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const res = await fetch(apiUrl('/api/app-download'), {
        method: 'POST',
        headers,
        body: JSON.stringify(barber ? { barberId: barber.id, pin: barber.pin } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.url) {
        window.location.href = body.url;
        setShowSteps(true);
      } else if (body.error === 'SIN_APP') {
        setError('La app todavía no está subida. Avísale al administrador.');
      } else if (res.status === 401) {
        setError('Tu sesión se cerró. Sal y vuelve a entrar.');
      } else {
        setError('No se pudo descargar. Intenta de nuevo.');
      }
    } catch {
      setError('Sin conexión. Revisa el internet e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.08] to-transparent p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <img src="/icon-192.png" alt="" width={192} height={192} className="w-14 h-14 rounded-2xl border border-gold/30 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold flex items-center gap-2"><Smartphone size={16} className="text-gold" /> App Barbería Hermanos</p>
          <p className="text-zinc-400 text-sm mt-0.5">
            {barber
              ? 'Tu agenda, tus ganancias y tus citas en el celular. Entras con un toque, sin PIN.'
              : 'La app de los barberos: cada uno entra a su perfil con un toque, sin PIN. Solo para los barberos.'}
          </p>
        </div>
      </div>

      {isIphone() ? (
        <p className="mt-4 text-sm text-zinc-300 rounded-xl bg-white/[0.04] border border-white/10 p-3">
          Por ahora la app es para <strong className="text-white">Android</strong>. La versión para iPhone llega más adelante.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="btn-gold mt-4 w-full sm:w-auto min-h-[48px] px-6 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} Descargar para Android
          </button>
          {error && <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-rose-300"><AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}</p>}
          <button type="button" onClick={() => setShowSteps((v) => !v)} aria-expanded={showSteps} className="mt-3 flex items-center gap-1 text-xs text-gold font-semibold">
            Cómo instalarla <ChevronDown size={14} className={showSteps ? 'rotate-180' : ''} />
          </button>
          {showSteps && (
            <ol className="mt-2 space-y-1.5 text-sm text-zinc-300 list-decimal pl-5">
              <li>Hazlo desde el <strong className="text-white">celular Android</strong> del barbero y toca «Descargar para Android».</li>
              <li>Cuando termine, abre el archivo <strong className="text-white">Barberia Hermanos.apk</strong>.</li>
              <li>Si el celular pregunta, toca <strong className="text-white">Configuración → Permitir de esta fuente</strong> y vuelve atrás.</li>
              <li>Toca <strong className="text-white">Instalar</strong>. Si aparece Play Protect, toca «Instalar de todas formas».</li>
              <li>Abre <strong className="text-white">Barbería Hermanos</strong> y toca tu perfil.</li>
            </ol>
          )}
        </>
      )}
    </section>
  );
}
