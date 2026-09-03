import { describe, expect, it } from "vitest";
import { normalizarRespuesta } from "./normalizarGasto";
import { RespuestaModelo } from "./parseResponseSchema";

/** Parsea como lo haria el cliente antes de normalizar, para probar el camino real. */
function desdeModelo(crudo: unknown) {
  const parseado = RespuestaModelo.safeParse(crudo);
  if (!parseado.success) throw new Error(`no valida: ${parseado.error.message}`);
  return normalizarRespuesta(parseado.data);
}

describe("AC-01 — pago unico equitativo en primera persona", () => {
  // "Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo"
  const gastos = desdeModelo({
    gastos: [
      {
        descripcion: "cena",
        montoTotal: "60.000",
        pagador: "Vos",
        modoReparto: "equitativo",
        consumos: [
          { participante: "Vos", monto: null },
          { participante: "Juan", monto: null },
          { participante: "Rodrigo", monto: null },
        ],
      },
    ],
  });

  it("parsea el monto con separador de miles", () => {
    expect(gastos[0]?.montoTotalCentavos).toBe(6_000_000);
  });

  it("deja Vos como pagador y los tres participantes sin monto individual", () => {
    expect(gastos[0]?.pagador).toBe("Vos");
    expect(gastos[0]?.consumos).toEqual([
      { participante: "Vos", montoCentavos: null },
      { participante: "Juan", montoCentavos: null },
      { participante: "Rodrigo", montoCentavos: null },
    ]);
  });
});

describe("RF-04 — variantes de primera persona se unifican en Vos", () => {
  it("mapea yo, mi y me al placeholder", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "bebida",
          montoTotal: "15000",
          pagador: "yo",
          modoReparto: "individual",
          consumos: [
            { participante: "mí", monto: "5000" },
            { participante: "Juan", monto: "10000" },
          ],
        },
      ],
    });
    expect(gastos[0]?.pagador).toBe("Vos");
    expect(gastos[0]?.consumos[0]?.participante).toBe("Vos");
    expect(gastos[0]?.consumos[1]?.participante).toBe("Juan");
  });
});

describe("AC-02 — varios gastos con pagadores distintos", () => {
  it("mantiene los tres gastos separados con su pagador", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "carne",
          montoTotal: "40.000",
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: null },
            { participante: "Vos", monto: null },
            { participante: "Rodri", monto: null },
          ],
        },
        {
          descripcion: "bebida",
          montoTotal: "15.000",
          pagador: "Vos",
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: null },
            { participante: "Vos", monto: null },
            { participante: "Rodri", monto: null },
          ],
        },
        {
          descripcion: "helado",
          montoTotal: "5.000",
          pagador: "Rodri",
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: null },
            { participante: "Vos", monto: null },
            { participante: "Rodri", monto: null },
          ],
        },
      ],
    });

    expect(gastos).toHaveLength(3);
    expect(gastos.map((g) => g.pagador)).toEqual(["Juan", "Vos", "Rodri"]);
    expect(gastos.map((g) => g.montoTotalCentavos)).toEqual([4_000_000, 1_500_000, 500_000]);
  });
});

describe("AC-08 / AC-10 — la ambiguedad se propaga como null", () => {
  it("deja el monto en null cuando el modelo no lo pudo extraer", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: null,
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [{ participante: "Juan", monto: null }],
        },
      ],
    });
    expect(gastos[0]?.montoTotalCentavos).toBeNull();
  });

  it("deja el monto en null cuando el modelo devolvio texto no numerico", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: "bastante",
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [{ participante: "Juan", monto: null }],
        },
      ],
    });
    expect(gastos[0]?.montoTotalCentavos).toBeNull();
  });

  it("trata un monto cero o negativo como ausente", () => {
    for (const montoTotal of ["0", "-500"]) {
      const gastos = desdeModelo({
        gastos: [
          {
            descripcion: "x",
            montoTotal,
            pagador: "Juan",
            modoReparto: "equitativo",
            consumos: [{ participante: "Juan", monto: null }],
          },
        ],
      });
      expect(gastos[0]?.montoTotalCentavos, montoTotal).toBeNull();
    }
  });

  it("deja el pagador en null cuando no quedo claro quien pago", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: "30.000",
          pagador: null,
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: null },
            { participante: "Vos", monto: null },
          ],
        },
      ],
    });
    expect(gastos[0]?.pagador).toBeNull();
  });

  it("deja en null el consumo que el modelo no pudo determinar (AC-07)", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: "30.000",
          pagador: "Juan",
          modoReparto: "individual",
          consumos: [
            { participante: "Juan", monto: "20.000" },
            { participante: "Rodri", monto: null },
          ],
        },
      ],
    });
    expect(gastos[0]?.consumos).toEqual([
      { participante: "Juan", montoCentavos: 2_000_000 },
      { participante: "Rodri", montoCentavos: null },
    ]);
  });
});

describe("normalizarRespuesta — tolerancia a respuestas imperfectas", () => {
  it("descarta los montos individuales si el reparto es equitativo", () => {
    // Dos fuentes de verdad para el mismo dato serian un bug silencioso: en
    // equitativo manda el total y los consumos los deriva el dominio.
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: "30.000",
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: "99.999" },
            { participante: "Rodri", monto: "1" },
          ],
        },
      ],
    });
    expect(gastos[0]?.consumos.every((c) => c.montoCentavos === null)).toBe(true);
  });

  it("acepta que el modelo devuelva el monto como number en vez de string", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: 60000,
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [{ participante: "Juan", monto: null }],
        },
      ],
    });
    expect(gastos[0]?.montoTotalCentavos).toBe(6_000_000);
  });

  it("asume equitativo si el modo de reparto viene ausente", () => {
    const gastos = desdeModelo({
      gastos: [{ montoTotal: "1000", pagador: "Juan", consumos: [{ participante: "Juan" }] }],
    });
    expect(gastos[0]?.modoReparto).toBe("equitativo");
  });

  it("descarta participantes sin nombre", () => {
    const gastos = desdeModelo({
      gastos: [
        {
          descripcion: "cena",
          montoTotal: "1000",
          pagador: "Juan",
          modoReparto: "equitativo",
          consumos: [
            { participante: "Juan", monto: null },
            { participante: "  ", monto: null },
          ],
        },
      ],
    });
    expect(gastos[0]?.consumos).toHaveLength(1);
  });

  it("descarta gastos que no aportan nada editable", () => {
    expect(
      desdeModelo({
        gastos: [{ descripcion: "ruido", montoTotal: null, pagador: null, consumos: [] }],
      }),
    ).toEqual([]);
  });

  it("AC-09: un texto sin gastos devuelve una lista vacia", () => {
    expect(desdeModelo({ gastos: [] })).toEqual([]);
  });
});
