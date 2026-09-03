import { claveParticipante, PLACEHOLDER_VOS } from "@/shared/domain/expense";
import { parseMonto } from "@/shared/domain/money";
import type { GastoInterpretado } from "./contract";
import type { RespuestaModelo } from "./parseResponseSchema";

/**
 * Convierte la respuesta validada del modelo en gastos interpretados, listos
 * para el formulario editable. Puro: no hay fetch ni reloj.
 *
 * Toda ambiguedad se propaga como null en vez de resolverse por adivinanza; el
 * formulario la resalta y bloquea la confirmacion (AC-07, AC-08, AC-10).
 */
export function normalizarRespuesta(respuesta: RespuestaModelo): GastoInterpretado[] {
  return respuesta.gastos.map(normalizarGasto).filter(tieneAlgoUtil);
}

function normalizarGasto(gasto: RespuestaModelo["gastos"][number]): GastoInterpretado {
  const montoTotalCentavos = normalizarMontoTotal(gasto.montoTotal);

  const consumos = gasto.consumos
    .map((consumo) => ({
      participante: normalizarNombre(consumo.participante),
      montoCentavos: parseMonto(consumo.monto),
    }))
    .filter((consumo) => consumo.participante !== "");

  // En reparto equitativo los montos por persona los deriva el dominio desde el
  // total: cualquier valor que haya mandado el modelo se descarta para que no
  // compitan dos fuentes de verdad.
  const modoReparto = gasto.modoReparto;

  return {
    descripcion: gasto.descripcion.trim(),
    montoTotalCentavos,
    pagador:
      gasto.pagador === null || gasto.pagador === "" ? null : normalizarNombre(gasto.pagador),
    modoReparto,
    consumos:
      modoReparto === "equitativo"
        ? consumos.map((consumo) => ({ ...consumo, montoCentavos: null }))
        : consumos,
  };
}

/**
 * El monto total tiene que ser positivo para servir. Un cero o un negativo del
 * modelo se trata igual que un monto ausente: campo vacio que el usuario
 * completa (AC-08).
 */
function normalizarMontoTotal(crudo: string | null): number | null {
  const centavos = parseMonto(crudo);
  return centavos !== null && centavos > 0 ? centavos : null;
}

/**
 * Unifica las variantes de primera persona a un unico "Vos" (RF-04). El modelo
 * ya recibe la instruccion, pero suele devolver "yo" o "mí" de todas formas.
 */
const VARIANTES_PRIMERA_PERSONA = new Set(
  ["vos", "yo", "mi", "me", "yo mismo", "mi persona"].map(claveParticipante),
);

function normalizarNombre(crudo: string | null): string {
  const nombre = (crudo ?? "").trim();
  if (nombre === "") return "";
  return VARIANTES_PRIMERA_PERSONA.has(claveParticipante(nombre)) ? PLACEHOLDER_VOS : nombre;
}

/**
 * Descarta gastos que no aportan nada editable: sin monto, sin pagador y sin
 * participantes no hay nada que corregir, solo ruido en el formulario.
 */
function tieneAlgoUtil(gasto: GastoInterpretado): boolean {
  return gasto.montoTotalCentavos !== null || gasto.pagador !== null || gasto.consumos.length > 0;
}
