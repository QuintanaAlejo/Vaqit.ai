import type { Gasto } from "./types";
import type { EstadoFormulario } from "./tipos-formulario";

const EPSILON = 0.01;

export interface ErroresGasto {
  monto?: string;
  pagador?: string;
  consumidores?: string;
  montosIndividuales?: string;
}

export interface ResultadoValidacion {
  erroresGlobales: string[];
  erroresPorGasto: Record<string, ErroresGasto>;
  gastos: Gasto[] | null;
}

function parsearMonto(valor: string): number | null {
  const normalizado = valor.trim().replace(",", ".");
  if (normalizado === "") return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function validarFormulario(estado: EstadoFormulario): ResultadoValidacion {
  const erroresGlobales: string[] = [];
  const erroresPorGasto: Record<string, ErroresGasto> = {};
  const gastosValidos: Gasto[] = [];

  if (estado.participantes.length === 0) {
    erroresGlobales.push("Agregá al menos un participante.");
  }

  if (estado.gastos.length === 0) {
    erroresGlobales.push("Agregá al menos un gasto.");
  }

  for (const gastoForm of estado.gastos) {
    const errores: ErroresGasto = {};
    const monto = parsearMonto(gastoForm.monto);

    if (monto === null || monto <= 0) {
      errores.monto = "Ingresá un monto válido mayor a 0.";
    }

    if (!gastoForm.pagador) {
      errores.pagador = "Elegí quién pagó este gasto.";
    }

    if (gastoForm.consumidores.length === 0) {
      errores.consumidores = "Elegí al menos un participante que haya consumido este gasto.";
    }

    let consumos: { participante: string; monto: number }[] = [];

    if (monto !== null && gastoForm.consumidores.length > 0) {
      if (gastoForm.modo === "equitativo") {
        const n = gastoForm.consumidores.length;
        const base = redondear(monto / n);
        consumos = gastoForm.consumidores.map((participante, indice) => ({
          participante,
          monto: indice === n - 1 ? redondear(monto - base * (n - 1)) : base,
        }));
      } else {
        const montosIndividuales = gastoForm.consumidores.map((participante) =>
          parsearMonto(gastoForm.montosIndividuales[participante] ?? "")
        );

        if (montosIndividuales.some((m) => m === null || m < 0)) {
          errores.montosIndividuales = "Completá un monto válido para cada participante.";
        } else {
          const suma = redondear(
            montosIndividuales.reduce((acc: number, m) => acc + (m as number), 0)
          );
          if (Math.abs(suma - monto) > EPSILON) {
            errores.montosIndividuales = `La suma de los montos individuales ($${suma}) no coincide con el total ($${monto}).`;
          } else {
            consumos = gastoForm.consumidores.map((participante, indice) => ({
              participante,
              monto: montosIndividuales[indice] as number,
            }));
          }
        }
      }
    }

    if (Object.keys(errores).length > 0) {
      erroresPorGasto[gastoForm.id] = errores;
    } else if (monto !== null) {
      gastosValidos.push({ pagador: gastoForm.pagador, monto, consumos });
    }
  }

  const hayErroresPorGasto = Object.keys(erroresPorGasto).length > 0;

  return {
    erroresGlobales,
    erroresPorGasto,
    gastos: erroresGlobales.length === 0 && !hayErroresPorGasto ? gastosValidos : null,
  };
}
