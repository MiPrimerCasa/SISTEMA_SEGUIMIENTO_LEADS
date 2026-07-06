# Evaluación de audio con IA (transcripción + feedback automático)

**Fecha / commit de referencia:** 2026-07-03 (envío a n8n) · 2026-07-06 (persistencia + panel supervisor)
**Roles afectados:** promotor (evalúa lo suyo y ve el resultado guardado), supervisor/auditor (evalúa grabaciones de su equipo desde el panel global)
**Estado:** activo

### Resumen (1–3 oraciones)

Agrega un botón "Transcribir y evaluar con IA" en el panel de Grabación diaria (promotor) y en el
panel de auditoría de grabaciones (supervisor/panel global). Sirve tanto para un audio recién elegido
en el navegador (antes de subirlo) como para una grabación ya guardada en el servidor. El backend
actúa de intermediario: recibe el audio y lo reenvía a un webhook externo (automatización tipo n8n)
que hace la transcripción y devuelve una evaluación en texto. El resultado de una grabación ya guardada
se persiste en SQLite, así que no hay que volver a llamar al webhook una vez generado, y el promotor lo
ve directo en su lista apenas el audio está aprobado.

### Reglas de negocio

| Condición | Resultado |
|-----------|-----------|
| Audio elegido en el navegador (aún no subido) | `POST /api/audio/evaluar` (multipart), no se persiste (no hay `id` de grabación todavía) |
| Grabación ya subida (tiene `id`), sin evaluación guardada | `POST /api/grabaciones/:id/evaluar` reenvía al webhook y, si responde OK, guarda `evaluacion`/`transcripcion` en la fila |
| Grabación ya subida, con evaluación ya guardada | `POST /api/grabaciones/:id/evaluar` devuelve la evaluación guardada directo, sin llamar al webhook de nuevo |
| Usuario no autenticado | 401 |
| Grabación no es del promotor ni el usuario es auditor/supervisor | 403 |
| Webhook externo no responde en 4 minutos | 502 con mensaje "tardó demasiado" |
| Webhook responde error o sin JSON válido / sin campo `evaluacion` | 502 con `message` + `detail` (recorte de la respuesta cruda) |
| Audio del promotor ya **aprobado** (`estado === 'activo'`) y con evaluación guardada | El promotor la ve directo en su lista al cargar la pantalla, sin tocar ningún botón |

### Flujo en pantalla

**Promotor** (`GrabacionDiariaPanel.tsx`):
1. Graba o selecciona un audio (o abre una grabación ya subida en su lista).
2. Toca "Transcribir y evaluar con IA" → botón pasa a "Transcribiendo… (puede tardar unos minutos)".
3. Al responder, se muestra la **evaluación** en una tarjeta y, si vino, la **transcripción** colapsada
   bajo "Ver transcripción".
4. Si el audio ya fue **aprobado** por el supervisor y ya tiene evaluación guardada, esa tarjeta aparece
   sola al entrar a la pantalla (no hace falta tocar el botón; el botón directamente no se muestra más
   una vez que hay evaluación).
5. Si falla, se muestra el mensaje de error debajo del botón (no bloquea el resto del panel).

**Supervisor / panel global** (`GrabacionesCumplimientoPanel.tsx`):
1. Entra a "Panel global" → pestaña "Grabaciones" → "Ver audios" de un promotor.
2. Junto a los botones "Aprobar"/"Rechazar" de cada audio pendiente aparece el mismo botón
   "Transcribir y evaluar con IA".
3. Mismo comportamiento que en el panel del promotor: si ya hay evaluación guardada, se muestra directo
   (útil para decidir si aprobar/rechazar sin tener que escuchar todo el audio).

### Dónde está el cambio (mapa de código)

| Capa | Archivo | Qué hace |
|------|---------|----------|
| Backend | `server/routes/audio-evaluacion-routes.js` | Registra `POST /api/audio/evaluar`; exporta `forwardAudioBufferToN8n()` (reenvía bytes al webhook, valida respuesta, timeout 4 min) |
| Backend | `server/routes/grabaciones-routes.js` | `POST /grabaciones/:id/evaluar`: valida permisos, devuelve la evaluación guardada si existe, o reenvía al webhook y la guarda con `guardarEvaluacionGrabacion()` |
| Backend | `server/db/grabaciones-store.js` | Columnas `evaluacion_ia` / `transcripcion_ia` en `promotor_grabaciones` (migración idempotente `migrateGrabacionesEvaluacionIA()`), `mapRow()` las expone como `evaluacionIA`/`transcripcionIA`, y `guardarEvaluacionGrabacion(id, {...})` las persiste |
| Backend | `server/create-app.js` | Registra `registerAudioEvaluacionRoutes()` |
| Tipos | `src/types/index.ts` | `EvaluacionAudioResponse { evaluacion, transcripcion? }`; `GrabacionPromotor.evaluacionIA` / `.transcripcionIA` |
| API cliente | `src/api/client.ts` | `evaluarAudioIA(archivo)` y `evaluarGrabacionExistenteIA(id)`; datos mock de modo demo incluyen un ejemplo de evaluación ya guardada |
| UI (compartida) | `src/components/grabaciones/EvaluacionGrabacionGuardada.tsx` | Botón + tarjeta de resultado (evaluación/transcripción), reutilizado por ambos paneles |
| UI (promotor) | `src/components/grabaciones/GrabacionDiariaPanel.tsx` | Usa el componente compartido; siembra `evaluacionesGuardadas` desde `g.evaluacionIA` cuando `g.estado === 'activo'` al cargar la lista |
| UI (supervisor) | `src/components/admin/GrabacionesCumplimientoPanel.tsx` | Dentro de `DetalleGrabaciones`: agrega el botón junto a Aprobar/Rechazar, mismo patrón de siembra desde `g.evaluacionIA` |
| Docs | `docs/FUNCIONALIDAD_EVALUACION_AUDIO_IA.md` | Este archivo |

### Persistencia

- La evaluación y transcripción de una grabación **ya subida** se guardan en SQLite, tabla
  `promotor_grabaciones` (`server/db/grabaciones-store.js`), columnas `evaluacion_ia` / `transcripcion_ia`.
  La migración es aditiva (`ALTER TABLE ... ADD COLUMN` envuelto en `try/catch`), corre sola la primera
  vez que arranca el backend — no hace falta correr nada a mano ni en desarrollo ni en producción.
- El audio elegido en el navegador **antes de subirlo** (`POST /api/audio/evaluar`) no se persiste: no
  tiene `id` de grabación todavía, así que esa evaluación vive solo en el estado de React de esa sesión.
- El audio en sí sigue guardándose en disco como ya lo hacía `grabaciones-routes.js` (storage local); este
  cambio solo agrega el envío del mismo archivo al webhook y, ahora, el guardado del resultado.
- Variable de entorno relevante: `N8N_EVALUAR_AUDIO_URL` (ver sección de conexión abajo).
- **Para el desarrollador:** si tenés que depurar o resetear una evaluación puntual, es una fila más de
  `promotor_grabaciones` — no hay tabla aparte. `UPDATE promotor_grabaciones SET evaluacion_ia = NULL,
  transcripcion_ia = NULL WHERE id = ?` fuerza a que la próxima vez se vuelva a llamar al webhook.

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
- [ ] Evaluar dos veces la misma grabación guardada → la segunda vez no debe volver a llamar al webhook
      (se puede confirmar apagando el webhook después de la primera evaluación exitosa: la segunda igual
      responde con la evaluación guardada).
- [ ] Como supervisor, en "Panel global → Grabaciones → Ver audios", confirmar que el botón aparece junto
      a Aprobar/Rechazar y que la evaluación guardada se ve sin volver a pedirla.
- [ ] Como promotor, con un audio ya aprobado por el supervisor y evaluado, recargar la página y confirmar
      que la evaluación aparece sola (sin tocar el botón).
- [ ] Reiniciar el backend y confirmar que no rompe nada (la migración de columnas nuevas es idempotente).

### Relacionado

- `docs/INDICE_FUNCIONALIDADES.md`
