import type { SaldoNeto, Transferencia } from "@/shared/domain/expense";

/**
 * Genera la matriz minima de transferencias que salda todos los netos (RF-10).
 *
 * Greedy: se empareja sucesivamente al mayor deudor con el mayor acreedor. Cada
 * paso deja saldado al menos a uno de los dos, por lo que se emiten como maximo
 * n-1 movimientos para n participantes con saldo distinto de cero (AC-13, AC-14).
 *
 * (El minimo absoluto de transferencias es un problema NP-hard en el caso
 * general; el greedy sobre saldos netos es la heuristica estandar y resuelve de
 * forma optima los casos del PRD, incluido el de saldo cero para todos.)
 */
export function calcularTransferencias(saldos: SaldoNeto[]): Transferencia[] {
  const acreedores = saldos
    .filter((s) => s.netoCentavos > 0)
    .map((s) => ({ nombre: s.participante, restante: s.netoCentavos }))
    .sort(porRestanteDescendente);

  const deudores = saldos
    .filter((s) => s.netoCentavos < 0)
    .map((s) => ({ nombre: s.participante, restante: -s.netoCentavos }))
    .sort(porRestanteDescendente);

  const transferencias: Transferencia[] = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i];
    const acreedor = acreedores[j];
    // noUncheckedIndexedAccess: los indices estan acotados por el while.
    if (deudor === undefined || acreedor === undefined) break;

    const monto = Math.min(deudor.restante, acreedor.restante);
    if (monto > 0) {
      transferencias.push({
        deudor: deudor.nombre,
        acreedor: acreedor.nombre,
        montoCentavos: monto,
      });
    }

    deudor.restante -= monto;
    acreedor.restante -= monto;

    if (deudor.restante === 0) i += 1;
    if (acreedor.restante === 0) j += 1;
  }

  return transferencias;
}

function porRestanteDescendente(
  a: { nombre: string; restante: number },
  b: { nombre: string; restante: number },
): number {
  if (a.restante !== b.restante) return b.restante - a.restante;
  return a.nombre.localeCompare(b.nombre, "es-AR");
}
