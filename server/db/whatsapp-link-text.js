/**
 * Texto y URLs wa.me para links de redes (mismo formato que la planilla original).
 */

/** Código compacto para SP/lookup (sin espacios). */
export function compactarCodigoSorteo(valor) {
  return String(valor ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s\u00A0]+/g, '')
    .replace(/_/g, '-');
}

/**
 * Código legible en el mensaje de WhatsApp con guiones.
 * SORTEO01S21P01 → SORTEO01-S21-P01
 */
export function formatCodigoMensajeWhatsApp(codigoCompacto) {
  const c = compactarCodigoSorteo(codigoCompacto);
  if (!c) return c;

  const rotativo = c.match(/^SORTEO(\d{2})ROTATIVO$/i);
  if (rotativo) return `SORTEO${rotativo[1]}-ROTATIVO`;

  const supervisor = c.match(/^SORTEO(\d{2})(S\d{2})00$/i);
  if (supervisor) return `SORTEO${supervisor[1]}-${supervisor[2]}-00`;

  const promotor = c.match(/^SORTEO(\d{2})(S\d{2})P(\d{2})$/i);
  if (promotor) return `SORTEO${promotor[1]}-${promotor[2]}-P${promotor[3]}`;

  return c;
}

/** Espacios como + (planilla / wa.me); el código va con guiones sin codificar. */
export function encodeWhatsAppText(text) {
  return encodeURIComponent(text).replace(/%20/g, '+');
}

export function buildMensajeLinkRedes(codigoCompacto, red) {
  const canal = red === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK';
  const codigoMsg = formatCodigoMensajeWhatsApp(codigoCompacto);
  return `Gracias por su atencion!!.ENVIE este codigo ${canal} y PARTICIPE GRATIS del: ${codigoMsg}`;
}

export function buildWaMeUrl(phone, codigoCompacto, red) {
  const text = buildMensajeLinkRedes(codigoCompacto, red);
  return `https://wa.me/${phone}?text=${encodeWhatsAppText(text)}&type=phone_number&app_absent=0`;
}
