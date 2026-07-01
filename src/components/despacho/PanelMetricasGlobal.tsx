import { useMemo, useState } from 'react';
import { StatusPill } from '../ui/StatusPill';
import { SeccionInformes } from './SeccionInformes';
import type { AdminDashboardData } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────

interface MetricasPersona {
  id: string;
  nombre: string;
  initials: string;
  leadsTratados: number;
  entrevistasSemana: number;
  cierresSemana: number;
  velocidadRespuestaHoras: number;
  sinAtender: number;
  score: number;
}

interface MetricasSup extends MetricasPersona {
  promotores: MetricasPersona[];
}

interface AlertaSinAtender {
  id: string;
  nombre: string;
  telefono: string;
  asignadoA: string;
  horasSinAtender: number;
  estadoVariant: 'nuevo' | 'contactado' | 'terreno';
  estadoLabel: string;
  canal: string;
}

interface OperadorDestino {
  id: string;
  nombre: string;
  initials: string;
  rol: 'supervisor' | 'promotor';
  leads: number;
  maxLeads: number;
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_METRICAS: MetricasSup[] = [
  {
    id: 'lr', nombre: 'Laura Ramírez', initials: 'LR',
    leadsTratados: 45, entrevistasSemana: 12, cierresSemana: 4,
    velocidadRespuestaHoras: 1.2, sinAtender: 1, score: 88,
    promotores: [
      { id: 'jp', nombre: 'Juan Pérez',  initials: 'JP', leadsTratados: 25, entrevistasSemana: 7, cierresSemana: 2, velocidadRespuestaHoras: 0.8, sinAtender: 0, score: 92 },
      { id: 'cr', nombre: 'Carmen Ruiz', initials: 'CR', leadsTratados: 20, entrevistasSemana: 5, cierresSemana: 2, velocidadRespuestaHoras: 1.5, sinAtender: 1, score: 82 },
    ],
  },
  {
    id: 'md', nombre: 'Marcos Díaz', initials: 'MD',
    leadsTratados: 38, entrevistasSemana: 8, cierresSemana: 3,
    velocidadRespuestaHoras: 2.1, sinAtender: 4, score: 71,
    promotores: [
      { id: 'dm', nombre: 'Diego Morales', initials: 'DM', leadsTratados: 22, entrevistasSemana: 5, cierresSemana: 2, velocidadRespuestaHoras: 1.8, sinAtender: 1, score: 78 },
      { id: 'sv', nombre: 'Sofía Vega',    initials: 'SV', leadsTratados: 16, entrevistasSemana: 3, cierresSemana: 1, velocidadRespuestaHoras: 2.5, sinAtender: 3, score: 62 },
    ],
  },
];

const MOCK_ALERTAS_48H: AlertaSinAtender[] = [
  { id: 'a1', nombre: 'Ana Suárez',    telefono: '11 5512-7788', asignadoA: 'Diego M.',   horasSinAtender: 52, estadoVariant: 'terreno',   estadoLabel: 'Interés terreno', canal: 'Redes · link S03' },
  { id: 'a2', nombre: 'Pedro Rojas',   telefono: '11 4455-6677', asignadoA: 'Carmen R.',  horasSinAtender: 61, estadoVariant: 'nuevo',     estadoLabel: 'No contactado',   canal: 'QR · campaña sorteo' },
  { id: 'a3', nombre: 'Luis García',   telefono: '11 9900-1122', asignadoA: 'Sofía V.',   horasSinAtender: 49, estadoVariant: 'nuevo',     estadoLabel: 'No contactado',   canal: 'WhatsApp · link P07' },
];

const OPERADORES_DESTINO: OperadorDestino[] = [
  { id: 'lr', nombre: 'Laura Ramírez', initials: 'LR', rol: 'supervisor', leads: 12, maxLeads: 30 },
  { id: 'md', nombre: 'Marcos Díaz',   initials: 'MD', rol: 'supervisor', leads: 8,  maxLeads: 30 },
  { id: 'jp', nombre: 'Juan Pérez',    initials: 'JP', rol: 'promotor',   leads: 5,  maxLeads: 15 },
  { id: 'cr', nombre: 'Carmen Ruiz',   initials: 'CR', rol: 'promotor',   leads: 7,  maxLeads: 15 },
  { id: 'dm', nombre: 'Diego Morales', initials: 'DM', rol: 'promotor',   leads: 5,  maxLeads: 15 },
  { id: 'sv', nombre: 'Sofía Vega',    initials: 'SV', rol: 'promotor',   leads: 3,  maxLeads: 15 },
];

const EFECTIVIDAD = { total: 23, contactados: 18, conEntrevista: 12, conCierre: 5 };

// Ranking global: todos los operadores ordenados por score
type RankingEntry = MetricasPersona & { rol: 'supervisor' | 'promotor'; supervisorNombre?: string };

// RANKING_GLOBAL se computa dinámicamente en el componente (ver rankingGlobal)

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtVelocidad(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function velColor(h: number): string {
  if (h <= 1) return 'text-ok font-semibold';
  if (h <= 4) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function velBadgeClass(h: number): string {
  if (h <= 1) return 'bg-ok-subtle text-ok';
  if (h <= 4) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function scoreColor(s: number): string {
  if (s >= 85) return 'text-ok font-bold';
  if (s >= 70) return 'text-amber-600 font-bold';
  return 'text-red-600 font-bold';
}

function scoreBadge(s: number): string {
  if (s >= 85) return 'bg-ok-subtle text-ok border border-ok/20';
  if (s >= 70) return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-red-50 text-red-700 border border-red-200';
}

function scoreLabel(s: number): string {
  if (s >= 85) return 'Excelente';
  if (s >= 70) return 'Bueno';
  if (s >= 55) return 'Regular';
  return 'Bajo';
}

function barColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-ok';
}

function pct(n: number, total: number) { return total ? Math.round((n / total) * 100) : 0; }

// ── Sub-components ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">{children}</p>
  );
}

function StatCard({ label, value, sub, color = 'zinc', alert = false }:
  { label: string; value: string | number; sub?: string; color?: 'zinc' | 'ok' | 'amber' | 'red' | 'brand'; alert?: boolean }) {
  const colors = {
    zinc:  'text-zinc-900',
    ok:    'text-ok',
    amber: 'text-amber-600',
    red:   'text-red-700',
    brand: 'text-brand-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${alert ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'}`}>
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className={`mt-0.5 text-[22px] font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}

// Fila de métricas (usada para supervisor y promotor)
function MetricasFila({ persona, isSupervisor }: { persona: MetricasPersona; isSupervisor: boolean }) {
  return (
    <div className={`grid items-center gap-3 px-4 py-3 ${isSupervisor ? 'bg-white' : 'bg-zinc-50'}`}
      style={{ gridTemplateColumns: '1fr 80px 80px 80px 90px 80px 90px' }}
    >
      {/* Nombre */}
      <div className="flex items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${isSupervisor ? 'bg-brand-600' : 'bg-blue-500'}`}>
          {persona.initials}
        </div>
        <div>
          <p className={`text-[13px] font-semibold text-zinc-900 ${isSupervisor ? '' : 'text-zinc-700'}`}>{persona.nombre}</p>
          <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${isSupervisor ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isSupervisor ? 'SUPERVISOR' : 'PROMOTOR'}
          </span>
        </div>
      </div>
      {/* Tratados */}
      <div className="text-center">
        <p className="text-[14px] font-bold text-zinc-900">{persona.leadsTratados}</p>
        <p className="text-[10px] text-zinc-400">tratados</p>
      </div>
      {/* Entrevistas */}
      <div className="text-center">
        <p className="text-[14px] font-bold text-ok">{persona.entrevistasSemana}</p>
        <p className="text-[10px] text-zinc-400">entrevistas</p>
      </div>
      {/* Cierres */}
      <div className="text-center">
        <p className="text-[14px] font-bold text-amber-600">{persona.cierresSemana}</p>
        <p className="text-[10px] text-zinc-400">cierres</p>
      </div>
      {/* Velocidad */}
      <div className="text-center">
        <p className={`text-[13px] ${velColor(persona.velocidadRespuestaHoras)}`}>{fmtVelocidad(persona.velocidadRespuestaHoras)}</p>
        <p className="text-[10px] text-zinc-400">vel. resp.</p>
      </div>
      {/* Sin atender */}
      <div className="text-center">
        <p className={`text-[14px] font-bold ${persona.sinAtender > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{persona.sinAtender}</p>
        <p className="text-[10px] text-zinc-400">sin atend.</p>
      </div>
      {/* Score */}
      <div className="flex justify-center">
        <span className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${scoreBadge(persona.score)}`}>
          {persona.score}
        </span>
      </div>
    </div>
  );
}

// Panel reasignar (slide desde derecha) — para alertas 48hs
interface PanelReasignarProps {
  alerta: AlertaSinAtender;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}
function PanelReasignar({ alerta, selectedId, onSelect, onConfirm, onClose }: PanelReasignarProps) {
  const seleccionado = OPERADORES_DESTINO.find((o) => o.id === selectedId);
  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="flex w-[420px] shrink-0 flex-col border-l border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">Alerta +48hs</p>
            <p className="text-[16px] font-bold text-zinc-900">Reasignar lead</p>
            <p className="mt-0.5 text-[12px] text-zinc-500">{alerta.nombre} · sin atender hace <span className="font-semibold text-red-600">{alerta.horasSinAtender}hs</span></p>
          </div>
          <button type="button" onClick={onClose} className="mt-1 flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Info del lead */}
        <div className="mx-5 mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill variant={alerta.estadoVariant === 'terreno' ? 'terreno' : alerta.estadoVariant === 'contactado' ? 'contactado' : 'nuevo'} dot>
              {alerta.estadoLabel}
            </StatusPill>
            <span className="text-[12px] text-zinc-500">{alerta.telefono}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div><p className="text-[10px] uppercase text-zinc-400">Canal</p><p className="text-[12px] text-zinc-700">{alerta.canal}</p></div>
            <div><p className="text-[10px] uppercase text-zinc-400">Asignado a (actual)</p><p className="text-[12px] font-semibold text-red-600">{alerta.asignadoA}</p></div>
          </div>
        </div>
        {/* Selector */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Seleccioná el nuevo operador</p>
          {(['supervisor', 'promotor'] as const).map((rol) => (
            <div key={rol} className="mt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{rol === 'supervisor' ? 'Supervisores' : 'Promotores'}</p>
              {OPERADORES_DESTINO.filter((o) => o.rol === rol).map((op) => {
                const isSelected = op.id === selectedId;
                const p = Math.round((op.leads / op.maxLeads) * 100);
                return (
                  <button key={op.id} type="button" onClick={() => onSelect(op.id)}
                    className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${isSelected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-200' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${rol === 'supervisor' ? 'bg-brand-600' : 'bg-blue-600'}`}>{op.initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-zinc-900">{op.nombre}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-100"><div className={`h-1 rounded-full ${barColor(p)}`} style={{ width: `${p}%` }} /></div>
                        <span className="text-[11px] text-zinc-400">{op.leads}/{op.maxLeads}</span>
                      </div>
                    </div>
                    {isSelected && <span className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">Seleccionado</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="border-t border-zinc-100 px-5 py-4">
          {seleccionado && (
            <p className="mb-3 text-[12px] text-zinc-500">
              <span className="font-semibold text-zinc-900">{alerta.nombre}</span>{' → '}
              <span className="font-semibold text-brand-700">{seleccionado.nombre}</span>
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
              Cancelar
            </button>
            <button type="button" disabled={!selectedId} onClick={onConfirm}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {seleccionado ? `Reasignar a ${seleccionado.nombre.split(' ')[0]}` : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
}

function calcScore(entrevistas: number, cierres: number, tratados: number): number {
  if (tratados === 0) return 50;
  const ep = Math.min((entrevistas / tratados) * 100, 50);
  const cp = Math.min(cierres * 8, 40);
  return Math.min(100, Math.round(30 + ep + cp));
}

export function PanelMetricasGlobal({ onVolver, adminDashboard }: { onVolver: () => void; adminDashboard?: AdminDashboardData | null }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [alertasResueltas, setAlertasResueltas] = useState<Set<string>>(new Set());
  const [reasignarAlertaId, setReasignarAlertaId] = useState<string | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  const alertaActiva = reasignarAlertaId ? MOCK_ALERTAS_48H.find((a) => a.id === reasignarAlertaId) : null;
  const alertasPendientes = MOCK_ALERTAS_48H.filter((a) => !alertasResueltas.has(a.id));

  const toggleSup = (id: string) => setExpandedIds((prev) => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const confirmarReasignacion = () => {
    if (reasignarAlertaId) setAlertasResueltas((prev) => new Set([...prev, reasignarAlertaId]));
    setReasignarAlertaId(null); setSelectedOpId(null);
  };

  // Métricas: usar adminDashboard si está disponible
  const metricas: MetricasSup[] = useMemo(() => {
    if (!adminDashboard?.supervisores?.length) return MOCK_METRICAS;
    return adminDashboard.supervisores.map((sup) => ({
      id: sup.supervisorId, nombre: sup.supervisorNombre, initials: iniciales(sup.supervisorNombre),
      leadsTratados: sup.totales.tratadosHoy, entrevistasSemana: sup.totales.entrevistasSemana,
      cierresSemana: sup.totales.cierresSemana, velocidadRespuestaHoras: 0, sinAtender: 0,
      score: calcScore(sup.totales.entrevistasSemana, sup.totales.cierresSemana, sup.totales.tratadosHoy),
      promotores: sup.promotores.map((p) => ({
        id: p.promotorId, nombre: p.promotorNombre, initials: iniciales(p.promotorNombre),
        leadsTratados: p.tratadosHoy, entrevistasSemana: p.entrevistasSemana,
        cierresSemana: p.cierresSemana, velocidadRespuestaHoras: 0, sinAtender: 0,
        score: calcScore(p.entrevistasSemana, p.cierresSemana, p.tratadosHoy),
      })),
    }));
  }, [adminDashboard]);

  // Ranking real desde adminDashboard si disponible
  const rankingGlobal: RankingEntry[] = useMemo(() => {
    const base: RankingEntry[] = [
      ...metricas.map((s) => ({ ...s, rol: 'supervisor' as const })),
      ...metricas.flatMap((s) => s.promotores.map((p) => ({ ...p, rol: 'promotor' as const, supervisorNombre: s.nombre }))),
    ];
    return base.sort((a, b) => b.score - a.score);
  }, [metricas]);

  // Totales globales
  const totalTratados    = metricas.reduce((s, sup) => s + sup.leadsTratados, 0);
  const totalEntrevistas = metricas.reduce((s, sup) => s + sup.entrevistasSemana, 0);
  const totalCierres     = metricas.reduce((s, sup) => s + sup.cierresSemana, 0);
  const velPromedioGlobal = MOCK_METRICAS.flatMap((s) => s.promotores).reduce((s, p) => s + p.velocidadRespuestaHoras, 0) / Math.max(MOCK_METRICAS.flatMap((s) => s.promotores).length, 1);
  const efectividadPct = pct(EFECTIVIDAD.conCierre, EFECTIVIDAD.total);

  return (
    <>
      {/* Panel reasignar 48hs */}
      {alertaActiva && (
        <PanelReasignar
          alerta={alertaActiva}
          selectedId={selectedOpId}
          onSelect={setSelectedOpId}
          onConfirm={confirmarReasignacion}
          onClose={() => { setReasignarAlertaId(null); setSelectedOpId(null); }}
        />
      )}

      <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold text-zinc-900">Panel Global de Métricas</h1>
            <p className="mt-1 text-[13px] text-zinc-500">Rendimiento del equipo · velocidad de atención · efectividad de reasignaciones</p>
          </div>
          <button type="button" onClick={onVolver}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Volver al despacho
          </button>
        </div>

        {/* ── RESUMEN GLOBAL ── */}
        <div className="mt-6">
          <SectionTitle>Resumen global</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Leads tratados hoy"      value={totalTratados}                          color="zinc" />
            <StatCard label="Entrevistas / sem"        value={totalEntrevistas}                       color="ok" />
            <StatCard label="Cierres / sem"            value={totalCierres}                           color="amber" />
            <StatCard label="Vel. resp. promedio"      value={fmtVelocidad(velPromedioGlobal)}        color={velPromedioGlobal <= 1 ? 'ok' : velPromedioGlobal <= 4 ? 'amber' : 'red'} sub="desde asignación" />
            <StatCard label="Sin atender +48hs"        value={alertasPendientes.length}               color="red" alert={alertasPendientes.length > 0} sub="requieren acción" />
            <StatCard label="Efect. reasignaciones"    value={`${efectividadPct}%`}                   color="brand" sub={`${EFECTIVIDAD.conCierre} cierres / ${EFECTIVIDAD.total} reasig.`} />
          </div>
        </div>

        {/* ── ALERTAS +48HS ── */}
        {alertasPendientes.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{alertasPendientes.length}</span>
              <SectionTitle>Leads sin atender +48hs — acción requerida</SectionTitle>
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50">
              <div className="border-b border-red-200 px-5 py-3">
                <p className="text-[12px] text-red-700">Estos leads fueron asignados por vos y aún no fueron contactados. Reasignalos para no perderlos.</p>
              </div>
              <div className="divide-y divide-red-100">
                {alertasPendientes.map((alerta) => (
                  <div key={alerta.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Hs badge */}
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-red-500 text-white">
                      <span className="text-[16px] font-bold leading-none">{alerta.horasSinAtender}</span>
                      <span className="text-[9px] font-semibold uppercase">horas</span>
                    </div>
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-zinc-900">{alerta.nombre}</span>
                        <StatusPill variant={alerta.estadoVariant === 'terreno' ? 'terreno' : alerta.estadoVariant === 'contactado' ? 'contactado' : 'nuevo'} dot>
                          {alerta.estadoLabel}
                        </StatusPill>
                      </div>
                      <p className="mt-0.5 text-[12px] text-zinc-600">
                        {alerta.telefono} · <span className="text-red-600 font-medium">Asignado a {alerta.asignadoA}</span> · {alerta.canal}
                      </p>
                    </div>
                    {/* Acción */}
                    <button
                      type="button"
                      onClick={() => { setReasignarAlertaId(alerta.id); setSelectedOpId(null); }}
                      className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Reasignar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── POR EQUIPO ── */}
        <div className="mt-6">
          <SectionTitle>Métricas por equipo</SectionTitle>
          {/* Cabecera de columnas */}
          <div className="mt-3 grid items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2"
            style={{ gridTemplateColumns: '1fr 80px 80px 80px 90px 80px 90px' }}
          >
            {['Operador', 'Tratados', 'Entrevistas', 'Cierres', 'Vel. resp.', 'Sin atend.', 'Score'].map((col) => (
              <p key={col} className="text-center text-[10px] font-bold uppercase tracking-wide text-zinc-400 first:text-left">{col}</p>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-3">
            {metricas.map((sup) => {
              const expanded = expandedIds.has(sup.id);
              return (
                <div key={sup.id} className="overflow-hidden rounded-2xl border border-zinc-200">
                  {/* Supervisor row */}
                  <div className="relative">
                    <MetricasFila persona={sup} isSupervisor />
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => toggleSup(sup.id)}
                      aria-expanded={expanded}
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
                    >
                      {expanded ? 'Ocultar' : 'Promotores'}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {/* Promotores rows */}
                  {expanded && (
                    <div className="border-t border-zinc-100">
                      {sup.promotores.map((prom, idx) => (
                        <div key={prom.id} className={idx < sup.promotores.length - 1 ? 'border-b border-zinc-100' : ''}>
                          <MetricasFila persona={prom} isSupervisor={false} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CIERRES POR PRODUCTO ── */}
        <div className="mt-6">
          <SectionTitle>Cierres por producto</SectionTitle>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Terreno */}
            {(() => {
              const data = { total: 8, semana: 3, porOperador: [
                { nombre: 'Juan P.',   cierres: 2 },
                { nombre: 'Carmen R.', cierres: 3 },
                { nombre: 'Diego M.',  cierres: 2 },
                { nombre: 'Sofía V.',  cierres: 1 },
              ]};
              const maxCierres = Math.max(...data.porOperador.map((o) => o.cierres));
              return (
                <div className="overflow-hidden rounded-2xl border border-red-200 bg-white">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[22px]">🔥</span>
                      <div>
                        <p className="text-[15px] font-bold text-zinc-900">Terreno</p>
                        <p className="text-[11px] text-zinc-500">Ventas de lotes y terrenos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[26px] font-bold leading-none text-red-700">{data.total}</p>
                      <p className="text-[10px] text-zinc-400">cierres totales</p>
                    </div>
                  </div>
                  {/* Esta semana badge */}
                  <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-2.5">
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">{data.semana} esta semana</span>
                    <span className="text-[11px] text-zinc-400">{pct(data.semana, data.total)}% del total</span>
                  </div>
                  {/* Por operador */}
                  <div className="px-5 py-4 flex flex-col gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Por promotor / supervisor</p>
                    {data.porOperador.map((op) => (
                      <div key={op.nombre} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-[12px] font-medium text-zinc-600">{op.nombre}</span>
                        <div className="flex-1 h-5 overflow-hidden rounded-md bg-zinc-100">
                          <div
                            className="h-full rounded-md bg-red-500 flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(pct(op.cierres, maxCierres), 15)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">{op.cierres}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Plan Inversión Joven */}
            {(() => {
              const data = { total: 5, semana: 2, porOperador: [
                { nombre: 'Juan P.',   cierres: 2 },
                { nombre: 'Carmen R.', cierres: 1 },
                { nombre: 'Diego M.',  cierres: 1 },
                { nombre: 'Sofía V.',  cierres: 1 },
              ]};
              const maxCierres = Math.max(...data.porOperador.map((o) => o.cierres));
              return (
                <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-white">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[22px]">🏠</span>
                      <div>
                        <p className="text-[15px] font-bold text-zinc-900">Plan Inversión Joven</p>
                        <p className="text-[11px] text-zinc-500">PIJ — plan de vivienda propia</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[26px] font-bold leading-none text-indigo-700">{data.total}</p>
                      <p className="text-[10px] text-zinc-400">cierres totales</p>
                    </div>
                  </div>
                  {/* Esta semana badge */}
                  <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-2.5">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">{data.semana} esta semana</span>
                    <span className="text-[11px] text-zinc-400">{pct(data.semana, data.total)}% del total</span>
                  </div>
                  {/* Por operador */}
                  <div className="px-5 py-4 flex flex-col gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Por promotor / supervisor</p>
                    {data.porOperador.map((op) => (
                      <div key={op.nombre} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-[12px] font-medium text-zinc-600">{op.nombre}</span>
                        <div className="flex-1 h-5 overflow-hidden rounded-md bg-zinc-100">
                          <div
                            className="h-full rounded-md bg-indigo-500 flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(pct(op.cierres, maxCierres), 15)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">{op.cierres}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── EFECTIVIDAD DE REASIGNACIONES ── */}
        <div className="mt-6">
          <SectionTitle>Efectividad de reasignaciones</SectionTitle>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-100 bg-zinc-50 px-6 py-4">
              <div>
                <p className="text-[15px] font-bold text-zinc-900">
                  {EFECTIVIDAD.total} leads reasignados
                </p>
                <p className="mt-0.5 text-[12px] text-zinc-500">
                  Conversión desde reasignación hasta cierre
                </p>
              </div>
              <div className="flex items-baseline gap-1.5 rounded-xl bg-ok-subtle px-4 py-2.5">
                <span className="text-[24px] font-bold text-ok leading-none">
                  {pct(EFECTIVIDAD.conCierre, EFECTIVIDAD.total)}%
                </span>
                <span className="text-[11px] font-medium text-ok">tasa de cierre</span>
              </div>
            </div>

            {/* Barras de embudo */}
            <div className="px-6 py-6 flex flex-col gap-4">
              {([
                {
                  label: 'Reasignados',
                  sublabel: 'leads enviados a operadores',
                  value: EFECTIVIDAD.total,
                  barClass: 'bg-zinc-700',
                  dotClass: 'bg-zinc-500',
                  numClass: 'text-zinc-900',
                  pctClass: 'text-zinc-500',
                  prevValue: null as number | null,
                },
                {
                  label: 'Contactados',
                  sublabel: 'el operador se comunicó con el lead',
                  value: EFECTIVIDAD.contactados,
                  barClass: 'bg-blue-500',
                  dotClass: 'bg-blue-500',
                  numClass: 'text-blue-700',
                  pctClass: 'text-blue-600',
                  prevValue: EFECTIVIDAD.total,
                },
                {
                  label: 'Con entrevista',
                  sublabel: 'llegaron a una entrevista',
                  value: EFECTIVIDAD.conEntrevista,
                  barClass: 'bg-amber-400',
                  dotClass: 'bg-amber-400',
                  numClass: 'text-amber-700',
                  pctClass: 'text-amber-600',
                  prevValue: EFECTIVIDAD.contactados,
                },
                {
                  label: 'Con cierre',
                  sublabel: 'cerraron la venta',
                  value: EFECTIVIDAD.conCierre,
                  barClass: 'bg-ok',
                  dotClass: 'bg-ok',
                  numClass: 'text-ok',
                  pctClass: 'text-ok',
                  prevValue: EFECTIVIDAD.conEntrevista,
                },
              ] as const).map((step) => {
                const widthPct = pct(step.value, EFECTIVIDAD.total);
                const stepPct  = step.prevValue !== null ? pct(step.value, step.prevValue) : 100;
                return (
                  <div key={step.label}>
                    {/* Etiqueta + conversión del paso */}
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${step.dotClass}`} />
                        <span className="text-[13px] font-semibold text-zinc-800">{step.label}</span>
                        <span className="text-[11px] text-zinc-400">{step.sublabel}</span>
                      </div>
                      {step.prevValue !== null && (
                        <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                          {stepPct}% del paso anterior
                        </span>
                      )}
                    </div>
                    {/* Barra + número + % global */}
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-zinc-100">
                        <div
                          className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-lg pr-3 ${step.barClass}`}
                          style={{ width: `${Math.max(widthPct, 8)}%` }}
                        >
                          <span className="text-[13px] font-bold text-white drop-shadow-sm">{step.value}</span>
                        </div>
                      </div>
                      <span className={`w-10 shrink-0 text-right text-[15px] font-bold ${step.pctClass}`}>
                        {widthPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tasas de conversión entre pasos */}
            <div className="grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100">
              {[
                { label: 'Reasig. → Contacto',     value: pct(EFECTIVIDAD.contactados, EFECTIVIDAD.total),    color: 'text-blue-600' },
                { label: 'Contacto → Entrevista',   value: pct(EFECTIVIDAD.conEntrevista, EFECTIVIDAD.contactados), color: 'text-amber-600' },
                { label: 'Entrevista → Cierre',     value: pct(EFECTIVIDAD.conCierre, EFECTIVIDAD.conEntrevista),   color: 'text-ok' },
              ].map((conv) => (
                <div key={conv.label} className="flex flex-col items-center py-4">
                  <span className={`text-[22px] font-bold ${conv.color}`}>{conv.value}%</span>
                  <span className="mt-0.5 text-[10px] font-medium text-zinc-400">{conv.label}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── SCORE DE VENTAS ── */}
        <SeccionInformes tipo="reasignados" />

        <div className="mt-6 mb-8">
          <SectionTitle>Score de ventas — ranking del equipo</SectionTitle>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {/* Header */}
            <div className="grid items-center gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-2.5"
              style={{ gridTemplateColumns: '32px 1fr 100px 80px 80px 120px 90px' }}
            >
              {['#', 'Operador', 'Score', 'Cierres', 'Entrevistas', 'Vel. resp.', 'Calificación'].map((col) => (
                <p key={col} className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{col}</p>
              ))}
            </div>
            {/* Rows */}
            {rankingGlobal.map((persona, idx) => {
              const isSup = persona.rol === 'supervisor';
              const velH = persona.velocidadRespuestaHoras;
              return (
                <div key={persona.id}
                  className={`grid items-center gap-4 border-b border-zinc-100 px-5 py-3.5 last:border-0 ${isSup ? 'bg-white' : 'bg-zinc-50/50'}`}
                  style={{ gridTemplateColumns: '32px 1fr 100px 80px 80px 120px 90px' }}
                >
                  {/* Rank */}
                  <span className={`text-[13px] font-bold ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-zinc-400' : idx === 2 ? 'text-amber-700' : 'text-zinc-300'}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </span>
                  {/* Nombre */}
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${isSup ? 'bg-brand-600' : 'bg-blue-500'}`}>
                      {persona.initials}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-900">{persona.nombre}</p>
                      {'supervisorNombre' in persona && persona.supervisorNombre && (
                        <p className="text-[10px] text-zinc-400">Sup. {persona.supervisorNombre}</p>
                      )}
                    </div>
                  </div>
                  {/* Score barra */}
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <div className={`h-2 rounded-full ${persona.score >= 85 ? 'bg-ok' : persona.score >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${persona.score}%` }} />
                    </div>
                    <span className={`shrink-0 text-[12px] ${scoreColor(persona.score)}`}>{persona.score}</span>
                  </div>
                  {/* Cierres */}
                  <p className="text-[13px] font-semibold text-zinc-700">{persona.cierresSemana}</p>
                  {/* Entrevistas */}
                  <p className="text-[13px] font-semibold text-zinc-700">{persona.entrevistasSemana}</p>
                  {/* Velocidad */}
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${velBadgeClass(velH)}`}>
                    {fmtVelocidad(velH)}
                  </span>
                  {/* Calificación */}
                  <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${scoreBadge(persona.score)}`}>
                    {scoreLabel(persona.score)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
