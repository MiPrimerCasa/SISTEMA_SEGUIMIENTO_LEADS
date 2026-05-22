import { useMemo } from 'react';
import { leadCompro, leadReagendaEntrevista } from '../data/mockData';

/**
 * Cuatro listas: activos (entrevista / contacto), reagendados (seguimiento), compraron.
 * @param {import('../data/mockData').Lead[]} leads
 */
export function useLeadsFilter(leads) {
  return useMemo(() => {
    const compraron = leads.filter((l) => leadCompro(l));
    const seguimiento = leads.filter((l) => !leadCompro(l) && leadReagendaEntrevista(l));
    const activos = leads.filter((l) => !leadCompro(l) && !leadReagendaEntrevista(l));

    const entrevistaPendiente = activos.filter((l) => l.lista === 'entrevista');
    const paraContactar = activos.filter((l) => l.lista === 'contacto');

    return { entrevistaPendiente, paraContactar, seguimiento, compraron };
  }, [leads]);
}
