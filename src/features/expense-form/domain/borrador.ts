import {
  claveParticipante,
  PLACEHOLDER_VOS,
  type BorradorConsumo,
  type BorradorGasto,
  type BorradorSesion,
} from "@/shared/domain/expense";

/**
 * Construccion y edicion del borrador (RF-11, RF-12).
 *
 * Todo puro: los ids se reciben por parametro en vez de generarse aca, para que
 * estas funciones sean testeables y no dependan de crypto ni del reloj.
 */

export function nuevoConsumo(id: string, participante = ""): BorradorConsumo {
  return { id, participante, montoCentavos: null };
}

/**
 * Gasto vacio para la carga manual (RF-17). Arranca con dos participantes
 * porque un gasto grupal de una sola persona no tiene sentido, y con el
 * placeholder "Vos" en el primero para que el usuario se identifique.
 */
export function nuevoBorradorGasto(id: string, idsConsumo: [string, string]): BorradorGasto {
  return {
    id,
    descripcion: "",
    montoTotalCentavos: null,
    pagador: PLACEHOLDER_VOS,
    modoReparto: "equitativo",
    consumos: [nuevoConsumo(idsConsumo[0], PLACEHOLDER_VOS), nuevoConsumo(idsConsumo[1])],
  };
}

/** Nombres unicos de toda la sesion, para poblar el selector de pagador. */
export function participantesDeSesion(sesion: BorradorSesion): string[] {
  const vistos = new Map<string, string>();
  for (const gasto of sesion.gastos) {
    for (const consumo of gasto.consumos) {
      const nombre = consumo.participante.trim();
      if (nombre === "") continue;
      const clave = claveParticipante(nombre);
      if (!vistos.has(clave)) vistos.set(clave, nombre);
    }
    const pagador = gasto.pagador?.trim();
    if (pagador !== undefined && pagador !== "") {
      const clave = claveParticipante(pagador);
      if (!vistos.has(clave)) vistos.set(clave, pagador);
    }
  }
  return [...vistos.values()];
}

/**
 * Reemplaza un participante en toda la sesion (RF-05).
 *
 * Se aplica a todos los gastos a la vez: cuando el usuario cambia "Vos" por su
 * nombre real tiene que quedar reemplazado en cada gasto donde aparezca, no solo
 * en el que estaba editando.
 */
export function renombrarParticipante(
  sesion: BorradorSesion,
  desde: string,
  hacia: string,
): BorradorSesion {
  const claveDesde = claveParticipante(desde);
  const nuevo = hacia.trim();
  if (nuevo === "") return sesion;

  const reemplazar = (nombre: string) =>
    claveParticipante(nombre) === claveDesde ? nuevo : nombre;

  return {
    gastos: sesion.gastos.map((gasto) => ({
      ...gasto,
      pagador: gasto.pagador === null ? null : reemplazar(gasto.pagador),
      consumos: gasto.consumos.map((consumo) => ({
        ...consumo,
        participante: reemplazar(consumo.participante),
      })),
    })),
  };
}

/** True si la sesion todavia tiene algun "Vos" sin reemplazar (AC-01). */
export function tienePlaceholderVos(sesion: BorradorSesion): boolean {
  const claveVos = claveParticipante(PLACEHOLDER_VOS);
  return sesion.gastos.some(
    (gasto) =>
      (gasto.pagador !== null && claveParticipante(gasto.pagador) === claveVos) ||
      gasto.consumos.some((c) => claveParticipante(c.participante) === claveVos),
  );
}
