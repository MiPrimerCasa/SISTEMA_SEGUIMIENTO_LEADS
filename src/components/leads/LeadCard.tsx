import {
  formatFechaReagenda,
  getProductoNombre,
  getPromotorNombre,
  leadCompro,
  leadReagendaEntrevista,
} from '../../domain/leads';
import { etiquetaPagoProducto } from '../../domain/venta';
import type { Barrio, Lead, Producto, Promotor } from '../../types';
import { StatusPill } from '../ui/StatusPill';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  variante?: 'activo' | 'seguimiento' | 'compro';
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
  const esArchivo = variante === 'compro' || compro;
  const esSeguimiento =
    variante === 'seguimiento' || (variante !== 'compro' && reagenda && !esArchivo);

  return (
    <button
      type="button"
      onClick={() => onClick(lead)}
      style={{ touchAction: 'manipulation' }}
      className={`w-full rounded-xl border p-4 text-left transition-[background,border-color,transform] duration-[140ms] ease-out active:scale-[0.995] md:p-5 ${
        esArchivo
          ? 'border-zinc-200 bg-zinc-50 active:bg-zinc-100 active:border-zinc-300 [&:not(:active)]:hover:border-zinc-300 [&:not(:active)]:hover:shadow-sm'
          : esSeguimiento
            ? 'border-brand-100 bg-brand-50 active:bg-brand-100 active:border-brand-300 [&:not(:active)]:hover:border-brand-200 [&:not(:active)]:hover:shadow-sm'
            : 'border-zinc-200 bg-white active:bg-brand-50 active:border-brand-200 [&:not(:active)]:hover:border-zinc-300 [&:not(:active)]:hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug text-zinc-900">{lead.nombre}</h3>
        <div className="shrink-0">
          {esArchivo && <StatusPill variant="compro" dot>Compró</StatusPill>}
          {esSeguimiento && !esArchivo && (
            <StatusPill variant="reagendado" dot>Reagendado</StatusPill>
          )}
          {!esArchivo && !reagenda && tieneSeguimiento && (
            <StatusPill variant="in-progress" dot>Seguimiento</StatusPill>
          )}
        </div>
      </div>

      <dl className="mt-3 space-y-1">
        <div className="text-[13px]">
          <dt className="inline text-zinc-400">Tel: </dt>
          <dd className="inline text-zinc-600">{lead.telefono}</dd>
        </div>
        <div className="text-[13px]">
          <dt className="inline text-zinc-400">Promotor: </dt>
          <dd className="inline text-zinc-600">
            {lead.promotorNombre ?? getPromotorNombre(lead.promotorId, promotores)}
            {lead.supervisorNombre && lead.supervisorNombre !== lead.promotorNombre && (
              <span className="text-zinc-400"> · Sup. {lead.supervisorNombre}</span>
            )}
          </dd>
        </div>
        {lead.domicilio && (
          <div className="text-[13px]">
            <dt className="inline text-zinc-400">Dir: </dt>
            <dd className="inline text-zinc-600">{lead.domicilio}</dd>
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
  );
}
