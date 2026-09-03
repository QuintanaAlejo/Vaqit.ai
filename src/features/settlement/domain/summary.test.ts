import { describe, expect, it } from "vitest";
import type { Transferencia } from "@/shared/domain/expense";
import { esTextoPlano, generarResumen } from "./summary";

const DOS_TRANSFERENCIAS: Transferencia[] = [
  { deudor: "Juan", acreedor: "Ale", montoCentavos: 1_000_000 },
  { deudor: "Rodri", acreedor: "Ale", montoCentavos: 1_000_000 },
];

describe("generarResumen — RF-14 / RNF-03", () => {
  it("detalla cada deuda individual y el total a saldar (AC-04)", () => {
    expect(generarResumen(DOS_TRANSFERENCIAS)).toBe(
      [
        "Vaqit.ai - Cuentas del grupo",
        "",
        "Juan le debe $10.000 a Ale",
        "Rodri le debe $10.000 a Ale",
        "",
        "Total a saldar: $20.000",
      ].join("\n"),
    );
  });

  it("es texto plano sin ningun caracter de marcado", () => {
    const resumen = generarResumen(DOS_TRANSFERENCIAS);
    expect(esTextoPlano(resumen)).toBe(true);
    expect(resumen).not.toMatch(/[*_~#`<>]/);
    expect(resumen).not.toContain("\\n");
  });

  it("informa explicitamente cuando nadie debe nada (AC-13)", () => {
    const resumen = generarResumen([]);
    expect(resumen).toContain("Nadie le debe nada a nadie");
    expect(resumen).not.toContain("Total a saldar");
    expect(esTextoPlano(resumen)).toBe(true);
  });

  it("usa el nombre real cuando el placeholder ya fue reemplazado (AC-02)", () => {
    const resumen = generarResumen([
      { deudor: "Rodri", acreedor: "Ale", montoCentavos: 1_500_000 },
    ]);
    expect(resumen).toContain("Rodri le debe $15.000 a Ale");
    expect(resumen).not.toContain("Vos");
  });

  it("mantiene texto plano con montos que llevan centavos", () => {
    const resumen = generarResumen([{ deudor: "Ana", acreedor: "Beto", montoCentavos: 6_000_050 }]);
    expect(resumen).toContain("Ana le debe $60.000,50 a Beto");
    expect(esTextoPlano(resumen)).toBe(true);
  });
});
