import { formatMonto } from "@/shared/domain/money";
import type { Gasto, Transferencia } from "@/shared/domain/expense";
import { calcularConsumoPorPersona, calcularTotalGastado, type ConsumoTotal } from "./balances";

/**
 * Genera el resumen compartible (RF-14).
 *
 * RNF-03: texto plano estricto. WhatsApp interpreta *, _, ~ y ``` como marcado,
 * asi que ninguno puede aparecer en la salida; tampoco # ni etiquetas HTML. Solo
 * letras, numeros, puntuacion basica y saltos de linea reales.
 */

/** Caracteres que WhatsApp (y la mayoria de los clientes) interpretan como marcado. */
const CARACTERES_DE_MARCADO = /[*_~#`<>]/;

const CENTAVOS_POR_PESO = 100;

export function generarResumen(gastos: Gasto[], transferencias: Transferencia[]): string {
  const lineas: string[] = ["Vaqit.ai - Cuentas del grupo", ""];

  if (gastos.length > 0) {
    lineas.push(`Total gastado: ${formatMonto(calcularTotalGastado(gastos))}`);
    lineas.push(...lineasDeConsumo(gastos));
    lineas.push("");
  }

  if (transferencias.length === 0) {
    lineas.push("Nadie le debe nada a nadie: todos los saldos quedaron en cero.");
  } else {
    for (const t of transferencias) {
      lineas.push(`${t.deudor} le debe ${formatMonto(t.montoCentavos)} a ${t.acreedor}`);
    }
    const total = transferencias.reduce((acc, t) => acc + t.montoCentavos, 0);
    lineas.push("", `Diferencia a saldar: ${formatMonto(total)}`);
  }

  return lineas.join("\n");
}

/**
 * Cuanto consumio cada uno. Si consumieron todos lo mismo se resume en una
 * linea; si hubo consumos distintos se listan uno por uno, que es el caso que
 * el grupo necesita ver detallado para entender el reparto.
 */
function lineasDeConsumo(gastos: Gasto[]): string[] {
  const consumos = calcularConsumoPorPersona(gastos);
  if (consumos.length === 0) return [];

  if (consumos.length === 1) {
    const unico = consumos[0];
    return unico === undefined
      ? []
      : [`Consumo de ${unico.participante}: ${formatMonto(unico.montoCentavos)}`];
  }

  if (consumieronLoMismo(consumos, gastos.length)) {
    // Se muestra al peso entero, igual que los consumos reales: decir
    // "$33,33 cada uno" cuando el reparto asigno $33 seria contradecirse.
    const parteIgual =
      Math.round(calcularTotalGastado(gastos) / consumos.length / CENTAVOS_POR_PESO) *
      CENTAVOS_POR_PESO;
    return [`Consumo: ${formatMonto(parteIgual)} cada uno`];
  }

  return [
    "",
    "Consumo de cada uno:",
    ...consumos.map((c) => `${c.participante}: ${formatMonto(c.montoCentavos)}`),
  ];
}

/**
 * Un reparto equitativo no siempre da montos identicos: cada gasto redondea la
 * parte de cada uno al peso entero y le deja el resto al pagador. Una diferencia
 * de hasta un peso por gasto es ese redondeo, no un consumo distinto, y listarla
 * como tal llenaria el mensaje de renglones que difieren en un peso.
 */
function consumieronLoMismo(consumos: ConsumoTotal[], cantidadDeGastos: number): boolean {
  const montos = consumos.map((c) => c.montoCentavos);
  return Math.max(...montos) - Math.min(...montos) <= cantidadDeGastos * CENTAVOS_POR_PESO;
}

/**
 * Guardia de RNF-03 para usar en tests y en el borde de compartir: si alguna vez
 * se cuela marcado en el resumen, se detecta antes de que llegue a WhatsApp.
 */
export function esTextoPlano(texto: string): boolean {
  return !CARACTERES_DE_MARCADO.test(texto);
}
