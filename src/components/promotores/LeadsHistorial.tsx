import { useMemo, useState } from 'react';
import { leadCompro, leadReagendaEntrevista, getPromotorNombre } from '../../domain/leads';
import type { Lead, Promotor } from '../../types';
import { StatusPill } from '../ui/StatusPill';

interface LeadsHistorialProps {
  leads: Lead[];
  promotores: Promotor[];
}

type LeadStatus = 'nuevo' | 'contactado' | 'seguimiento' | 'compro';

function getLeadStatus(lead: Lead): LeadStatus {
  if (leadCompro(lead)) return 'compro';
  if (leadReagendaEntrevista(lead)) return 'seguimiento';
  if (lead.seguimiento?.canal || lead.seguimiento?.huboEntrevista != null) return 'contactado';
  return 'nuevo';
}

const STATUS_PRIORITY: Record<LeadStatus, number> = {
  seguimiento: 0,
  contactado: 1,
  nuevo: 2,
  compro: 3,
};

const ROW_CLASS: Record<LeadStatus, string> = {
  nuevo:       'bg-[#F0FDFA] border-[#99F6E4]',
  contactado:  'bg-white border-zinc-200',
  seguimiento: 'bg-brand-50 border-brand-100',
  compro:      'bg-zinc-50 border-zinc-200',
};

const PILL: Record<LeadStatus, { variant: 'nuevo' | 'in-progress' | 'reagendado' | 'compro'; label: string }> = {
  nuevo:       { variant: 'nuevo',       label: 'Nuevo' },
  contactado:  { variant: 'in-progress', label: 'Contactado' },
  seguimiento: { variant: 'reagendado',  label: 'En seguimiento' },
  compro:      { variant: 'compro',      label: 'Compró' },
};

export function LeadsHistorial({ leads, promotores }: LeadsHistorialProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...leads].sort((a, b) => {
        const pd = STATUS_PRIORITY[getLeadStatus(a)] - STATUS_PRIORITY[getLeadStatus(b)];
        if (pd !== 0) return pd;
        return (b.fechaObtencion ?? '').localeCompare(a.fechaObtencion ?? '');
      }),
    [leads],
  );

  if (leads.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ touchAction: 'manipulation' }}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors active:bg-zinc-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            Historial de leads
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-500">
            {leads.length}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Lista desplegable */}
      {open && (
        <ul className="space-y-2">
          {sorted.map((lead) => {
            const status = getLeadStatus(lead);
            const { variant, label } = PILL[status];
            const promotorNombre =
              lead.promotorNombre ?? getPromotorNombre(lead.promotorId, promotores);

            return (
              <li
                key={lead.id}
                className={`flex min-h-[60px] items-center gap-3 rounded-xl border px-4 py-3 ${ROW_CLASS[status]}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-zinc-900">{lead.nombre}</p>
                  <p className="mt-0.5 text-[12px] text-zinc-400">
                    {lead.telefono}
                    {promotorNombre && (
                      <>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        {promotorNombre}
                      </>
                    )}
                  </p>
                </div>
                <StatusPill variant={variant} dot>
                  {label}
                </StatusPill>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
