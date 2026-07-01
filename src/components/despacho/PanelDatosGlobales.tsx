import { useMemo, useState } from 'react';
import { SeccionInformes } from './SeccionInformes';
import type { AdminDashboardData, Lead } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────

interface OperadorMetricas {
  id: string;
  nombre: string;
  initials: string;
  leadsTotal: number;
  leadsSemana: number;
  leadsHoy: number;
  tratadosHoy: number;
  tratadosSemana: number;
  entrevistasSemana: number;
  entrevistasHoy: number;
  cierresSemana: number;
  cierresHoy: number;
  terrenoSemana: number;
  pijSemana: number;
}

interface SupervisorGlobal extends OperadorMetricas {
  promotores: OperadorMetricas[];
}

type TabGlobal = 'equipo' | 'informe' | 'ranking';

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_DATA: SupervisorGlobal[] = [
  {
    id: 'lr', nombre: 'Laura Ramírez', initials: 'LR',
    leadsTotal: 47, leadsSemana: 12, leadsHoy: 7,
    tratadosHoy: 45, tratadosSemana: 83,
    entrevistasSemana: 12, entrevistasHoy: 4,
    cierresSemana: 4, cierresHoy: 1,
    terrenoSemana: 3, pijSemana: 1,
    promotores: [
      {
        id: 'jp', nombre: 'Juan Pérez', initials: 'JP',
        leadsTotal: 25, leadsSemana: 7, leadsHoy: 4,
        tratadosHoy: 12, tratadosSemana: 38,
        entrevistasSemana: 7, entrevistasHoy: 2,
        cierresSemana: 2, cierresHoy: 1,
        terrenoSemana: 1, pijSemana: 1,
      },
      {
        id: 'cr', nombre: 'Carmen Ruiz', initials: 'CR',
        leadsTotal: 22, leadsSemana: 5, leadsHoy: 3,
        tratadosHoy: 18, tratadosSemana: 45,
        entrevistasSemana: 5, entrevistasHoy: 2,
        cierresSemana: 2, cierresHoy: 0,
        terrenoSemana: 2, pijSemana: 0,
      },
    ],
  },
  {
    id: 'md', nombre: 'Marcos Díaz', initials: 'MD',
    leadsTotal: 36, leadsSemana: 10, leadsHoy: 5,
    tratadosHoy: 38, tratadosSemana: 71,
    entrevistasSemana: 8, entrevistasHoy: 3,
    cierresSemana: 3, cierresHoy: 1,
    terrenoSemana: 1, pijSemana: 2,
    promotores: [
      {
        id: 'dm', nombre: 'Diego Morales', initials: 'DM',
        leadsTotal: 20, leadsSemana: 6, leadsHoy: 3,
        tratadosHoy: 8,  tratadosSemana: 38,
        entrevistasSemana: 5, entrevistasHoy: 2,
        cierresSemana: 2, cierresHoy: 1,
        terrenoSemana: 1, pijSemana: 1,
      },
      {
        id: 'sv', nombre: 'Sofía Vega', initials: 'SV',
        leadsTotal: 16, leadsSemana: 4, leadsHoy: 2,
        tratadosHoy: 5,  tratadosSemana: 33,
        entrevistasSemana: 3, entrevistasHoy: 1,
        cierresSemana: 1, cierresHoy: 0,
        terrenoSemana: 0, pijSemana: 1,
      },
    ],
  },
];

// TOTALES y TODOS_FLAT se computan dinámicamente en el componente

// ── Helpers ────────────────────────────────────────────────────────────────

function conv(cierres: number, leads: number) {
  return leads > 0 ? ((cierres / leads) * 100).toFixed(1) : '0.0';
}

// ── Atoms ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color = 'zinc', small = false,
}: {
  label: string; value: string | number; sub?: string;
  color?: 'zinc' | 'brand' | 'ok' | 'amber' | 'red' | 'indigo'; small?: boolean;
}) {
  const colors = {
    zinc:   'text-zinc-900',
    brand:  'text-brand-600',
    ok:     'text-ok',
    amber:  'text-amber-600',
    red:    'text-red-600',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`font-bold ${small ? 'text-[18px]' : 'text-[24px]'} ${colors[color]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">{children}</p>;
}

function Avatar({ initials, isSup }: { initials: string; isSup: boolean }) {
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${isSup ? 'bg-brand-600' : 'bg-blue-500'}`}>
      {initials}
    </div>
  );
}

// ── Columnas del informe ───────────────────────────────────────────────────

const COL_STYLE = 'grid-cols-[1fr_64px_64px_64px_64px_60px_60px_72px_72px]';

function InformeHeader() {
  return (
    <div className={`grid ${COL_STYLE} items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2`}>
      {['Operador', 'L. total', 'L. hoy', 'Trat. hoy', 'Trat. sem', 'Entrev.', 'Cierres', 'Terreno', 'PIJ'].map((col, i) => (
        <p key={col} className={`text-[10px] font-bold uppercase tracking-wide text-zinc-400 ${i === 0 ? 'text-left' : 'text-center'}`}>{col}</p>
      ))}
    </div>
  );
}

function InformeFila({ op, isSup }: { op: OperadorMetricas; isSup: boolean }) {
  return (
    <div className={`grid ${COL_STYLE} items-center gap-2 border-b border-zinc-100 px-4 py-3 last:border-0 ${isSup ? 'bg-white' : 'bg-zinc-50/60'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Avatar initials={op.initials} isSup={isSup} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-zinc-900">{op.nombre}</p>
          <span className={`text-[9px] font-bold uppercase ${isSup ? 'text-blue-600' : 'text-emerald-600'}`}>{isSup ? 'SUPERVISOR' : 'PROMOTOR'}</span>
        </div>
      </div>
      <p className="text-center text-[12px] font-semibold text-zinc-700">{op.leadsTotal}</p>
      <p className="text-center text-[12px] font-semibold text-brand-600">{op.leadsHoy}</p>
      <p className="text-center text-[12px] font-semibold text-zinc-700">{op.tratadosHoy}</p>
      <p className="text-center text-[12px] text-zinc-600">{op.tratadosSemana}</p>
      <p className="text-center text-[12px] font-semibold text-brand-700">{op.entrevistasSemana}</p>
      <p className="text-center text-[12px] font-semibold text-ok">{op.cierresSemana}</p>
      <p className="text-center text-[12px] font-semibold text-amber-600">{op.terrenoSemana}</p>
      <p className="text-center text-[12px] font-semibold text-indigo-600">{op.pijSemana}</p>
    </div>
  );
}

// ── Ranking card ───────────────────────────────────────────────────────────

function RankingCard({
  title, color, items, valueKey,
}: {
  title: string;
  color: string;
  items: { nombre: string; initials: string; rol: 'supervisor' | 'promotor'; value: number }[];
  valueKey: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className={`border-b border-zinc-100 px-4 py-3 ${color}`}>
        <p className="text-[12px] font-bold text-zinc-900">{title}</p>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.slice(0, 5).map((item, i) => (
          <div key={item.nombre} className="flex items-center gap-3 px-4 py-3">
            <span className={`shrink-0 text-[13px] font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-zinc-400' : 'text-zinc-300'}`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
            </span>
            <Avatar initials={item.initials} isSup={item.rol === 'supervisor'} />
            <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-zinc-900">{item.nombre}</p>
            <span className="shrink-0 text-[14px] font-bold text-zinc-800">{item.value}</span>
            <span className="shrink-0 text-[10px] text-zinc-400">{valueKey}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
}

export function PanelDatosGlobales({ onVolver, adminDashboard, leads: leadsArr = [] }: { onVolver: () => void; adminDashboard?: AdminDashboardData | null; leads?: Lead[] }) {
  const [tab, setTab]             = useState<TabGlobal>('equipo');
  const [expandedIds, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setExpanded((prev) => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  // Datos reales desde adminDashboard, fallback a mock
  const datosEquipo: SupervisorGlobal[] = useMemo(() => {
    if (!adminDashboard?.supervisores?.length) return MOCK_DATA;
    return adminDashboard.supervisores.map((sup) => ({
      id: sup.supervisorId, nombre: sup.supervisorNombre, initials: iniciales(sup.supervisorNombre),
      leadsTotal: sup.totales.leadsTotal, leadsSemana: sup.totales.leadsSemana, leadsHoy: 0,
      tratadosHoy: sup.totales.tratadosHoy, tratadosSemana: sup.totales.tratadosSemana,
      entrevistasSemana: sup.totales.entrevistasSemana, entrevistasHoy: sup.totales.entrevistasHoy,
      cierresSemana: sup.totales.cierresSemana, cierresHoy: sup.totales.cierresHoy,
      terrenoSemana: sup.totales.ventasTerrenoSemana, pijSemana: sup.totales.ventasPijSemana,
      promotores: sup.promotores.map((p) => ({
        id: p.promotorId, nombre: p.promotorNombre, initials: iniciales(p.promotorNombre),
        leadsTotal: p.leadsTotal, leadsSemana: p.leadsSemana, leadsHoy: 0,
        tratadosHoy: p.tratadosHoy, tratadosSemana: p.tratadosSemana,
        entrevistasSemana: p.entrevistasSemana, entrevistasHoy: p.entrevistasHoy,
        cierresSemana: p.cierresSemana, cierresHoy: p.cierresHoy,
        terrenoSemana: p.ventasTerrenoSemana, pijSemana: p.ventasPijSemana,
      })),
    }));
  }, [adminDashboard]);

  // Totales reales
  const TOTALES_REAL = useMemo(() => datosEquipo.reduce(
    (acc, s) => ({
      leadsTotal: acc.leadsTotal + s.leadsTotal, leadsSemana: acc.leadsSemana + s.leadsSemana, leadsHoy: acc.leadsHoy + s.leadsHoy,
      tratadosHoy: acc.tratadosHoy + s.tratadosHoy, tratadosSemana: acc.tratadosSemana + s.tratadosSemana,
      entrevistasSemana: acc.entrevistasSemana + s.entrevistasSemana, entrevistasHoy: acc.entrevistasHoy + s.entrevistasHoy,
      cierresSemana: acc.cierresSemana + s.cierresSemana, cierresHoy: acc.cierresHoy + s.cierresHoy,
      terrenoSemana: acc.terrenoSemana + s.terrenoSemana, pijSemana: acc.pijSemana + s.pijSemana,
    }),
    { leadsTotal: 0, leadsSemana: 0, leadsHoy: 0, tratadosHoy: 0, tratadosSemana: 0, entrevistasSemana: 0, entrevistasHoy: 0, cierresSemana: 0, cierresHoy: 0, terrenoSemana: 0, pijSemana: 0 },
  ), [datosEquipo]);

  // Entrantes hoy desde leads reales
  const entrantesHoy = useMemo(() => {
    if (!leadsArr.length) return TOTALES_REAL.leadsHoy;
    const hoy = new Date().toISOString().slice(0, 10);
    return leadsArr.filter((l) => (l.fechaAlta ?? l.fechaObtencion)?.startsWith(hoy)).length;
  }, [leadsArr, TOTALES_REAL.leadsHoy]);

  // Rankings reales
  const TODOS_FLAT_REAL = useMemo(() => [
    ...datosEquipo.map((s) => ({ ...s, rol: 'supervisor' as const, supNombre: '' })),
    ...datosEquipo.flatMap((s) => s.promotores.map((p) => ({ ...p, rol: 'promotor' as const, supNombre: s.nombre }))),
  ], [datosEquipo]);

  const rankCierres     = [...TODOS_FLAT_REAL].sort((a, b) => b.cierresSemana - a.cierresSemana).map((o) => ({ nombre: o.nombre, initials: o.initials, rol: o.rol, value: o.cierresSemana }));
  const rankEntrevistas = [...TODOS_FLAT_REAL].sort((a, b) => b.entrevistasSemana - a.entrevistasSemana).map((o) => ({ nombre: o.nombre, initials: o.initials, rol: o.rol, value: o.entrevistasSemana }));
  const rankLeads       = [...TODOS_FLAT_REAL].sort((a, b) => b.leadsTotal - a.leadsTotal).map((o) => ({ nombre: o.nombre, initials: o.initials, rol: o.rol, value: o.leadsTotal }));

  const TABS: { value: TabGlobal; label: string }[] = [
    { value: 'equipo',   label: 'Por equipo' },
    { value: 'informe',  label: 'Informe completo' },
    { value: 'ranking',  label: 'Rankings' },
  ];

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900">Datos Globales</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            Totales de leads, ventas y cierres de todos los supervisores y promotores
          </p>
        </div>
        <button
          type="button"
          onClick={onVolver}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Volver al despacho
        </button>
      </div>

      {/* ── Stats globales ── */}
      <div className="mt-5">
        <SectionTitle>Acumulado total</SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <StatCard label="Leads en sistema"     value={TOTALES_REAL.leadsTotal}        color="zinc" />
          <StatCard label="Leads hoy"            value={entrantesHoy}                   color="brand" />
          <StatCard label="Entrevistas / sem"    value={TOTALES_REAL.entrevistasSemana} color="brand" sub={`${TOTALES_REAL.entrevistasHoy} hoy`} />
          <StatCard label="Cierres / sem"        value={TOTALES_REAL.cierresSemana}     color="ok"    sub={`${TOTALES_REAL.cierresHoy} hoy`} />
          <StatCard label="Conversión global"    value={`${conv(TOTALES_REAL.cierresSemana, TOTALES_REAL.leadsSemana)}%`} color="amber" sub="cierres / leads semana" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Tratados hoy"        value={TOTALES_REAL.tratadosHoy}       color="zinc"   small />
          <StatCard label="Tratados / sem"      value={TOTALES_REAL.tratadosSemana}    color="zinc"   small />
          <StatCard label="Terreno / sem"       value={TOTALES_REAL.terrenoSemana}     color="amber"  small sub="🔥 lotes y terrenos" />
          <StatCard label="Plan Inv. Joven / sem" value={TOTALES_REAL.pijSemana}       color="indigo" small sub="🏠 plan joven" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-6">
        <div className="inline-flex gap-0.5 rounded-lg bg-zinc-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-md px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                tab === t.value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Por equipo ── */}
      {tab === 'equipo' && (
        <div className="mt-4 flex flex-col gap-4">
          {datosEquipo.map((sup) => {
            const expanded = expandedIds.has(sup.id);
            const supConv  = conv(sup.cierresSemana, sup.leadsTotal);
            return (
              <div key={sup.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                {/* Supervisor header */}
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                    {sup.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold text-zinc-900">{sup.nombre}</span>
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">SUPERVISOR</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-[12px]">
                      <span className="text-zinc-500">Leads: <strong className="text-zinc-900">{sup.leadsTotal}</strong></span>
                      <span className="text-zinc-500">Hoy: <strong className="text-brand-600">{sup.leadsHoy}</strong></span>
                      <span className="text-zinc-500">Entrevistas: <strong className="text-brand-700">{sup.entrevistasSemana}</strong></span>
                      <span className="text-zinc-500">Cierres: <strong className="text-ok">{sup.cierresSemana}</strong></span>
                      <span className="text-zinc-500">🔥 Terreno: <strong className="text-amber-600">{sup.terrenoSemana}</strong></span>
                      <span className="text-zinc-500">🏠 PIJ: <strong className="text-indigo-600">{sup.pijSemana}</strong></span>
                      <span className="text-zinc-500">Conversión: <strong className="text-zinc-900">{supConv}%</strong></span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(sup.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                  >
                    {expanded ? 'Ocultar' : 'Ver promotores'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* Promotores */}
                {expanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3">
                    <div className="flex flex-col gap-2">
                      {sup.promotores.map((prom) => {
                        const promConv = conv(prom.cierresSemana, prom.leadsTotal);
                        return (
                          <div key={prom.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white">
                              {prom.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-semibold text-zinc-900">{prom.nombre}</span>
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">PROMOTOR</span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-4 text-[11px]">
                                <span className="text-zinc-500">Leads: <strong className="text-zinc-900">{prom.leadsTotal}</strong></span>
                                <span className="text-zinc-500">Hoy: <strong className="text-brand-600">{prom.leadsHoy}</strong></span>
                                <span className="text-zinc-500">Trat. hoy: <strong className="text-zinc-700">{prom.tratadosHoy}</strong></span>
                                <span className="text-zinc-500">Trat. sem: <strong className="text-zinc-700">{prom.tratadosSemana}</strong></span>
                                <span className="text-zinc-500">Entrev: <strong className="text-brand-700">{prom.entrevistasSemana}</strong></span>
                                <span className="text-zinc-500">Cierres: <strong className="text-ok">{prom.cierresSemana}</strong></span>
                                <span className="text-zinc-500">🔥 <strong className="text-amber-600">{prom.terrenoSemana}</strong></span>
                                <span className="text-zinc-500">🏠 <strong className="text-indigo-600">{prom.pijSemana}</strong></span>
                                <span className="text-zinc-500">Conv: <strong className="text-zinc-900">{promConv}%</strong></span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Informe completo ── */}
      {tab === 'informe' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <InformeHeader />

          {/* Fila de totales */}
          <div className={`grid ${COL_STYLE} items-center gap-2 border-b border-zinc-200 bg-brand-50 px-4 py-3`}>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500" />
              <span className="text-[12px] font-bold text-brand-800">TOTALES</span>
            </div>
            <p className="text-center text-[12px] font-bold text-zinc-900">{TOTALES_REAL.leadsTotal}</p>
            <p className="text-center text-[12px] font-bold text-brand-600">{TOTALES_REAL.leadsHoy}</p>
            <p className="text-center text-[12px] font-bold text-zinc-900">{TOTALES_REAL.tratadosHoy}</p>
            <p className="text-center text-[12px] text-zinc-700">{TOTALES_REAL.tratadosSemana}</p>
            <p className="text-center text-[12px] font-bold text-brand-700">{TOTALES_REAL.entrevistasSemana}</p>
            <p className="text-center text-[12px] font-bold text-ok">{TOTALES_REAL.cierresSemana}</p>
            <p className="text-center text-[12px] font-bold text-amber-600">{TOTALES_REAL.terrenoSemana}</p>
            <p className="text-center text-[12px] font-bold text-indigo-600">{TOTALES_REAL.pijSemana}</p>
          </div>

          {/* Filas por supervisor y promotor */}
          {datosEquipo.map((sup) => (
            <>
              <InformeFila key={sup.id} op={sup} isSup />
              {sup.promotores.map((prom) => (
                <InformeFila key={prom.id} op={prom} isSup={false} />
              ))}
            </>
          ))}
        </div>
      )}

      {/* ── Tab: Rankings ── */}
      {tab === 'ranking' && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <RankingCard
            title="Top cierres / semana"
            color="bg-ok-subtle"
            items={rankCierres}
            valueKey="cierres"
          />
          <RankingCard
            title="Top entrevistas / semana"
            color="bg-brand-50"
            items={rankEntrevistas}
            valueKey="entrevistas"
          />
          <RankingCard
            title="Top leads totales"
            color="bg-zinc-50"
            items={rankLeads}
            valueKey="leads"
          />
        </div>
      )}

      <SeccionInformes tipo="globales" />
      <div className="pb-8" />
    </div>
  );
}
