import { describe, expect, it } from "vitest";
import { filtrarTextoMonto, formatMonto, parseMonto } from "./money";

describe("parseMonto — AC-06 / RNF-05", () => {
  it("interpreta como sesenta mil todos los formatos equivalentes del AC-06", () => {
    for (const raw of ["60000", "60.000", "60,000", "$60.000", "$ 60.000", "ARS 60000"]) {
      expect(parseMonto(raw), raw).toBe(6_000_000);
    }
  });

  it("interpreta como sesenta mil con cincuenta todos sus formatos equivalentes", () => {
    for (const raw of ["60.000,50", "60,000.50", "60000.5", "60000,50", "$60.000,50"]) {
      expect(parseMonto(raw), raw).toBe(6_000_050);
    }
  });

  it("resuelve separadores de miles repetidos", () => {
    expect(parseMonto("1.234.567")).toBe(123_456_700);
    expect(parseMonto("1,234,567")).toBe(123_456_700);
    expect(parseMonto("1.234.567,89")).toBe(123_456_789);
  });

  it("trata un solo separador con tres digitos a la derecha como miles", () => {
    // En es-AR "1.500" es mil quinientos, no uno con medio.
    expect(parseMonto("1.500")).toBe(150_000);
    expect(parseMonto("1,500")).toBe(150_000);
  });

  it("trata uno o dos digitos a la derecha como decimales", () => {
    expect(parseMonto("1.5")).toBe(150);
    expect(parseMonto("1,50")).toBe(150);
    expect(parseMonto("0,99")).toBe(99);
  });

  it("redondea al centavo mas cercano cuando hay mas de dos decimales", () => {
    // Fracciones de 4+ digitos: no pueden ser una agrupacion de miles valida.
    expect(parseMonto("10,0040")).toBe(1000);
    expect(parseMonto("10,0050")).toBe(1001);
    expect(parseMonto("10,9990")).toBe(1100);
  });

  it("lee tres digitos a la derecha como miles, no como milesimas", () => {
    // "10,004" en es-AR es diez mil cuatro. Es la contracara de la regla que
    // hace que "60.000" sean sesenta mil, y es la lectura correcta para dinero.
    expect(parseMonto("10,004")).toBe(1_000_400);
    expect(parseMonto("10.004")).toBe(1_000_400);
  });

  it("descarta simbolos y codigos de moneda", () => {
    expect(parseMonto("US$ 1.200")).toBe(120_000);
    expect(parseMonto("1200 pesos")).toBe(120_000);
    expect(parseMonto("€1.200")).toBe(120_000);
  });

  it("devuelve null cuando no hay un monto interpretable (AC-08)", () => {
    for (const raw of ["", "   ", "bastante", "un monto", null, undefined, "$"]) {
      expect(parseMonto(raw), String(raw)).toBeNull();
    }
  });

  it("rechaza montos negativos y basura numerica", () => {
    expect(parseMonto("-500")).toBeNull();
    expect(parseMonto("1.2.3,4,5")).toBeNull();
    expect(parseMonto("12a34")).toBeNull();
  });
});

describe("filtrarTextoMonto", () => {
  it("descarta letras y otros caracteres que no sean digitos, punto o coma", () => {
    expect(filtrarTextoMonto("12a34")).toBe("1234");
    expect(filtrarTextoMonto("abc")).toBe("");
    expect(filtrarTextoMonto("$60.000")).toBe("60.000");
    expect(filtrarTextoMonto("60,000.50")).toBe("60,000.50");
  });
});

describe("formatMonto", () => {
  it("omite decimales cuando el monto es redondo", () => {
    expect(formatMonto(6_000_000)).toBe("$60.000");
    expect(formatMonto(0)).toBe("$0");
  });

  it("muestra dos decimales cuando hay centavos", () => {
    expect(formatMonto(6_000_050)).toBe("$60.000,50");
  });

  it("preserva el signo de un saldo negativo", () => {
    expect(formatMonto(-150_000)).toBe("-$1.500");
  });

  it("no emite caracteres de markdown (RNF-03)", () => {
    expect(formatMonto(123_456_789)).not.toMatch(/[*_~#`]/);
  });
});
