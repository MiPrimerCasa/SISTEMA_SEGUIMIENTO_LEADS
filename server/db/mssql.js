import sql from 'mssql';

let pool;
let poolEncuestas;

function sqlConfig(database) {
  const dbName = database || process.env.DB_NAME;
  return {
    server: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 1433),
    database: dbName,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
    connectionTimeout: 15_000,
    requestTimeout: 30_000,
  };
}

/** Activo si hay host y credenciales en .env */
export function isSqlServerConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);
}

export function getSqlServerProcedureName() {
  const raw = process.env.SP_LOGIN || 'dbo.operadorAccesoCategoria';
  return raw.replace(/^\[?dbo\]?\./i, '').replace(/[\[\]]/g, '');
}

export function getEncuestasDatabase() {
  return process.env.ENCUESTAS_DB_NAME || process.env.DB_NAME;
}

export async function getSqlPool() {
  if (!isSqlServerConfigured()) {
    throw new Error('SQL Server no configurado (faltan DB_HOST, DB_USER o DB_NAME).');
  }
  if (!pool) {
    pool = await sql.connect(sqlConfig(process.env.DB_NAME));
  }
  return pool;
}

/** Pool para el SP de encuestas (puede vivir en otra base, ej. mensajeria). */
export async function getSqlPoolEncuestas() {
  if (!isSqlServerConfigured()) {
    throw new Error('SQL Server no configurado (faltan DB_HOST, DB_USER o DB_NAME).');
  }
  const dbEncuestas = getEncuestasDatabase();
  if (dbEncuestas === process.env.DB_NAME && pool) {
    return pool;
  }
  if (!poolEncuestas) {
    poolEncuestas = await sql.connect(sqlConfig(dbEncuestas));
  }
  return poolEncuestas;
}

function pickField(row, ...candidates) {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const name of candidates.filter(Boolean)) {
    const key = keys.find((k) => k.toLowerCase() === String(name).toLowerCase());
    if (key != null && row[key] != null && row[key] !== '') return row[key];
  }
  return null;
}

export function parseIdEntero(valor) {
  const n = Number.parseInt(String(valor ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeCategoria(categoria) {
  return String(categoria ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Regla DBA: idSupervisor === idVendedor → supervisor; si son distintos → promotor.
 * @returns {'supervisor'|'promotor'|null} null si faltan ids para comparar
 */
export function mapOperadorIdsToRol(idSupervisor, idVendedor, idOperador) {
  const sup = parseIdEntero(idSupervisor);
  const ven = parseIdEntero(idVendedor) ?? parseIdEntero(idOperador);
  if (sup == null || ven == null) return null;
  return sup === ven ? 'supervisor' : 'promotor';
}

/** Respaldo si el SP aún no devuelve idSupervisor / idVendedor. */
export function mapCategoriaToRol(categoria) {
  const raw = normalizeCategoria(categoria);
  if (!raw) return 'supervisor';
  if (raw === 'PROMOTOR PLAN JOVEN') return 'promotor';
  return 'supervisor';
}

/**
 * Mapea la fila de [dbo].[operadorAccesoCategoria].
 * Columnas conocidas: idOperador, operadorCodigo, operadorDescripcion, operadorFUM, Categoria.
 * Para el rol (regla DBA): idSupervisor e idVendedor (nombres pueden variar; ver pickField).
 */
export function mapOperadorRow(row) {
  const idOperador = pickField(row, 'idOperador', 'IdOperador');
  const idSupervisor = pickField(
    row,
    process.env.SP_LOGIN_COL_SUPERVISOR,
    'idSupervisor',
    'IdSupervisor',
    'id_supervisor',
    'IDSupervisor',
    'idOperadorSupervisor',
  );
  const idVendedor = pickField(
    row,
    process.env.SP_LOGIN_COL_VENDEDOR,
    'idVendedor',
    'IdVendedor',
    'id_vendedor',
    'IDVendedor',
    'idOperadorVendedor',
  );
  const loginId = pickField(row, 'operadorCodigo', 'OperadorCodigo');
  const nombre =
    pickField(row, 'operadorDescripcion', 'OperadorDescripcion') ??
    loginId ??
    String(idOperador ?? 'Operador');
  const categoria = pickField(row, 'Categoria', 'categoria');

  if (!idOperador && !loginId) return null;

  const rolPorIds = mapOperadorIdsToRol(idSupervisor, idVendedor, idOperador);
  const rol = rolPorIds ?? mapCategoriaToRol(categoria);
  const idEncuestas = parseIdEntero(idVendedor) ?? parseIdEntero(idOperador);

  return {
    id: String(idEncuestas ?? idOperador ?? loginId),
    nombre: String(nombre),
    rol,
    rolOrigen: rolPorIds ? 'ids' : 'categoria',
    categoria: categoria ? String(categoria) : undefined,
    loginId: loginId ? String(loginId) : undefined,
    idOperador: idOperador != null ? String(idOperador) : undefined,
    idSupervisor: idSupervisor != null ? String(idSupervisor) : undefined,
    idVendedor: idVendedor != null ? String(idVendedor) : undefined,
  };
}

/**
 * exec [dbo].[operadorAccesoCategoria] @LoginID, @PasID
 */
export async function verifyLoginSqlServer(loginId, password) {
  const dbPool = await getSqlPool();
  const proc = getSqlServerProcedureName();
  const paramUser = process.env.SP_LOGIN_PARAM_USER || 'LoginID';
  const paramPass = process.env.SP_LOGIN_PARAM_PASS || 'PasID';

  const request = dbPool.request();
  request.input(paramUser, sql.NVarChar, loginId);
  request.input(paramPass, sql.NVarChar, password);

  const result = await request.execute(proc);
  const rows = result.recordset ?? result.recordsets?.[0] ?? [];
  const row = rows[0];
  if (!row) return null;

  return mapOperadorRow(row);
}

/** Ping liviano para /api/health en producción. */
export async function pingSqlServer() {
  const dbPool = await getSqlPool();
  await dbPool.request().query('SELECT 1 AS ok');
  return true;
}

export async function closeSqlPool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
  if (poolEncuestas && poolEncuestas !== pool) {
    await poolEncuestas.close();
    poolEncuestas = null;
  }
}
