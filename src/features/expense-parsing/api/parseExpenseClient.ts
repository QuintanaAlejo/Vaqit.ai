"use client";

import { RespuestaInterpretacion, type GastoInterpretado } from "../domain/contract";

/**
 * Cliente del endpoint de interpretacion.
 *
 * Vive en api/ y no en data/: data/ es donde se habla con el proveedor de IA
 * (server-side), mientras esto es el otro extremo del propio limite HTTP de la
 * feature. Asi la UI no importa nunca de data/, como pide AGENTS.md.
 */

export const RUTA_INTERPRETACION = "/api/parse-expense";

export type ResultadoInterpretacion =
  | { ok: true; gastos: GastoInterpretado[] }
  | { ok: false; code: string; mensaje: string; retryAfterSeconds?: number };

const MENSAJE_GENERICO =
  "No pudimos interpretar el texto. Probá reformularlo o cargá el gasto a mano.";

export async function interpretarGasto(texto: string): Promise<ResultadoInterpretacion> {
  let respuesta: Response;
  try {
    respuesta = await fetch(RUTA_INTERPRETACION, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
  } catch {
    // Sin red no hay forma de interpretar: se ofrece la carga manual (AC-05).
    return {
      ok: false,
      code: "SIN_CONEXION",
      mensaje: "No pudimos conectarnos. Revisá tu conexión o cargá el gasto a mano.",
    };
  }

  // El cuerpo puede no ser JSON (un 404 o un 502 de la plataforma devuelven
  // HTML): se trata como fallo interpretable, no como excepcion.
  const crudo: unknown = await respuesta.json().catch(() => null);
  const parseado = RespuestaInterpretacion.safeParse(crudo);

  if (!parseado.success) {
    return { ok: false, code: "RESPUESTA_INVALIDA", mensaje: MENSAJE_GENERICO };
  }

  return parseado.data;
}
