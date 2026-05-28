import {
  formatFechaReagenda,
  getProductoNombre,
  getPromotorNombre,
  leadCompro,
  leadReagendaEntrevista,
} from '../../domain/leads';
import { etiquetaPagoProducto } from '../../domain/venta';
import type { Barrio, FuenteLead, Lead, Producto, Promotor } from '../../types';

const FUENTE_LABEL: Record<FuenteLead, string> = {
  qr: 'QR',
  app: 'App',
  facebook: 'Facebook',
  instagram: 'Instagram',
};
import { StatusPill } from '../ui/StatusPill';

function whatsappUrl(telefono: string): string {
  const digits = telefono.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function WhatsAppIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  variante?: 'activo' | 'seguimiento' | 'compro' | 'no-compro';
  promotores?: Promotor[];
  productos?: Producto[];
  barrios?: Barrio[];
}

export function LeadCard({
  lead,
  onClick,
  variante = 'activo',
  promotores = [],
  productos = [],
  barrios = [],
}: LeadCardProps) {
  const compro = leadCompro(lead);
  const reagenda = leadReagendaEntrevista(lead);
  const productoNombre = getProductoNombre(lead.seguimiento?.idProducto, productos);
  const detallePago = etiquetaPagoProducto(
    lead.seguimiento?.idProducto,
    lead.seguimiento?.estadoPago,
    barrios,
    lead.seguimiento?.idBarrio,
  );
  const tieneSeguimiento = Boolean(
    lead.seguimiento?.canal || lead.seguimiento?.huboEntrevista != null,
  );
  const esNoCompro   = variante === 'no-compro';
  const esArchivo    = variante === 'compro' || (compro && !esNoCompro);
  const esSeguimiento =
    !esNoCompro && (variante === 'seguimiento' || (variante !== 'compro' && reagenda && !esArchivo));
  const esContactado = !esArchivo && !esSeguimiento && !esNoCompro && tieneSeguimiento;
  const esNuevo      = !esArchivo && !esSeguimiento && !esNoCompro && !tieneSeguimiento;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onClick(lead)}
        style={{ touchAction: 'manipulation' }}
        className={`w-full rounded-xl border p-4 pb-14 text-left transition-[background,border-color,transform] duration-[140ms] ease-out active:scale-[0.995] md:p-5 md:pb-14 ${
          esNoCompro
            ? 'border-red-500 bg-zinc-900 active:bg-zinc-800 active:border-red-400 [&:not(:active)]:hover:border-red-400 [&:not(:active)]:hover:shadow-sm'
            : esArchivo
            ? 'border-zinc-300 bg-zinc-200 active:bg-zinc-300 active:border-zinc-400 [&:not(:active)]:hover:border-zinc-400 [&:not(:active)]:hover:shadow-sm'
            : esSeguimiento
              ? 'border-brand-100 bg-brand-50 active:bg-brand-100 active:border-brand-300 [&:not(:active)]:hover:border-brand-200 [&:not(:active)]:hover:shadow-sm'
              : esContactado
                ? 'border-amber-200 bg-amber-50 active:bg-amber-100 active:border-amber-300 [&:not(:active)]:hover:border-amber-300 [&:not(:active)]:hover:shadow-sm'
                : esNuevo
                  ? 'border-[#99F6E4] bg-[#F0FDFA] active:bg-[#CCFBF1] active:border-[#5EEAD4] [&:not(:active)]:hover:border-[#5EEAD4] [&:not(:active)]:hover:shadow-sm'
                  : 'border-zinc-200 bg-white active:bg-brand-50 active:border-brand-200 [&:not(:active)]:hover:border-zinc-300 [&:not(:active)]:hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-[15px] font-semibold leading-snug ${esNoCompro ? 'text-white' : 'text-zinc-900'}`}>{lead.nombre}</h3>
          <div className="shrink-0">
            {esArchivo && <StatusPill variant="compro" dot>Compró</StatusPill>}
            {esSeguimiento && !esArchivo && (
              <StatusPill variant="reagendado" dot>En seguimiento</StatusPill>
            )}
            {esContactado && (
              <StatusPill variant="contactado" dot>Contactado</StatusPill>
            )}
            {!esArchivo && !esSeguimiento && !tieneSeguimiento && !reagenda && (
              <StatusPill variant="nuevo" dot>Nuevo</StatusPill>
            )}
          </div>
        </div>

        <dl className="mt-3 space-y-1">
          <div className="text-[13px]">
            <dt className={`inline ${esNoCompro ? 'text-zinc-400' : 'text-zinc-400'}`}>Tel: </dt>
            <dd className={`inline ${esNoCompro ? 'text-zinc-300' : 'text-zinc-600'}`}>{lead.telefono}</dd>
          </div>
          <div className="text-[13px]">
            <dt className="inline text-zinc-400">Promotor: </dt>
            <dd className={`inline ${esNoCompro ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {lead.promotorNombre ?? getPromotorNombre(lead.promotorId, promotores)}
              {lead.supervisorNombre && lead.supervisorNombre !== lead.promotorNombre && (
                <span className={esNoCompro ? 'text-zinc-500' : 'text-zinc-400'}> · Sup. {lead.supervisorNombre}</span>
              )}
            </dd>
          </div>
          {lead.domicilio && (
            <div className="text-[13px]">
              <dt className="inline text-zinc-400">Dir: </dt>
              <dd className={`inline ${esNoCompro ? 'text-zinc-300' : 'text-zinc-600'}`}>{lead.domicilio}</dd>
            </div>
          )}
        </dl>

        {esArchivo && productoNombre && (
          <div className="mt-3 text-[13px]">
            <span className="text-zinc-400">Producto: </span>
            <span className="font-medium text-zinc-700">{productoNombre}</span>
            {detallePago && <span className="ml-1 text-zinc-400">· {detallePago}</span>}
            {lead.seguimiento?.numeroRecibo && (
              <span className="ml-1 text-zinc-400">
                · Recibo: {lead.seguimiento.numeroRecibo}
              </span>
            )}
          </div>
        )}

        {(esSeguimiento || reagenda) && !esArchivo && (
          <div className="mt-3 rounded-lg border border-brand-100 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
              Próxima entrevista
            </p>
            {lead.seguimiento?.fechaReagenda ? (
              <p className="mt-0.5 text-[13px] font-semibold text-zinc-800">
                {formatFechaReagenda(lead.seguimiento.fechaReagenda)}
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] text-zinc-400">Sin fecha cargada</p>
            )}
          </div>
        )}
      </button>

      {/* Badge fuente — bottom-left */}
      {lead.seguimiento?.fuente && (
        <span className="absolute bottom-4 left-4 inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
          {FUENTE_LABEL[lead.seguimiento.fuente]}
        </span>
      )}

      {/* Botón WhatsApp — hermano del button, no hijo (HTML válido) */}
      <a
        href={whatsappUrl(lead.telefono)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Enviar WhatsApp a ${lead.nombre}`}
        style={{ touchAction: 'manipulation' }}
        className="absolute bottom-3.5 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-transform duration-[120ms] active:scale-90 md:bottom-4 md:right-5"
      >
        <WhatsAppIcon />
      </a>
    </div>
  );
}
