import { claveParticipante, type Gasto, type SaldoNeto } from "@/shared/domain/expense";

/**
 * Consolida todos los gastos de la sesion en un saldo neto por persona (RF-09).
 *
 * Neto = lo que puso - lo que consumio. Positivo: le deben. Negativo: debe.
 * Consolidar en un solo neto (en vez de saldar gasto por gasto) es lo que
 * permite que alguien que pago y consumio en gastos distintos termine en cero
 * sin ninguna transferencia (AC-13).
 */
export function calcularSaldosNetos(gastos: Gasto[]): SaldoNeto[] {
  // La clave canonica agrupa "Rodri" y "rodri"; se guarda el primer nombre
  // visto para mostrarlo tal como lo escribio el usuario.
  const acumulado = new Map<string, { nombre: string; neto: number }>();

  const sumar = (nombre: string, delta: number) => {
    const clave = claveParticipante(nombre);
    const actual = acumulado.get(clave);
    if (actual === undefined) {
      acumulado.set(clave, { nombre: nombre.trim(), neto: delta });
      return;
    }
    actual.neto += delta;
  };

  for (const gasto of gastos) {
    sumar(gasto.pagador, gasto.montoTotalCentavos);
    for (const consumo of gasto.consumos) {
      sumar(consumo.participante, -consumo.montoCentavos);
    }
  }

  return [...acumulado.values()]
    .map(({ nombre, neto }) => ({ participante: nombre, netoCentavos: neto }))
    .sort(ordenarPorNetoDescendente);
}

/** Acreedores primero, deudores al final; empates por nombre para ser determinista. */
function ordenarPorNetoDescendente(a: SaldoNeto, b: SaldoNeto): number {
  if (a.netoCentavos !== b.netoCentavos) return b.netoCentavos - a.netoCentavos;
  return a.participante.localeCompare(b.participante, "es-AR");
}
