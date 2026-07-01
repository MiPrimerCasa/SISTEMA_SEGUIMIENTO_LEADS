# Documentación Técnica — Rol Manager Leads
## Sistema mpcleads · Mi Primer Casa S.A.

> **Destinatario:** Desarrollador backend/fullstack que conectará el rol a la base de datos.  
> **Stack:** React + TypeScript (Vite), API REST existente en `/api/...`  
> **Fecha:** Julio 2026

---

## 1. Qué es el rol Manager Leads

El **Manager Leads** es el rol operativo central del sistema. Es más completo que el `superadmin` (que es una vista analítica de solo lectura) porque puede:

- Ver y editar los datos de cualquier lead
- Resetear el seguimiento de un lead
- Reasignar leads entre promotores/supervisores
- Monitorear la cola de leads entrantes en tiempo real
- Ver todas las entrevistas (confirmadas, realizadas, resultados)
- Descargar reportes Excel

Técnicamente, el `manager` tiene acceso a todos los endpoints de `/api/admin/...`.

---

## 2. Arquitectura del rol en el frontend

### 2.1 Tipo de rol

```typescript
// src/types/index.ts
export type RolUsuario = 'promotor' | 'supervisor' | 'superadmin' | 'manager';
```

### 2.2 Vistas disponibles (tabs)

```typescript
// src/types/index.ts
export type VistaActiva = 'leads' | 'promotores' | 'metricas' | 'calendario' | 'admin' | 'despacho' | 'handler' | 'entrevistas';
```

Las tres vistas del manager son: `'despacho'` | `'handler'` | `'entrevistas'`

### 2.3 Enrutamiento en App.tsx

```tsx
// src/App.tsx (líneas 212–221)
esManager ? (
  vistaActiva === 'handler' ? (
    <HandlerLeads />
  ) : vistaActiva === 'entrevistas' ? (
    <EntrevistasPanel />
  ) : cargando && !adminDashboard ? (
    <VistaCargando texto="Cargando datos del despacho…" />
  ) : (
    <PanelDespacho leads={leads} adminDashboard={adminDashboard} />
  )
)
```

### 2.4 Carga de datos inicial (App.tsx)

Cuando el usuario es manager, se ejecuta en paralelo:

```typescript
// src/App.tsx (líneas 97–113)
const [dash, leadsRes] = await Promise.all([
  fetchAdminDashboard(p),  // GET /api/admin/dashboard
  fetchLeads(),            // GET /api/leads
]);
setAdminDashboard(dash);
setLeads(leadsRes.leads);
```

Ambos resultados se pasan como props a `PanelDespacho`:
```tsx
<PanelDespacho leads={leads} adminDashboard={adminDashboard} />
```

---

## 3. Mapa de componentes

```
src/components/despacho/
├── PanelDespacho.tsx        ← Vista principal "Despacho" (cola de leads + equipo)
├── PanelMetricasGlobal.tsx  ← Sub-vista: métricas globales de operadores
├── PanelDatosGlobales.tsx   ← Sub-vista: tabla detallada de supervisores/promotores
├── SeccionInformes.tsx      ← Sub-componente de informes imprimibles
├── HandlerLeads.tsx         ← Vista "Handler Leads" (editar cualquier lead)
└── EntrevistasPanel.tsx     ← Vista "Entrevistas" (todas las entrevistas + export Excel)
```

---

## 4. Endpoints de la API ya implementados en el cliente

Todos están en `src/api/client.ts`. El manager tiene acceso a todos.

| Función | Método + Ruta | Descripción |
|---|---|---|
| `fetchLeads()` | `GET /api/leads` | Todos los leads (por sesión del manager) |
| `fetchAdminDashboard(periodo?)` | `GET /api/admin/dashboard?periodo=mes` | Dashboard con métricas de supervisores, rankings, etc. |
| `fetchAdminLeads()` | `GET /api/admin/leads` | Todos los leads sin filtro de operador |
| `fetchAdminOperadores()` | `GET /api/admin/operadores` | Lista de operadores (promotores + supervisores) con código de carga |
| `reasignarLead(leadId, nuevoUsuarioCarga)` | `POST /api/admin/leads/:leadId/reasignar` | Reasigna un lead a otro operador |
| `modificarDatosLead(leadId, datos)` | `PATCH /api/admin/leads/:leadId/datos` | Edita nombre, teléfono, domicilio, etc. del lead |
| `resetearLeadSeguimiento(leadId)` | `POST /api/admin/leads/:leadId/reset` | Limpia todo el seguimiento del lead |
| `duplicarLead(leadId, codigoVendedorDestino)` | `POST /api/admin/leads/:leadId/duplicate` | Crea copia del lead asignada a otro vendedor |
| `fetchHistorialSeguimiento(leadId)` | `GET /api/leads/:leadId/historial` | Historial de cambios de un lead |
| `guardarSeguimiento(leadId, seguimiento)` | `PATCH /api/leads/:leadId/seguimiento` | Actualiza seguimiento de un lead |

### Firma de `reasignarLead` (la más importante)

```typescript
// src/api/client.ts (líneas 391–403)
export async function reasignarLead(leadId: string, nuevoUsuarioCarga: string): Promise<Lead> {
  const data = await apiFetch<{ lead: Lead; message?: string }>(
    `/api/admin/leads/${encodeURIComponent(leadId)}/reasignar`,
    {
      method: 'POST',
      body: JSON.stringify({ usuarioCarga: nuevoUsuarioCarga }),
    },
  );
  return data.lead;
}
```

El campo `nuevoUsuarioCarga` es el **código de promotor** (ej. `SORTEO01S21P01`), que corresponde a `OperadorCatalogo.codigo` del endpoint `/api/admin/operadores`.

### Firma de `fetchAdminOperadores`

```typescript
// src/api/client.ts (líneas 377–389)
export interface OperadorCatalogo {
  nombre: string;
  codigo: string;                    // ← Este se usa como nuevoUsuarioCarga en reasignarLead
  rol: 'promotor' | 'supervisor';
}

export async function fetchAdminOperadores(): Promise<OperadorCatalogo[]>
// GET /api/admin/operadores
// Respuesta esperada: { operadores: OperadorCatalogo[] }
```

---

## 5. Estado actual de cada componente

### ✅ 5.1 HandlerLeads — FUNCIONA con API real

**Archivo:** `src/components/despacho/HandlerLeads.tsx`

**Qué hace:**
- Llama a `fetchAdminLeads()` al montar (no depende de props, carga sus propios datos)
- Permite buscar por nombre, teléfono, promotor, supervisor
- Filtra por estado (`lead.lista`) y por origen (`lead.origen`)
- Al hacer doble-click en una fila o al presionar "Editar" → abre `AdminModificarLeadModal`
- El modal permite editar campos del lead → llama a `modificarDatosLead()` ✅
- El modal tiene botón "Limpiar seguimiento" con confirmación → llama a `resetearLeadSeguimiento()` ✅
- Al guardar/resetear, actualiza el estado local con el lead devuelto por la API

**No tiene pendientes.** Este componente está conectado a la base de datos correctamente.

---

### ✅ 5.2 EntrevistasPanel — FUNCIONA con API real

**Archivo:** `src/components/despacho/EntrevistasPanel.tsx`

**Qué hace:**
- Llama a `fetchAdminLeads()` al montar
- Filtra los leads que tienen al menos uno de: `quiereEntrevista`, `horarioEntrevista`, `confirmoEntrevista`, `huboEntrevista`
- Muestra estadísticas: total, confirmadas, realizadas, compró, no compró, reagenda, terreno, tasa cierre
- Permite filtrar por estado de entrevista y resultado
- Botón "Descargar Excel (No compró)": exporta con la biblioteca `xlsx` los leads donde `resultadoEntrevista === 'no_compro'`

**No tiene pendientes.** Todos los datos son reales.

---

### 🔴 5.3 PanelDespacho — CONEXIONES PENDIENTES

**Archivo:** `src/components/despacho/PanelDespacho.tsx`

Este es el componente con más trabajo pendiente. Recibe `leads` y `adminDashboard` por props desde App.tsx (datos reales), pero internamente tiene mocks que no fueron reemplazados.

#### 5.3.1 Mocks que deben reemplazarse

**MOCK 1 — `MOCK_COLA_POR_FILTRO` (línea ~98)**

Se usa cuando `leads.length === 0`. La lógica real ya existe:

```typescript
// PanelDespacho.tsx (líneas 1013–1023) — lógica real YA IMPLEMENTADA
const colaReal: Record<FiltroDespacho, MockLeadCola[]> = useMemo(() => {
  if (!leads.length) return MOCK_COLA_POR_FILTRO;  // ← AQUÍ cae al mock
  const sorted = [...leads].sort(...).slice(0, 30);
  ...
}, [leads]);
```

**Solución:** Cuando la API devuelva leads reales, este bloque ya los usa. El mock solo aparece si `leads` viene vacío. No requiere cambios en el frontend si el backend devuelve datos.

**MOCK 2 — `MOCK_SUPERVISORES` (línea ~144)**

```typescript
// PanelDespacho.tsx (líneas 971–989) — lógica real YA IMPLEMENTADA
const equipoSupervisores = useMemo(() => {
  if (!adminDashboard?.supervisores?.length) return MOCK_SUPERVISORES;  // ← cae al mock
  return adminDashboard.supervisores.map((sup) => ({ ... }));
}, [adminDashboard]);
```

**Solución:** Igual que arriba — ya tiene la lógica para usar `adminDashboard.supervisores`. El mock solo aparece si el dashboard viene vacío.

**MOCK 3 — `MOCK_SEGUIMIENTO` (línea ~174)**

```typescript
// PanelDespacho.tsx (línea 1041) — HARDCODEADO, no tiene reemplazo real
const sinAtenderCount = MOCK_SEGUIMIENTO.filter((i) => i.accion === 'reasignar').length;
```

Y en la vista "Seguimiento" (línea ~1141):
```typescript
{MOCK_SEGUIMIENTO.map((item) => ( ... ))}  // ← siempre muestra los 7 items ficticios
```

**Solución requerida:** Este es el único mock que requiere trabajo en el frontend.

La vista "Seguimiento de reasignados" debería mostrar leads que han sido reasignados. La fuente de datos debería ser los propios `leads` filtrados por algún criterio de reasignación (ej. `lead.seguimiento.operadorId !== lead.promotorId` o un campo específico del backend).

**Propuesta de implementación:**
```typescript
// En PanelDespacho.tsx, reemplazar la referencia a MOCK_SEGUIMIENTO
// por un filtro sobre los leads reales:
const leadsReasignados = useMemo(() =>
  leads.filter((l) => l.seguimiento.operadorId !== null),
[leads]);
```

> **Nota para el backend:** Si existe un campo en el lead que indique "fue reasignado" o "promotor original vs promotor actual", ese campo sería ideal para este filtro. Confirmarlo con el equipo.

**MOCK 4 — `statsVentas` fallback (línea 995)**

```typescript
// PanelDespacho.tsx (línea 994–995)
const statsVentas = useMemo(() => {
  if (!adminDashboard) return { cierresSemana: 7, cierresHoy: 2, terrenoSemana: 4, pijSemana: 3 };  // ← mock
  ...
}, [adminDashboard]);
```

**Solución:** No requiere cambio en el frontend. Si `adminDashboard` carga correctamente desde `/api/admin/dashboard`, este fallback no se activa.

**MOCK 5 — `statsFlujo` fallback (línea 1004)**

```typescript
// PanelDespacho.tsx (línea 1003–1004)
if (!leads.length) return { entrantesHoy: 47, enGestion: 19, sinAtender: 5 };  // ← mock
```

**Solución:** Igual — no requiere cambio si el backend devuelve leads.

---

#### 5.3.2 REASIGNACIÓN — El problema central 🔴

**Dónde está el bug:**

```typescript
// PanelDespacho.tsx (líneas 1181–1184)
onConfirmarAsignacion={(leadId, personaId) => {
  const op = todosOperadores.find((o) => o.id === personaId);
  if (op) setAsignaciones((prev) => ({ ...prev, [leadId]: abrev(op.nombre) }));
  // ↑ SOLO actualiza estado local, no llama a ninguna API
}}
```

```typescript
// PanelDespacho.tsx (líneas 1046–1051) — mismo problema en el modal de lista
const handleConfirmarModal = () => {
  if (!reasignarLeadId || !selectedPersonaId) return;
  const op = todosOperadores.find((o) => o.id === selectedPersonaId);
  if (op) setAsignaciones((prev) => ({ ...prev, [reasignarLeadId]: abrev(op.nombre) }));
  setReasignarLeadId(null); setSelectedPersonaId(null); setMotivo('');
  // ↑ SOLO actualiza estado local, no llama a ninguna API
};
```

**Cómo debe quedar:**

```typescript
// VERSIÓN CORREGIDA de handleConfirmarModal
const handleConfirmarModal = async () => {
  if (!reasignarLeadId || !selectedPersonaId) return;
  const op = todosOperadores.find((o) => o.id === selectedPersonaId);
  if (!op) return;

  try {
    // op.id debe ser el código de carga (ej. "SORTEO01S21P01"), no el ID interno
    const leadActualizado = await reasignarLead(reasignarLeadId, op.id);
    // Actualizar el lead en el estado local con la respuesta de la API
    setLeadsLocal((prev) => prev.map((l) => l.id === reasignarLeadId ? leadActualizado : l));
    setAsignaciones((prev) => ({ ...prev, [reasignarLeadId]: abrev(op.nombre) }));
  } catch (err) {
    console.error('Error al reasignar:', err);
    // Mostrar toast de error
  } finally {
    setReasignarLeadId(null);
    setSelectedPersonaId(null);
    setMotivo('');
  }
};
```

**Importante:** El `personaId` que se usa actualmente en `todosOperadores` es el ID interno del supervisor/promotor. Para llamar a `reasignarLead()`, se necesita el **código de carga** (`OperadorCatalogo.codigo`). Ver sección 6.1 para la solución completa.

---

#### 5.3.3 Lista de operadores — Hardcodeada en PanelMetricasGlobal

**Archivo:** `src/components/despacho/PanelMetricasGlobal.tsx`

```typescript
// PanelMetricasGlobal.tsx (líneas 73–80) — HARDCODEADO
const OPERADORES_DESTINO = [
  { id: 'op1', nombre: 'Juan Pérez',    rol: 'promotor'   as const, supervisor: 'Laura R.'  },
  { id: 'op2', nombre: 'Carmen Ruiz',   rol: 'promotor'   as const, supervisor: 'Laura R.'  },
  { id: 'op3', nombre: 'Diego Morales', rol: 'promotor'   as const, supervisor: 'Marcos D.' },
  { id: 'op4', nombre: 'Sofía Vega',    rol: 'promotor'   as const, supervisor: 'Marcos D.' },
  { id: 'op5', nombre: 'Laura Ramírez', rol: 'supervisor' as const, supervisor: '—'          },
  { id: 'op6', nombre: 'Marcos Díaz',   rol: 'supervisor' as const, supervisor: '—'          },
];
```

Esta lista se usa en el panel de reasignación de alertas +48hs. Debe reemplazarse con el resultado de `fetchAdminOperadores()`.

---

#### 5.3.4 PanelDatosGlobales — Métricas hardcodeadas

**Archivo:** `src/components/despacho/PanelDatosGlobales.tsx`

```typescript
// PanelDatosGlobales.tsx (líneas 32–85) — TODO HARDCODEADO
const MOCK_DATA: SupervisorGlobal[] = [
  { id: 'lr', nombre: 'Laura Ramírez', leadsTotal: 47, ... },
  { id: 'md', nombre: 'Marcos Díaz',   leadsTotal: 36, ... },
];
```

El componente recibe `adminDashboard` por props pero no lo usa:

```typescript
// PanelDatosGlobales.tsx
export function PanelDatosGlobales({
  onVolver,
  adminDashboard,  // ← llega correctamente
  leads,
}: { onVolver: () => void; adminDashboard?: AdminDashboardData | null; leads?: Lead[] }) {
  // Pero internamente usa MOCK_DATA en lugar de adminDashboard
```

**Cómo debe quedar:**

```typescript
// Reemplazar MOCK_DATA por datos derivados de adminDashboard
const supervisoresReales: SupervisorGlobal[] = useMemo(() => {
  if (!adminDashboard?.supervisores?.length) return MOCK_DATA;
  return adminDashboard.supervisores.map((sup) => ({
    id: sup.supervisorId,
    nombre: sup.supervisorNombre,
    initials: iniciales(sup.supervisorNombre),
    leadsTotal: sup.totales.leadsTotal,
    leadsSemana: sup.totales.leadsSemana,
    leadsHoy: 0,  // adminDashboard no tiene este campo por día
    tratadosHoy: sup.totales.tratadosHoy,
    tratadosSemana: sup.totales.tratadosSemana,
    entrevistasSemana: sup.totales.entrevistasSemana,
    entrevistasHoy: sup.totales.entrevistasHoy,
    cierresSemana: sup.totales.cierresSemana,
    cierresHoy: sup.totales.cierresHoy,
    terrenoSemana: sup.totales.ventasTerrenoSemana,
    pijSemana: sup.totales.ventasPijSemana,
    promotores: sup.promotores.map((p) => ({ ... })),
  }));
}, [adminDashboard]);
```

---

#### 5.3.5 SeccionInformes — Reportes con datos ficticios

**Archivo:** `src/components/despacho/SeccionInformes.tsx`

```typescript
// SeccionInformes.tsx (líneas 35–50) — HARDCODEADO
const PROMOTORES_INFORME: PromotorInforme[] = [
  { id: 'jp', nombre: 'Juan Pérez', tratadosHoy: 12, tratadosSemana: 38, ... },
  ...
];

const REASIGNACIONES_INFORME: ReasignacionInforme[] = [
  { id: 'r1', lead: 'María González', de: 'Laura R.', a: 'Juan P.', ... },
  ...
];
```

El componente no recibe props. Para conectarlo a datos reales necesitaría recibir `adminDashboard` y construir el informe desde ahí.

**Impacto:** Los PDFs impresos con el botón "Imprimir" muestran datos completamente inventados.

---

### 5.4 PanelMetricasGlobal — Parcialmente conectado

**Archivo:** `src/components/despacho/PanelMetricasGlobal.tsx`

```typescript
// PanelMetricasGlobal.tsx (líneas 46–65) — HARDCODEADO
const MOCK_METRICAS = [
  { id: 'sup1', nombre: 'Laura Ramírez', ... },
  ...
];

const MOCK_ALERTAS_48H = [
  { id: 'a1', nombre: 'Roberto Sánchez', horasSinAtender: 72, ... },
];
```

El componente recibe `adminDashboard` pero lo usa solo para el ranking:

```typescript
// Ya usa datos reales para rankings:
adminDashboard?.rankings?.entrevistasSemana?.map(...)
adminDashboard?.rankings?.cierresSemana?.map(...)
```

Las métricas por equipo (`MOCK_METRICAS`) y las alertas de +48hs (`MOCK_ALERTAS_48H`) siguen hardcodeadas.

**Para las alertas +48hs:** Los datos provienen de `adminDashboard.leadsSinTratar` (tipo `LeadSinTratarDetalle[]`):

```typescript
// src/types/index.ts
export interface LeadSinTratarDetalle {
  id: string;
  nombre: string;
  telefono: string;
  origen: string;
  fechaAlta: string;
  promotorNombre: string;
  supervisorNombre: string;
}
```

---

## 6. Plan de implementación paso a paso

### Paso 1 — Conectar reasignación a la API (CRÍTICO)

**Archivos a modificar:** `PanelDespacho.tsx`

**Qué agregar:**

1. Importar `reasignarLead` y `fetchAdminOperadores` en el componente:

```typescript
import { reasignarLead, fetchAdminOperadores } from '../../api/client';
import type { OperadorCatalogo } from '../../api/client';
```

2. Agregar estado para operadores reales y loading:

```typescript
const [operadoresCatalogo, setOperadoresCatalogo] = useState<OperadorCatalogo[]>([]);
const [reasignandoId, setReasignandoId] = useState<string | null>(null);

useEffect(() => {
  fetchAdminOperadores().then(setOperadoresCatalogo).catch(console.error);
}, []);
```

3. Reemplazar `handleConfirmarModal` (línea 1046):

```typescript
const handleConfirmarModal = async () => {
  if (!reasignarLeadId || !selectedPersonaId) return;
  const operador = operadoresCatalogo.find((o) => o.codigo === selectedPersonaId);
  if (!operador) return;

  setReasignandoId(reasignarLeadId);
  try {
    await reasignarLead(reasignarLeadId, operador.codigo);
    // Si App.tsx pasa un setter de leads, llamarlo acá para actualizar el estado global
    // De lo contrario, recargar la página o actualizar el estado local
  } catch (err) {
    alert('Error al reasignar: ' + (err instanceof Error ? err.message : 'Error desconocido'));
  } finally {
    setReasignandoId(null);
    setReasignarLeadId(null);
    setSelectedPersonaId(null);
    setMotivo('');
  }
};
```

4. Reemplazar `onConfirmarAsignacion` en `PanelDerecho` (línea 1181) de la misma forma.

5. Pasar `operadoresCatalogo` al componente `PanelDerecho` en lugar del `todosOperadores` local (que viene de los mocks).

---

### Paso 2 — Reemplazar MOCK_DATA en PanelDatosGlobales

**Archivo:** `src/components/despacho/PanelDatosGlobales.tsx`

1. Ya recibe `adminDashboard` como prop.
2. Derivar `supervisoresData` desde `adminDashboard.supervisores` en lugar de `MOCK_DATA`.
3. El tipo `SupervisorGlobal` del componente ya tiene los campos correctos — solo hay que mapear `SupervisorMetricasAdmin` (del tipo de `adminDashboard`) al tipo interno.

Mapeo de campos:

```
adminDashboard.supervisores[i]         → SupervisorGlobal
  .supervisorId                        → .id
  .supervisorNombre                    → .nombre
  .totales.leadsTotal                  → .leadsTotal
  .totales.leadsSemana                 → .leadsSemana
  .totales.tratadosHoy                 → .tratadosHoy
  .totales.tratadosSemana              → .tratadosSemana
  .totales.entrevistasSemana           → .entrevistasSemana
  .totales.entrevistasHoy              → .entrevistasHoy
  .totales.cierresSemana               → .cierresSemana
  .totales.cierresHoy                  → .cierresHoy
  .totales.ventasTerrenoSemana         → .terrenoSemana
  .totales.ventasPijSemana             → .pijSemana
  .promotores[j]                       → .promotores[j] (mismo mapeo)
```

---

### Paso 3 — Reemplazar MOCK_METRICAS y alertas en PanelMetricasGlobal

**Archivo:** `src/components/despacho/PanelMetricasGlobal.tsx`

1. Reemplazar `MOCK_METRICAS` con `adminDashboard.supervisores` (mismo mapeo que Paso 2).

2. Reemplazar `MOCK_ALERTAS_48H` con `adminDashboard.leadsSinTratar`:

```typescript
const alertas48h = useMemo(() => {
  if (!adminDashboard?.leadsSinTratar?.length) return MOCK_ALERTAS_48H;
  return adminDashboard.leadsSinTratar.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    telefono: l.telefono,
    horasSinAtender: Math.floor((Date.now() - new Date(l.fechaAlta).getTime()) / 3_600_000),
    promotor: l.promotorNombre,
    supervisor: l.supervisorNombre,
  }));
}, [adminDashboard]);
```

3. Reemplazar `OPERADORES_DESTINO` con `fetchAdminOperadores()` (ver Paso 1 para el patrón).

---

### Paso 4 — Reemplazar MOCK_SEGUIMIENTO en PanelDespacho

**Archivo:** `src/components/despacho/PanelDespacho.tsx`

La vista "Seguimiento de reasignados" usa `MOCK_SEGUIMIENTO` en dos lugares:
- Línea ~1041: `sinAtenderCount = MOCK_SEGUIMIENTO.filter(...).length`
- Línea ~1141–1172: renderiza la lista completa

**Implementación:**

```typescript
// Derivar leads reasignados desde los leads reales
const leadsReasignados = useMemo(() =>
  leads
    .filter((l) => l.seguimiento.canal !== null || l.seguimiento.huboEntrevista)
    .sort((a, b) => new Date(b.fechaObtencion).getTime() - new Date(a.fechaObtencion).getTime())
    .slice(0, 20),
[leads]);
```

> **Consultar al backend:** Si hay un campo específico para "lead reasignado" (ej. `promotorOriginalId`, `fechaReasignacion`), usarlo para el filtro. De lo contrario, filtrar por `seguimiento.operadorId !== null` o el criterio que mejor represente "fue tocado por el manager".

---

### Paso 5 — Conectar SeccionInformes (menor prioridad)

**Archivo:** `src/components/despacho/SeccionInformes.tsx`

Actualmente no recibe props. Para conectarlo:

1. Agregar prop `adminDashboard?: AdminDashboardData` al componente.
2. Pasarla desde `PanelDatosGlobales` (que ya la tiene).
3. Derivar `promotoresInforme` desde `adminDashboard.supervisores[].promotores[]`.
4. Para `reasignacionesInforme`: no existe un endpoint que devuelva el historial de reasignaciones. Requiere un endpoint nuevo o usar el historial de leads.

---

## 7. Endpoints de backend que podrían necesitar ajustes

### 7.1 `/api/admin/dashboard` (ya existe)

Verificar que incluya `leadsSinTratar` en la respuesta:

```typescript
// src/types/index.ts
export interface AdminDashboardData {
  ...
  leadsSinTratar?: LeadSinTratarDetalle[];  // ← necesario para alertas +48hs
}
```

Si no está en la respuesta actual, agregarlo. El tipo `LeadSinTratarDetalle` ya está declarado en `src/types/index.ts`.

### 7.2 `/api/admin/leads/:leadId/reasignar` (ya existe)

```
POST /api/admin/leads/:leadId/reasignar
Body: { usuarioCarga: string }  ← código de promotor destino
Response: { lead: Lead, message?: string }
```

Verificar que el endpoint actualice correctamente:
- El `promotorId` del lead en la base de datos
- El `promotorNombre` del lead (para que se refleje en el frontend)
- Registre la reasignación en alguna tabla de auditoría (opcional pero recomendado)

### 7.3 `/api/admin/operadores` (ya existe)

```
GET /api/admin/operadores
Response: { operadores: Array<{ nombre: string, codigo: string, rol: 'promotor' | 'supervisor' }> }
```

Verificar que el `codigo` sea el mismo valor que se usa como `usuarioCarga` en la reasignación.

### 7.4 Endpoint nuevo recomendado — Historial de reasignaciones

Para la vista "Seguimiento de reasignados" en PanelDespacho, sería ideal:

```
GET /api/admin/reasignaciones?periodo=hoy|semana|mes
Response: {
  items: Array<{
    leadId: string,
    leadNombre: string,
    leadTelefono: string,
    promotorOrigen: string,
    promotorDestino: string,
    operadorQueCargo: string,
    estado: string,
    fechaReasignacion: string
  }>
}
```

Si no se implementa, la vista puede mostrar los leads que tienen seguimiento activo como alternativa.

---

## 8. Tipos de datos de referencia

### Lead completo (el objeto central)

```typescript
// src/types/index.ts
export interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  promotorId: string;
  promotorNombre?: string;
  supervisorNombre?: string;
  domicilio?: string;
  quiereEntrevista: boolean;
  horarioEntrevista?: string;
  lugarEntrevista?: 'sucursal' | 'domicilio';
  domicilioEntrevista?: string;
  lista: 'entrevista' | 'contacto';
  origen?: 'encuesta' | 'sorteo' | 'manual' | 'redes';
  fechaObtencion: string;
  fechaAlta?: string;
  codigoCampania?: string;
  conoceMpc?: boolean | null;
  sabiaPlanInversionJoven?: boolean | null;
  seguimiento: SeguimientoLead;
  // ... (más campos en tipos/index.ts)
}
```

### AdminDashboardData (lo que devuelve /api/admin/dashboard)

```typescript
// src/types/index.ts
export interface AdminDashboardData {
  generadoEn: string;
  supervisores: SupervisorMetricasAdmin[];      // ← usar para reemplazar MOCK_DATA
  resumenHoy: { entrevistas, cierres, ventasTerreno, ventasPij };
  rankings: {
    entrevistasSemana: RankingAdminEntry[];
    cierresSemana: RankingAdminEntry[];
    leadsSemana: RankingAdminEntry[];
    ventasTerrenoSemana: RankingAdminEntry[];
    ventasPijSemana: RankingAdminEntry[];
  };
  productividad?: AdminProductividad;
  leadsSinTratar?: LeadSinTratarDetalle[];      // ← para alertas +48hs
  pijCierresPorPersona?: PersonaPijCierres[];
  totalLeads?: number;
  totalSupervisores?: number;
}
```

---

## 9. Resumen de prioridades

| Prioridad | Tarea | Archivo | Impacto |
|---|---|---|---|
| 🔴 1 | Conectar `reasignarLead()` a la UI de reasignación | `PanelDespacho.tsx` | Las reasignaciones no persisten en BD |
| 🔴 2 | Usar `fetchAdminOperadores()` para la lista de destino | `PanelDespacho.tsx`, `PanelMetricasGlobal.tsx` | Muestra operadores inventados al reasignar |
| 🟠 3 | Reemplazar `MOCK_DATA` con `adminDashboard.supervisores` | `PanelDatosGlobales.tsx` | Toda la tabla muestra datos ficticios |
| 🟠 4 | Reemplazar `MOCK_METRICAS` con `adminDashboard.supervisores` | `PanelMetricasGlobal.tsx` | Métricas por equipo son ficticias |
| 🟠 5 | Reemplazar `MOCK_ALERTAS_48H` con `adminDashboard.leadsSinTratar` | `PanelMetricasGlobal.tsx` | Las alertas de +48hs son ficticias |
| 🟡 6 | Reemplazar `MOCK_SEGUIMIENTO` con leads reales | `PanelDespacho.tsx` | Vista "Seguimiento" muestra datos ficticios |
| 🟡 7 | Conectar `SeccionInformes` con datos reales | `SeccionInformes.tsx` | PDFs impresos con datos inventados |

---

## 10. Notas de autenticación

El cliente envía el rol del usuario en todos los requests mediante headers HTTP:

```
x-usuario-id         ← ID interno del usuario
x-usuario-rol        ← 'manager' para este rol
x-usuario-nombre     ← nombre del usuario
x-usuario-login-id   ← loginId si existe
```

El backend debe verificar que `x-usuario-rol === 'manager'` (o `'superadmin'`) para permitir el acceso a los endpoints `/api/admin/...`. Los endpoints de manager son los mismos que los de superadmin.

---

## 11. Modo demo

El sistema tiene un modo demo activable con la variable de entorno `VITE_DEMO=true`. Para el rol manager, el login demo es:

```typescript
// src/api/client.ts (líneas 174–183)
// Login con usuario: '__demo_manager__' activa el modo demo con rol manager
```

Los endpoints de admin en modo demo devuelven datos ficticios desde `src/api/demoData.ts`. La función `getDemoOperadores()` ya existe y devuelve operadores de prueba para `fetchAdminOperadores()`.

---

*Documento generado para el equipo de desarrollo de mpcleads · Mi Primer Casa S.A.*
