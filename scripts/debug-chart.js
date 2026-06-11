import '../server/load-env.js';
import { fetchAdminDashboard } from '../server/db/admin-dashboard.js';
import { closeSqlPool } from '../server/db/mssql.js';
// Mapeos y funciones de depuración
// Let's implement the hooks logic in the script directly.

const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const ADMIN_CHART_SERIES = [
  { key: 'Leads', tipo: 'lead', color: '#71717A' },
  { key: 'Entrevistas', tipo: 'entrevista', color: '#9A1620' },
  { key: 'Cierres', tipo: 'cierre', color: '#059669' },
  { key: 'Terrenos', tipo: 'terreno', color: '#D97706' },
  { key: 'PIJ', tipo: 'pij', color: '#6366F1' },
];

function periodKey(fechaISO, agrupacion) {
  const d = new Date(fechaISO);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  if (agrupacion === 'anio') return String(y);
  if (agrupacion === 'mes') return `${MESES[d.getMonth()]} ${y}`;
  return '';
}

async function main() {
  try {
    const dashboard = await fetchAdminDashboard();
    const eventos = dashboard.eventos || [];
    console.log(`Total events: ${eventos.length}`);
    
    const countByTipo = {};
    for (const e of eventos) {
      countByTipo[e.tipo] = (countByTipo[e.tipo] || 0) + 1;
    }
    console.log('Events by type:', countByTipo);

    // Group by mes
    const periodosSet = new Set();
    const matrix = {};

    for (const ev of eventos) {
      const periodo = periodKey(ev.fecha, 'mes');
      if (!periodo) continue;
      periodosSet.add(periodo);
      if (!matrix[periodo]) matrix[periodo] = {};
      const serie = ADMIN_CHART_SERIES.find((s) => s.tipo === ev.tipo);
      if (!serie) continue;
      matrix[periodo][serie.key] = (matrix[periodo][serie.key] ?? 0) + 1;
    }

    console.log('\nChart data by month:');
    for (const p of [...periodosSet].sort()) {
      console.log(`${p}:`, matrix[p]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await closeSqlPool();
  }
}

main();
