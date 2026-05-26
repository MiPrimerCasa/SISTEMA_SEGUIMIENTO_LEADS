# Deploy en Render (pruebas rápidas)

Archivo de blueprint: [`render.yaml`](../render.yaml) en la raíz del repo.

## Pasos

1. Subí el repo a GitHub (`MiPrimerCasa/SISTEMA_SEGUIMIENTO_LEADS`).
2. En [Render](https://dashboard.render.com) → **New** → **Blueprint**.
3. Conectá el repo y confirmá el `render.yaml`.
4. Completá las variables marcadas `sync: false` (secretas):
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `ENCUESTAS_DB_NAME` (ej. `STRSYSTEM`)
5. **Create resources** y esperá el build.

URL de prueba: `https://seguimiento-leads.onrender.com` (o el nombre que asigne Render).

Health: `GET /api/health` → `"ok": true`, `"sql": "ok"`.

## Build / start (local = mismo que Render)

```bash
npm ci
npm run build
npm start
```

Render usa `PORT` automáticamente; la app ya lee `process.env.PORT`.

## SQL Server desde Render

El VPS/SQL debe **permitir conexiones entrantes** desde internet (no solo tu PC):

- En Hostinger / firewall del SQL: habilitar el puerto **1433** o whitelist de IPs de Render.
- En Render free, la IP de salida puede cambiar; a veces hace falta abrir un rango o usar VPN/túnel para pruebas.

Si `/api/health` muestra `"sql": "error"`, el problema suele ser red/firewall, no el código.

## Caché local (seguimiento en modal)

`data/app-cache.db` vive en el disco **efímero** del contenedor en Render. Al redeploy se puede perder. Para producción real usá VPS + volumen o persistir en SQL (`sql/migrations/`).

## Variables opcionales

| Variable | Uso |
|----------|-----|
| `LEADS_PUBLIC_HOST` | URL pública (informativa en health) |
| `SP_LOGIN_COL_SUPERVISOR` | Si el login usa otro nombre de columna |

## Alternativa producción

Para Mi Primer Casa en producción con Traefik y mismo VPS que la encuesta: [DEPLOY_VPS.md](./DEPLOY_VPS.md).
