import { LOGO_MPC_ALT, LOGO_MPC_URL } from '../../brand';
import { NotificationsCenter } from './NotificationsCenter';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { RolUsuario, UsuarioSesion, VistaActiva } from '../../types';

const TABS_SUPERVISOR = [
  { value: 'leads' as const, label: 'Leads' },
  { value: 'promotores' as const, label: 'Promotores' },
  { value: 'calendario' as const, label: 'Calendario' },
];

const TABS_SUPERVISOR_GLOBAL = [
  { value: 'leads' as const, label: 'Leads' },
  { value: 'promotores' as const, label: 'Promotores' },
  { value: 'calendario' as const, label: 'Calendario' },
  { value: 'admin' as const, label: 'Panel global' },
];

const TABS_PROMOTOR = [
  { value: 'leads' as const, label: 'Leads' },
  { value: 'calendario' as const, label: 'Calendario' },
  { value: 'metricas' as const, label: 'Métricas' },
];

const TABS_PROMOTOR_GLOBAL = [
  { value: 'leads' as const, label: 'Leads' },
  { value: 'calendario' as const, label: 'Calendario' },
  { value: 'metricas' as const, label: 'Métricas' },
  { value: 'admin' as const, label: 'Panel global' },
];

const TABS_SUPERADMIN = [{ value: 'admin' as const, label: 'Panel global' }];
const TABS_MANAGER    = [
  { value: 'despacho'     as const, label: 'Despacho' },
  { value: 'handler'      as const, label: 'Handler Leads' },
  { value: 'entrevistas'  as const, label: 'Entrevistas' },
];

const ROL_LABEL: Record<RolUsuario, string> = {
  promotor:   'Promotor',
  supervisor: 'Supervisor',
  superadmin: 'Superadmin',
  manager:    'Manager Leads',
};

const ROL_BADGE_CLASS: Record<RolUsuario, string> = {
  promotor:   'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  supervisor: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  superadmin: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  manager:    'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
};

interface NavBarProps {
  vistaActiva: VistaActiva;
  onCambiarVista: (id: VistaActiva) => void;
  usuario: UsuarioSesion;
  onLogout: () => void;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export function NavBar({ vistaActiva, onCambiarVista, usuario, onLogout, isDark, onToggleDark }: NavBarProps) {
  const tabs: Array<{ value: VistaActiva; label: string }> =
    usuario.rol === 'superadmin'
      ? TABS_SUPERADMIN
      : usuario.rol === 'manager'
        ? TABS_MANAGER
        : usuario.rol === 'supervisor'
          ? usuario.panelGlobal
            ? TABS_SUPERVISOR_GLOBAL
            : TABS_SUPERVISOR
          : usuario.panelGlobal
            ? TABS_PROMOTOR_GLOBAL
            : TABS_PROMOTOR;

  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:bg-zinc-900/90 dark:border-zinc-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Fila 1: marca + usuario */}
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:mx-auto md:h-16 md:max-w-5xl md:px-6">

        {/* Brand */}
        {usuario.rol === 'manager' ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={LOGO_MPC_URL}
              alt={LOGO_MPC_ALT}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:block">
                Mi Primer Casa S.A.
              </p>
              <p className="truncate text-[13px] font-semibold text-zinc-900">mpcleads</p>
              <p className="truncate text-[11px] text-zinc-400">
                Manager Leads ·{' '}
                {vistaActiva === 'handler' ? 'Handler Leads' : vistaActiva === 'entrevistas' ? 'Entrevistas' : 'Despacho'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={LOGO_MPC_URL}
              alt={LOGO_MPC_ALT}
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:block">
                Mi Primer Casa S.A.
              </p>
              <p className="truncate text-[13px] font-semibold text-zinc-900">
                Mi Primer Casa
              </p>
              <p className="truncate text-[11px] text-zinc-400 md:hidden">
                {usuario.nombre}
              </p>
            </div>
          </div>
        )}

        {/* Desktop: nav */}
        <div className="hidden items-center gap-4 md:flex">
          {tabs.length > 1 && (
            <SegmentedControl
              options={tabs}
              value={vistaActiva}
              onChange={onCambiarVista}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {usuario.rol === 'manager' ? (
            /* Manager: bloque usuario con "en vivo" + badge "MANAGER LEADS" */
            <div className="hidden flex-col items-end md:flex">
              <span className="text-[13px] font-semibold text-zinc-700">{usuario.nombre}</span>
              <span className="mt-0.5 rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">
                MANAGER LEADS
              </span>
            </div>
          ) : (
            <>
              <NotificationsCenter rol={usuario.rol} />
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${ROL_BADGE_CLASS[usuario.rol]}`}
              >
                {ROL_LABEL[usuario.rol]}
              </span>
              <span className="hidden max-w-[140px] truncate text-[13px] text-zinc-500 md:inline">
                {usuario.nombre}
              </span>
            </>
          )}

          {/* Toggle dark/light */}
          {onToggleDark && (
            <button
              type="button"
              onClick={onToggleDark}
              aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              {isDark ? (
                // Sol
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                // Luna
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            style={{ touchAction: 'manipulation' }}
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-zinc-500 transition-colors active:bg-brand-50 active:text-brand-700 hover:text-zinc-700 md:px-3"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Fila 2 mobile: underline tabs */}
      {tabs.length > 1 && (
        <div className="flex border-t border-zinc-100 md:hidden">
          {tabs.map((tab) => {
            const active = vistaActiva === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onCambiarVista(tab.value)}
                style={{ touchAction: 'manipulation' }}
                className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors xs:text-[14px] ${
                  active
                    ? 'border-b-2 border-brand-600 text-brand-600'
                    : 'border-b-2 border-transparent text-zinc-400 active:text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
