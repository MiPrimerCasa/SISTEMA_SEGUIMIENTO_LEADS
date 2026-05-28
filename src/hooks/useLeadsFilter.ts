import { useMemo } from 'react';
import { leadCompro, leadReagendaEntrevista } from '../domain/leads';
import type { Lead } from '../types';

function fifoSort(leads: Lead[]) {
  return [...leads].sort((a, b) => {
    const fa = a.fechaAlta ?? `${a.fechaObtencion}T00:00:00`;
    const fb = b.fechaAlta ?? `${b.fechaObtencion}T00:00:00`;
    return fa.localeCompare(fb);
  });
}

/** Cuatro listas excluyentes con orden FIFO (fecha_alta ASC). */
export function useLeadsFilter(leads: Lead[]) {
  return useMemo(() => {
    const compraron = fifoSort(leads.filter((l) => leadCompro(l)));
    const seguimiento = fifoSort(
      leads.filter((l) => !leadCompro(l) && leadReagendaEntrevista(l)),
    );
    const activos = leads.filter((l) => !leadCompro(l) && !leadReagendaEntrevista(l));

    const fueContactado = (l: Lead) =>
      Boolean(l.seguimiento?.canal || l.seguimiento?.huboEntrevista != null);
    const entrevistaPendiente = fifoSort(activos.filter((l) => !fueContactado(l)));
    const paraContactar      = fifoSort(activos.filter(fueContactado));

    return { entrevistaPendiente, paraContactar, seguimiento, compraron };
  }, [leads]);
}
