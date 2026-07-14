import type { Gasto, Saldo, Transferencia } from "./types";

const EPSILON = 0.01;

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function calcularSaldos(gastos: Gasto[]): Saldo[] {
  const netos = new Map<string, number>();

  const acumular = (participante: string, delta: number) => {
    netos.set(participante, (netos.get(participante) ?? 0) + delta);
  };

  for (const gasto of gastos) {
    acumular(gasto.pagador, gasto.monto);
    for (const consumo of gasto.consumos) {
      acumular(consumo.participante, -consumo.monto);
    }
  }

  return Array.from(netos.entries()).map(([participante, neto]) => ({
    participante,
    neto: redondear(neto),
  }));
}

export function optimizarTransferencias(saldos: Saldo[]): Transferencia[] {
  const deudores = saldos
    .filter((s) => s.neto < -EPSILON)
    .map((s) => ({ participante: s.participante, monto: -s.neto }))
    .sort((a, b) => b.monto - a.monto);

  const acreedores = saldos
    .filter((s) => s.neto > EPSILON)
    .map((s) => ({ participante: s.participante, monto: s.neto }))
    .sort((a, b) => b.monto - a.monto);

  const transferencias: Transferencia[] = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i];
    const acreedor = acreedores[j];
    const monto = redondear(Math.min(deudor.monto, acreedor.monto));

    transferencias.push({
      deudor: deudor.participante,
      acreedor: acreedor.participante,
      monto,
    });

    deudor.monto = redondear(deudor.monto - monto);
    acreedor.monto = redondear(acreedor.monto - monto);

    if (deudor.monto <= EPSILON) i++;
    if (acreedor.monto <= EPSILON) j++;
  }

  return transferencias;
}

function formatearMonto(monto: number): string {
  const redondeado = redondear(monto);
  return redondeado.toLocaleString("es-AR", {
    minimumFractionDigits: redondeado % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function generarResumenTexto(transferencias: Transferencia[]): string {
  if (transferencias.length === 0) {
    return "No hay transferencias pendientes: todos los gastos están saldados.";
  }

  return transferencias
    .map((t) => `${t.deudor} le debe $${formatearMonto(t.monto)} a ${t.acreedor}`)
    .join("\n");
}
