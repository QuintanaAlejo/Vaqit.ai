import { describe, expect, it } from "vitest";
import type { Gasto, Transferencia } from "@/shared/domain/expense";
import { esTextoPlano, generarResumen } from "./summary";

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

const DOS_TRANSFERENCIAS: Transferencia[] = [
  { deudor: "Juan", acreedor: "Ale", montoCentavos: 1_000_000 },
  { deudor: "Rodri", acreedor: "Ale", montoCentavos: 1_000_000 },
];

describe("generarResumen — consumo igual para todos", () => {
  // Una cena de $60.000 dividida en tres.
  const gastos = [
    gasto("cena", "Ale", 6_000_000, [
      ["Ale", 2_000_000],
      ["Juan", 2_000_000],
      ["Rodri", 2_000_000],
    ]),
  ];

  it("resume el consumo en una sola linea", () => {
    expect(generarResumen(gastos, DOS_TRANSFERENCIAS)).toBe(
      [
        "Vaqit.ai - Cuentas del grupo",
        "",
        "Total gastado: $60.000",
        "Consumo: $20.000 cada uno",
        "",
        "Juan le debe $10.000 a Ale",
        "Rodri le debe $10.000 a Ale",
        "",
        "Diferencia a saldar: $20.000",
      ].join("\n"),
    );
  });

  it("trata como iguales las diferencias de redondeo al peso", () => {
    // $40.000 entre 3 no da exacto: el reparto asigna $13.333 a cada uno y le
    // deja el peso de resto al pagador. Eso es redondeo, no consumo distinto.
    const conResto = [
      gasto("carne", "Juan", 4_000_000, [
        ["Juan", 1_333_400],
        ["Ale", 1_333_300],
        ["Rodri", 1_333_300],
      ]),
    ];
    const resumen = generarResumen(conResto, []);
    expect(resumen).toContain("Consumo: $13.333 cada uno");
    expect(resumen).not.toContain("Consumo de cada uno:");
    // Y sobre todo: ningun centavo en el mensaje que se comparte.
    expect(resumen).not.toMatch(/,\d{2}/);
  });
});

describe("generarResumen — consumos distintos", () => {
  // AC-14: cada uno consumio algo distinto.
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

  const transferencias: Transferencia[] = [
    { deudor: "Juan", acreedor: "Vos", montoCentavos: 1_000_000 },
    { deudor: "Rodri", acreedor: "Vos", montoCentavos: 1_000_000 },
  ];

  it("lista lo que consumio cada uno, de mayor a menor", () => {
    expect(generarResumen(gastos, transferencias)).toBe(
      [
        "Vaqit.ai - Cuentas del grupo",
        "",
        "Total gastado: $90.000",
        "",
        "Consumo de cada uno:",
        "Juan: $40.000",
        "Vos: $30.000",
        "Rodri: $20.000",
        "",
        "Juan le debe $10.000 a Vos",
        "Rodri le debe $10.000 a Vos",
        "",
        "Diferencia a saldar: $20.000",
      ].join("\n"),
    );
  });

  it("el consumo de cada uno suma el total gastado", () => {
    const resumen = generarResumen(gastos, transferencias);
    expect(resumen).toContain("Total gastado: $90.000");
    // 40.000 + 30.000 + 20.000 = 90.000
    expect(resumen).toContain("Juan: $40.000");
  });
});

describe("generarResumen — casos de borde", () => {
  it("informa explicitamente cuando nadie debe nada (AC-13)", () => {
    const gastos = [
      gasto("previa", "Vos", 3_000_000, [
        ["Vos", 1_500_000],
        ["Juan", 1_500_000],
      ]),
      gasto("cena", "Juan", 3_000_000, [
        ["Juan", 1_500_000],
        ["Vos", 1_500_000],
      ]),
    ];
    const resumen = generarResumen(gastos, []);
    expect(resumen).toContain("Total gastado: $60.000");
    expect(resumen).toContain("Nadie le debe nada a nadie");
    expect(resumen).not.toContain("Diferencia a saldar");
  });

  it("funciona sin gastos, mostrando solo el estado", () => {
    const resumen = generarResumen([], []);
    expect(resumen).not.toContain("Total gastado");
    expect(resumen).toContain("Nadie le debe nada a nadie");
  });

  it("nombra al unico participante en vez de decir 'cada uno'", () => {
    const gastos = [gasto("cafe", "Ana", 100_000, [["Ana", 100_000]])];
    expect(generarResumen(gastos, [])).toContain("Consumo de Ana: $1.000");
  });
});

describe("generarResumen — RNF-03 texto plano", () => {
  const gastos = [
    gasto("cena", "Ale", 6_000_000, [
      ["Ale", 2_000_000],
      ["Juan", 2_000_000],
      ["Rodri", 2_000_000],
    ]),
  ];

  it("no emite ningun caracter de marcado", () => {
    const resumen = generarResumen(gastos, DOS_TRANSFERENCIAS);
    expect(esTextoPlano(resumen)).toBe(true);
    expect(resumen).not.toMatch(/[*_~#`<>]/);
    expect(resumen).not.toContain("\\n");
  });

  it("mantiene texto plano con consumos distintos y montos con centavos", () => {
    const conCentavos = [
      gasto("varios", "Ana", 6_000_050, [
        ["Ana", 4_000_050],
        ["Beto", 2_000_000],
      ]),
    ];
    const resumen = generarResumen(conCentavos, [
      { deudor: "Beto", acreedor: "Ana", montoCentavos: 2_000_000 },
    ]);
    expect(resumen).toContain("Ana: $40.000,50");
    expect(esTextoPlano(resumen)).toBe(true);
  });
});
