import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Download, Image as ImageIcon, MessageCircle } from 'lucide-react';
import { Panel } from './ui';

// Configuración → Código QR: compartir la reserva por WhatsApp con el logo como imagen de verdad.
// El recuadro automático de los enlaces lo arma WhatsApp y no siempre sale; aquí la imagen se adjunta.

const LOGO_URL = '/og-image.png';
const LOGO_NAME = 'Reserva-Barberia-Hermanos.png';

export default function ShareBooking({ bookingUrl }: { bookingUrl: string }) {
  const message = `💈 *Barbería Hermanos* 💈\n¡Reserva tu cita ya! Escoge tu servicio, tu barbero y tu hora desde el celular:\n${bookingUrl}`;
  // Se carga antes: el navegador solo deja compartir justo después de tocar el botón
  const [logo, setLogo] = useState<File | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<'logo' | 'mensaje' | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(LOGO_URL)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then((b) => { if (alive) setLogo(new File([b], LOGO_NAME, { type: 'image/png' })); })
      .catch((err) => { console.error('No se pudo cargar el logo', err); if (alive) setStatus({ ok: false, text: 'No se pudo cargar el logo. Recarga la página.' }); });
    return () => { alive = false; };
  }, []);

  const canShare = !!logo && typeof navigator.canShare === 'function' && navigator.canShare({ files: [logo] });
  const canCopyLogo = typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

  const markCopied = (what: 'logo' | 'mensaje') => {
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2500);
  };

  const share = async () => {
    if (!logo) return;
    setStatus(null);
    // Algunos teléfonos pasan solo la imagen: el mensaje queda copiado para pegarlo
    navigator.clipboard?.writeText(message).catch(() => undefined);
    try {
      await navigator.share({ files: [logo], text: message, title: 'Barbería Hermanos' });
      setStatus({ ok: true, text: 'Logo listo. Ahora toca «Paso 2» y escoge el mismo chat.' });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // canceló
      console.error('No se pudo compartir', err);
      setStatus({ ok: false, text: 'No se pudo abrir WhatsApp. Usa «Descargar logo» y «Copiar mensaje».' });
    }
  };

  const copyLogo = async () => {
    if (!logo) return;
    setStatus(null);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': logo })]);
      markCopied('logo');
      setStatus({ ok: true, text: 'Logo copiado: pégalo en el chat de WhatsApp y escribe o pega el mensaje.' });
    } catch (err) {
      console.error('No se pudo copiar el logo', err);
      setStatus({ ok: false, text: 'Este navegador no deja copiar imágenes. Usa «Descargar logo».' });
    }
  };

  const copyMessage = async () => {
    setStatus(null);
    try {
      await navigator.clipboard.writeText(message);
      markCopied('mensaje');
    } catch {
      setStatus({ ok: false, text: 'No se pudo copiar. Mantén presionado el mensaje para copiarlo.' });
    }
  };

  return (
    <Panel title="Compartir reservas por WhatsApp" subtitle="Envía el logo, el mensaje y el enlace para que tus clientes reserven">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1f2c33] max-w-sm mx-auto w-full">
          <img src={LOGO_URL} alt="Logo de Barbería Hermanos" width={1200} height={630} className="w-full h-auto block" />
          <p className="p-3 text-sm text-zinc-100 whitespace-pre-wrap break-words select-all">{message.replace(/\*/g, '')}</p>
        </div>

        <div className="space-y-2.5">
          {canShare && (
            <button type="button" onClick={share} className="w-full min-h-[50px] rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold inline-flex items-center justify-center gap-2">
              <Share2 size={18} /> Paso 1: enviar el logo
            </button>
          )}
          {/* WhatsApp puede descartar el texto que llega con la imagen: el mensaje y el enlace van aparte, ya escritos */}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[50px] rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center justify-center gap-2 text-center px-4"
          >
            <MessageCircle size={18} /> {canShare ? 'Paso 2: enviar mensaje y enlace' : 'Enviar mensaje y enlace por WhatsApp'}
          </a>
          {canShare && <p className="text-xs text-zinc-400 text-center">Escoge el mismo chat en los dos pasos: primero llega el logo y debajo el mensaje con el enlace.</p>}
          <div className="grid grid-cols-2 gap-2">
            {canCopyLogo && (
              <button type="button" onClick={copyLogo} disabled={!logo} className="btn-dark-glass min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                {copied === 'logo' ? <Check size={15} className="text-emerald-400" /> : <ImageIcon size={15} />} {copied === 'logo' ? '¡Copiado!' : 'Copiar logo'}
              </button>
            )}
            <button type="button" onClick={copyMessage} className="btn-dark-glass min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              {copied === 'mensaje' ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />} {copied === 'mensaje' ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
            <a href={LOGO_URL} download={LOGO_NAME} className={`btn-dark-glass min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${canCopyLogo ? 'col-span-2' : ''}`}>
              <Download size={15} /> Descargar logo
            </a>
          </div>
          {status && <p role="status" className={`text-sm ${status.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{status.text}</p>}

          <div className="rounded-2xl bg-gold/5 border border-gold/20 p-3.5 text-xs text-zinc-300 space-y-1.5">
            <p className="font-semibold text-gold text-sm flex items-center gap-2"><MessageCircle size={15} /> Para responder rápido con WhatsApp Business</p>
            <p>Descarga el logo y copia el mensaje. En WhatsApp Business entra a <strong className="text-white">Herramientas para la empresa → Respuestas rápidas → +</strong>, pega el mensaje, adjunta el logo y ponle el atajo <strong className="text-white">/reserva</strong>. Después, en cualquier chat, escribe /reserva y envíalo.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
