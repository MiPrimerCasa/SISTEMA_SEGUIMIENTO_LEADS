/** @typedef {'entrevista' | 'contacto'} ListaLead */

/**
 * @typedef {Object} Promotor
 * @property {string} id
 * @property {string} nombre
 */

/**
 * @typedef {Object} Referido
 * @property {string} nombre
 * @property {string} telefono
 */

/** @typedef {'promotor' | 'supervisor'} RolUsuario */

/**
 * @typedef {Object} Producto
 * @property {string} id
 * @property {string} codigo
 * @property {string} nombre
 * @property {RolUsuario[]} rolesPermitidos
 */

/**
 * @typedef {Object} SeguimientoLead
 * @property {'llamada' | 'mensaje' | null} [canal]
 * @property {boolean | null} [huboEntrevista]
 * @property {'sin_interes' | 'reagenda' | 'no_compro' | 'compro' | null} [resultadoEntrevista]
 * @property {string | null} [fechaReagenda]
 * @property {string | null} [idProducto]
 * @property {'sena' | 'cien' | null} [estadoPago]
 * @property {boolean | null} [brindoReferidos]
 * @property {Referido[]} [referidos]
 * @property {string} [observaciones]
 */

/**
 * @typedef {Object} Lead
 * @property {string} id
 * @property {string} nombre
 * @property {string} telefono
 * @property {string} promotorId
 * @property {boolean} quiereEntrevista
 * @property {ListaLead} lista
 * @property {string} fechaObtencion ISO date (YYYY-MM-DD)
 * @property {SeguimientoLead} seguimiento
 */

/** @type {Promotor[]} */
export const promotores = [
  { id: 'p1', nombre: 'Promotor A' },
  { id: 'p2', nombre: 'Promotor B' },
  { id: 'p3', nombre: 'Promotor C' },
  { id: 'p4', nombre: 'Promotor D' },
];

/** @type {Producto[]} */
export const productos = [
  {
    id: 'prod-pij',
    codigo: 'PLAN_INVERSION_JOVEN',
    nombre: 'Plan Inversión Joven',
    rolesPermitidos: ['promotor', 'supervisor'],
  },
  {
    id: 'prod-terreno',
    codigo: 'TERRENO',
    nombre: 'Terreno',
    rolesPermitidos: ['supervisor'],
  },
];

/** @param {RolUsuario} rol */
export function getProductosPorRol(rol) {
  return productos.filter((p) => p.rolesPermitidos.includes(rol));
}

/** @param {RolUsuario} rol @param {string} idProducto */
export function puedeVenderProducto(rol, idProducto) {
  const prod = productos.find((p) => p.id === idProducto);
  return Boolean(prod?.rolesPermitidos.includes(rol));
}

export function getProductoNombre(idProducto) {
  return productos.find((p) => p.id === idProducto)?.nombre ?? null;
}

/** @type {Lead[]} */
export const mockLeads = [
  {
    id: 'l1',
    nombre: 'Juan Pérez',
    telefono: '+54 11 4521-8890',
    promotorId: 'p1',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-01-08',
    seguimiento: {},
  },
  {
    id: 'l2',
    nombre: 'María González',
    telefono: '+54 11 3344-2211',
    promotorId: 'p2',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-01-15',
    seguimiento: {
      huboEntrevista: true,
      resultadoEntrevista: 'compro',
      idProducto: 'prod-pij',
      estadoPago: 'sena',
    },
  },
  {
    id: 'l3',
    nombre: 'Carlos Ruiz',
    telefono: '+54 11 5566-7788',
    promotorId: 'p1',
    quiereEntrevista: false,
    lista: 'contacto',
    fechaObtencion: '2025-02-03',
    seguimiento: {},
  },
  {
    id: 'l4',
    nombre: 'Ana Martínez',
    telefono: '+54 11 9900-1122',
    promotorId: 'p3',
    quiereEntrevista: false,
    lista: 'contacto',
    fechaObtencion: '2025-02-20',
    seguimiento: { canal: 'mensaje' },
  },
  {
    id: 'l5',
    nombre: 'Lucía Fernández',
    telefono: '+54 11 2233-4455',
    promotorId: 'p2',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-03-10',
    seguimiento: {
      canal: 'llamada',
      huboEntrevista: false,
      resultadoEntrevista: 'reagenda',
      fechaReagenda: '2025-05-28T11:00',
    },
  },
  {
    id: 'l6',
    nombre: 'Roberto Díaz',
    telefono: '+54 11 6677-8899',
    promotorId: 'p4',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-03-18',
    seguimiento: {
      huboEntrevista: true,
      resultadoEntrevista: 'no_compro',
    },
  },
  {
    id: 'l7',
    nombre: 'Sofía López',
    telefono: '+54 11 1122-3344',
    promotorId: 'p1',
    quiereEntrevista: false,
    lista: 'contacto',
    fechaObtencion: '2025-04-02',
    seguimiento: {},
  },
  {
    id: 'l8',
    nombre: 'Diego Herrera',
    telefono: '+54 11 7788-9900',
    promotorId: 'p3',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-04-15',
    seguimiento: {},
  },
  {
    id: 'l9',
    nombre: 'Valentina Castro',
    telefono: '+54 11 4455-6677',
    promotorId: 'p2',
    quiereEntrevista: false,
    lista: 'contacto',
    fechaObtencion: '2025-05-05',
    seguimiento: {},
  },
  {
    id: 'l10',
    nombre: 'Martín Acosta',
    telefono: '+54 11 8899-0011',
    promotorId: 'p4',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2025-05-12',
    seguimiento: {
      huboEntrevista: true,
      resultadoEntrevista: 'compro',
      idProducto: 'prod-terreno',
      estadoPago: 'cien',
    },
  },
  {
    id: 'l11',
    nombre: 'Paula Ríos',
    telefono: '+54 11 2233-9900',
    promotorId: 'p1',
    quiereEntrevista: true,
    lista: 'entrevista',
    fechaObtencion: '2024-11-20',
    seguimiento: {
      huboEntrevista: true,
      resultadoEntrevista: 'compro',
      idProducto: 'prod-pij',
      estadoPago: 'sena',
    },
  },
  {
    id: 'l12',
    nombre: 'Ignacio Vega',
    telefono: '+54 11 5566-1122',
    promotorId: 'p3',
    quiereEntrevista: false,
    lista: 'contacto',
    fechaObtencion: '2024-12-08',
    seguimiento: {},
  },
];

export function leadCompro(lead) {
  return lead.seguimiento?.resultadoEntrevista === 'compro';
}

export function leadReagendaEntrevista(lead) {
  return lead.seguimiento?.resultadoEntrevista === 'reagenda';
}

/** @param {string | null | undefined} isoLocal datetime-local value */
export function formatFechaReagenda(isoLocal) {
  if (!isoLocal) return '';
  const d = new Date(isoLocal);
  if (Number.isNaN(d.getTime())) return isoLocal;
  return d.toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPromotorNombre(promotorId, lista = promotores) {
  return lista.find((p) => p.id === promotorId)?.nombre ?? 'Sin promotor';
}
