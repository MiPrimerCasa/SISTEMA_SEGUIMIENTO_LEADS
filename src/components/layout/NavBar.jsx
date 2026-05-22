const TABS = [
  { id: 'leads', label: 'Leads' },
  { id: 'promotores', label: 'Promotores' },
];

const ROLES = [
  { id: 'promotor', label: 'Promotor' },
  { id: 'supervisor', label: 'Supervisor' },
];

export function NavBar({ vistaActiva, onCambiarVista, rolUsuario, onCambiarRol }) {
  return (
    <header className="sticky top-0 z-40 bg-brand shadow-md">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo-mpc.png"
              alt="Mi Primer Casa S.A."
              className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm sm:h-14 sm:w-14"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/90 sm:text-xs">
                Mi Primer Casa S.A.
              </p>
              <h1 className="truncate text-sm font-bold uppercase text-white sm:text-base">
                Seguimiento de Leads
              </h1>
            </div>
          </div>
          <nav
            className="flex shrink-0 gap-1 rounded-full bg-black/20 p-1"
            aria-label="Vistas principales"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onCambiarVista(tab.id)}
                className={`min-h-11 rounded-full px-3 py-2 text-xs font-bold uppercase transition touch-manipulation sm:px-4 sm:text-sm ${
                  vistaActiva === tab.id
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="text-[10px] font-semibold uppercase text-white/80">Sesión demo:</span>
          <div className="flex gap-1 rounded-full bg-black/25 p-0.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onCambiarRol(r.id)}
                className={`min-h-9 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase sm:text-xs ${
                  rolUsuario === r.id ? 'bg-white text-brand' : 'text-white/90'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
