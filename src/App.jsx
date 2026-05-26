import { useCallback, useState } from 'react';
import { NavBar } from './components/layout/NavBar';
import { LeadsPanel } from './components/leads/LeadsPanel';
import { PromotoresPanel } from './components/promotores/PromotoresPanel';
import { mockLeads, promotores } from './data/mockData';

export default function App() {
  const [vistaActiva, setVistaActiva] = useState('leads');
  const [rolUsuario, setRolUsuario] = useState('supervisor');
  const [leads, setLeads] = useState(mockLeads);

  const onActualizarLead = useCallback((leadId, seguimiento) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              seguimiento: { ...lead.seguimiento, ...seguimiento },
            }
          : lead,
      ),
    );
  }, []);

  return (
    <div vaul-drawer-wrapper="" className="min-h-svh bg-zinc-50">
      <NavBar
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        rolUsuario={rolUsuario}
        onCambiarRol={setRolUsuario}
      />
      <main>
        {vistaActiva === 'leads' ? (
          <LeadsPanel
            leads={leads}
            rolUsuario={rolUsuario}
            onActualizarLead={onActualizarLead}
          />
        ) : (
          <PromotoresPanel leads={leads} promotores={promotores} />
        )}
      </main>
    </div>
  );
}
