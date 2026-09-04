import { describe, expect, it } from "vitest";
import type { BorradorSesion } from "@/shared/domain/expense";
import {
  agregarParticipanteGlobal,
  alternarParticipanteEnGasto,
  estaIncluido,
  nuevoBorradorGasto,
  participantesDeSesion,
  quitarParticipanteGlobal,
  renombrarParticipante,
  tienePlaceholderVos,
} from "./borrador";

describe("nuevoBorradorGasto — RF-17", () => {
  it("arranca vacio, con Vos como pagador y un consumo por cada participante conocido", () => {
    const gasto = nuevoBorradorGasto("g1", ["Vos", "Juan"], ["c1", "c2"]);
    expect(gasto.montoTotalCentavos).toBeNull();
    expect(gasto.pagador).toBe("Vos");
    expect(gasto.modoReparto).toBe("equitativo");
    expect(gasto.consumos.map((c) => c.participante)).toEqual(["Vos", "Juan"]);
  });

  it("no le asigna pagador si Vos ya no esta entre los participantes conocidos", () => {
    const gasto = nuevoBorradorGasto("g1", ["Ale", "Juan"], ["c1", "c2"]);
    expect(gasto.pagador).toBeNull();
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

describe("estaIncluido / alternarParticipanteEnGasto", () => {
  const gasto: BorradorSesion["gastos"][number] = {
    id: "g1",
    descripcion: "previa",
    montoTotalCentavos: 1000,
    pagador: "Vos",
    modoReparto: "equitativo",
    consumos: [{ id: "c1", participante: "Vos", montoCentavos: null }],
  };

  it("detecta si un nombre ya tiene un consumo en ese gasto", () => {
    expect(estaIncluido(gasto, "Vos")).toBe(true);
    expect(estaIncluido(gasto, "vos")).toBe(true);
    expect(estaIncluido(gasto, "Juan")).toBe(false);
  });

  it("agrega un consumo nuevo si el nombre no estaba incluido", () => {
    const actualizado = alternarParticipanteEnGasto(gasto, "Juan", "c2");
    expect(actualizado.consumos.map((c) => c.participante)).toEqual(["Vos", "Juan"]);
  });

  it("quita el consumo si el nombre ya estaba incluido", () => {
    const actualizado = alternarParticipanteEnGasto(gasto, "Vos", "c2");
    expect(actualizado.consumos).toEqual([]);
  });
});

describe("agregarParticipanteGlobal / quitarParticipanteGlobal", () => {
  const sesion: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "previa",
        montoTotalCentavos: 1000,
        pagador: "Vos",
        modoReparto: "equitativo",
        consumos: [{ id: "c1", participante: "Vos", montoCentavos: null }],
      },
      {
        id: "g2",
        descripcion: "cena",
        montoTotalCentavos: 2000,
        pagador: "Juan",
        modoReparto: "equitativo",
        consumos: [{ id: "c2", participante: "Juan", montoCentavos: null }],
      },
    ],
  };

  it("incluye al nuevo participante en todos los gastos existentes", () => {
    const conAle = agregarParticipanteGlobal(sesion, "Ale", ["nuevo1", "nuevo2"]);
    // "Ale" queda al final de los consumos del primer gasto, asi que aparece
    // ahi antes que "Juan" (que recien se ve al escanear el segundo gasto).
    expect(participantesDeSesion(conAle)).toEqual(["Vos", "Ale", "Juan"]);
    expect(conAle.gastos[0]?.consumos.map((c) => c.participante)).toEqual(["Vos", "Ale"]);
    expect(conAle.gastos[1]?.consumos.map((c) => c.participante)).toEqual(["Juan", "Ale"]);
  });

  it("ignora un nombre repetido o en blanco", () => {
    expect(agregarParticipanteGlobal(sesion, "vos", ["n1", "n2"])).toBe(sesion);
    expect(agregarParticipanteGlobal(sesion, "   ", ["n1", "n2"])).toBe(sesion);
  });

  it("quita al participante de todos los gastos y vacia el pagador donde coincidia", () => {
    const sinVos = quitarParticipanteGlobal(sesion, "Vos");
    expect(sinVos.gastos[0]?.consumos).toEqual([]);
    expect(sinVos.gastos[0]?.pagador).toBeNull();
    // No afecta al otro gasto, que no tenia a Vos ni como pagador ni como consumo.
    expect(sinVos.gastos[1]?.consumos.map((c) => c.participante)).toEqual(["Juan"]);
    expect(sinVos.gastos[1]?.pagador).toBe("Juan");
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
