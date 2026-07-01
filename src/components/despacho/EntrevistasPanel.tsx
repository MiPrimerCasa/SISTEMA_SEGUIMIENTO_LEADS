import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { fetchAdminLeads } from '../../api/client';
import type { Lead, ResultadoEntrevista } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFechaHora(fechaStr?: string | null): string {
  if (!fechaStr) return '—';
  try {
    const d = new Date(fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return fechaStr;
    const fecha = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const hora  = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${fecha} ${hora}`;
  } catch {
    return fechaStr ?? '—';
  }
}

function cleanTel(tel?: string): string {
  return tel ? tel.replace(/@\w+$/, '').trim() : '—';
}

function tiempoDesde(fechaStr?: string | null): string {
  if (!fechaStr) return '—';
  const diff = Date.now() - new Date(fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T')).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

// ── Predicados ────────────────────────────────────────────────────────────

function tieneEntrevista(l: Lead): boolean {
  return Boolean(
    l.quiereEntrevista ||
    l.horarioEntrevista ||
    l.seguimiento.confirmoEntrevista ||
    l.seguimiento.huboEntrevista,
  );
}

// ── Tipos de filtro ────────────────────────────────────────────────────────

type FiltroEstado    = 'todas' | 'agendadas' | 'confirmadas' | 'realizadas';
type FiltroResultado = 'todos' | ResultadoEntrevista | 'sin_resultado';

const ESTADO_OPTS: { value: FiltroEstado; label: string }[] = [
  { value: 'todas',       label: 'Todas' },
  { value: 'agendadas',   label: 'Agendadas (pendientes)' },
  { value: 'confirmadas', label: 'Confirmadas' },
  { value: 'realizadas',  label: 'Realizadas' },
];

const RESULTADO_OPTS: { value: FiltroResultado; label: string }[] = [
  { value: 'todos',            label: 'Todos los resultados' },
  { value: 'compro',           label: 'Compró' },
  { value: 'no_compro',        label: 'No compró' },
  { value: 'reagenda',         label: 'Reagenda' },
  { value: 'sin_interes',      label: 'Sin interés' },
  { value: 'derivar_terreno',  label: 'Interés terreno' },
  { value: 'sin_resultado',    label: 'Sin resultado' },
];

// ── Badges ────────────────────────────────────────────────────────────────

function ResultadoBadge({ resultado }: { resultado?: ResultadoEntrevista | null }) {
  if (!resultado) {
    return (
      <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
        Pendiente
      </span>
    );
  }
  const MAP: Record<ResultadoEntrevista, { label: string; cls: string }> = {
    compro:          { label: 'Compró',          cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
    no_compro:       { label: 'No compró',       cls: 'bg-red-50 border-red-100 text-red-700' },
    reagenda:        { label: 'Reagenda',        cls: 'bg-blue-50 border-blue-100 text-blue-700' },
    sin_interes:     { label: 'Sin interés',     cls: 'bg-zinc-100 border-zinc-200 text-zinc-500' },
    derivar_terreno: { label: 'Interés terreno', cls: 'bg-amber-50 border-amber-100 text-amber-700' },
  };
  const conf = MAP[resultado];
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${conf.cls}`}>
      {conf.label}
    </span>
  );
}

function BoolBadge({ valor, labelSi, labelNo }: { valor?: boolean | null; labelSi: string; labelNo: string }) {
  if (valor === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
        {labelSi}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
      {labelNo}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'default',
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: 'default' | 'green' | 'blue' | 'amber' | 'red';
}) {
  const valueColor = {
    default: 'text-zinc-900',
    green:   'text-emerald-700',
    blue:    'text-brand-700',
    amber:   'text-amber-700',
    red:     'text-red-700',
  }[color];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-[22px] font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  );
}

// ── Exportar No Compró ────────────────────────────────────────────────────

function exportarNoCompro(leads: Lead[]) {
  const noCompro = leads.filter(
    (l) => l.seguimiento.resultadoEntrevista === 'no_compro',
  );

  const rows = noCompro.map((l) => ({
    Nombre:              l.nombre ?? '',
    Teléfono:            cleanTel(l.telefono),
    Promotor:            l.promotorNombre ?? '',
    Supervisor:          l.supervisorNombre ?? '',
    'Fecha entrevista':  formatFechaHora(l.horarioEntrevista ?? l.seguimiento.horarioEntrevistaPropuesto),
    Lugar:               l.lugarEntrevista === 'sucursal'
                           ? 'Sucursal'
                           : l.lugarEntrevista === 'domicilio'
                             ? 'Domicilio'
                             : '',
    'Confirmó asistencia': l.seguimiento.confirmoEntrevista === true ? 'Sí' : 'No',
    'Entrevista realizada': l.seguimiento.huboEntrevista === true ? 'Sí' : 'No',
    Resultado:           'No compró',
    Observaciones:       l.seguimiento.observaciones ?? '',
    'Domicilio cliente': l.domicilio ?? '',
    Origen:              l.origen ?? '',
    'Fecha alta':        formatFechaHora(l.fechaAlta ?? l.fechaObtencion),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar ancho de columnas automáticamente
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key as keyof typeof r] ?? '').length),
    ) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'No Compró');

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `no-compro-${fecha}.xlsx`);
}

// ── Componente principal ──────────────────────────────────────────────────

export function EntrevistasPanel() {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [busqueda, setBusqueda]             = useState('');
  const [filtroEstado, setFiltroEstado]     = useState<FiltroEstado>('todas');
  const [filtroResultado, setFiltroResultado] = useState<FiltroResultado>('todos');

  // ── Carga ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setCargando(true);
    fetchAdminLeads()
      .then((data) => { setLeads(data); setCargando(false); })
      .catch((err) => {
        setErrorCarga(err instanceof Error ? err.message : 'Error al cargar leads.');
        setCargando(false);
      });
  }, []);

  // ── Solo leads con entrevista ──────────────────────────────────────────
  const conEntrevista = useMemo(() => leads.filter(tieneEntrevista), [leads]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const confirmadas  = conEntrevista.filter((l) => l.seguimiento.confirmoEntrevista === true);
    const realizadas   = conEntrevista.filter((l) => l.seguimiento.huboEntrevista === true);
    const compro       = realizadas.filter((l) => l.seguimiento.resultadoEntrevista === 'compro');
    const noCompro     = realizadas.filter((l) => l.seguimiento.resultadoEntrevista === 'no_compro');
    const reagenda     = realizadas.filter((l) => l.seguimiento.resultadoEntrevista === 'reagenda');
    const terreno      = realizadas.filter((l) => l.seguimiento.resultadoEntrevista === 'derivar_terreno');
    const tasaCierre   = realizadas.length > 0 ? Math.round((compro.length / realizadas.length) * 100) : null;
    return {
      total:       conEntrevista.length,
      confirmadas: confirmadas.length,
      realizadas:  realizadas.length,
      compro:      compro.length,
      noCompro:    noCompro.length,
      reagenda:    reagenda.length,
      terreno:     terreno.length,
      tasaCierre,
    };
  }, [conEntrevista]);

  // ── Filtrado ──────────────────────────────────────────────────────────
  const leadsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return conEntrevista.filter((l) => {
      // texto
      const matchText =
        !q ||
        l.nombre?.toLowerCase().includes(q) ||
        l.telefono?.includes(q) ||
        l.promotorNombre?.toLowerCase().includes(q) ||
        l.supervisorNombre?.toLowerCase().includes(q);

      // estado
      let matchEstado = true;
      if (filtroEstado === 'agendadas')   matchEstado = Boolean(l.quiereEntrevista || l.horarioEntrevista) && !l.seguimiento.huboEntrevista;
      if (filtroEstado === 'confirmadas') matchEstado = l.seguimiento.confirmoEntrevista === true && !l.seguimiento.huboEntrevista;
      if (filtroEstado === 'realizadas')  matchEstado = l.seguimiento.huboEntrevista === true;

      // resultado
      let matchResultado = true;
      if (filtroResultado === 'sin_resultado') {
        matchResultado = !l.seguimiento.resultadoEntrevista;
      } else if (filtroResultado !== 'todos') {
        matchResultado = l.seguimiento.resultadoEntrevista === filtroResultado;
      }

      return matchText && matchEstado && matchResultado;
    });
  }, [conEntrevista, busqueda, filtroEstado, filtroResultado]);

  // ── Ordenar por fecha de entrevista (más próxima primero para pendientes, más reciente primero para realizadas) ──
  const leadsSorted = useMemo(() => {
    return [...leadsFiltrados].sort((a, b) => {
      const fa = a.horarioEntrevista ?? a.seguimiento.horarioEntrevistaPropuesto ?? a.fechaObtencion;
      const fb = b.horarioEntrevista ?? b.seguimiento.horarioEntrevistaPropuesto ?? b.fechaObtencion;
      return new Date(fb ?? 0).getTime() - new Date(fa ?? 0).getTime();
    });
  }, [leadsFiltrados]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">

      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
          Manager Leads · Seguimiento
        </p>
        <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-zinc-900">
          Entrevistas
        </h2>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Todos los leads con entrevista agendada, confirmada o realizada
        </p>
      </div>

      {/* Stats */}
      {!cargando && !errorCarga && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Total"        value={stats.total}       />
          <StatCard label="Confirmadas"  value={stats.confirmadas}  color="blue" />
          <StatCard label="Realizadas"   value={stats.realizadas}   color="blue" />
          <StatCard label="Compró"       value={stats.compro}       color="green" />
          <StatCard label="No compró"    value={stats.noCompro}     color="red" />
          <StatCard label="Reagenda"     value={stats.reagenda}     color="amber" />
          <StatCard label="Terreno"      value={stats.terreno}      color="amber" />
          <StatCard
            label="Tasa cierre"
            value={stats.tasaCierre !== null ? `${stats.tasaCierre}%` : '—'}
            sub={stats.realizadas > 0 ? `de ${stats.realizadas} realizadas` : undefined}
            color={stats.tasaCierre !== null && stats.tasaCierre >= 50 ? 'green' : 'default'}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative min-w-[220px] flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono, promotor…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
          />
        </div>

        {/* Filtro estado */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
        >
          {ESTADO_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Filtro resultado */}
        <select
          value={filtroResultado}
          onChange={(e) => setFiltroResultado(e.target.value as FiltroResultado)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
        >
          {RESULTADO_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Conteo + botón descarga */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[12px] text-zinc-500">
            {cargando ? 'Cargando…' : `${leadsSorted.length} entrevista${leadsSorted.length === 1 ? '' : 's'}`}
          </span>

          {!cargando && !errorCarga && (
            <button
              type="button"
              onClick={() => exportarNoCompro(conEntrevista)}
              disabled={conEntrevista.filter((l) => l.seguimiento.resultadoEntrevista === 'no_compro').length === 0}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              title={`Descargar los ${conEntrevista.filter((l) => l.seguimiento.resultadoEntrevista === 'no_compro').length} "No compró" como Excel`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              No compró
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {conEntrevista.filter((l) => l.seguimiento.resultadoEntrevista === 'no_compro').length}
              </span>
              <span className="text-[10px] font-medium text-emerald-600">.xlsx</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-brand-600" />
            <p className="text-[13px] text-zinc-500 font-medium animate-pulse">
              Cargando entrevistas…
            </p>
          </div>
        ) : errorCarga ? (
          <p className="px-6 py-10 text-center text-[13px] font-medium text-red-600">{errorCarga}</p>
        ) : leadsSorted.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-zinc-400">
            Sin entrevistas para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 text-[13px]">
              <thead>
                <tr className="bg-zinc-50/60 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  <th className="py-3 pl-5 pr-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Promotor</th>
                  <th className="px-3 py-3 text-left">Supervisor</th>
                  <th className="px-3 py-3 text-center">Fecha entrevista</th>
                  <th className="px-3 py-3 text-center">Lugar</th>
                  <th className="px-3 py-3 text-center">Confirmó</th>
                  <th className="px-3 py-3 text-center">Realizada</th>
                  <th className="py-3 pl-3 pr-5 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {leadsSorted.map((lead) => {
                  const fechaEntrevista =
                    lead.horarioEntrevista ??
                    lead.seguimiento.horarioEntrevistaPropuesto ??
                    null;
                  const realizada = lead.seguimiento.huboEntrevista === true;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors hover:bg-zinc-50/60 ${realizada ? '' : 'bg-white'}`}
                    >
                      {/* Cliente */}
                      <td className="py-3 pl-5 pr-3">
                        <p className="font-semibold text-zinc-900">{lead.nombre}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                          {cleanTel(lead.telefono)}
                        </p>
                      </td>

                      {/* Promotor */}
                      <td className="px-3 py-3 text-zinc-700">
                        {lead.promotorNombre || <span className="text-zinc-300">—</span>}
                      </td>

                      {/* Supervisor */}
                      <td className="px-3 py-3 text-zinc-500">
                        {lead.supervisorNombre || <span className="text-zinc-300">—</span>}
                      </td>

                      {/* Fecha */}
                      <td className="px-3 py-3 text-center">
                        {fechaEntrevista ? (
                          <div>
                            <p className="tabular-nums text-zinc-800 font-medium">
                              {formatFechaHora(fechaEntrevista)}
                            </p>
                            <p className="text-[11px] text-zinc-400">
                              {tiempoDesde(fechaEntrevista)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Lugar */}
                      <td className="px-3 py-3 text-center">
                        {lead.lugarEntrevista === 'sucursal' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Sucursal
                          </span>
                        ) : lead.lugarEntrevista === 'domicilio' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            Domicilio
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Confirmó */}
                      <td className="px-3 py-3 text-center">
                        <BoolBadge
                          valor={lead.seguimiento.confirmoEntrevista}
                          labelSi="Confirmó"
                          labelNo="Sin conf."
                        />
                      </td>

                      {/* Realizada */}
                      <td className="px-3 py-3 text-center">
                        <BoolBadge
                          valor={lead.seguimiento.huboEntrevista}
                          labelSi="Realizada"
                          labelNo="Pendiente"
                        />
                      </td>

                      {/* Resultado */}
                      <td className="py-3 pl-3 pr-5 text-center">
                        <ResultadoBadge resultado={lead.seguimiento.resultadoEntrevista} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
