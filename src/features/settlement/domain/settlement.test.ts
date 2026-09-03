import { describe, expect, it } from "vitest";
import type { Gasto, SaldoNeto } from "@/shared/domain/expense";
import { calcularSaldosNetos } from "./balances";
import { repartirEquitativo } from "@/shared/domain/split";
import { calcularTransferencias } from "./transfers";

/** Helper para armar gastos validados sin repetir boilerplate. */
function gasto(
  descripcion: string,
  pagador: string,
  totalCentavos: number,
  consumos: Array<[string, number]>,
): Gasto {
  return {
    id: descripcion,
    descripcion,
    pagador,
    montoTotalCentavos: totalCentavos,
    consumos: consumos.map(([participante, montoCentavos]) => ({ participante, montoCentavos })),
  };
}

function netoDe(saldos: SaldoNeto[], participante: string): number {
  const encontrado = saldos.find((s) => s.participante === participante);
  expect(encontrado, "no se encontro el saldo de " + participante).toBeDefined();
  return encontrado?.netoCentavos ?? Number.NaN;
}

describe("repartirEquitativo — RF-08", () => {
  it("divide en partes exactas cuando el total es divisible", () => {
    const consumos = repartirEquitativo(6_000_000, ["Juan", "Rodrigo", "Vos"]);
    expect(consumos.map((c) => c.montoCentavos)).toEqual([2_000_000, 2_000_000, 2_000_000]);
  });

  it("redondea la parte de cada uno al peso entero", () => {
    // $100 entre 3 son $33,33 cada uno; se reparte $33 y el resto va al pagador.
    const consumos = repartirEquitativo(10_000, ["Juan", "Rodri", "Vos"]);
    expect(consumos.map((c) => c.montoCentavos)).toEqual([3400, 3300, 3300]);
    expect(consumos.every((c) => c.montoCentavos % 100 === 0)).toBe(true);
  });

  it("le deja el resto al pagador", () => {
    const consumos = repartirEquitativo(10_000, ["Juan", "Rodri", "Vos"], "Rodri");
    expect(consumos).toEqual([
      { participante: "Juan", montoCentavos: 3300 },
      { participante: "Rodri", montoCentavos: 3400 },
      { participante: "Vos", montoCentavos: 3300 },
    ]);
  });

  it("identifica al pagador sin importar como este escrito", () => {
    const consumos = repartirEquitativo(10_000, ["Juan", "Rodri", "Vos"], "RODRI");
    expect(consumos[1]?.montoCentavos).toBe(3400);
  });

  it("si el pagador no consumio, el resto lo absorbe el primero", () => {
    // Alguien tiene que absorberlo o los saldos netos no cierran en cero.
    const consumos = repartirEquitativo(10_000, ["Juan", "Rodri", "Vos"], "Ana");
    expect(consumos[0]?.montoCentavos).toBe(3400);
  });

  it("la suma siempre da exactamente el total, sin perder ni un centavo", () => {
    for (const total of [10_000, 4_000_000, 500_000, 100_099, 1, 7]) {
      for (const cantidad of [1, 2, 3, 5, 7]) {
        const participantes = Array.from({ length: cantidad }, (_, i) => `P${i}`);
        const consumos = repartirEquitativo(total, participantes, "P0");
        expect(
          consumos.reduce((acc, c) => acc + c.montoCentavos, 0),
          `total=${total} cantidad=${cantidad}`,
        ).toBe(total);
      }
    }
  });

  it("devuelve vacio sin participantes", () => {
    expect(repartirEquitativo(1000, [])).toEqual([]);
  });
});

describe("AC-01 — pago unico dividido equitativamente", () => {
  // "Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo"
  const consumos = repartirEquitativo(6_000_000, ["Vos", "Juan", "Rodrigo"]);
  const gastos = [
    gasto(
      "cena",
      "Vos",
      6_000_000,
      consumos.map((c) => [c.participante, c.montoCentavos] as [string, number]),
    ),
  ];

  it("deja a Juan y Rodrigo debiendo 20.000 cada uno", () => {
    const saldos = calcularSaldosNetos(gastos);
    expect(netoDe(saldos, "Vos")).toBe(4_000_000);
    expect(netoDe(saldos, "Juan")).toBe(-2_000_000);
    expect(netoDe(saldos, "Rodrigo")).toBe(-2_000_000);
  });

  it("genera exactamente dos transferencias hacia el pagador", () => {
    const transferencias = calcularTransferencias(calcularSaldosNetos(gastos));
    expect(transferencias).toEqual([
      { deudor: "Juan", acreedor: "Vos", montoCentavos: 2_000_000 },
      { deudor: "Rodrigo", acreedor: "Vos", montoCentavos: 2_000_000 },
    ]);
  });
});

describe("AC-02 — pagos cruzados consolidados", () => {
  // "Juan pagó 40.000 de carne, yo puse 15.000 de bebida y Rodri gastó 5.000 en helado"
  // Los tres consumieron el total en partes iguales: 20.000 cada uno.
  const gastos = [
    gasto("carne", "Juan", 4_000_000, [
      ["Juan", 1_333_334],
      ["Vos", 1_333_333],
      ["Rodri", 1_333_333],
    ]),
    gasto("bebida", "Vos", 1_500_000, [
      ["Juan", 500_000],
      ["Vos", 500_000],
      ["Rodri", 500_000],
    ]),
    gasto("helado", "Rodri", 500_000, [
      ["Juan", 166_666],
      ["Vos", 166_667],
      ["Rodri", 166_667],
    ]),
  ];

  it("consolida un total de 60.000 con 20.000 por persona", () => {
    const saldos = calcularSaldosNetos(gastos);
    const totalPagado = gastos.reduce((acc, g) => acc + g.montoTotalCentavos, 0);
    expect(totalPagado).toBe(6_000_000);
    expect(netoDe(saldos, "Juan")).toBe(2_000_000);
    expect(netoDe(saldos, "Vos")).toBe(-500_000);
    expect(netoDe(saldos, "Rodri")).toBe(-1_500_000);
  });

  it("genera las transferencias optimas de Rodri y Vos hacia Juan", () => {
    const transferencias = calcularTransferencias(calcularSaldosNetos(gastos));
    expect(transferencias).toEqual([
      { deudor: "Rodri", acreedor: "Juan", montoCentavos: 1_500_000 },
      { deudor: "Vos", acreedor: "Juan", montoCentavos: 500_000 },
    ]);
  });
});

describe("AC-13 — saldo neto cero para todos: ninguna transferencia", () => {
  // Cada uno pago 30.000 y consumio 30.000, en gastos distintos.
  const gastos = [
    gasto("previa", "Vos", 3_000_000, [
      ["Juan", 1_500_000],
      ["Vos", 1_500_000],
    ]),
    gasto("cena", "Juan", 3_000_000, [
      ["Juan", 1_500_000],
      ["Rodri", 1_500_000],
    ]),
    gasto("bebidas", "Rodri", 3_000_000, [
      ["Rodri", 1_500_000],
      ["Vos", 1_500_000],
    ]),
  ];

  it("deja los tres saldos en cero", () => {
    const saldos = calcularSaldosNetos(gastos);
    expect(saldos.every((s) => s.netoCentavos === 0)).toBe(true);
  });

  it("no emite ninguna transferencia, en vez de las 3 cruzadas", () => {
    expect(calcularTransferencias(calcularSaldosNetos(gastos))).toEqual([]);
  });
});

describe("AC-14 — minimizacion con saldo neto distinto de cero", () => {
  const gastos = [
    gasto("primera noche", "Vos", 5_000_000, [
      ["Juan", 2_500_000],
      ["Vos", 2_500_000],
    ]),
    gasto("segunda noche", "Juan", 3_000_000, [
      ["Juan", 1_500_000],
      ["Rodri", 1_500_000],
    ]),
    gasto("traslado", "Rodri", 1_000_000, [
      ["Rodri", 500_000],
      ["Vos", 500_000],
    ]),
  ];

  it("calcula los netos del PRD: Vos +20.000, Juan -10.000, Rodri -10.000", () => {
    const saldos = calcularSaldosNetos(gastos);
    expect(netoDe(saldos, "Vos")).toBe(2_000_000);
    expect(netoDe(saldos, "Juan")).toBe(-1_000_000);
    expect(netoDe(saldos, "Rodri")).toBe(-1_000_000);
  });

  it("genera exactamente 2 transferencias en vez de 3", () => {
    const transferencias = calcularTransferencias(calcularSaldosNetos(gastos));
    expect(transferencias).toHaveLength(2);
    expect(transferencias).toEqual([
      { deudor: "Juan", acreedor: "Vos", montoCentavos: 1_000_000 },
      { deudor: "Rodri", acreedor: "Vos", montoCentavos: 1_000_000 },
    ]);
  });
});

describe("calcularSaldosNetos — identidad de participantes", () => {
  it("agrupa el mismo nombre escrito con distinta capitalizacion o acento", () => {
    const gastos = [
      gasto("cafe", "Nico", 1000, [
        ["nico", 500],
        ["NICÓ", 500],
      ]),
    ];
    const saldos = calcularSaldosNetos(gastos);
    expect(saldos).toHaveLength(1);
    expect(saldos[0]).toEqual({ participante: "Nico", netoCentavos: 0 });
  });
});

describe("calcularTransferencias — propiedades generales", () => {
  it("emite como maximo n-1 transferencias para n participantes con saldo", () => {
    const saldos = [
      { participante: "A", netoCentavos: 3000 },
      { participante: "B", netoCentavos: 2000 },
      { participante: "C", netoCentavos: -1500 },
      { participante: "D", netoCentavos: -1500 },
      { participante: "E", netoCentavos: -2000 },
    ];
    const transferencias = calcularTransferencias(saldos);
    expect(transferencias.length).toBeLessThanOrEqual(saldos.length - 1);
  });

  it("la suma de lo transferido iguala el total de la deuda", () => {
    const saldos = [
      { participante: "A", netoCentavos: 7333 },
      { participante: "B", netoCentavos: -1111 },
      { participante: "C", netoCentavos: -2222 },
      { participante: "D", netoCentavos: -4000 },
    ];
    const total = calcularTransferencias(saldos).reduce((acc, t) => acc + t.montoCentavos, 0);
    expect(total).toBe(7333);
  });

  it("ignora a los participantes con saldo cero", () => {
    const transferencias = calcularTransferencias([
      { participante: "A", netoCentavos: 0 },
      { participante: "B", netoCentavos: 0 },
    ]);
    expect(transferencias).toEqual([]);
  });
});
