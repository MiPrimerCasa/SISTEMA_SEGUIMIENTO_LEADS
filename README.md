# Seguimiento de Leads — Inmobiliaria

App React mobile-first para supervisores: panel de leads diario y métricas de promotores.

## Inicio rápido

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173` en el navegador (o en el celular en la misma red).

## Estructura

```
src/
  data/mockData.js          # Leads, promotores, barrios
  hooks/
    useLeadsFilter.js       # Columnas entrevista / contacto
    usePromotoresMetrics.js # Totales y compras por promotor
    usePromotoresChartData.js # Agrupación semana / mes / año
  components/
    leads/                  # LeadCard, LeadModalForm, LeadsPanel
    promotores/             # Tabla, gráfico, panel
    layout/NavBar.jsx
  App.jsx
```

## Vistas

1. **Leads** — Dos columnas (en móvil, pestañas): entrevista pendiente y contacto/seguimiento. Al tocar un lead se abre el formulario modal por secciones.
2. **Promotores** — Tabla con total de leads y compras; gráfico de barras apiladas por semana, mes o año.

Los cambios del formulario se guardan en estado local (`useState`); al conectar un backend, reemplazá `onActualizarLead` por una llamada API.
