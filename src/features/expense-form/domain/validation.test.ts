import { describe, expect, it } from "vitest";
import type { BorradorGasto, BorradorSesion } from "@/shared/domain/expense";
import { borradorAGastos, validarSesion } from "./validation";

function borrador(overrides: Partial<BorradorGasto> = {}): BorradorGasto {
  return {
    id: "g1",
    descripcion: "cena",
    montoTotalCentavos: 6_000_000,
    pagador: "Ale",
    modoReparto: "equitativo",
    consumos: [
      { id: "c1", participante: "Ale", montoCentavos: null },
      { id: "c2", participante: "Juan", montoCentavos: null },
      { id: "c3", participante: "Rodrigo", montoCentavos: null },
    ],
    ...overrides,
  };
}

function sesion(...gastos: BorradorGasto[]): BorradorSesion {
  return { gastos };
}

/** Todos los mensajes de error para un campo dado. */
function erroresDe(resultado: ReturnType<typeof validarSesion>, campo: string): string[] {
  return resultado.errores.filter((e) => e.campo === campo).map((e) => e.mensaje);
}

describe("validarSesion — casos que habilitan confirmar", () => {
  it("acepta un gasto equitativo completo", () => {
    const resultado = validarSesion(sesion(borrador()));
    expect(resultado.errores).toEqual([]);
    expect(resultado.puedeConfirmar).toBe(true);
  });

  it("acepta un gasto individual cuyos consumos suman el total", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          modoReparto: "individual",
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: 4_000_000 },
            { id: "c2", participante: "Juan", montoCentavos: 2_000_000 },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(true);
  });
});

describe("AC-08 — monto ausente o ilegible bloquea", () => {
  it("no permite confirmar sin monto", () => {
    const resultado = validarSesion(sesion(borrador({ montoTotalCentavos: null })));
    expect(resultado.puedeConfirmar).toBe(false);
    expect(erroresDe(resultado, "montoTotal")).toContain("Completá el monto del gasto.");
  });

  it("rechaza un monto en cero o negativo", () => {
    expect(validarSesion(sesion(borrador({ montoTotalCentavos: 0 }))).puedeConfirmar).toBe(false);
    expect(validarSesion(sesion(borrador({ montoTotalCentavos: -100 }))).puedeConfirmar).toBe(
      false,
    );
  });
});

describe("AC-10 / AC-11 — pagador ausente bloquea", () => {
  it("no permite confirmar sin pagador", () => {
    const resultado = validarSesion(sesion(borrador({ pagador: null })));
    expect(resultado.puedeConfirmar).toBe(false);
    expect(erroresDe(resultado, "pagador")).toContain("Elegí quién pagó este gasto.");
  });

  it("trata un pagador en blanco igual que uno ausente", () => {
    expect(validarSesion(sesion(borrador({ pagador: "   " }))).puedeConfirmar).toBe(false);
  });
});

describe("AC-07 — campos ambiguos bloquean", () => {
  it("bloquea cuando el mismo nombre aparece dos veces", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          consumos: [
            { id: "c1", participante: "Juan", montoCentavos: null },
            { id: "c2", participante: "juan", montoCentavos: null },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(false);
    // El mensaje muestra el nombre como lo escribio el usuario, no la clave.
    expect(erroresDe(resultado, "participante")[0]).toContain('"Juan" aparece 2 veces');
  });

  it("bloquea cuando un participante no tiene monto en reparto individual", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          modoReparto: "individual",
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: 6_000_000 },
            { id: "c2", participante: "Juan", montoCentavos: null },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(false);
    expect(erroresDe(resultado, "consumo")).toContain("Completá cuánto consumió Juan.");
  });

  it("bloquea un nombre de participante vacio", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: null },
            { id: "c2", participante: "", montoCentavos: null },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(false);
    expect(erroresDe(resultado, "participante")).toContain("Completá el nombre del participante.");
  });
});

describe("coherencia entre consumos y total", () => {
  it("avisa cuanto falta asignar", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          modoReparto: "individual",
          montoTotalCentavos: 6_000_000,
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: 2_000_000 },
            { id: "c2", participante: "Juan", montoCentavos: 2_000_000 },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(false);
    expect(erroresDe(resultado, "consumo")[0]).toContain("Faltan asignar $20.000");
  });

  it("avisa cuanto sobra", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          modoReparto: "individual",
          montoTotalCentavos: 6_000_000,
          consumos: [
            { id: "c1", participante: "Ale", montoCentavos: 5_000_000 },
            { id: "c2", participante: "Juan", montoCentavos: 3_000_000 },
          ],
        }),
      ),
    );
    expect(erroresDe(resultado, "consumo")[0]).toContain("Sobran $20.000");
  });

  it("no exige coherencia de montos en reparto equitativo", () => {
    // En equitativo los consumos se derivan del total, no se ingresan.
    expect(validarSesion(sesion(borrador())).puedeConfirmar).toBe(true);
  });
});

describe('AC-01 — el placeholder "Vos" advierte pero no bloquea', () => {
  it("permite confirmar con Vos sin reemplazar", () => {
    const resultado = validarSesion(sesion(borrador({ pagador: "Vos" })));
    expect(resultado.puedeConfirmar).toBe(true);
    expect(resultado.advertencias.some((a) => a.campo === "pagador")).toBe(true);
  });

  it("advierte tambien cuando Vos es solo participante", () => {
    const resultado = validarSesion(
      sesion(
        borrador({
          pagador: "Juan",
          consumos: [
            { id: "c1", participante: "Juan", montoCentavos: null },
            { id: "c2", participante: "Vos", montoCentavos: null },
          ],
        }),
      ),
    );
    expect(resultado.puedeConfirmar).toBe(true);
    expect(resultado.advertencias.map((a) => a.consumoId)).toContain("c2");
  });
});

describe("validarSesion — sesion sin gastos", () => {
  it("no permite confirmar una sesion vacia", () => {
    const resultado = validarSesion({ gastos: [] });
    expect(resultado.puedeConfirmar).toBe(false);
  });
});

describe("borradorAGastos", () => {
  it("deriva los consumos equitativos desde el total", () => {
    const [gasto] = borradorAGastos(sesion(borrador()));
    expect(gasto?.consumos).toEqual([
      { participante: "Ale", montoCentavos: 2_000_000 },
      { participante: "Juan", montoCentavos: 2_000_000 },
      { participante: "Rodrigo", montoCentavos: 2_000_000 },
    ]);
  });

  it("conserva los consumos individuales tal como fueron ingresados", () => {
    const [gasto] = borradorAGastos(
      sesion(
        borrador({
          modoReparto: "individual",
          consumos: [
            { id: "c1", participante: " Ale ", montoCentavos: 4_000_000 },
            { id: "c2", participante: "Juan", montoCentavos: 2_000_000 },
          ],
        }),
      ),
    );
    expect(gasto?.consumos).toEqual([
      { participante: "Ale", montoCentavos: 4_000_000 },
      { participante: "Juan", montoCentavos: 2_000_000 },
    ]);
  });

  it("descarta gastos incompletos en vez de propagar NaN al calculo", () => {
    expect(borradorAGastos(sesion(borrador({ montoTotalCentavos: null })))).toEqual([]);
    expect(borradorAGastos(sesion(borrador({ pagador: null })))).toEqual([]);
    expect(borradorAGastos(sesion(borrador({ consumos: [] })))).toEqual([]);
  });
});
