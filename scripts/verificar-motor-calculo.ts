import assert from "node:assert/strict";
import {
  calcularSaldos,
  optimizarTransferencias,
  generarResumenTexto,
} from "../src/lib/gastos/calculo";
import type { Gasto, Saldo, Transferencia } from "../src/lib/gastos/types";

function totalGastadoPorPersona(gastos: Gasto[]): Record<string, number> {
  const totales: Record<string, number> = {};
  for (const gasto of gastos) {
    totales[gasto.pagador] = (totales[gasto.pagador] ?? 0) + gasto.monto;
  }
  return totales;
}

function totalConsumidoPorPersona(gastos: Gasto[]): Record<string, number> {
  const totales: Record<string, number> = {};
  for (const gasto of gastos) {
    for (const consumo of gasto.consumos) {
      totales[consumo.participante] =
        (totales[consumo.participante] ?? 0) + consumo.monto;
    }
  }
  return totales;
}

function ordenar<T extends { participante?: string; deudor?: string }>(
  lista: T[]
): T[] {
  return [...lista].sort((a, b) =>
    (a.participante ?? a.deudor ?? "").localeCompare(b.participante ?? b.deudor ?? "")
  );
}

interface CasoAC {
  id: string;
  descripcion: string;
  gastos: Gasto[];
  saldosEsperados: Saldo[];
  transferenciasEsperadas: Transferencia[];
}

const casos: CasoAC[] = [
  {
    id: "AC-01",
    descripcion:
      "Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo (pago único equitativo)",
    gastos: [
      {
        pagador: "Vos",
        monto: 60000,
        consumos: [
          { participante: "Vos", monto: 20000 },
          { participante: "Juan", monto: 20000 },
          { participante: "Rodrigo", monto: 20000 },
        ],
      },
    ],
    saldosEsperados: [
      { participante: "Vos", neto: 40000 },
      { participante: "Juan", neto: -20000 },
      { participante: "Rodrigo", neto: -20000 },
    ],
    transferenciasEsperadas: [
      { deudor: "Juan", acreedor: "Vos", monto: 20000 },
      { deudor: "Rodrigo", acreedor: "Vos", monto: 20000 },
    ],
  },
  {
    id: "AC-02",
    descripcion:
      "Juan pagó 40.000 de carne, Vos puso 15.000 de bebida, Rodri gastó 5.000 en helado (consumo parejo entre los 3)",
    gastos: [
      {
        pagador: "Juan",
        monto: 40000,
        consumos: [
          { participante: "Juan", monto: 20000 },
          { participante: "Vos", monto: 20000 },
          { participante: "Rodri", monto: 20000 },
        ],
      },
      { pagador: "Vos", monto: 15000, consumos: [] },
      { pagador: "Rodri", monto: 5000, consumos: [] },
    ],
    saldosEsperados: [
      { participante: "Juan", neto: 20000 },
      { participante: "Vos", neto: -5000 },
      { participante: "Rodri", neto: -15000 },
    ],
    transferenciasEsperadas: [
      { deudor: "Rodri", acreedor: "Juan", monto: 15000 },
      { deudor: "Vos", acreedor: "Juan", monto: 5000 },
    ],
  },
  {
    id: "AC-13",
    descripcion:
      "Previa/cena/bebidas: cada uno paga y consume exactamente lo mismo (saldo neto $0 para todos)",
    gastos: [
      {
        pagador: "Vos",
        monto: 30000,
        consumos: [
          { participante: "Juan", monto: 15000 },
          { participante: "Vos", monto: 15000 },
        ],
      },
      {
        pagador: "Juan",
        monto: 30000,
        consumos: [
          { participante: "Juan", monto: 15000 },
          { participante: "Rodri", monto: 15000 },
        ],
      },
      {
        pagador: "Rodri",
        monto: 30000,
        consumos: [
          { participante: "Rodri", monto: 15000 },
          { participante: "Vos", monto: 15000 },
        ],
      },
    ],
    saldosEsperados: [
      { participante: "Vos", neto: 0 },
      { participante: "Juan", neto: 0 },
      { participante: "Rodri", neto: 0 },
    ],
    transferenciasEsperadas: [],
  },
  {
    id: "AC-14",
    descripcion:
      "Primera noche/segunda noche/traslado: saldo neto final no es cero para todos, se esperan 2 transferencias (no 3)",
    gastos: [
      {
        pagador: "Vos",
        monto: 50000,
        consumos: [
          { participante: "Juan", monto: 25000 },
          { participante: "Vos", monto: 25000 },
        ],
      },
      {
        pagador: "Juan",
        monto: 30000,
        consumos: [
          { participante: "Juan", monto: 15000 },
          { participante: "Rodri", monto: 15000 },
        ],
      },
      {
        pagador: "Rodri",
        monto: 10000,
        consumos: [
          { participante: "Rodri", monto: 5000 },
          { participante: "Vos", monto: 5000 },
        ],
      },
    ],
    saldosEsperados: [
      { participante: "Vos", neto: 20000 },
      { participante: "Juan", neto: -10000 },
      { participante: "Rodri", neto: -10000 },
    ],
    transferenciasEsperadas: [
      { deudor: "Juan", acreedor: "Vos", monto: 10000 },
      { deudor: "Rodri", acreedor: "Vos", monto: 10000 },
    ],
  },
];

let huboError = false;

for (const caso of casos) {
  console.log(`\n=== ${caso.id}: ${caso.descripcion} ===`);

  const gastado = totalGastadoPorPersona(caso.gastos);
  const consumido = totalConsumidoPorPersona(caso.gastos);
  const personas = Array.from(new Set([...Object.keys(gastado), ...Object.keys(consumido)]));

  console.log("Gastó / Consumió por persona:");
  for (const persona of personas) {
    console.log(
      `  ${persona}: gastó $${(gastado[persona] ?? 0).toLocaleString("es-AR")} — consumió $${(
        consumido[persona] ?? 0
      ).toLocaleString("es-AR")}`
    );
  }

  const saldos = calcularSaldos(caso.gastos);
  console.log("Saldo neto:");
  for (const saldo of ordenar(saldos)) {
    console.log(`  ${saldo.participante}: ${saldo.neto >= 0 ? "+" : ""}$${saldo.neto.toLocaleString("es-AR")}`);
  }

  const transferencias = optimizarTransferencias(saldos);
  console.log("Transferencias para saldar:");
  if (transferencias.length === 0) {
    console.log("  (ninguna)");
  } else {
    for (const t of transferencias) {
      console.log(`  ${t.deudor} le debe $${t.monto.toLocaleString("es-AR")} a ${t.acreedor}`);
    }
  }

  console.log("Resumen (RF-14):");
  console.log(
    generarResumenTexto(transferencias)
      .split("\n")
      .map((linea) => `  ${linea}`)
      .join("\n")
  );

  try {
    assert.deepStrictEqual(ordenar(saldos), ordenar(caso.saldosEsperados));
    assert.deepStrictEqual(
      ordenar(transferencias),
      ordenar(caso.transferenciasEsperadas)
    );
    console.log(`✓ ${caso.id} OK`);
  } catch (error) {
    huboError = true;
    console.error(`✗ ${caso.id} FALLÓ`);
    console.error(error);
  }
}

console.log("\n===================================");
if (huboError) {
  console.error("Resultado final: hay casos que fallaron.");
  process.exit(1);
} else {
  console.log("Resultado final: todos los AC verificados pasaron.");
}
