import { describe, expect, it } from "vitest";
import type { BorradorSesion } from "@/shared/domain/expense";
import { parseMonto } from "@/shared/domain/money";
import { calcularSaldosNetos } from "@/features/settlement/domain/balances";
import { generarResumen, esTextoPlano } from "@/features/settlement/domain/summary";
import { calcularTransferencias } from "@/features/settlement/domain/transfers";
import { renombrarParticipante } from "./borrador";
import { borradorAGastos, validarSesion } from "./validation";

/**
 * Integracion del flujo completo tal como lo ejercita la UI:
 * borrador editable -> validacion -> gastos -> saldos -> transferencias -> resumen.
 *
 * Es la contraparte no visual del recorrido manual: si algo se rompe entre dos
 * capas, falla aca antes que en el navegador.
 */

describe("AC-14 end to end desde el formulario", () => {
  // Los montos entran como los tipearia el usuario, no como centavos.
  const sesion: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "primera noche",
        montoTotalCentavos: parseMonto("50.000"),
        pagador: "Vos",
        modoReparto: "individual",
        consumos: [
          { id: "c1", participante: "Juan", montoCentavos: parseMonto("25.000") },
          { id: "c2", participante: "Vos", montoCentavos: parseMonto("25.000") },
        ],
      },
      {
        id: "g2",
        descripcion: "segunda noche",
        montoTotalCentavos: parseMonto("30.000"),
        pagador: "Juan",
        modoReparto: "individual",
        consumos: [
          { id: "c3", participante: "Juan", montoCentavos: parseMonto("15.000") },
          { id: "c4", participante: "Rodri", montoCentavos: parseMonto("15.000") },
        ],
      },
      {
        id: "g3",
        descripcion: "traslado",
        montoTotalCentavos: parseMonto("$10.000"),
        pagador: "Rodri",
        modoReparto: "individual",
        consumos: [
          { id: "c5", participante: "Rodri", montoCentavos: parseMonto("5000") },
          { id: "c6", participante: "Vos", montoCentavos: parseMonto("5.000") },
        ],
      },
    ],
  };

  it("habilita confirmar: todos los consumos cierran con su total", () => {
    expect(validarSesion(sesion).puedeConfirmar).toBe(true);
  });

  it("produce las 2 transferencias del PRD y un resumen en texto plano", () => {
    const saldos = calcularSaldosNetos(borradorAGastos(sesion));
    const transferencias = calcularTransferencias(saldos);
    expect(transferencias).toHaveLength(2);

    const resumen = generarResumen(borradorAGastos(sesion), transferencias);
    expect(resumen).toContain("Juan le debe $10.000 a Vos");
    expect(resumen).toContain("Rodri le debe $10.000 a Vos");
    expect(resumen).toContain("Diferencia a saldar: $20.000");
    expect(resumen).toContain("Total gastado: $90.000");
    expect(esTextoPlano(resumen)).toBe(true);
  });

  it("usa el nombre real en el resumen despues de reemplazar el placeholder (AC-02)", () => {
    const conNombre = renombrarParticipante(sesion, "Vos", "Ale");
    const resumen = generarResumen(
      borradorAGastos(conNombre),
      calcularTransferencias(calcularSaldosNetos(borradorAGastos(conNombre))),
    );
    expect(resumen).toContain("Juan le debe $10.000 a Ale");
    expect(resumen).not.toContain("Vos");
  });
});

describe("AC-01 end to end: pago unico equitativo desde el formulario", () => {
  const sesion: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "cena de ayer",
        montoTotalCentavos: parseMonto("60.000"),
        pagador: "Vos",
        modoReparto: "equitativo",
        consumos: [
          { id: "c1", participante: "Vos", montoCentavos: null },
          { id: "c2", participante: "Juan", montoCentavos: null },
          { id: "c3", participante: "Rodrigo", montoCentavos: null },
        ],
      },
    ],
  };

  it("cobra 20.000 a cada uno de los otros dos", () => {
    const transferencias = calcularTransferencias(calcularSaldosNetos(borradorAGastos(sesion)));
    expect(transferencias).toEqual([
      { deudor: "Juan", acreedor: "Vos", montoCentavos: 2_000_000 },
      { deudor: "Rodrigo", acreedor: "Vos", montoCentavos: 2_000_000 },
    ]);
  });
});

describe("AC-13 end to end: pagos cruzados que se compensan", () => {
  const sesion: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "previa",
        montoTotalCentavos: parseMonto("30.000"),
        pagador: "Vos",
        modoReparto: "individual",
        consumos: [
          { id: "c1", participante: "Juan", montoCentavos: parseMonto("15.000") },
          { id: "c2", participante: "Vos", montoCentavos: parseMonto("15.000") },
        ],
      },
      {
        id: "g2",
        descripcion: "cena",
        montoTotalCentavos: parseMonto("30.000"),
        pagador: "Juan",
        modoReparto: "individual",
        consumos: [
          { id: "c3", participante: "Juan", montoCentavos: parseMonto("15.000") },
          { id: "c4", participante: "Rodri", montoCentavos: parseMonto("15.000") },
        ],
      },
      {
        id: "g3",
        descripcion: "bebidas",
        montoTotalCentavos: parseMonto("30.000"),
        pagador: "Rodri",
        modoReparto: "individual",
        consumos: [
          { id: "c5", participante: "Rodri", montoCentavos: parseMonto("15.000") },
          { id: "c6", participante: "Vos", montoCentavos: parseMonto("15.000") },
        ],
      },
    ],
  };

  it("no genera ninguna transferencia y el resumen lo dice explicitamente", () => {
    const transferencias = calcularTransferencias(calcularSaldosNetos(borradorAGastos(sesion)));
    expect(transferencias).toEqual([]);
    expect(generarResumen(borradorAGastos(sesion), transferencias)).toContain(
      "Nadie le debe nada a nadie",
    );
  });
});

describe("AC-08 / AC-10 end to end: el formulario bloquea antes de calcular", () => {
  const incompleta: BorradorSesion = {
    gastos: [
      {
        id: "g1",
        descripcion: "cena",
        // "gastamos bastante en la cena": no hay monto extraible.
        montoTotalCentavos: parseMonto("gastamos bastante"),
        pagador: null,
        modoReparto: "equitativo",
        consumos: [
          { id: "c1", participante: "Juan", montoCentavos: null },
          { id: "c2", participante: "Rodrigo", montoCentavos: null },
        ],
      },
    ],
  };

  it("no permite confirmar y marca monto y pagador", () => {
    const resultado = validarSesion(incompleta);
    expect(resultado.puedeConfirmar).toBe(false);
    expect(resultado.errores.map((e) => e.campo).sort()).toEqual(["montoTotal", "pagador"]);
  });

  it("no produce ningun gasto calculable", () => {
    expect(borradorAGastos(incompleta)).toEqual([]);
  });
});
