import { formatMonto } from "@/shared/domain/money";
import type { Transferencia } from "@/shared/domain/expense";

/**
 * Genera el resumen compartible (RF-14).
 *
 * RNF-03: texto plano estricto. WhatsApp interpreta *, _, ~ y ``` como marcado,
 * asi que ninguno puede aparecer en la salida; tampoco # ni etiquetas HTML. Solo
 * letras, numeros, puntuacion basica y saltos de linea reales.
 */

/** Caracteres que WhatsApp (y la mayoria de los clientes) interpretan como marcado. */
const CARACTERES_DE_MARCADO = /[*_~#`<>]/;

export function generarResumen(transferencias: Transferencia[]): string {
  const lineas: string[] = ["Vaqit.ai - Cuentas del grupo", ""];

  if (transferencias.length === 0) {
    lineas.push("Nadie le debe nada a nadie: todos los saldos quedaron en cero.");
  } else {
    for (const t of transferencias) {
      lineas.push(`${t.deudor} le debe ${formatMonto(t.montoCentavos)} a ${t.acreedor}`);
    }
    const total = transferencias.reduce((acc, t) => acc + t.montoCentavos, 0);
    lineas.push("", `Total a saldar: ${formatMonto(total)}`);
  }

  return lineas.join("\n");
}

/**
 * Guardia de RNF-03 para usar en tests y en el borde de compartir: si alguna vez
 * se cuela marcado en el resumen, se detecta antes de que llegue a WhatsApp.
 */
export function esTextoPlano(texto: string): boolean {
  return !CARACTERES_DE_MARCADO.test(texto);
}
