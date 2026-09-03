import type { Consumo } from "./expense";

/**
 * Reparte un monto en partes iguales (RF-08, AC-01).
 *
 * El resto de la division entera se distribuye de a un centavo entre los
 * primeros participantes, de forma que la suma de los consumos siempre sea
 * exactamente igual al total. Si se redondeara cada parte por separado, un
 * gasto de $100 entre 3 daria tres consumos de $33,33 y perderia un centavo.
 */
export function repartirEquitativo(totalCentavos: number, participantes: string[]): Consumo[] {
  if (participantes.length === 0) return [];

  const base = Math.floor(totalCentavos / participantes.length);
  const resto = totalCentavos - base * participantes.length;

  return participantes.map((participante, i) => ({
    participante,
    montoCentavos: base + (i < resto ? 1 : 0),
  }));
}
