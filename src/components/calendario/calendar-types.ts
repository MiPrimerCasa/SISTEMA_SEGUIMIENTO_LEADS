import type { Lead, Promotor } from '../../types';
import { getPromotorNombre } from '../../domain/leads';

export interface CalendarEvent {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  promotor: string;
  type: 'seguimiento';
  date: string;
  lead: Lead;
}

export function buildCalendarEvents(leads: Lead[], promotores: Promotor[]): CalendarEvent[] {
  return leads
    .filter(
      (l) =>
        l.seguimiento.resultadoEntrevista === 'reagenda' &&
        Boolean(l.seguimiento.fechaReagenda),
    )
    .map((l) => ({
      id: l.id,
      leadId: l.id,
      leadName: l.nombre,
      leadPhone: l.telefono,
      promotor: l.promotorNombre ?? getPromotorNombre(l.promotorId, promotores),
      type: 'seguimiento' as const,
      date: l.seguimiento.fechaReagenda!,
      lead: l,
    }));
}
