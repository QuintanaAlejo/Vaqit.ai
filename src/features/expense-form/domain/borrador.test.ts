import { describe, expect, it } from "vitest";
import type { BorradorSesion } from "@/shared/domain/expense";
import {
  nuevoBorradorGasto,
  participantesDeSesion,
  renombrarParticipante,
  tienePlaceholderVos,
} from "./borrador";

describe("nuevoBorradorGasto — RF-17", () => {
  it("arranca vacio, con Vos como pagador y dos filas de participante", () => {
    const gasto = nuevoBorradorGasto("g1", ["c1", "c2"]);
    expect(gasto.montoTotalCentavos).toBeNull();
    expect(gasto.pagador).toBe("Vos");
    expect(gasto.modoReparto).toBe("equitativo");
    expect(gasto.consumos.map((c) => c.participante)).toEqual(["Vos", ""]);
  });
});

describe("participantesDeSesion", () => {
  it("junta nombres de todos los gastos sin repetir y sin vacios", () => {
    const sesion: BorradorSesion = {
      gastos: [
        {
          id: "g1",
          descripcion: "previa",
          montoTotalCentavos: 1000,
          pagador: "Ale",
          modoReparto: "equitativo",
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: null },
            { id: "c2", participante: "Juan", montoCentavos: null },
            { id: "c3", participante: "  ", montoCentavos: null },
          ],
        },
        {
          id: "g2",
          descripcion: "cena",
          montoTotalCentavos: 2000,
          pagador: "Rodri",
          modoReparto: "equitativo",
          consumos: [{ id: "c4", participante: "juan", montoCentavos: null }],
        },
      ],
    };
    // "Rodri" entra por ser pagador aunque no figure como consumidor.
    expect(participantesDeSesion(sesion)).toEqual(["Ale", "Juan", "Rodri"]);
  });
});

describe("renombrarParticipante — RF-05", () => {
  const sesion: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "previa",
        montoTotalCentavos: 1000,
        pagador: "Vos",
        modoReparto: "equitativo",
        consumos: [
          { id: "c1", participante: "Vos", montoCentavos: null },
          { id: "c2", participante: "Juan", montoCentavos: null },
        ],
      },
      {
        id: "g2",
        descripcion: "cena",
        montoTotalCentavos: 2000,
        pagador: "Juan",
        modoReparto: "equitativo",
        consumos: [{ id: "c3", participante: "vos", montoCentavos: null }],
      },
    ],
  };

  it("reemplaza el placeholder en todos los gastos a la vez", () => {
    const renombrada = renombrarParticipante(sesion, "Vos", "Ale");
    expect(tienePlaceholderVos(renombrada)).toBe(false);
    expect(renombrada.gastos[0]?.pagador).toBe("Ale");
    expect(renombrada.gastos[0]?.consumos[0]?.participante).toBe("Ale");
    // El segundo gasto lo escribia en minuscula: tambien se reemplaza.
    expect(renombrada.gastos[1]?.consumos[0]?.participante).toBe("Ale");
  });

  it("no toca a los demas participantes", () => {
    const renombrada = renombrarParticipante(sesion, "Vos", "Ale");
    expect(renombrada.gastos[0]?.consumos[1]?.participante).toBe("Juan");
    expect(renombrada.gastos[1]?.pagador).toBe("Juan");
  });

  it("ignora un nombre nuevo en blanco en vez de borrar el participante", () => {
    expect(renombrarParticipante(sesion, "Vos", "   ")).toBe(sesion);
  });
});

describe("tienePlaceholderVos — AC-01", () => {
  it("detecta Vos tanto en el pagador como en un consumo", () => {
    const base = {
      id: "g1",
      descripcion: "x",
      montoTotalCentavos: 1000,
      modoReparto: "equitativo" as const,
    };
    expect(
      tienePlaceholderVos({
        gastos: [
          {
            ...base,
            pagador: "Vos",
            consumos: [{ id: "c1", participante: "Juan", montoCentavos: null }],
          },
        ],
      }),
    ).toBe(true);
    expect(
      tienePlaceholderVos({
        gastos: [
          {
            ...base,
            pagador: "Juan",
            consumos: [{ id: "c1", participante: "Vos", montoCentavos: null }],
          },
        ],
      }),
    ).toBe(true);
    expect(
      tienePlaceholderVos({
        gastos: [
          {
            ...base,
            pagador: "Juan",
            consumos: [{ id: "c1", participante: "Ale", montoCentavos: null }],
          },
        ],
      }),
    ).toBe(false);
  });
});
