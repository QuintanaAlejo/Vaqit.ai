import { describe, expect, it } from "vitest";
import { enlaceEsDemasiadoLargo, enlaceWhatsApp } from "./share";
import { generarResumen } from "./summary";

describe("enlaceWhatsApp — RF-15 / AC-04", () => {
  const resumen = generarResumen([
    { deudor: "Juan", acreedor: "Ale", montoCentavos: 1_000_000 },
    { deudor: "Rodri", acreedor: "Ale", montoCentavos: 1_000_000 },
  ]);

  it("apunta a wa.me sin numero, para que el usuario elija el destinatario", () => {
    expect(enlaceWhatsApp(resumen).startsWith("https://wa.me/?text=")).toBe(true);
  });

  it("codifica los saltos de linea y los espacios", () => {
    const enlace = enlaceWhatsApp(resumen);
    expect(enlace).toContain("%0A");
    expect(enlace).not.toContain(" ");
    expect(enlace).not.toContain("\n");
  });

  it("el texto vuelve a ser exactamente el resumen al decodificarlo", () => {
    const enlace = enlaceWhatsApp(resumen);
    const decodificado = decodeURIComponent(enlace.slice("https://wa.me/?text=".length));
    expect(decodificado).toBe(resumen);
  });

  it("no rompe con acentos ni con el signo $", () => {
    const conAcentos = generarResumen([
      { deudor: "Nicolás", acreedor: "María", montoCentavos: 1_234_567 },
    ]);
    const enlace = enlaceWhatsApp(conAcentos);
    const decodificado = decodeURIComponent(enlace.slice("https://wa.me/?text=".length));
    expect(decodificado).toContain("Nicolás le debe $12.345,67 a María");
  });

  it("funciona con el resumen de saldos en cero (AC-13)", () => {
    const enlace = enlaceWhatsApp(generarResumen([]));
    const decodificado = decodeURIComponent(enlace.slice("https://wa.me/?text=".length));
    expect(decodificado).toContain("Nadie le debe nada a nadie");
  });
});

describe("enlaceEsDemasiadoLargo", () => {
  it("un resumen normal entra sin problema", () => {
    const transferencias = Array.from({ length: 20 }, (_, i) => ({
      deudor: `Deudor ${i}`,
      acreedor: "Ale",
      montoCentavos: 100_000,
    }));
    expect(enlaceEsDemasiadoLargo(generarResumen(transferencias))).toBe(false);
  });

  it("detecta un resumen que excede el tope del enlace", () => {
    expect(enlaceEsDemasiadoLargo("a".repeat(9000))).toBe(true);
  });
});
