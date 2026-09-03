import { esMismoParticipante, type Consumo } from "./expense";

/**
 * Reparte un monto en partes iguales (RF-08, AC-01).
 *
 * La parte de cada uno se redondea hacia abajo al PESO ENTERO, y el resto lo
 * absorbe el pagador. Sin esto, un gasto de $40.000 entre tres deja consumos de
 * $13.333,33 y el resumen que se comparte por WhatsApp termina lleno de cifras
 * como "$14.999,99", que se leen como un error aunque sean exactas.
 *
 * El resto tiene que asignarse a alguien si o si: si la suma de los consumos no
 * diera exactamente el total, los saldos netos no cerrarian en cero y la matriz
 * de transferencias quedaria descompensada.
 */
export function repartirEquitativo(
  totalCentavos: number,
  participantes: string[],
  pagador?: string | null,
): Consumo[] {
  if (participantes.length === 0) return [];

  const cantidad = participantes.length;
  const base = Math.floor(totalCentavos / cantidad / 100) * 100;
  const resto = totalCentavos - base * cantidad;

  // El pagador se come el resto. Si no consumio nada, lo absorbe el primero:
  // alguien tiene que hacerlo para que la suma cuadre con el total.
  const indiceAbsorbe = indiceDelPagador(participantes, pagador);

  return participantes.map((participante, i) => ({
    participante,
    montoCentavos: base + (i === indiceAbsorbe ? resto : 0),
  }));
}

function indiceDelPagador(participantes: string[], pagador?: string | null): number {
  if (pagador === undefined || pagador === null || pagador.trim() === "") return 0;
  const indice = participantes.findIndex((nombre) => esMismoParticipante(nombre, pagador));
  return indice === -1 ? 0 : indice;
}
