import { useMemo } from 'react';

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/** Paleta contrastada para vista comparativa (todos los promotores) */
export const COLORES_PROMOTORES = [
  '#C41E24',
  '#1E40AF',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#44403C',
];

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function periodKey(fechaISO, agrupacion) {
  const d = new Date(fechaISO + 'T12:00:00');
  const y = d.getFullYear();
  if (agrupacion === 'anio') return String(y);
  if (agrupacion === 'mes') return `${MESES[d.getMonth()]} ${y}`;
  const sem = getISOWeek(d);
  return `Sem ${sem} · ${y}`;
}

function sortPeriodos(periodos, agrupacion) {
  const parse = (label) => {
    if (agrupacion === 'anio') return Number(label);
    const yearMatch = label.match(/\d{4}/);
    const year = yearMatch ? Number(yearMatch[0]) : 0;
    if (agrupacion === 'mes') {
      const mesIdx = MESES.findIndex((m) => label.startsWith(m));
      return year * 100 + (mesIdx >= 0 ? mesIdx : 0);
    }
    const semMatch = label.match(/Sem (\d+)/);
    return year * 100 + (semMatch ? Number(semMatch[1]) : 0);
  };
  return [...periodos].sort((a, b) => parse(a) - parse(b));
}

function buildMatrix(leads, agrupacion) {
  const periodosSet = new Set();
  const matrix = {};

  for (const lead of leads) {
    const periodo = periodKey(lead.fechaObtencion, agrupacion);
    periodosSet.add(periodo);
    if (!matrix[periodo]) matrix[periodo] = {};
    matrix[periodo][lead.promotorId] = (matrix[periodo][lead.promotorId] ?? 0) + 1;
  }

  return { periodos: sortPeriodos(periodosSet, agrupacion), matrix };
}

/**
 * @param {import('../data/mockData').Lead[]} leads
 * @param {import('../data/mockData').Promotor[]} promotores
 * @param {'semana' | 'mes' | 'anio'} agrupacion
 * @param {string | null} promotorId null = todos
 */
export function usePromotoresChartData(leads, promotores, agrupacion, promotorId = null) {
  return useMemo(() => {
    if (promotorId) {
      const filtrados = leads.filter((l) => l.promotorId === promotorId);
      const { periodos, matrix } = buildMatrix(filtrados, agrupacion);
      const promotor = promotores.find((p) => p.id === promotorId);

      const chartData = periodos.map((periodo, index) => {
        const cantidad = matrix[periodo]?.[promotorId] ?? 0;
        const prev = index > 0 ? (matrix[periodos[index - 1]]?.[promotorId] ?? 0) : null;
        let variacion = null;
        if (prev !== null) {
          if (cantidad > prev) variacion = 'up';
          else if (cantidad < prev) variacion = 'down';
          else variacion = 'flat';
        }
        return { periodo, cantidad, variacion };
      });

      return {
        mode: 'trend',
        chartData,
        promotorNombre: promotor?.nombre ?? 'Promotor',
        color: '#C41E24',
      };
    }

    const { periodos, matrix } = buildMatrix(leads, agrupacion);

    const chartData = periodos.map((periodo) => {
      const row = { periodo };
      for (const p of promotores) {
        row[p.nombre] = matrix[periodo]?.[p.id] ?? 0;
      }
      return row;
    });

    const promotorKeys = promotores.map((p) => p.nombre);
    const colores = promotores.map((_, i) => COLORES_PROMOTORES[i % COLORES_PROMOTORES.length]);

    return {
      mode: 'comparativo',
      chartData,
      promotorKeys,
      colores,
    };
  }, [leads, promotores, agrupacion, promotorId]);
}
