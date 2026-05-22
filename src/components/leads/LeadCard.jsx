import {
  formatFechaReagenda,
  getProductoNombre,
  getPromotorNombre,
  leadCompro,
  leadReagendaEntrevista,
} from '../../data/mockData';

const ESTADO_PAGO = { sena: 'Seña', cien: '100%' };

export function LeadCard({ lead, onClick, variante = 'activo' }) {
  const compro = leadCompro(lead);
  const reagenda = leadReagendaEntrevista(lead);
  const productoNombre = getProductoNombre(lead.seguimiento?.idProducto);
  const tieneSeguimiento = Boolean(
    lead.seguimiento?.canal || lead.seguimiento?.huboEntrevista != null,
  );
  const esArchivo = variante === 'compro' || compro;
  const esSeguimiento = variante === 'seguimiento' || (variante !== 'compro' && reagenda && !esArchivo);

  return (
    <button
      type="button"
      onClick={() => onClick(lead)}
      className={`w-full rounded-2xl border-2 p-4 text-left shadow-sm transition active:scale-[0.98] touch-manipulation ${
        esArchivo
          ? 'border-black/20 bg-neutral-50 hover:border-black/40'
          : esSeguimiento
            ? 'border-brand/40 bg-brand-light hover:border-brand hover:shadow-md'
            : 'border-neutral-200 bg-white hover:border-brand hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold text-neutral-900">{lead.nombre}</p>
          <p className="mt-0.5 text-sm text-neutral-500">{lead.telefono}</p>
        </div>
        {esArchivo && (
          <span className="shrink-0 rounded-full bg-black px-2.5 py-1 text-xs font-bold uppercase text-white">
            Compró
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Promotor: {getPromotorNombre(lead.promotorId)}
      </p>
      {esArchivo && productoNombre && (
        <p className="mt-2 text-sm font-bold text-brand">
          Compró: {productoNombre}
          {lead.seguimiento?.estadoPago && (
            <span className="font-semibold text-neutral-600">
              {' '}
              · {ESTADO_PAGO[lead.seguimiento.estadoPago]}
            </span>
          )}
        </p>
      )}
      {(esSeguimiento || reagenda) && !esArchivo && (
        <p className="mt-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs font-bold text-brand ring-1 ring-brand/20">
          Próxima entrevista
          {lead.seguimiento?.fechaReagenda ? (
            <span className="mt-0.5 block text-sm font-bold normal-case text-neutral-900">
              {formatFechaReagenda(lead.seguimiento.fechaReagenda)}
            </span>
          ) : (
            <span className="mt-0.5 block font-normal normal-case text-neutral-500">
              Sin fecha cargada
            </span>
          )}
        </p>
      )}
      {!esArchivo && !reagenda && tieneSeguimiento && (
        <p className="mt-2 text-xs font-bold uppercase text-brand">Seguimiento iniciado</p>
      )}
    </button>
  );
}
