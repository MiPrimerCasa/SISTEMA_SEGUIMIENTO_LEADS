import { useMemo, useState } from 'react';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StatusPill } from '../ui/StatusPill';
import { PanelMetricasGlobal } from './PanelMetricasGlobal';
import { PanelDatosGlobales } from './PanelDatosGlobales';
import type { AdminDashboardData, Lead } from '../../types';

// ── Props reales ──────────────────────────────────────────────────────────

interface PanelDespachoProps {
  leads?: Lead[];
  adminDashboard?: AdminDashboardData | null;
}

// ── Helpers para datos reales ─────────────────────────────────────────────

function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : nombre.slice(0, 2).toUpperCase();
}

function calcTiempo(fechaStr: string): string {
  const diff = Date.now() - new Date(fechaStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'ahora';
  if (mins < 60)  return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

function leadEstado(lead: Lead): { estadoVariant: MockLeadCola['estadoVariant']; estadoLabel: string } {
  const seg = lead.seguimiento;
  if (seg.resultadoEntrevista === 'derivar_terreno') return { estadoVariant: 'terreno',    estadoLabel: 'Interés terreno' };
  if (seg.canal || seg.huboEntrevista)               return { estadoVariant: 'contactado', estadoLabel: 'Contactado' };
  return                                                    { estadoVariant: 'nuevo',       estadoLabel: 'No contactado' };
}

function leadToColaMock(lead: Lead): MockLeadCola {
  const { estadoVariant, estadoLabel } = leadEstado(lead);
  const origenMap: Record<string, string> = { qr: 'QR', encuesta: 'Encuesta', sorteo: 'Sorteo', redes: 'Redes', manual: 'Manual' };
  const canal = `${origenMap[lead.origen ?? ''] ?? 'Manual'}${lead.codigoCampania ? ` · ${lead.codigoCampania}` : ''}`;
  const linkDe = lead.supervisorNombre ? `Sup. ${abrev(lead.supervisorNombre)}`
    : lead.promotorNombre ? `Prom. ${abrev(lead.promotorNombre)}` : '—';
  return {
    id: lead.id, nombre: lead.nombre, telefono: lead.telefono,
    estadoVariant, estadoLabel,
    tags: [lead.lista === 'entrevista' ? 'ENTREVISTA' : 'CONTACTO'],
    canal, linkDe, tiempo: calcTiempo(lead.fechaObtencion),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────

type FiltroDespacho = 'todos' | 'sin-asignar' | 'sin-atender' | 'reasignados';
type VistaDespacho  = 'panel' | 'seguimiento' | 'lista' | 'metricas' | 'datos-globales';

interface MockLeadCola {
  id: string; nombre: string; telefono: string;
  estadoVariant: 'nuevo' | 'contactado' | 'terreno';
  estadoLabel: string; tags: string[]; canal: string; linkDe: string; tiempo: string;
  reasignadoA?: string;
}

interface MockLeadLista {
  id: string; nombre: string; telefono: string;
  estadoVariant: 'nuevo' | 'contactado' | 'terreno' | 'in-progress';
  estadoLabel: string; tags: string[]; canal: string; asignadoA: string; tiempo: string;
}

interface MockScores {
  tratadosHoy: number;
  entrevistasSemana: number;
  cierresSemana: number;
  sinContactar: number;
}

interface MockPromotor {
  id: string; nombre: string; initials: string;
  leads: number; maxLeads: number; scores: MockScores;
}

interface MockSupervisorConEquipo {
  id: string; nombre: string; initials: string;
  leads: number; maxLeads: number; scores: MockScores;
  promotores: MockPromotor[];
}

interface MockSeguimientoItem {
  id: string; nombre: string; reasignacion: string;
  estadoVariant: 'in-progress' | 'contactado' | 'no-compro';
  estadoLabel: string; tiempo: string; accion: 'reasignar' | 'ninguna';
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_COLA_POR_FILTRO: Record<FiltroDespacho, MockLeadCola[]> = {
  todos: [
    { id: 't1', nombre: 'María González',  telefono: '11 2262-4410', estadoVariant: 'nuevo',     estadoLabel: 'No contactado',   tags: ['ENTREVISTA', 'FLORES'],    canal: 'QR · campaña sorteo',  linkDe: 'Sup. Laura R.',  tiempo: 'hace 2 min' },
    { id: 't2', nombre: 'Carlos Pérez',    telefono: '11 3003-1180', estadoVariant: 'contactado', estadoLabel: 'Contactado',      tags: ['CONTACTO', 'RECOLETA'],    canal: 'WhatsApp · link P07',  linkDe: 'Prom. Diego M.', tiempo: 'hace 6 min' },
    { id: 't3', nombre: 'Ana Suárez',      telefono: '11 5512-7788', estadoVariant: 'terreno',    estadoLabel: 'Interés terreno', tags: ['CABALLITO'],               canal: 'Redes · link S03',     linkDe: 'Sup. Marcos D.', tiempo: 'hace 9 min', reasignadoA: 'Juan P.' },
  ],
  'sin-asignar': [
    { id: 'sa1', nombre: 'María González',   telefono: '11 2262-4410', estadoVariant: 'nuevo',     estadoLabel: 'No contactado', tags: ['ENTREVISTA', 'FLORES'],   canal: 'QR · campaña sorteo', linkDe: '—', tiempo: 'hace 2 min' },
    { id: 'sa2', nombre: 'Valentina Torres', telefono: '11 7890-1234', estadoVariant: 'nuevo',     estadoLabel: 'No contactado', tags: ['ENTREVISTA', 'BELGRANO'], canal: 'QR · campaña sorteo', linkDe: '—', tiempo: 'hace 5 min' },
    { id: 'sa3', nombre: 'Roberto Iglesias', telefono: '11 6543-2109', estadoVariant: 'contactado', estadoLabel: 'Contactado',   tags: ['CONTACTO', 'PALERMO'],   canal: 'WhatsApp · link P04', linkDe: '—', tiempo: 'hace 11 min' },
  ],
  'sin-atender': [
    { id: 'st1', nombre: 'Ana Suárez',        telefono: '11 5512-7788', estadoVariant: 'terreno',    estadoLabel: 'Interés terreno', tags: ['CABALLITO'],              canal: 'Redes · link S03',    linkDe: 'Sup. Marcos D.', tiempo: 'hace 9 min',  reasignadoA: 'Juan P.' },
    { id: 'st2', nombre: 'Pedro López',       telefono: '11 4400-2233', estadoVariant: 'contactado', estadoLabel: 'Contactado',      tags: ['ENTREVISTA', 'PALERMO'],  canal: 'WhatsApp · link P07', linkDe: 'Prom. Diego M.', tiempo: 'hace 41 min', reasignadoA: 'Carmen R.' },
    { id: 'st3', nombre: 'Carolina Martínez', telefono: '11 9988-7766', estadoVariant: 'nuevo',      estadoLabel: 'No contactado',   tags: ['ENTREVISTA', 'RECOLETA'], canal: 'WhatsApp · link P07', linkDe: 'Prom. Diego M.', tiempo: 'hace 1h',     reasignadoA: 'Diego M.' },
  ],
  reasignados: [
    { id: 'r1', nombre: 'Ana Suárez',      telefono: '11 5512-7788', estadoVariant: 'terreno',    estadoLabel: 'Interés terreno', tags: ['CABALLITO'],             canal: 'Redes · link S03',    linkDe: 'Sup. Marcos D.', tiempo: 'hace 9 min', reasignadoA: 'Juan P.' },
    { id: 'r2', nombre: 'Roberto Sanchez', telefono: '11 3344-5566', estadoVariant: 'nuevo',      estadoLabel: 'No contactado',   tags: ['CONTACTO', 'CABALLITO'], canal: 'QR · campaña sorteo', linkDe: 'Sup. Laura R.',  tiempo: 'ayer',       reasignadoA: 'Marcos D.' },
    { id: 'r3', nombre: 'Lucía Fernández', telefono: '11 6677-8899', estadoVariant: 'contactado', estadoLabel: 'Contactado',      tags: ['ENTREVISTA', 'BELGRANO'],canal: 'Redes · link S03',    linkDe: 'Sup. Marcos D.', tiempo: 'hace 2h',    reasignadoA: 'Juan P.' },
  ],
};

const MOCK_LEADS_LISTA: MockLeadLista[] = [
  { id: 'll1',  nombre: 'María González',    telefono: '11 2262-4410', estadoVariant: 'nuevo',       estadoLabel: 'No contactado',   tags: ['ENTREVISTA', 'FLORES'],   canal: 'QR · campaña sorteo',  asignadoA: 'Juan P.',    tiempo: 'hace 2 min' },
  { id: 'll2',  nombre: 'Carlos Pérez',      telefono: '11 3003-1180', estadoVariant: 'contactado',  estadoLabel: 'Contactado',      tags: ['CONTACTO', 'RECOLETA'],   canal: 'WhatsApp · link P07',  asignadoA: 'Carmen R.',  tiempo: 'hace 6 min' },
  { id: 'll3',  nombre: 'Ana Suárez',        telefono: '11 5512-7788', estadoVariant: 'terreno',     estadoLabel: 'Interés terreno', tags: ['CABALLITO'],              canal: 'Redes · link S03',     asignadoA: 'Juan P.',    tiempo: 'hace 9 min' },
  { id: 'll4',  nombre: 'Pedro López',       telefono: '11 4400-2233', estadoVariant: 'contactado',  estadoLabel: 'Contactado',      tags: ['ENTREVISTA', 'PALERMO'],  canal: 'WhatsApp · link P07',  asignadoA: 'Carmen R.',  tiempo: 'hace 41 min' },
  { id: 'll5',  nombre: 'Lucía Fernández',   telefono: '11 6677-8899', estadoVariant: 'in-progress', estadoLabel: 'En seguimiento',  tags: ['ENTREVISTA', 'BELGRANO'], canal: 'Redes · link S03',     asignadoA: 'Juan P.',    tiempo: 'hace 2h' },
  { id: 'll6',  nombre: 'Roberto Sanchez',   telefono: '11 3344-5566', estadoVariant: 'nuevo',       estadoLabel: 'No contactado',   tags: ['CONTACTO', 'CABALLITO'],  canal: 'QR · campaña sorteo',  asignadoA: 'Carmen R.',  tiempo: 'ayer' },
  { id: 'll7',  nombre: 'Valentina Torres',  telefono: '11 7890-1234', estadoVariant: 'nuevo',       estadoLabel: 'No contactado',   tags: ['ENTREVISTA', 'BELGRANO'], canal: 'QR · campaña sorteo',  asignadoA: 'Carmen R.',  tiempo: 'hace 5 min' },
  { id: 'll8',  nombre: 'Carolina Martínez', telefono: '11 9988-7766', estadoVariant: 'contactado',  estadoLabel: 'Contactado',      tags: ['ENTREVISTA', 'RECOLETA'], canal: 'WhatsApp · link P07',  asignadoA: 'Diego M.',   tiempo: 'hace 1h' },
  { id: 'll9',  nombre: 'Roberto Iglesias',  telefono: '11 6543-2109', estadoVariant: 'nuevo',       estadoLabel: 'No contactado',   tags: ['CONTACTO', 'PALERMO'],    canal: 'WhatsApp · link P04',  asignadoA: '—',          tiempo: 'hace 11 min' },
  { id: 'll10', nombre: 'Sofía Medina',      telefono: '11 5544-3322', estadoVariant: 'in-progress', estadoLabel: 'En seguimiento',  tags: ['ENTREVISTA', 'FLORES'],   canal: 'QR · campaña sorteo',  asignadoA: 'Juan P.',    tiempo: 'hace 3h' },
  { id: 'll11', nombre: 'Martín Rojas',      telefono: '11 2211-9900', estadoVariant: 'nuevo',       estadoLabel: 'No contactado',   tags: ['CONTACTO', 'BELGRANO'],   canal: 'WhatsApp · link P07',  asignadoA: 'Diego M.',   tiempo: 'hace 20 min' },
  { id: 'll12', nombre: 'Elena Castro',      telefono: '11 8877-6655', estadoVariant: 'terreno',     estadoLabel: 'Interés terreno', tags: ['PALERMO'],                canal: 'Redes · link S03',     asignadoA: 'Sofía V.',   tiempo: 'hace 4h' },
];

// Leads por promotor id (para el panel "ver leads")
const LEADS_POR_PROMOTOR: Record<string, MockLeadLista[]> = {
  jp: MOCK_LEADS_LISTA.filter((l) => l.asignadoA === 'Juan P.'),
  cr: MOCK_LEADS_LISTA.filter((l) => l.asignadoA === 'Carmen R.'),
  dm: MOCK_LEADS_LISTA.filter((l) => l.asignadoA === 'Diego M.'),
  sv: MOCK_LEADS_LISTA.filter((l) => l.asignadoA === 'Sofía V.'),
};

const MOCK_SUPERVISORES: MockSupervisorConEquipo[] = [
  {
    id: 'lr', nombre: 'Laura Ramírez', initials: 'LR',
    leads: 12, maxLeads: 30,
    scores: { tratadosHoy: 45, entrevistasSemana: 8, cierresSemana: 3, sinContactar: 2 },
    promotores: [
      { id: 'jp', nombre: 'Juan Pérez',  initials: 'JP', leads: 5, maxLeads: 15, scores: { tratadosHoy: 12, entrevistasSemana: 3, cierresSemana: 1, sinContactar: 0 } },
      { id: 'cr', nombre: 'Carmen Ruiz', initials: 'CR', leads: 7, maxLeads: 15, scores: { tratadosHoy: 18, entrevistasSemana: 4, cierresSemana: 2, sinContactar: 1 } },
    ],
  },
  {
    id: 'md', nombre: 'Marcos Díaz', initials: 'MD',
    leads: 8, maxLeads: 30,
    scores: { tratadosHoy: 38, entrevistasSemana: 6, cierresSemana: 2, sinContactar: 5 },
    promotores: [
      { id: 'dm', nombre: 'Diego Morales', initials: 'DM', leads: 5, maxLeads: 15, scores: { tratadosHoy: 8,  entrevistasSemana: 2, cierresSemana: 1, sinContactar: 1 } },
      { id: 'sv', nombre: 'Sofía Vega',    initials: 'SV', leads: 3, maxLeads: 15, scores: { tratadosHoy: 5,  entrevistasSemana: 1, cierresSemana: 0, sinContactar: 2 } },
    ],
  },
];

// Lista plana — se reemplaza con datos reales en el componente (ver buildOperadores)
function buildOperadores(sups: MockSupervisorConEquipo[]) {
  return [
    ...sups.map((s) => ({ id: s.id, nombre: s.nombre, initials: s.initials, rol: 'supervisor' as const, leads: s.leads, maxLeads: s.maxLeads })),
    ...sups.flatMap((s) => s.promotores.map((p) => ({ id: p.id, nombre: p.nombre, initials: p.initials, rol: 'promotor' as const, leads: p.leads, maxLeads: p.maxLeads }))),
  ];
}
// buildOperadores(MOCK_SUPERVISORES) — se construye en tiempo de ejecución desde adminDashboard

const MOCK_SEGUIMIENTO: MockSeguimientoItem[] = [
  { id: '1', nombre: 'María González',    reasignacion: 'Laura R. → Juan P.',   estadoVariant: 'in-progress', estadoLabel: 'En seguimiento', tiempo: 'hace 12 min', accion: 'ninguna' },
  { id: '2', nombre: 'Lucía Fernández',   reasignacion: 'Manager → Marcos D.',  estadoVariant: 'contactado',  estadoLabel: 'Contactado',     tiempo: 'hace 5 min',  accion: 'ninguna' },
  { id: '3', nombre: 'Pedro López',       reasignacion: 'Diego M. → Carmen R.', estadoVariant: 'no-compro',   estadoLabel: 'Sin atender',    tiempo: 'hace 41 min', accion: 'reasignar' },
  { id: '4', nombre: 'Ana Suárez',        reasignacion: 'Marcos D. → Juan P.',  estadoVariant: 'no-compro',   estadoLabel: 'Sin atender',    tiempo: 'hace 9 min',  accion: 'reasignar' },
  { id: '5', nombre: 'Roberto Sanchez',   reasignacion: 'Laura R. → Marcos D.', estadoVariant: 'contactado',  estadoLabel: 'Contactado',     tiempo: 'ayer',        accion: 'ninguna' },
  { id: '6', nombre: 'Valentina Torres',  reasignacion: 'Manager → Juan P.',    estadoVariant: 'in-progress', estadoLabel: 'En seguimiento', tiempo: 'hace 2h',     accion: 'ninguna' },
  { id: '7', nombre: 'Carolina Martínez', reasignacion: 'Diego M. → Carmen R.', estadoVariant: 'no-compro',   estadoLabel: 'Sin atender',    tiempo: 'hace 1h',     accion: 'reasignar' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function barColor(pct: number) {
  if (pct >= 80) return 'bg-red-500';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-ok';
}
function abrev(nombre: string) {
  const p = nombre.split(' ');
  return p[0] + (p[1] ? ' ' + p[1][0] + '.' : '');
}
function pillVariant(v: MockLeadLista['estadoVariant']): 'nuevo' | 'contactado' | 'terreno' | 'in-progress' {
  return v;
}

// ── Small atoms ───────────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </span>
  );
}

function DragHandle() {
  return (
    <div className="mt-[3px] grid shrink-0 cursor-grab grid-cols-2 gap-[3px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
      ))}
    </div>
  );
}

function MiniBar({ leads, maxLeads }: { leads: number; maxLeads: number }) {
  const pct = Math.round((leads / maxLeads) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-1.5 rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-zinc-400">{leads}/{maxLeads}</span>
    </div>
  );
}

function ScorePill({ label, value, color = 'zinc' }: { label: string; value: number; color?: 'zinc' | 'ok' | 'amber' | 'red' }) {
  const colors = {
    zinc:  'bg-zinc-100 text-zinc-700',
    ok:    'bg-ok-subtle text-ok',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-700',
  };
  return (
    <div className={`flex flex-col items-center rounded-xl px-4 py-3 ${colors[color]}`}>
      <span className="text-[20px] font-bold">{value}</span>
      <span className="mt-0.5 text-center text-[10px] font-medium leading-tight">{label}</span>
    </div>
  );
}

// ── ColaLeadCard ──────────────────────────────────────────────────────────

const CARD_BG: Record<MockLeadCola['estadoVariant'], string> = {
  nuevo: 'bg-teal-50 border-teal-200', contactado: 'bg-amber-50 border-amber-200', terreno: 'bg-red-50 border-red-300',
};
const LISTA_BG: Record<MockLeadLista['estadoVariant'], string> = {
  nuevo: 'bg-teal-50 border-teal-200', contactado: 'bg-amber-50 border-amber-200', terreno: 'bg-red-50 border-red-300', 'in-progress': 'bg-brand-50 border-brand-100',
};

function ColaLeadCard({ lead, onReasignar }: { lead: MockLeadCola; onReasignar?: () => void }) {
  return (
    <div className={`rounded-xl border p-4 ${CARD_BG[lead.estadoVariant]}`}>
      <div className="flex items-start gap-2">
        <DragHandle />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-semibold text-zinc-900">{lead.nombre}</span>
            <span className="shrink-0 text-[10px] text-zinc-500">{lead.tiempo}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-600">{lead.telefono}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusPill variant={lead.estadoVariant === 'nuevo' ? 'nuevo' : lead.estadoVariant === 'contactado' ? 'contactado' : 'terreno'} dot>
          {lead.estadoLabel}
        </StatusPill>
        {lead.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div><p className="text-[10px] uppercase text-zinc-400">Canal</p><p className="text-[12px] text-zinc-700">{lead.canal}</p></div>
        <div><p className="text-[10px] uppercase text-zinc-400">Link de</p><p className="text-[12px] text-zinc-700">{lead.linkDe}</p></div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {lead.reasignadoA ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex flex-col items-start gap-1">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200">
                Reasignado a {lead.reasignadoA}
              </span>
              <StatusPill variant="no-compro">Sin atender</StatusPill>
            </div>
            <button
              type="button"
              onClick={onReasignar}
              className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
            >
              Reasignar de nuevo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onReasignar}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Reasignar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Cola: vista tabla compacta ────────────────────────────────────────────

function ColaLeadTabla({ lead, onReasignar }: { lead: MockLeadCola; onReasignar?: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${CARD_BG[lead.estadoVariant]}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-900 truncate">{lead.nombre}</span>
          <StatusPill variant={lead.estadoVariant === 'nuevo' ? 'nuevo' : lead.estadoVariant === 'contactado' ? 'contactado' : 'terreno'} dot>
            {lead.estadoLabel}
          </StatusPill>
        </div>
        <p className="text-[11px] text-zinc-500">
          {lead.telefono} · {lead.linkDe} · {lead.tiempo}
        </p>
      </div>
      {lead.reasignadoA ? (
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200">
          → {lead.reasignadoA}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onReasignar}
        className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Reasignar
      </button>
    </div>
  );
}

// ── Equipo: Supervisor Accordion ──────────────────────────────────────────

interface EquipoSectionProps {
  supervisores: MockSupervisorConEquipo[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onVerSupervisor: (s: MockSupervisorConEquipo) => void;
  onVerPromotor: (p: MockPromotor, supNombre: string) => void;
  onReasignarPromotor: (p: MockPromotor) => void;
}

function EquipoSection({ supervisores, expandedIds, onToggle, onVerSupervisor, onVerPromotor, onReasignarPromotor }: EquipoSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {supervisores.map((sup) => {
        const expanded = expandedIds.has(sup.id);
        return (
          <div key={sup.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {/* Supervisor header */}
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                {sup.initials}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold text-zinc-900">{sup.nombre}</span>
                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">SUPERVISOR</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="text-[13px] font-semibold text-zinc-700">{sup.leads} leads</span>
                  <MiniBar leads={sup.leads} maxLeads={sup.maxLeads} />
                  <span className="text-[11px] text-zinc-400">{sup.promotores.length} promotores</span>
                </div>
              </div>
              {/* Acciones */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onVerSupervisor(sup)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Ver scores
                </button>
                <button
                  type="button"
                  onClick={() => onToggle(sup.id)}
                  aria-expanded={expanded}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                >
                  Promotores
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Promotores (expandidos) */}
            {expanded && (
              <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3 flex flex-col gap-2">
                {sup.promotores.map((prom) => {
                  const ppct = Math.round((prom.leads / prom.maxLeads) * 100);
                  return (
                    <div key={prom.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                      {/* Avatar promotor */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                        {prom.initials}
                      </div>
                      {/* Info promotor */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-900">{prom.nombre}</span>
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">PROMOTOR</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3">
                          <span className="text-[12px] text-zinc-600">{prom.leads} leads</span>
                          <MiniBar leads={prom.leads} maxLeads={prom.maxLeads} />
                          <span className={`text-[11px] ${ppct >= 80 ? 'text-red-600 font-semibold' : 'text-zinc-400'}`}>{ppct}%</span>
                        </div>
                      </div>
                      {/* Acciones promotor */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onVerPromotor(prom, sup.nombre)}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
                        >
                          Ver leads
                        </button>
                        <button
                          type="button"
                          onClick={() => onReasignarPromotor(prom)}
                          className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
                        >
                          Reasignar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Panel derecho ─────────────────────────────────────────────────────────

type PanelState =
  | { tipo: 'scores-supervisor'; sup: MockSupervisorConEquipo }
  | { tipo: 'leads-promotor'; prom: MockPromotor; supNombre: string }
  | { tipo: 'reasignar'; titulo: string; leadCount?: number }
  | null;

type OperadorEntry = ReturnType<typeof buildOperadores>[number];

interface PanelDerechoProps {
  panel: PanelState;
  onClose: () => void;
  onAbrirReasignar: (titulo: string, count?: number) => void;
  onConfirmarAsignacion: (leadId: string, personaId: string) => void;
  operadores: OperadorEntry[];
}

function PanelDerecho({ panel, onClose, onAbrirReasignar, onConfirmarAsignacion, operadores }: PanelDerechoProps) {
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [reasignarLeadId, setReasignarLeadId] = useState<string | null>(null);

  if (!panel) return null;

  const cerrar = () => { setSelectedOpId(null); setReasignarLeadId(null); onClose(); };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      {/* backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-[2px]" onClick={cerrar} />
      {/* panel */}
      <div className="flex w-[440px] shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl">

        {/* Header panel */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            {panel.tipo === 'scores-supervisor' && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Equipo</p>
                <p className="text-[16px] font-bold text-zinc-900">{panel.sup.nombre}</p>
              </>
            )}
            {panel.tipo === 'leads-promotor' && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{panel.supNombre}</p>
                <p className="text-[16px] font-bold text-zinc-900">{panel.prom.nombre}</p>
              </>
            )}
            {panel.tipo === 'reasignar' && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Reasignar</p>
                <p className="text-[16px] font-bold text-zinc-900">{panel.titulo}</p>
              </>
            )}
          </div>
          <button type="button" onClick={cerrar} className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Scores supervisor ── */}
          {panel.tipo === 'scores-supervisor' && (
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Métricas del equipo</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ScorePill label="Tratados hoy"       value={panel.sup.scores.tratadosHoy}       color="zinc" />
                <ScorePill label="Entrevistas / sem"  value={panel.sup.scores.entrevistasSemana}  color="ok" />
                <ScorePill label="Cierres / sem"      value={panel.sup.scores.cierresSemana}      color="amber" />
                <ScorePill label="Sin contactar"      value={panel.sup.scores.sinContactar}       color={panel.sup.scores.sinContactar > 3 ? 'red' : 'zinc'} />
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Promotores</p>
                <div className="mt-3 flex flex-col gap-2">
                  {panel.sup.promotores.map((prom) => (
                    <div key={prom.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{prom.initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-zinc-900">{prom.nombre}</p>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-[11px] text-zinc-500">
                          <span>{prom.leads} leads</span>
                          <span>· {prom.scores.entrevistasSemana} entrevistas</span>
                          <span>· {prom.scores.cierresSemana} cierres</span>
                        </div>
                      </div>
                      <MiniBar leads={prom.leads} maxLeads={prom.maxLeads} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Ver leads promotor ── */}
          {panel.tipo === 'leads-promotor' && (
            <div className="p-5">
              {/* Scores mini */}
              <div className="grid grid-cols-4 gap-2">
                <ScorePill label="Hoy"         value={panel.prom.scores.tratadosHoy}       color="zinc" />
                <ScorePill label="Entrevistas" value={panel.prom.scores.entrevistasSemana}  color="ok" />
                <ScorePill label="Cierres"     value={panel.prom.scores.cierresSemana}      color="amber" />
                <ScorePill label="Sin cont."   value={panel.prom.scores.sinContactar}       color={panel.prom.scores.sinContactar > 1 ? 'red' : 'zinc'} />
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    Leads asignados ({LEADS_POR_PROMOTOR[panel.prom.id]?.length ?? 0})
                  </p>
                  <button
                    type="button"
                    onClick={() => onAbrirReasignar(`Leads de ${panel.prom.nombre}`, LEADS_POR_PROMOTOR[panel.prom.id]?.length)}
                    className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Reasignar todos
                  </button>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {(LEADS_POR_PROMOTOR[panel.prom.id] ?? []).map((lead) => (
                    <div key={lead.id} className={`flex items-start gap-3 rounded-xl border p-3 ${LISTA_BG[lead.estadoVariant]}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-zinc-900">{lead.nombre}</span>
                          <StatusPill variant={pillVariant(lead.estadoVariant)} dot>{lead.estadoLabel}</StatusPill>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500">{lead.telefono} · {lead.tiempo}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {lead.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setReasignarLeadId(lead.id); onAbrirReasignar(lead.nombre); }}
                        className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                      >
                        Reasignar
                      </button>
                    </div>
                  ))}
                  {(LEADS_POR_PROMOTOR[panel.prom.id]?.length ?? 0) === 0 && (
                    <p className="py-6 text-center text-[12px] text-zinc-400">Sin leads asignados</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Reasignar: selector de equipo ── */}
          {panel.tipo === 'reasignar' && (
            <div className="p-5">
              {panel.leadCount !== undefined && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
                  <span className="font-semibold">{panel.leadCount} leads</span> serán reasignados al operador que selecciones.
                </div>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Seleccioná el operador destino</p>

              {/* Supervisores */}
              <div className="mt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Supervisores</p>
                {operadores.filter((o) => o.rol === 'supervisor').map((op) => {
                  const selected = selectedOpId === op.id;
                  const pct = Math.round((op.leads / op.maxLeads) * 100);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedOpId(op.id)}
                      className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-200' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">{op.initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-900">{op.nombre}</span>
                          <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">SUP</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-100"><div className={`h-1 rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                          <span className="text-[11px] text-zinc-400">{op.leads}/{op.maxLeads} leads</span>
                        </div>
                      </div>
                      {selected && <span className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">Seleccionado</span>}
                    </button>
                  );
                })}
              </div>

              {/* Promotores */}
              <div className="mt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Promotores</p>
                {operadores.filter((o) => o.rol === 'promotor').map((op) => {
                  const selected = selectedOpId === op.id;
                  const pct = Math.round((op.leads / op.maxLeads) * 100);
                  const supNombre = '';  // derivado del equipo cuando el panel tiene contexto
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedOpId(op.id)}
                      className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-200' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{op.initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-zinc-900">{op.nombre}</span>
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">PROM</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-100"><div className={`h-1 rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                          <span className="text-[11px] text-zinc-400">{op.leads}/{op.maxLeads} leads</span>
                          <span className="text-[11px] text-zinc-400">· Sup. {abrev(supNombre)}</span>
                        </div>
                      </div>
                      {selected && <span className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">Seleccionado</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer panel reasignar */}
        {panel.tipo === 'reasignar' && (
          <div className="border-t border-zinc-100 px-5 py-4">
            <div className="flex gap-3">
              <button type="button" onClick={cerrar} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedOpId}
                onClick={() => {
                  if (reasignarLeadId && selectedOpId) onConfirmarAsignacion(reasignarLeadId, selectedOpId);
                  setSelectedOpId(null);
                  setReasignarLeadId(null);
                  cerrar();
                }}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedOpId ? `Reasignar a ${operadores.find((o) => o.id === selectedOpId)?.nombre.split(' ')[0]}` : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reasignar modal (para vista Lista) ────────────────────────────────────

interface ReasignarModalProps {
  lead: MockLeadLista; asignadoActual: string;
  selectedId: string | null; onSelect: (id: string) => void;
  motivo: string; onMotivo: (v: string) => void;
  onConfirm: () => void; onClose: () => void;
  operadores: OperadorEntry[];
}
function ReasignarModal({ lead, asignadoActual, selectedId, onSelect, motivo, onMotivo, onConfirm, onClose, operadores }: ReasignarModalProps) {
  const seleccionado = operadores.find((p) => p.id === selectedId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-[16px] font-bold text-zinc-900">Reasignar lead</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-6 mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Lead</p>
            <p className="mt-1.5 text-[15px] font-bold text-zinc-900">{lead.nombre}</p>
            <p className="text-[12px] text-zinc-500">{lead.telefono}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusPill variant={pillVariant(lead.estadoVariant)} dot>{lead.estadoLabel}</StatusPill>
              {lead.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><p className="text-[10px] uppercase text-zinc-400">Canal</p><p className="text-[12px] text-zinc-700">{lead.canal}</p></div>
              <div><p className="text-[10px] uppercase text-zinc-400">Asignado a</p><p className="text-[12px] text-zinc-700">{asignadoActual}</p></div>
            </div>
          </div>
          <div className="px-6 pb-2 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Seleccioná el operador destino</p>
            <div className="mt-3 flex flex-col gap-2">
              {operadores.map((op) => {
                const isSup = op.rol === 'supervisor';
                const isSelected = op.id === selectedId;
                const pct = Math.round((op.leads / op.maxLeads) * 100);
                return (
                  <button key={op.id} type="button" onClick={() => onSelect(op.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${isSelected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-200' : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${isSup ? 'bg-brand-600' : 'bg-blue-600'}`}>{op.initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-zinc-900">{op.nombre}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${isSup ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{isSup ? 'SUP' : 'PROM'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-100"><div className={`h-1 rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} /></div>
                        <span className="text-[11px] text-zinc-400">{op.leads}/{op.maxLeads} leads</span>
                      </div>
                    </div>
                    {isSelected && <span className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white">Seleccionado</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-6 pb-5 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Motivo <span className="normal-case font-normal text-zinc-400">(opcional)</span></p>
            <textarea value={motivo} onChange={(e) => onMotivo(e.target.value)} placeholder="Ej: Zona fuera de cobertura del promotor actual" rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
            />
          </div>
        </div>
        <div className="border-t border-zinc-100 px-6 py-4">
          {seleccionado && (
            <p className="mb-3 text-[12px] text-zinc-500">
              <span className="font-semibold text-zinc-900">{lead.nombre}</span>{' → '}
              <span className="font-semibold text-brand-700">{seleccionado.nombre}</span>
              {asignadoActual !== '—' && <span className="text-zinc-400"> ({asignadoActual} deja de ver este lead)</span>}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">Cancelar</button>
            <button type="button" disabled={!selectedId} onClick={onConfirm}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {seleccionado ? `Reasignar a ${seleccionado.nombre.split(' ')[0]}` : 'Reasignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────

interface StatsRowProps {
  entrantesHoy: number; enGestion: number; sinAtender: number;
  cierresSemana: number; cierresHoy: number; terrenoSemana: number; pijSemana: number;
}
function StatsRow({ entrantesHoy, enGestion, sinAtender, cierresSemana, cierresHoy, terrenoSemana, pijSemana }: StatsRowProps) {
  const totalCierres = cierresSemana || 1;
  const terrPct = Math.round((terrenoSemana / totalCierres) * 100);
  const pijPct  = Math.round((pijSemana  / totalCierres) * 100);
  return (
    <div className="flex flex-col gap-3">
      {/* Fila 1 — Flujo de leads */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-500">Entrantes hoy</p>
          <p className="text-[22px] font-bold text-zinc-900">{entrantesHoy}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-500">Reasignados (únicos)</p>
          <p className="text-[22px] font-bold text-brand-600">—</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-500">En gestión</p>
          <p className="text-[22px] font-bold text-amber-700">{enGestion}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] text-zinc-500">Sin atender</p>
          <p className="text-[22px] font-bold text-red-700">{sinAtender}</p>
        </div>
      </div>

      {/* Fila 2 — Cierres por producto (compacta) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-900 px-3 py-2">
          <span className="text-[11px] text-zinc-400">Cierres / sem</span>
          <span className="text-[14px] font-bold text-white">{cierresSemana}</span>
          <span className="rounded bg-zinc-700 px-1.5 py-px text-[9px] font-semibold text-zinc-300">{cierresHoy} hoy</span>
        </div>
        <span className="text-zinc-300">·</span>
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-amber-400" />
          <span className="text-[11px] text-zinc-500">Terreno</span>
          <span className="text-[14px] font-bold text-amber-600">{terrenoSemana}</span>
          {cierresSemana > 0 && <span className="text-[10px] text-amber-500">{terrPct}%</span>}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-indigo-400" />
          <span className="text-[11px] text-zinc-500">Plan Inv. Joven</span>
          <span className="text-[14px] font-bold text-indigo-600">{pijSemana}</span>
          {cierresSemana > 0 && <span className="text-[10px] text-indigo-500">{pijPct}%</span>}
        </div>
      </div>
    </div>
  );
}

function VolverBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
      Volver al despacho
    </button>
  );
}

function SeguimientoTabla({ onReasignar }: { onReasignar?: (nombre: string) => void }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            {['Lead', 'De a quién', 'Estado', 'Tiempo', 'Acción'].map((col) => (
              <th key={col} className="pb-3 pr-6 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 last:pr-0">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_SEGUIMIENTO.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
              <td className="py-3.5 pr-6"><span className="text-[13px] font-semibold text-zinc-900">{item.nombre}</span></td>
              <td className="py-3.5 pr-6"><span className="text-[12px] text-zinc-600">{item.reasignacion}</span></td>
              <td className="py-3.5 pr-6"><StatusPill variant={item.estadoVariant}>{item.estadoLabel}</StatusPill></td>
              <td className="py-3.5 pr-6"><span className="text-[12px] text-zinc-500">{item.tiempo}</span></td>
              <td className="py-3.5">
                {item.accion === 'reasignar'
                  ? <button type="button" onClick={() => onReasignar?.(item.nombre)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700">Reasignar</button>
                  : <span className="text-[12px] text-zinc-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Barra de acciones ─────────────────────────────────────────────────────

const FILTROS_TABS = [
  { value: 'todos' as FiltroDespacho,       label: 'Todos' },
  { value: 'sin-asignar' as FiltroDespacho, label: 'Sin asignar' },
  { value: 'sin-atender' as FiltroDespacho, label: 'Sin atender' },
  { value: 'reasignados' as FiltroDespacho, label: 'Reasignados' },
];

interface BarraAccionesProps {
  filtro: FiltroDespacho; onFiltro: (f: FiltroDespacho) => void;
  onSeguimiento: () => void; onLista: () => void;
  onMetricas: () => void; onDatosGlobales: () => void;
  sinAtenderCount: number;
}
function BarraAcciones({ filtro, onFiltro, onSeguimiento, onLista, onMetricas, onDatosGlobales, sinAtenderCount }: BarraAccionesProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl options={FILTROS_TABS} value={filtro} onChange={onFiltro} size="sm" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMetricas} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </svg>
          Datos Reasignados
        </button>
        <button type="button" onClick={onDatosGlobales} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" />
          </svg>
          Datos Globales
        </button>
        <button type="button" onClick={onLista} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Lista de leads
        </button>
        <button type="button" onClick={onSeguimiento} className="relative flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-700">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          Seguimiento
          {sinAtenderCount > 0 && <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-brand-600">{sinAtenderCount}</span>}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function PanelDespacho({ leads = [], adminDashboard }: PanelDespachoProps) {
  const [filtro, setFiltro]     = useState<FiltroDespacho>('todos');
  const [vista, setVista]       = useState<VistaDespacho>('panel');
  const [busqueda, setBusqueda] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [colaExpandida, setColaExpandida] = useState(false);
  const [colaVista, setColaVista]         = useState<'cards' | 'tabla'>('cards');

  // Panel derecho (equipo)
  const [panel, setPanel] = useState<PanelState>(null);

  // Modal reasignar (lista de leads)
  const [reasignarLeadId, setReasignarLeadId]     = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [motivo, setMotivo]                        = useState('');
  const [asignaciones, setAsignaciones]            = useState<Record<string, string>>({});

  // ── Datos derivados de la API real ────────────────────────────────────

  // Equipo: usar adminDashboard.supervisores si está disponible
  const equipoSupervisores: MockSupervisorConEquipo[] = useMemo(() => {
    if (!adminDashboard?.supervisores?.length) return MOCK_SUPERVISORES;
    return adminDashboard.supervisores.map((sup) => ({
      id: sup.supervisorId,
      nombre: sup.supervisorNombre,
      initials: iniciales(sup.supervisorNombre),
      leads: sup.totales.leadsTotal,
      maxLeads: 30,
      scores: { tratadosHoy: sup.totales.tratadosHoy, entrevistasSemana: sup.totales.entrevistasSemana, cierresSemana: sup.totales.cierresSemana, sinContactar: 0 },
      promotores: sup.promotores.map((p) => ({
        id: p.promotorId,
        nombre: p.promotorNombre,
        initials: iniciales(p.promotorNombre),
        leads: p.leadsTotal,
        maxLeads: 15,
        scores: { tratadosHoy: p.tratadosHoy, entrevistasSemana: p.entrevistasSemana, cierresSemana: p.cierresSemana, sinContactar: 0 },
      })),
    }));
  }, [adminDashboard]);

  const todosOperadores = useMemo(() => buildOperadores(equipoSupervisores), [equipoSupervisores]);

  // Stats: cierres/terreno/PIJ desde adminDashboard
  const statsVentas = useMemo(() => {
    if (!adminDashboard) return { cierresSemana: 7, cierresHoy: 2, terrenoSemana: 4, pijSemana: 3 };
    const cierresSemana = adminDashboard.supervisores.reduce((s, sup) => s + sup.totales.cierresSemana, 0);
    const terrenoSemana = adminDashboard.supervisores.reduce((s, sup) => s + sup.totales.ventasTerrenoSemana, 0);
    const pijSemana     = adminDashboard.supervisores.reduce((s, sup) => s + sup.totales.ventasPijSemana, 0);
    return { cierresSemana, cierresHoy: adminDashboard.resumenHoy.cierres, terrenoSemana, pijSemana };
  }, [adminDashboard]);

  // Stats flujo: entrantes/gestión/sinAtender desde leads reales
  const statsFlujo = useMemo(() => {
    if (!leads.length) return { entrantesHoy: 47, enGestion: 19, sinAtender: 5 };
    const hoy = new Date().toISOString().slice(0, 10);
    const entrantesHoy = leads.filter((l) => (l.fechaAlta ?? l.fechaObtencion)?.startsWith(hoy)).length;
    const enGestion = leads.filter((l) => l.seguimiento.canal != null && !l.seguimiento.resultadoEntrevista).length;
    const sinAtender = leads.filter((l) => !l.seguimiento.canal && !l.seguimiento.huboEntrevista).length;
    return { entrantesHoy, enGestion, sinAtender };
  }, [leads]);

  // Cola de entrantes desde leads reales
  const colaReal: Record<FiltroDespacho, MockLeadCola[]> = useMemo(() => {
    if (!leads.length) return MOCK_COLA_POR_FILTRO;
    const sorted = [...leads].sort((a, b) => new Date(b.fechaObtencion).getTime() - new Date(a.fechaObtencion).getTime()).slice(0, 30);
    const mapped = sorted.map(leadToColaMock);
    return {
      todos:          mapped.slice(0, 10),
      'sin-asignar':  mapped.filter((l) => l.estadoVariant === 'nuevo').slice(0, 10),
      'sin-atender':  mapped.filter((l) => l.reasignadoA).slice(0, 10),
      reasignados:    mapped.filter((l) => l.estadoVariant !== 'nuevo').slice(0, 10),
    };
  }, [leads]);

  // Lista de leads completa desde reales (para vista "Lista")
  const listaLeadsReal: MockLeadLista[] = useMemo(() => {
    if (!leads.length) return MOCK_LEADS_LISTA;
    return leads.slice(0, 50).map((lead) => {
      const { estadoVariant, estadoLabel } = leadEstado(lead);
      const origenMap: Record<string, string> = { qr: 'QR', encuesta: 'Encuesta', sorteo: 'Sorteo', redes: 'Redes', manual: 'Manual' };
      const canal = `${origenMap[lead.origen ?? ''] ?? 'Manual'}${lead.codigoCampania ? ` · ${lead.codigoCampania}` : ''}`;
      const asignadoA = lead.promotorNombre ? abrev(lead.promotorNombre) : '—';
      const variant = estadoVariant === 'nuevo' ? 'nuevo' : estadoVariant === 'contactado' ? 'contactado' : estadoVariant === 'terreno' ? 'terreno' : 'in-progress';
      return { id: lead.id, nombre: lead.nombre, telefono: lead.telefono, estadoVariant: variant as MockLeadLista['estadoVariant'], estadoLabel, tags: [lead.lista === 'entrevista' ? 'ENTREVISTA' : 'CONTACTO'], canal, asignadoA, tiempo: calcTiempo(lead.fechaObtencion) };
    });
  }, [leads]);

  // ── Estado derivado ───────────────────────────────────────────────────

  const leadsEnCola     = colaReal[filtro];
  const sinAtenderCount = MOCK_SEGUIMIENTO.filter((i) => i.accion === 'reasignar').length;
  const leadReasignando = reasignarLeadId ? listaLeadsReal.find((l) => l.id === reasignarLeadId) : null;

  const toggleSupervisor = (id: string) => setExpandedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleConfirmarModal = () => {
    if (!reasignarLeadId || !selectedPersonaId) return;
    const op = todosOperadores.find((o) => o.id === selectedPersonaId);
    if (op) setAsignaciones((prev) => ({ ...prev, [reasignarLeadId]: abrev(op.nombre) }));
    setReasignarLeadId(null); setSelectedPersonaId(null); setMotivo('');
  };

  const leadsFiltrados = listaLeadsReal.filter((l) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return l.nombre.toLowerCase().includes(q) || l.telefono.includes(q) || l.tags.some((t) => t.toLowerCase().includes(q));
  });

  // ── Vista: Datos Reasignados ────────────────────────────────────────────
  if (vista === 'metricas') {
    return <PanelMetricasGlobal onVolver={() => setVista('panel')} adminDashboard={adminDashboard} />;
  }

  // ── Vista: Datos Globales ───────────────────────────────────────────────
  if (vista === 'datos-globales') {
    return <PanelDatosGlobales onVolver={() => setVista('panel')} adminDashboard={adminDashboard} leads={leads} />;
  }

  // ── Vista: Lista completa ──────────────────────────────────────────────
  if (vista === 'lista') {
    return (
      <>
        {leadReasignando && (
          <ReasignarModal
            lead={leadReasignando} asignadoActual={asignaciones[leadReasignando.id] ?? leadReasignando.asignadoA}
            selectedId={selectedPersonaId} onSelect={setSelectedPersonaId}
            motivo={motivo} onMotivo={setMotivo}
            onConfirm={handleConfirmarModal}
            onClose={() => { setReasignarLeadId(null); setSelectedPersonaId(null); setMotivo(''); }}
            operadores={todosOperadores}
          />
        )}
        <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">
          <StatsRow {...statsFlujo} {...statsVentas} />
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold text-zinc-900">Lista de leads</h2>
                <p className="mt-1 text-[12px] text-zinc-500">Todos los leads del sistema · podés reasignarlos a cualquier supervisor o promotor</p>
              </div>
              <VolverBtn onClick={() => { setVista('panel'); setBusqueda(''); }} />
            </div>
            <div className="mt-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, teléfono o zona…"
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-4 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
                />
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-100" />
            <p className="mt-3 text-[11px] text-zinc-500">{leadsFiltrados.length} leads</p>
            <div className="mt-2 flex flex-col gap-2">
              {leadsFiltrados.length === 0
                ? <p className="py-8 text-center text-[13px] text-zinc-400">Sin resultados para "{busqueda}"</p>
                : leadsFiltrados.map((lead) => {
                  const asignadoMostrado = asignaciones[lead.id] ?? lead.asignadoA;
                  return (
                    <div key={lead.id} className={`flex items-center gap-4 rounded-xl border p-4 ${LISTA_BG[lead.estadoVariant]}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-semibold text-zinc-900">{lead.nombre}</span>
                          <span className="text-[12px] text-zinc-500">{lead.telefono}</span>
                          <StatusPill variant={pillVariant(lead.estadoVariant)} dot>{lead.estadoLabel}</StatusPill>
                          {lead.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                          <span>Canal: <span className="text-zinc-700">{lead.canal}</span></span>
                          <span>·</span>
                          <span>Asignado a: <span className={`font-semibold ${asignadoMostrado === '—' ? 'text-zinc-400' : 'text-zinc-700'}`}>{asignadoMostrado}</span></span>
                          <span>·</span>
                          <span>{lead.tiempo}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setReasignarLeadId(lead.id); setSelectedPersonaId(null); }}
                        className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"
                      >
                        Reasignar
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Vista: Seguimiento ──────────────────────────────────────────────────
  if (vista === 'seguimiento') {
    return (
      <>
        <PanelDerecho
          panel={panel}
          onClose={() => setPanel(null)}
          onAbrirReasignar={(titulo, count) => setPanel({ tipo: 'reasignar', titulo, leadCount: count })}
          onConfirmarAsignacion={(leadId, personaId) => {
            const op = todosOperadores.find((o) => o.id === personaId);
            if (op) setAsignaciones((prev) => ({ ...prev, [leadId]: abrev(op.nombre) }));
          }}
          operadores={todosOperadores}
        />
        <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">
          <StatsRow {...statsFlujo} {...statsVentas} />
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-bold text-zinc-900">Seguimiento de reasignados</h2>
                <p className="mt-1 text-[12px] text-zinc-500">lo que despachaste y cómo va · si sigue sin atender, reasignalo de nuevo</p>
              </div>
              <VolverBtn onClick={() => setVista('panel')} />
            </div>
            <div className="mt-4 border-t border-zinc-100" />
            <div className="mt-4">
              <SeguimientoTabla onReasignar={(nombre) => setPanel({ tipo: 'reasignar', titulo: nombre })} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Vista: Panel principal ──────────────────────────────────────────────
  return (
    <>
      <PanelDerecho
        panel={panel}
        onClose={() => setPanel(null)}
        onAbrirReasignar={(titulo, count) => setPanel({ tipo: 'reasignar', titulo, leadCount: count })}
        onConfirmarAsignacion={(leadId, personaId) => {
          const op = todosOperadores.find((o) => o.id === personaId);
          if (op) setAsignaciones((prev) => ({ ...prev, [leadId]: abrev(op.nombre) }));
        }}
        operadores={todosOperadores}
      />

      <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">
        <StatsRow {...statsFlujo} {...statsVentas} />
        <BarraAcciones
          filtro={filtro} onFiltro={setFiltro}
          onSeguimiento={() => setVista('seguimiento')}
          onLista={() => setVista('lista')}
          onMetricas={() => setVista('metricas')}
          onDatosGlobales={() => setVista('datos-globales')}
          sinAtenderCount={sinAtenderCount}
        />

        <div className="mt-5 flex gap-6">
          {/* Cola */}
          <div className="w-[392px] shrink-0">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              {/* Header cola */}
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold text-zinc-900">Cola de entrantes</h2>
                <div className="flex items-center gap-2">
                  {/* Toggle cards / tabla */}
                  <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
                    <button
                      type="button"
                      title="Vista tarjetas"
                      onClick={() => setColaVista('cards')}
                      className={`flex items-center justify-center rounded-md p-1.5 transition-all ${colaVista === 'cards' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Vista tabla compacta"
                      onClick={() => setColaVista('tabla')}
                      className={`flex items-center justify-center rounded-md p-1.5 transition-all ${colaVista === 'tabla' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow shadow-green-200" />
                </div>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">en tiempo real · por orden de llegada</p>
              <div className="mt-3 border-t border-zinc-100" />

              {leadsEnCola.length === 0 ? (
                <p className="mt-6 text-center text-[12px] text-zinc-400">Sin leads en esta categoría</p>
              ) : (
                <>
                  {colaVista === 'cards' ? (
                    <div className="mt-3 flex flex-col gap-3">
                      {leadsEnCola.slice(0, colaExpandida ? undefined : 10).map((l) => (
                        <ColaLeadCard
                          key={l.id}
                          lead={l}
                          onReasignar={() => setPanel({ tipo: 'reasignar', titulo: l.nombre })}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {leadsEnCola.slice(0, colaExpandida ? undefined : 10).map((l) => (
                        <ColaLeadTabla
                          key={l.id}
                          lead={l}
                          onReasignar={() => setPanel({ tipo: 'reasignar', titulo: l.nombre })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Expandir / colapsar */}
                  {leadsEnCola.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setColaExpandida((v) => !v)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-[12px] font-semibold text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
                    >
                      {colaExpandida ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
                          Mostrar menos
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                          Ver {leadsEnCola.length - 10} más
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Equipo */}
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-baseline gap-1">
                <h2 className="text-[15px] font-bold text-zinc-900">Equipo</h2>
                <span className="text-[11px] text-zinc-500">· hacé clic en "Promotores" para desplegar el equipo de cada supervisor</span>
              </div>
              <div className="mt-3 border-t border-zinc-100" />
              <div className="mt-3">
                <EquipoSection
                  supervisores={equipoSupervisores}
                  expandedIds={expandedIds}
                  onToggle={toggleSupervisor}
                  onVerSupervisor={(s) => setPanel({ tipo: 'scores-supervisor', sup: s })}
                  onVerPromotor={(p, supNombre) => setPanel({ tipo: 'leads-promotor', prom: p, supNombre })}
                  onReasignarPromotor={(p) => setPanel({ tipo: 'reasignar', titulo: `Leads de ${p.nombre}`, leadCount: p.leads })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
