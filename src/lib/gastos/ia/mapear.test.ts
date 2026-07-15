import { describe, expect, it } from "vitest";
import { mapearInterpretacionAFormulario } from "./mapear";
import type { InterpretacionGasto } from "./tipos";

describe("mapearInterpretacionAFormulario", () => {
  it("mapea un gasto equitativo completo", () => {
    const interpretacion: InterpretacionGasto = {
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
    };

    const estado = mapearInterpretacionAFormulario(interpretacion);

    expect(estado.participantes).toEqual(["Vos", "Juan", "Rodrigo"]);
    expect(estado.gastos).toHaveLength(1);
    expect(estado.gastos[0].monto).toBe("60000");
    expect(estado.gastos[0].pagador).toBe("Vos");
  });

  it("deja el pagador vacío cuando la IA no lo identificó (AC-10)", () => {
    const interpretacion: InterpretacionGasto = {
      interpretable: true,
      participantes: ["Juan", "Rodrigo"],
      gastos: [
        { monto: 30000, pagador: null, modo: "equitativo", consumidores: ["Juan", "Rodrigo"], montosIndividuales: {} },
      ],
      advertencias: [],
    };

    const estado = mapearInterpretacionAFormulario(interpretacion);

    expect(estado.gastos[0].pagador).toBe("");
  });

  it("deja el monto vacío cuando la IA no lo identificó (AC-08)", () => {
    const interpretacion: InterpretacionGasto = {
      interpretable: true,
      participantes: ["Juan"],
      gastos: [
        { monto: null, pagador: "Juan", modo: "equitativo", consumidores: ["Juan"], montosIndividuales: {} },
      ],
      advertencias: [],
    };

    const estado = mapearInterpretacionAFormulario(interpretacion);

    expect(estado.gastos[0].monto).toBe("");
  });

  it("usa 'Vos' por defecto si no hay participantes", () => {
    const interpretacion: InterpretacionGasto = {
      interpretable: true,
      participantes: [],
      gastos: [],
      advertencias: [],
    };

    const estado = mapearInterpretacionAFormulario(interpretacion);

    expect(estado.participantes).toEqual(["Vos"]);
    expect(estado.gastos).toHaveLength(1);
  });

  it("convierte montosIndividuales numéricos a strings para los inputs", () => {
    const interpretacion: InterpretacionGasto = {
      interpretable: true,
      participantes: ["Vos", "Juan"],
      gastos: [
        {
          monto: 50000,
          pagador: "Vos",
          modo: "individual",
          consumidores: ["Vos", "Juan"],
          montosIndividuales: { Vos: 20000, Juan: 30000 },
        },
      ],
      advertencias: [],
    };

    const estado = mapearInterpretacionAFormulario(interpretacion);

    expect(estado.gastos[0].montosIndividuales).toEqual({ Vos: "20000", Juan: "30000" });
  });
});
