import {
  claveParticipante,
  esMismoParticipante,
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
 * Gasto nuevo (RF-17, o al agregar otro gasto sobre una sesion existente).
 * Arranca incluyendo a todos los participantes ya conocidos de la sesion: la
 * mayoria de los gastos de un grupo los consumen todos, asi que el caso comun
 * no exige tildar a nadie, y las excepciones se destildan con el toggle.
 *
 * `ids` trae un id por cada nombre de `participantes`, en el mismo orden y con
 * la misma longitud: es una precondicion de quien llama, no algo a validar aca.
 */
export function nuevoBorradorGasto(
  id: string,
  participantes: string[],
  ids: string[],
): BorradorGasto {
  return {
    id,
    descripcion: "",
    montoTotalCentavos: null,
    // Si "Vos" ya no esta en la sesion (el usuario lo reemplazo por su nombre),
    // no hay que resucitarlo: se deja sin pagador para que el usuario elija.
    pagador: participantes.some((nombre) => esMismoParticipante(nombre, PLACEHOLDER_VOS))
      ? PLACEHOLDER_VOS
      : null,
    modoReparto: "equitativo",
    consumos: participantes.map((nombre, indice) => nuevoConsumo(ids[indice]!, nombre)),
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

/** True si el participante tiene un consumo cargado en ese gasto puntual. */
export function estaIncluido(gasto: BorradorGasto, nombre: string): boolean {
  return gasto.consumos.some((c) => esMismoParticipante(c.participante, nombre));
}

/**
 * Prende o apaga a un participante dentro de un gasto puntual: si ya estaba
 * incluido se quita su consumo, si no estaba se agrega uno nuevo en null (sin
 * monto asignado todavia). Es la base del selector compacto por ticket: el
 * registro de nombres es global, pero quien participo de cada gasto es local
 * a ese gasto (AC-13, AC-14 — no todos los gastos los consume todo el grupo).
 */
export function alternarParticipanteEnGasto(
  gasto: BorradorGasto,
  nombre: string,
  idNuevoConsumo: string,
): BorradorGasto {
  if (estaIncluido(gasto, nombre)) {
    return {
      ...gasto,
      consumos: gasto.consumos.filter((c) => !esMismoParticipante(c.participante, nombre)),
    };
  }
  return { ...gasto, consumos: [...gasto.consumos, nuevoConsumo(idNuevoConsumo, nombre)] };
}

/**
 * Agrega un participante nuevo a toda la sesion (registro global de arriba).
 * Se lo incluye de entrada en todos los gastos existentes porque el caso
 * comun es que participe de todo; si no participo de alguno puntual, se lo
 * destilda ahi con el toggle. `ids` trae un id por cada gasto de la sesion, en
 * el mismo orden que `sesion.gastos` y con la misma longitud (precondicion de
 * quien llama).
 */
export function agregarParticipanteGlobal(
  sesion: BorradorSesion,
  nombre: string,
  ids: string[],
): BorradorSesion {
  const limpio = nombre.trim();
  if (limpio === "") return sesion;

  const yaExiste = participantesDeSesion(sesion).some((n) => esMismoParticipante(n, limpio));
  if (yaExiste) return sesion;

  return {
    gastos: sesion.gastos.map((gasto, indice) => ({
      ...gasto,
      consumos: [...gasto.consumos, nuevoConsumo(ids[indice]!, limpio)],
    })),
  };
}

/**
 * Quita a un participante de toda la sesion: su consumo desaparece de cada
 * gasto, y si era el pagador de alguno ese campo queda vacio para que el
 * usuario elija a otra persona en su lugar.
 */
export function quitarParticipanteGlobal(sesion: BorradorSesion, nombre: string): BorradorSesion {
  return {
    gastos: sesion.gastos.map((gasto) => ({
      ...gasto,
      pagador:
        gasto.pagador !== null && esMismoParticipante(gasto.pagador, nombre) ? null : gasto.pagador,
      consumos: gasto.consumos.filter((c) => !esMismoParticipante(c.participante, nombre)),
    })),
  };
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
