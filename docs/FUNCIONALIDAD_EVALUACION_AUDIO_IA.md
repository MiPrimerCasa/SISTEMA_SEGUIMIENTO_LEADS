# Evaluación de audio con IA (transcripción + feedback automático)

**Fecha / commit de referencia:** 2026-07-03
**Roles afectados:** promotor (evalúa lo suyo), supervisor/auditor (evalúa grabaciones de su equipo)
**Estado:** activo

### Resumen (1–3 oraciones)

Agrega un botón "Transcribir y evaluar con IA" en el panel de Grabación diaria. Sirve tanto para un
audio recién elegido en el navegador (antes de subirlo) como para una grabación ya guardada en el
servidor. El backend actúa de intermediario: recibe el audio y lo reenvía a un webhook externo
(automatización tipo n8n) que hace la transcripción y devuelve una evaluación en texto.

### Reglas de negocio

| Condición | Resultado |
|-----------|-----------|
| Audio elegido en el navegador (aún no subido) | `POST /api/audio/evaluar` (multipart) |
| Grabación ya subida (tiene `id`) | `POST /api/grabaciones/:id/evaluar` (el backend lee el archivo del almacén) |
| Usuario no autenticado | 401 |
| Grabación no es del promotor ni el usuario es auditor/supervisor | 403 |
| Webhook externo no responde en 4 minutos | 502 con mensaje "tardó demasiado" |
| Webhook responde error o sin JSON válido / sin campo `evaluacion` | 502 con `message` + `detail` (recorte de la respuesta cruda) |

### Flujo en pantalla

1. Promotor graba o selecciona un audio (o abre una grabación ya subida en su lista).
2. Toca "Transcribir y evaluar con IA" → botón pasa a "Transcribiendo… (puede tardar unos minutos)".
3. Al responder, se muestra la **evaluación** en una tarjeta y, si vino, la **transcripción** colapsada
   bajo "Ver transcripción".
4. Si falla, se muestra el mensaje de error debajo del botón (no bloquea el resto del panel).

### Dónde está el cambio (mapa de código)

| Capa | Archivo | Qué hace |
|------|---------|----------|
| Backend (nuevo) | `server/routes/audio-evaluacion-routes.js` | Registra `POST /api/audio/evaluar`; exporta `forwardAudioBufferToN8n()` (reenvía bytes al webhook, valida respuesta, timeout 4 min) |
| Backend | `server/routes/grabaciones-routes.js` | Nuevo `POST /grabaciones/:id/evaluar`: valida permisos, lee el archivo del storage y reusa `forwardAudioBufferToN8n()` |
| Backend | `server/create-app.js` | Registra `registerAudioEvaluacionRoutes()` |
| Tipos | `src/types/index.ts` | `EvaluacionAudioResponse { evaluacion, transcripcion? }` |
| API cliente | `src/api/client.ts` | `evaluarAudioIA(archivo)` y `evaluarGrabacionExistenteIA(id)` |
| UI | `src/components/grabaciones/GrabacionDiariaPanel.tsx` | Botón + tarjeta de resultado, tanto para archivo nuevo como por cada grabación guardada |
| Docs | `docs/FUNCIONALIDAD_EVALUACION_AUDIO_IA.md` | Este archivo |

### Persistencia

- No se guarda nada nuevo en SQLite ni SQL Server: la evaluación se pide "al vuelo" y vive solo en el
  estado de React mientras la pantalla está abierta (no se persiste si se recarga la página).
- El audio en sí sigue guardándose como ya lo hacía `grabaciones-routes.js` (storage local); este cambio
  solo agrega un envío adicional del mismo archivo hacia afuera.
- Variable de entorno relevante: `N8N_EVALUAR_AUDIO_URL` (ver sección de conexión abajo).

### Cómo conectarlo / variables de entorno

**1. Conexión a SQL Server (ya existente, no es parte de este cambio, pero es requisito para correr el backend):**

En `.env` (o `src/.env`, usado por `npm run dev:api`):

```
DB_HOST=<host del servidor SQL Server>
DB_PORT=1433
DB_NAME=<base principal>
ENCUESTAS_DB_NAME=<base de encuestas, puede ser la misma>
DB_USER=<usuario>
DB_PASSWORD=<password>
DB_ENCRYPT=false
DB_TRUST_CERT=true
```

Con esas variables definidas, `server/db/mssql.js` abre el pool de conexión solo la primera vez que
alguna ruta lo necesita. No requiere ningún cambio de código.

**2. Webhook de evaluación de audio (lo nuevo de esta funcionalidad):**

```
N8N_EVALUAR_AUDIO_URL=<URL del webhook que recibe el audio y evalúa>
```

Si no se define, se usa por defecto la URL hardcodeada en
`server/routes/audio-evaluacion-routes.js` (línea `WEBHOOK_URL`).

Requisitos que debe cumplir ese webhook (venga de donde venga, no tiene que ser necesariamente n8n):

- Aceptar `POST` con `multipart/form-data`, campo de archivo llamado `audio`.
- Responder JSON con al menos `{ "evaluacion": "..." }` (string). Opcional: `"transcripcion": "..."`.
- Responder dentro de ~4 minutos (timeout fijo en el backend, `TIMEOUT_MS`).

Para cambiar de proveedor de automatización alcanza con actualizar `N8N_EVALUAR_AUDIO_URL` — no hace
falta tocar el código del frontend ni del backend mientras el contrato de entrada/salida se mantenga.

### Pruebas manuales sugeridas

- [ ] Elegir un audio nuevo (sin subir), tocar "Transcribir y evaluar con IA" y ver que aparezca la evaluación.
- [ ] Abrir una grabación ya guardada de la lista y evaluarla desde ahí.
- [ ] Simular que el webhook está caído (URL inválida) y verificar que se muestre un error legible, sin romper el resto del panel.
- [ ] Como promotor, intentar evaluar una grabación que no es propia → debe dar 403.
- [ ] Como supervisor/auditor, evaluar una grabación de un promotor de su equipo → debe funcionar.

### Relacionado

- `docs/INDICE_FUNCIONALIDADES.md`
