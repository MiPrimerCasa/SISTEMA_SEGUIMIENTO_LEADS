import { useState, type ReactNode } from 'react';
import { useLeadsFilter } from '../../hooks/useLeadsFilter';
import type { Barrio, Lead, Producto, Promotor, RolUsuario, SeguimientoLead } from '../../types';
import { LeadCard } from './LeadCard';
import { LeadModalForm } from './LeadModalForm';

type ListaKey = 'entrevistaPendiente' | 'paraContactar' | 'seguimiento' | 'compraron';

const COLUMNAS_ACTIVAS: Array<{
  id: string;
  tituloTab: string;
  tituloLargo: string;
  key: ListaKey;
}> = [
  {
    id: 'entrevista',
    tituloTab: 'Entrevista',
    tituloLargo: 'Entrevista pendiente',
    key: 'entrevistaPendiente',
  },
  {
    id: 'contacto',
    tituloTab: 'Contactar',
    tituloLargo: 'Para contactar',
    key: 'paraContactar',
  },
];

const SECCION_SEGUIMIENTO = {
  id: 'seguimiento',
  tituloTab: 'Seguimiento',
  tituloLargo: 'Seguimiento — entrevista reagendada',
  key: 'seguimiento' as const,
};

const SECCION_COMPRO = {
  id: 'compro',
  tituloTab: 'Compraron',
  tituloLargo: 'Compraron — cerrados',
  key: 'compraron' as const,
};

const TABS_MOBILE: Array<{
  id: string;
  tituloTab: string;
  key: ListaKey;
}> = [...COLUMNAS_ACTIVAS, SECCION_SEGUIMIENTO, SECCION_COMPRO];

function ListaLeads({
  items,
  onAbrir,
  variante,
  vacio,
  promotores,
  productos,
  barrios,
}: {
  items: Lead[];
  onAbrir: (lead: Lead) => void;
  variante: 'activo' | 'seguimiento' | 'compro';
  vacio: string;
  promotores: Promotor[];
  productos: Producto[];
  barrios: Barrio[];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-[13px] text-zinc-400">
        {vacio}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onClick={onAbrir}
          variante={variante}
          promotores={promotores}
          productos={productos}
          barrios={barrios}
        />
      ))}
    </div>
  );
}

function SectionEyebrow({ titulo, contador }: { titulo: string; contador: number }) {
  return (
    <div className="mb-4 flex items-baseline gap-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-900">
        {titulo}
      </span>
      <span className="text-[13px] tabular-nums text-zinc-400">{contador}</span>
    </div>
  );
}

function SeccionColapsable({
  tabActivo,
  tabId,
  abierto,
  onToggle,
  titulo,
  contador,
  children,
}: {
  tabActivo: string;
  tabId: string;
  abierto: boolean;
  onToggle: () => void;
  titulo: string;
  contador: number;
  children: ReactNode;
}) {
  const visibleMobile = tabActivo === tabId;

  return (
    <section className={`mt-10 ${visibleMobile ? '' : 'hidden lg:block'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`${
          visibleMobile ? 'hidden' : 'flex'
        } w-full items-center justify-between gap-2 pb-4 text-left touch-manipulation lg:flex lg:cursor-default lg:pointer-events-none`}
        aria-expanded={abierto}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            {titulo}
          </span>
          <span className="text-[13px] tabular-nums text-zinc-400">{contador}</span>
        </div>
        <span className="text-[11px] text-zinc-400 lg:hidden">{abierto ? '▲' : '▼'}</span>
      </button>

      {(abierto || visibleMobile) && <div className="space-y-3">{children}</div>}
    </section>
  );
}

interface LeadsPanelProps {
  leads: Lead[];
  rolUsuario: RolUsuario;
  promotores: Promotor[];
  productos: Producto[];
  barrios: Barrio[];
  onActualizarLead: (leadId: string, seguimiento: SeguimientoLead) => void | Promise<void>;
}

export function LeadsPanel({
  leads,
  rolUsuario,
  promotores,
  productos,
  barrios,
  onActualizarLead,
}: LeadsPanelProps) {
  const { entrevistaPendiente, paraContactar, seguimiento, compraron } = useLeadsFilter(leads);
  const listas: Record<ListaKey, Lead[]> = {
    entrevistaPendiente,
    paraContactar,
    seguimiento,
    compraron,
  };

  const [tabActivo, setTabActivo] = useState('entrevista');
  const [seguimientoAbierto, setSeguimientoAbierto] = useState(true);
  const [comproAbierto, setComproAbierto] = useState(true);
  const [leadSeleccionado, setLeadSeleccionado] = useState<Lead | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const abrirLead = (lead: Lead) => {
    setLeadSeleccionado(lead);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setLeadSeleccionado(null);
  };

  const guardar = async (leadId: string, seguimientoData: SeguimientoLead) => {
    await onActualizarLead(leadId, seguimientoData);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-12 sm:px-6">

      {/* Info banner */}
      <div className="mb-6 flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          className="mt-0.5 shrink-0 text-zinc-400"
          aria-hidden="true"
        >
          <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M7.5 6.5v4M7.5 4.5v.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-[13px] text-zinc-500">
          <span className="font-medium text-zinc-700">Reagendar</span> mueve el lead a{' '}
          <span className="font-medium text-zinc-700">Seguimiento</span>.{' '}
          <span className="font-medium text-zinc-700">Compró</span> lo archiva abajo. El panel
          superior queda solo para el trabajo del día.
        </p>
      </div>

      {/* Navegación mobile */}
      <nav
        className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
        aria-label="Secciones de leads"
      >
        {TABS_MOBILE.map((tab) => {
          const activo = tabActivo === tab.id;
          const count = listas[tab.key].length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabActivo(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors touch-manipulation ${
                activo
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              }`}
            >
              {tab.tituloTab}
              <span className="tabular-nums text-[11px] text-zinc-400">{count}</span>
            </button>
          );
        })}
      </nav>

      {/* Columnas activas desktop */}
      <div className="grid gap-12 lg:grid-cols-2">
        {COLUMNAS_ACTIVAS.map((col) => {
          const items = listas[col.key];
          const esMobileOculta = tabActivo !== col.id;

          return (
            <div key={col.id} className={esMobileOculta ? 'hidden lg:block' : ''}>
              <SectionEyebrow titulo={col.tituloLargo} contador={items.length} />
              <ListaLeads
                items={items}
                onAbrir={abrirLead}
                variante="activo"
                vacio="Sin leads pendientes"
                promotores={promotores}
                productos={productos}
                barrios={barrios}
              />
            </div>
          );
        })}
      </div>

      {/* Sección seguimiento */}
      <SeccionColapsable
        tabActivo={tabActivo}
        tabId="seguimiento"
        abierto={seguimientoAbierto}
        onToggle={() => setSeguimientoAbierto((v) => !v)}
        titulo={SECCION_SEGUIMIENTO.tituloLargo}
        contador={seguimiento.length}
      >
        <ListaLeads
          items={seguimiento}
          onAbrir={abrirLead}
          variante="seguimiento"
          vacio="Nadie con entrevista reagendada por ahora"
          promotores={promotores}
          productos={productos}
          barrios={barrios}
        />
      </SeccionColapsable>

      {/* Sección compraron */}
      <SeccionColapsable
        tabActivo={tabActivo}
        tabId="compro"
        abierto={comproAbierto}
        onToggle={() => setComproAbierto((v) => !v)}
        titulo={SECCION_COMPRO.tituloLargo}
        contador={compraron.length}
      >
        <ListaLeads
          items={compraron}
          onAbrir={abrirLead}
          variante="compro"
          vacio="Aún no hay ventas registradas"
          promotores={promotores}
          productos={productos}
          barrios={barrios}
        />
      </SeccionColapsable>

      <LeadModalForm
        lead={leadSeleccionado}
        open={modalAbierto}
        rolUsuario={rolUsuario}
        productos={productos}
        barrios={barrios}
        onClose={cerrarModal}
        onSave={guardar}
      />
    </div>
  );
}
