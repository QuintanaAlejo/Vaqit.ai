/**
 * Construccion del enlace de WhatsApp (RF-15).
 *
 * Puro: devuelve la URL, no navega. Quien la usa decide si abre una pestaña.
 */

const BASE_WA = "https://wa.me/";

/**
 * wa.me sin numero abre el selector de contacto, que es justo lo que hace falta:
 * el usuario elige a quien mandarle el resumen. Un numero fijo no aplica porque
 * no hay cuentas ni contactos guardados.
 */
export function enlaceWhatsApp(resumen: string): string {
  return `${BASE_WA}?text=${encodeURIComponent(resumen)}`;
}

/**
 * Tope de longitud de un enlace wa.me. Un resumen mas largo se comparte igual
 * por el portapapeles (RF-16), que no tiene este limite.
 */
export const MAX_LARGO_ENLACE = 8000;

export function enlaceEsDemasiadoLargo(resumen: string): boolean {
  return enlaceWhatsApp(resumen).length > MAX_LARGO_ENLACE;
}
