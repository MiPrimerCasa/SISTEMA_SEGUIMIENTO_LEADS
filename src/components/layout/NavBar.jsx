import logoMpc from '../../assets/Logo-Arreglado (1).png';
import { SegmentedControl } from '../ui/SegmentedControl';

const TABS = [
  { value: 'leads', label: 'Leads' },
  { value: 'promotores', label: 'Promotores' },
];

export function NavBar({ vistaActiva, onCambiarVista, rolUsuario, onCambiarRol }) {
  const otroRol = rolUsuario === 'promotor' ? 'supervisor' : 'promotor';
  const rolLabel = rolUsuario === 'promotor' ? 'Promotor' : 'Supervisor';

  return (
    <header
      className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Fila 1: marca + rol (mobile) / marca + nav + sesión (desktop) */}
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:mx-auto md:h-16 md:max-w-5xl md:px-6">

        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={logoMpc}
            alt="Mi Primer Casa S.A."
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 sm:block">
              Mi Primer Casa S.A.
            </p>
            <p className="truncate text-[13px] font-semibold text-zinc-900">
              Mi Primer Casa
            </p>
          </div>
        </div>

        {/* Desktop: nav + sesión */}
        <div className="hidden items-center gap-4 md:flex">
          <SegmentedControl
            options={TABS}
            value={vistaActiva}
            onChange={onCambiarVista}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile: chip de rol tappable — toca para cambiar */}
          <button
            type="button"
            onClick={() => onCambiarRol(otroRol)}
            touch-action="manipulation"
            className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-600 transition-colors active:bg-brand-50 active:text-brand-700 md:hidden"
            aria-label={`Sesión: ${rolLabel}. Tocar para cambiar.`}
          >
            {rolLabel}
            <svg
              width="10" height="10" viewBox="0 0 10 10" fill="none"
              className="shrink-0 text-zinc-400" aria-hidden="true"
            >
              <path d="M5 1.5v7M5 1.5L2.5 4M5 1.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 8.5L2.5 6M5 8.5L7.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Desktop: session switcher */}
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
              Demo
            </span>
            <SegmentedControl
              options={[
                { value: 'promotor', label: 'Promotor' },
                { value: 'supervisor', label: 'Supervisor' },
              ]}
              value={rolUsuario}
              onChange={onCambiarRol}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Fila 2 mobile: underline tabs */}
      <div className="flex border-t border-zinc-100 md:hidden">
        {TABS.map((tab) => {
          const active = vistaActiva === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onCambiarVista(tab.value)}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 py-2.5 text-[14px] font-semibold transition-colors ${
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
    </header>
  );
}
