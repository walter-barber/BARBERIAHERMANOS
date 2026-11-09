import { useState } from 'react';
import { Copy, Check, Download, MessageCircle } from 'lucide-react';
import { Panel } from './ui';

// Configuración → Código QR: enviar por WhatsApp un solo mensaje con logo, texto y enlace.
// /cita (public/cita/index.html) trae los datos con los que WhatsApp arma el recuadro con el logo,
// y lleva a la persona a la reserva.

const SHARE_URL = 'https://barberia-hermanos.vercel.app/cita';
const LOGO_URL = '/og-reserva.jpg';
const MESSAGE = `💈 *Barbería Hermanos* 💈\n¡Reserva tu cita ya! Escoge tu servicio, tu barbero y tu hora desde el celular:\n${SHARE_URL}`;

export default function ShareBooking() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copy = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(MESSAGE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('No se pudo copiar. Mantén presionado el mensaje para copiarlo.');
    }
  };

  return (
    <Panel title="Compartir reservas por WhatsApp" subtitle="Logo, mensaje y enlace en un solo envío">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1f2c33] max-w-sm mx-auto w-full">
          <img src={LOGO_URL} alt="Logo de la barbería" width={1200} height={630} className="w-full h-auto block" />
          <p className="p-3 text-sm text-zinc-100 whitespace-pre-wrap break-words select-all">{MESSAGE.replace(/\*/g, '')}</p>
        </div>

        <div className="space-y-2.5">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(MESSAGE)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[54px] rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold inline-flex items-center justify-center gap-2 text-center px-4"
          >
            <MessageCircle size={19} /> Enviar todo junto por WhatsApp
          </a>
          <p className="text-xs text-zinc-400 text-center">Escoge el chat y espera a que aparezca el recuadro con el logo antes de enviar.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className="btn-dark-glass min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />} {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
            <a href={LOGO_URL} download="Reserva-Barberia-Hermanos.jpg" className="btn-dark-glass min-h-[44px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              <Download size={15} /> Descargar logo
            </a>
          </div>
          {error && <p role="status" className="text-sm text-rose-300">{error}</p>}

          <div className="rounded-2xl bg-gold/5 border border-gold/20 p-3.5 text-xs text-zinc-300 space-y-1.5">
            <p className="font-semibold text-gold text-sm flex items-center gap-2"><MessageCircle size={15} /> Para responder rápido con WhatsApp Business</p>
            <p>Copia el mensaje. En WhatsApp Business entra a <strong className="text-white">Herramientas para la empresa → Respuestas rápidas → +</strong>, pégalo y ponle el atajo <strong className="text-white">/reserva</strong>. Después, en cualquier chat, escribe /reserva y envíalo.</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
