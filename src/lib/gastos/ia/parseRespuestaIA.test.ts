import { describe, expect, it } from "vitest";
import { parseRespuestaIA } from "./parseRespuestaIA";

describe("parseRespuestaIA", () => {
  it("parsea una respuesta válida completa", () => {
    const resultado = parseRespuestaIA({
      interpretable: true,
      participantes: ["Vos", "Juan", "Rodrigo"],
      gastos: [
        {
          monto: 60000,
          pagador: "Vos",
          modo: "equitativo",
          consumidores: ["Vos", "Juan", "Rodrigo"],
          montosIndividuales: {},
        },
      ],
      advertencias: [],
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.gastos).toHaveLength(1);
      expect(resultado.data.gastos[0].monto).toBe(60000);
    }
  });

  it("acepta monto y pagador en null (AC-08, AC-10)", () => {
    const resultado = parseRespuestaIA({
      interpretable: true,
      participantes: ["Juan", "Rodrigo"],
      gastos: [
        { monto: null, pagador: null, modo: "equitativo", consumidores: [], montosIndividuales: {} },
      ],
      advertencias: [],
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.gastos[0].monto).toBeNull();
      expect(resultado.data.gastos[0].pagador).toBeNull();
    }
  });

  it("devuelve interpretable=false cuando el texto no se pudo interpretar (AC-09)", () => {
    const resultado = parseRespuestaIA({ interpretable: false });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.interpretable).toBe(false);
      expect(resultado.data.gastos).toEqual([]);
    }
  });

  it("rechaza JSON que no es un objeto", () => {
    expect(parseRespuestaIA("no soy un objeto").ok).toBe(false);
    expect(parseRespuestaIA(null).ok).toBe(false);
    expect(parseRespuestaIA(42).ok).toBe(false);
  });

  it("rechaza cuando falta el campo interpretable", () => {
    const resultado = parseRespuestaIA({ participantes: [], gastos: [], advertencias: [] });
    expect(resultado.ok).toBe(false);
  });

  it("rechaza un gasto con modo inválido", () => {
    const resultado = parseRespuestaIA({
      interpretable: true,
      participantes: ["Vos"],
      gastos: [{ monto: 100, pagador: "Vos", modo: "raro", consumidores: [], montosIndividuales: {} }],
      advertencias: [],
    });

    expect(resultado.ok).toBe(false);
  });

  it("rechaza montosIndividuales con valores no numéricos", () => {
    const resultado = parseRespuestaIA({
      interpretable: true,
      participantes: ["Vos", "Juan"],
      gastos: [
        {
          monto: 100,
          pagador: "Vos",
          modo: "individual",
          consumidores: ["Vos", "Juan"],
          montosIndividuales: { Juan: "no es numero" },
        },
      ],
      advertencias: [],
    });

    expect(resultado.ok).toBe(false);
  });

  it("conserva advertencias de ambigüedad (AC-07)", () => {
    const resultado = parseRespuestaIA({
      interpretable: true,
      participantes: ["Juan", "Juan"],
      gastos: [],
      advertencias: ["Hay dos personas llamadas Juan, revisá a quién corresponde cada monto"],
    });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.data.advertencias).toHaveLength(1);
    }
  });
});
