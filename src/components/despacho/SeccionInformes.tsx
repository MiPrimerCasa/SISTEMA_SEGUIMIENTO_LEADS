import { useMemo, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type TipoInforme = 'globales' | 'reasignados';
type PeriodoFiltro = 'hoy' | 'semana' | 'mes';

interface PromotorInforme {
  id: string;
  nombre: string;
  supervisor: string;
  leadsTotal: number;
  tratadosHoy: number;
  tratadosSemana: number;
  tratadosMes: number;
  entrevistasSemana: number;
  cierresSemana: number;
  terreno: number;
  pij: number;
}

interface ReasignacionInforme {
  id: string;
  lead: string;
  telefono: string;
  de: string;
  a: string;
  estado: string;
  tiempo: string;
  interes: 'terreno' | 'pij' | '—';
}

// ── Mock data ──────────────────────────────────────────────────────────────

const PROMOTORES_INFORME: PromotorInforme[] = [
  { id: 'jp', nombre: 'Juan Pérez',    supervisor: 'Laura Ramírez', leadsTotal: 25, tratadosHoy: 12, tratadosSemana: 38, tratadosMes: 95,  entrevistasSemana: 7, cierresSemana: 2, terreno: 1, pij: 1 },
  { id: 'cr', nombre: 'Carmen Ruiz',   supervisor: 'Laura Ramírez', leadsTotal: 22, tratadosHoy: 18, tratadosSemana: 45, tratadosMes: 110, entrevistasSemana: 5, cierresSemana: 2, terreno: 2, pij: 0 },
  { id: 'dm', nombre: 'Diego Morales', supervisor: 'Marcos Díaz',   leadsTotal: 20, tratadosHoy: 8,  tratadosSemana: 38, tratadosMes: 90,  entrevistasSemana: 5, cierresSemana: 2, terreno: 1, pij: 1 },
  { id: 'sv', nombre: 'Sofía Vega',    supervisor: 'Marcos Díaz',   leadsTotal: 16, tratadosHoy: 5,  tratadosSemana: 33, tratadosMes: 78,  entrevistasSemana: 3, cierresSemana: 1, terreno: 0, pij: 1 },
];

const REASIGNACIONES_INFORME: ReasignacionInforme[] = [
  { id: 'r1', lead: 'María González',    telefono: '11 2262-4410', de: 'Laura R.',  a: 'Juan P.',    estado: 'En seguimiento', tiempo: 'hace 12 min', interes: 'pij' },
  { id: 'r2', lead: 'Lucía Fernández',   telefono: '11 6677-8899', de: 'Manager',   a: 'Marcos D.',  estado: 'Contactado',     tiempo: 'hace 5 min',  interes: '—' },
  { id: 'r3', lead: 'Pedro López',       telefono: '11 4400-2233', de: 'Diego M.',  a: 'Carmen R.',  estado: 'Sin atender',    tiempo: 'hace 41 min', interes: 'terreno' },
  { id: 'r4', lead: 'Ana Suárez',        telefono: '11 5512-7788', de: 'Marcos D.', a: 'Juan P.',    estado: 'Sin atender',    tiempo: 'hace 9 min',  interes: 'terreno' },
  { id: 'r5', lead: 'Roberto Sanchez',   telefono: '11 3344-5566', de: 'Laura R.',  a: 'Marcos D.',  estado: 'Contactado',     tiempo: 'ayer',        interes: '—' },
  { id: 'r6', lead: 'Valentina Torres',  telefono: '11 7890-1234', de: 'Manager',   a: 'Juan P.',    estado: 'En seguimiento', tiempo: 'hace 2h',     interes: 'pij' },
  { id: 'r7', lead: 'Carolina Martínez', telefono: '11 9988-7766', de: 'Diego M.',  a: 'Carmen R.',  estado: 'Sin atender',    tiempo: 'hace 1h',     interes: 'terreno' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function sumarTotales(rows: PromotorInforme[]) {
  return rows.reduce((acc, p) => ({
    leadsTotal:       acc.leadsTotal       + p.leadsTotal,
    tratadosHoy:      acc.tratadosHoy      + p.tratadosHoy,
    tratadosSemana:   acc.tratadosSemana   + p.tratadosSemana,
    tratadosMes:      acc.tratadosMes      + p.tratadosMes,
    entrevistasSemana:acc.entrevistasSemana+ p.entrevistasSemana,
    cierresSemana:    acc.cierresSemana    + p.cierresSemana,
    terreno:          acc.terreno          + p.terreno,
    pij:              acc.pij              + p.pij,
  }), { leadsTotal: 0, tratadosHoy: 0, tratadosSemana: 0, tratadosMes: 0, entrevistasSemana: 0, cierresSemana: 0, terreno: 0, pij: 0 });
}

function estadoClass(estado: string): string {
  if (estado === 'Sin atender')    return 'bg-zinc-900 text-white';
  if (estado === 'Contactado')     return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (estado === 'En seguimiento') return 'bg-brand-50 text-brand-700 border border-brand-100';
  if (estado === 'Cierre')         return 'bg-ok-subtle text-ok';
  return 'bg-zinc-100 text-zinc-500';
}

// ── Generador HTML para imprimir ───────────────────────────────────────────

function generarHtml(
  tipo: TipoInforme,
  periodo: PeriodoFiltro,
  busqueda: string,
): string {
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const periodoLabel = periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Semana actual' : 'Mes actual';
  const tipoLabel = tipo === 'globales' ? 'Datos Globales' : 'Datos Reasignados';

  const promotores = PROMOTORES_INFORME.filter((p) =>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const tot = sumarTotales(promotores);

  const dsm = (p: PromotorInforme) => `${p.tratadosHoy}&nbsp;/&nbsp;${p.tratadosSemana}&nbsp;/&nbsp;${p.tratadosMes}`;
  const totDSM = `${tot.tratadosHoy} / ${tot.tratadosSemana} / ${tot.tratadosMes}`;

  const filasPromotores = promotores.map((p, i) => `
    <tr>
      <td class="pos">${i + 1}</td>
      <td class="bold">${p.nombre}</td>
      <td class="sup">${p.supervisor}</td>
      <td class="num">${p.leadsTotal}</td>
      <td class="num dsm">${dsm(p)}</td>
      <td class="num brand">${p.entrevistasSemana}</td>
      <td class="num ok">${p.cierresSemana}</td>
      <td class="num amber">${p.terreno}</td>
      <td class="num indigo">${p.pij}</td>
    </tr>`).join('');

  const filasReasig = REASIGNACIONES_INFORME.map((r) => `
    <tr>
      <td><strong>${r.lead}</strong><br/><span class="sub">${r.telefono}</span></td>
      <td>${r.de}</td>
      <td class="brand bold">→ ${r.a}</td>
      <td>${r.interes !== '—' ? `<span class="${r.interes === 'terreno' ? 'chip-amber' : 'chip-indigo'}">${r.interes === 'terreno' ? 'Terreno' : 'Plan Joven'}</span>` : '—'}</td>
      <td>${r.estado}</td>
      <td class="sub">${r.tiempo}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe de Operaciones — ${periodoLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #18181b; padding: 28px; }
    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #9A1620; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: 800; color: #9A1620; }
    .header p  { font-size: 9px; color: #71717a; margin-top: 2px; }
    .header-right { text-align: right; font-size: 9px; color: #71717a; }
    .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #a1a1aa; margin: 16px 0 6px; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 6px 8px; text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: .05em; color: #71717a; border-bottom: 2px solid #e4e4e7; background: #f4f4f5; }
    td { padding: 6px 8px; border-bottom: 1px solid #f4f4f5; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .pos    { color: #a1a1aa; font-size: 10px; width: 32px; }
    .bold   { font-weight: 700; }
    .sup    { color: #71717a; }
    .sub    { color: #a1a1aa; font-size: 9px; }
    .num    { text-align: right; font-variant-numeric: tabular-nums; }
    .dsm    { color: #18181b; font-weight: 600; }
    .brand  { color: #9A1620; font-weight: 700; }
    .ok     { color: #15803D; font-weight: 700; }
    .amber  { color: #92400e; font-weight: 700; }
    .indigo { color: #3730a3; font-weight: 700; }
    .total-row td { background: #fdf2f3; font-weight: 700; border-top: 2px solid #9A1620; }
    .chip-amber  { background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 999px; font-size: 9px; }
    .chip-indigo { background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 999px; font-size: 9px; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e4e4e7; font-size: 8px; color: #a1a1aa; display: flex; justify-content: space-between; }
    @media print { body { padding: 14px; } @page { margin: 1.2cm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Mi Primer Casa S.A.</h1>
      <p>mpcleads · ${tipoLabel} · Informe de Operaciones</p>
    </div>
    <div class="header-right"><strong>${periodoLabel}</strong><br/>Generado: ${hoy}</div>
  </div>

  <div class="section-title">Informe de Operaciones — ${periodoLabel}</div>
  <table>
    <thead>
      <tr>
        <th>Pos</th><th>Promotor</th><th>Equipo (Supervisor)</th><th style="text-align:right">Leads</th>
        <th style="text-align:right">Tratados (D/S/M)</th><th style="text-align:right">Entrevistas</th>
        <th style="text-align:right">Cierres</th><th style="text-align:right">Terrenos</th><th style="text-align:right">PIJ</th>
      </tr>
    </thead>
    <tbody>
      ${filasPromotores}
      <tr class="total-row">
        <td></td><td colspan="2">Total Empresa</td>
        <td class="num">${tot.leadsTotal}</td>
        <td class="num dsm">${totDSM}</td>
        <td class="num brand">${tot.entrevistasSemana}</td>
        <td class="num ok">${tot.cierresSemana}</td>
        <td class="num amber">${tot.terreno}</td>
        <td class="num indigo">${tot.pij}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Reasignaciones del período</div>
  <table>
    <thead>
      <tr><th>Lead</th><th>Origen</th><th>Reasignado a</th><th>Interés</th><th>Estado</th><th>Tiempo</th></tr>
    </thead>
    <tbody>${filasReasig}</tbody>
  </table>

  <div class="footer">
    <span>mpcleads — Manager Leads · Despacho</span>
    <span>${tipoLabel} · ${periodoLabel}</span>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
}

// ── Componente principal ───────────────────────────────────────────────────

export function SeccionInformes({ tipo }: { tipo: TipoInforme }) {
  const [abierto, setAbierto]     = useState(false);
  const [periodo, setPeriodo]     = useState<PeriodoFiltro>('mes');
  const [busqueda, setBusqueda]   = useState('');
  const [fechaPersonalizada, setFechaPersonalizada] = useState('');

  const promotoresFiltrados = useMemo(() =>
    PROMOTORES_INFORME.filter((p) =>
      !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
    ),
  [busqueda]);

  const totales = useMemo(() => sumarTotales(promotoresFiltrados), [promotoresFiltrados]);

  const handleImprimir = () => {
    const html = generarHtml(tipo, periodo, busqueda);
    const win = window.open('', '_blank', 'width=1050,height=750');
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="mt-6">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all ${
          abierto ? 'border-brand-200 bg-brand-50' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${abierto ? 'bg-brand-600' : 'bg-zinc-100'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={abierto ? 'white' : '#71717a'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <p className={`text-[14px] font-bold ${abierto ? 'text-brand-700' : 'text-zinc-900'}`}>Informes</p>
            <p className="text-[11px] text-zinc-500">Informe de operaciones por período · con reasignaciones</p>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`shrink-0 text-zinc-400 transition-transform ${abierto ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          {/* ── Barra de controles ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            {/* Período pills */}
            <div className="flex items-center gap-1.5">
              {(['hoy', 'semana', 'mes'] as PeriodoFiltro[]).map((p) => (
                <button key={p} type="button" onClick={() => setPeriodo(p)}
                  className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-all ${
                    periodo === p ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
              {/* Fecha personalizada */}
              <input
                type="date"
                value={fechaPersonalizada}
                onChange={(e) => setFechaPersonalizada(e.target.value)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 focus:border-brand-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Buscar promotor */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar promotor..."
                  className="rounded-lg border border-zinc-200 py-1.5 pl-8 pr-3 text-[12px] text-zinc-700 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none"
                />
              </div>
              {/* Imprimir */}
              <button type="button" onClick={handleImprimir}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6,9 6,2 18,2 18,9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Imprimir
              </button>
            </div>
          </div>

          {/* ── INFORME DE OPERACIONES ── */}
          <div className="px-5 pb-1 pt-4">
            <p className="text-[11px] font-bold text-zinc-900">INFORME DE OPERACIONES</p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Listado de promotores y operadores con desglose de gestiones y leads tratados.
            </p>
          </div>

          <div className="overflow-x-auto px-5 pb-5 pt-3">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-zinc-200">
                  {[
                    { label: 'POS',                align: 'left'  },
                    { label: 'PROMOTOR',           align: 'left'  },
                    { label: 'EQUIPO (SUPERVISOR)',align: 'left'  },
                    { label: 'LEADS',              align: 'right' },
                    { label: 'TRATADOS (D/S/M)',   align: 'right' },
                    { label: 'ENTREVISTAS',        align: 'right' },
                    { label: 'CIERRES',            align: 'right' },
                    { label: 'TERRENOS',           align: 'right' },
                    { label: 'PIJ',                align: 'right' },
                  ].map((col) => (
                    <th key={col.label}
                      className={`pb-2 pr-4 text-[10px] font-bold uppercase tracking-wide text-zinc-400 last:pr-0 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promotoresFiltrados.map((p, i) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 text-[12px] text-zinc-400">{i + 1}</td>
                    <td className="py-3 pr-4 text-[13px] font-bold text-zinc-900">{p.nombre}</td>
                    <td className="py-3 pr-4 text-[12px] text-zinc-500">{p.supervisor}</td>
                    <td className="py-3 pr-4 text-right text-[12px] font-semibold text-zinc-700">{p.leadsTotal}</td>
                    <td className="py-3 pr-4 text-right text-[12px] font-semibold tabular-nums text-zinc-900">
                      <span className="text-zinc-900">{p.tratadosHoy}</span>
                      <span className="mx-1 text-zinc-300">/</span>
                      <span className="text-zinc-900">{p.tratadosSemana}</span>
                      <span className="mx-1 text-zinc-300">/</span>
                      <span className="text-zinc-900">{p.tratadosMes}</span>
                    </td>
                    <td className="py-3 pr-4 text-right text-[13px] font-bold text-brand-600">{p.entrevistasSemana}</td>
                    <td className="py-3 pr-4 text-right text-[13px] font-bold text-ok">{p.cierresSemana}</td>
                    <td className="py-3 pr-4 text-right text-[13px] font-bold text-amber-600">{p.terreno}</td>
                    <td className="py-3 text-right text-[13px] font-bold text-indigo-600">{p.pij}</td>
                  </tr>
                ))}

                {/* Total */}
                <tr className="border-t-2 border-zinc-200 bg-zinc-50">
                  <td className="py-3 pr-4" />
                  <td className="py-3 pr-4 text-[13px] font-bold text-zinc-900" colSpan={2}>Total Empresa</td>
                  <td className="py-3 pr-4 text-right text-[13px] font-bold text-zinc-900">{totales.leadsTotal}</td>
                  <td className="py-3 pr-4 text-right text-[13px] font-bold tabular-nums text-zinc-900">
                    {totales.tratadosHoy}
                    <span className="mx-1 text-zinc-300">/</span>
                    {totales.tratadosSemana}
                    <span className="mx-1 text-zinc-300">/</span>
                    {totales.tratadosMes}
                  </td>
                  <td className="py-3 pr-4 text-right text-[13px] font-bold text-brand-600">{totales.entrevistasSemana}</td>
                  <td className="py-3 pr-4 text-right text-[13px] font-bold text-ok">{totales.cierresSemana}</td>
                  <td className="py-3 pr-4 text-right text-[13px] font-bold text-amber-600">{totales.terreno}</td>
                  <td className="py-3 text-right text-[13px] font-bold text-indigo-600">{totales.pij}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── REASIGNACIONES ── */}
          <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
            <p className="mb-3 text-[11px] font-bold text-zinc-900">REASIGNACIONES DEL PERÍODO</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-200">
                    {['Lead', 'Teléfono', 'Origen', 'Reasignado a', 'Interés', 'Estado', 'Tiempo'].map((col) => (
                      <th key={col} className="pb-2 pr-4 text-left text-[10px] font-bold uppercase tracking-wide text-zinc-400 last:pr-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REASIGNACIONES_INFORME.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2.5 pr-4 text-[12px] font-semibold text-zinc-900">{r.lead}</td>
                      <td className="py-2.5 pr-4 text-[12px] text-zinc-500">{r.telefono}</td>
                      <td className="py-2.5 pr-4 text-[12px] text-zinc-500">{r.de}</td>
                      <td className="py-2.5 pr-4 text-[12px] font-semibold text-brand-600">→ {r.a}</td>
                      <td className="py-2.5 pr-4">
                        {r.interes === 'terreno' && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Terreno</span>
                        )}
                        {r.interes === 'pij' && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">Plan Joven</span>
                        )}
                        {r.interes === '—' && <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${estadoClass(r.estado)}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-zinc-400">{r.tiempo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
