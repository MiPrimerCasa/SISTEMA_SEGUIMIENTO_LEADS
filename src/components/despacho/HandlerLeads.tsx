import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdminLeads,
  modificarDatosLead,
  resetearLeadSeguimiento,
} from '../../api/client';
import type { ModificarDatosLeadPayload } from '../../api/client';
import type { Lead } from '../../types';
import { AdminModificarLeadModal } from '../admin/AdminModificarLeadModal';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFecha(fechaStr?: string): string {
  if (!fechaStr) return '-';
  try {
    const d = new Date(fechaStr.includes('T') ? fechaStr : fechaStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return fechaStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return fechaStr;
  }
}

function cleanTel(tel?: string): string {
  if (!tel) return '-';
  return tel.replace(/@\w+$/, '').trim();
}

// ── Estado badge ──────────────────────────────────────────────────────────

function EstadoBadge({ lista }: { lista?: string }) {
  switch (lista) {
    case 'compro':
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          Venta
        </span>
      );
    case 'seguimiento':
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
          Seguimiento
        </span>
      );
    case 'contacto':
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
          Contactado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 border border-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
          Prioridad
        </span>
      );
  }
}

// ── Tipos de filtro ────────────────────────────────────────────────────────

type FiltroEstado  = 'todos' | 'entrevista' | 'contacto' | 'seguimiento' | 'compro';
type FiltroOrigen  = 'todos' | 'encuesta' | 'sorteo' | 'manual' | 'redes';

const ESTADO_OPTS: { value: FiltroEstado; label: string }[] = [
  { value: 'todos',       label: 'Todos los estados' },
  { value: 'entrevista',  label: 'Prioridad' },
  { value: 'contacto',    label: 'Contactado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'compro',      label: 'Venta' },
];

const ORIGEN_OPTS: { value: FiltroOrigen; label: string }[] = [
  { value: 'todos',    label: 'Todos los orígenes' },
  { value: 'encuesta', label: 'Encuesta' },
  { value: 'sorteo',   label: 'Sorteo' },
  { value: 'redes',    label: 'Redes' },
  { value: 'manual',   label: 'Manual' },
];

const ORIGEN_LABEL: Record<string, string> = {
  encuesta: 'Encuesta',
  sorteo:   'Sorteo',
  redes:    'Redes',
  manual:   'Manual',
  qr:       'QR',
};

// ── Componente principal ──────────────────────────────────────────────────

export function HandlerLeads() {
  const [leads, setLeads]             = useState<Lead[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [errorCarga, setErrorCarga]   = useState('');

  const [busqueda, setBusqueda]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>('todos');

  const [modificandoLead, setModificandoLead] = useState<Lead | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    setCargando(true);
    setErrorCarga('');
    fetchAdminLeads()
      .then((data) => { setLeads(data); setCargando(false); })
      .catch((err) => {
        setErrorCarga(err instanceof Error ? err.message : 'Error al cargar leads.');
        setCargando(false);
      });
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────────────
  const leadsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return leads.filter((l) => {
      const matchText =
        !q ||
        l.nombre?.toLowerCase().includes(q) ||
        l.telefono?.includes(q) ||
        l.promotorNombre?.toLowerCase().includes(q) ||
        l.supervisorNombre?.toLowerCase().includes(q);
      const matchEstado = filtroEstado === 'todos' || l.lista === filtroEstado;
      const matchOrigen = filtroOrigen === 'todos' || l.origen === filtroOrigen;
      return matchText && matchEstado && matchOrigen;
    });
  }, [leads, busqueda, filtroEstado, filtroOrigen]);

  // ── Acciones API ──────────────────────────────────────────────────────
  const handleGuardar = async (leadId: string, datos: ModificarDatosLeadPayload) => {
    const updatedLead = await modificarDatosLead(leadId, datos);
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    if (modificandoLead?.id === updatedLead.id) setModificandoLead(updatedLead);
  };

  const handleReset = async () => {
    if (!modificandoLead) return;
    const updatedLead = await resetearLeadSeguimiento(modificandoLead.id);
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setModificandoLead(updatedLead);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1480px] px-4 py-5 md:px-6">

      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
          Manager Leads · Administración
        </p>
        <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em] text-zinc-900">
          Handler Leads
        </h2>
        <p className="mt-0.5 text-[13px] text-zinc-500">
          Todos los leads del sistema · doble clic para editar o limpiar seguimiento
        </p>
      </div>

      {/* Barra de filtros */}
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

        {/* Filtro origen */}
        <select
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value as FiltroOrigen)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] text-zinc-700 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-100"
        >
          {ORIGEN_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Conteo */}
        <span className="ml-auto text-[12px] text-zinc-500">
          {cargando ? 'Cargando…' : `${leadsFiltrados.length} lead${leadsFiltrados.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">

        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-brand-600" />
            <p className="text-[13px] text-zinc-500 font-medium animate-pulse">
              Cargando base de datos completa…
            </p>
          </div>
        ) : errorCarga ? (
          <p className="px-6 py-10 text-center text-[13px] font-medium text-red-600">
            {errorCarga}
          </p>
        ) : leadsFiltrados.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-zinc-400">
            Sin resultados para la búsqueda actual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-100 text-[13px]">
              <thead>
                <tr className="bg-zinc-50/60 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  <th className="py-3 pl-5 pr-3 text-left">Cliente</th>
                  <th className="px-3 py-3 text-left">Promotor</th>
                  <th className="px-3 py-3 text-left">Supervisor</th>
                  <th className="px-3 py-3 text-center">Estado</th>
                  <th className="px-3 py-3 text-center">Origen</th>
                  <th className="px-3 py-3 text-center">Fecha</th>
                  <th className="py-3 pl-3 pr-5 text-center text-[10px] text-zinc-300">
                    Doble clic para editar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {leadsFiltrados.map((lead) => (
                  <tr
                    key={lead.id}
                    onDoubleClick={() => setModificandoLead(lead)}
                    className="cursor-pointer transition-colors hover:bg-brand-50/40 active:bg-brand-50"
                    title="Doble clic para editar"
                  >
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold text-zinc-900">{lead.nombre}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                        {cleanTel(lead.telefono)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-zinc-700">
                      {lead.promotorNombre || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-zinc-500">
                      {lead.supervisorNombre || <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <EstadoBadge lista={lead.lista} />
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-500">
                      {ORIGEN_LABEL[lead.origen ?? ''] ?? lead.origen ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-500 tabular-nums">
                      {formatFecha(lead.fechaAlta ?? lead.fechaObtencion)}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-center">
                      <button
                        type="button"
                        onClick={() => setModificandoLead(lead)}
                        className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal edición + clear */}
      <AdminModificarLeadModal
        lead={modificandoLead}
        open={modificandoLead !== null}
        onClose={() => setModificandoLead(null)}
        onSave={handleGuardar}
        onReset={handleReset}
      />
    </div>
  );
}
