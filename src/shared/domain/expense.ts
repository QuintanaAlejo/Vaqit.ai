/**
 * Modelo canonico de un gasto grupal. Vive en shared/ porque es el contrato de
 * datos que comparten las tres features (parsing, formulario y settlement); no
 * es un componente compartido, es el vocabulario del dominio.
 *
 * Todos los montos son enteros en CENTAVOS. Trabajar en centavos evita el error
 * de punto flotante al sumar y al repartir, y deja el redondeo concentrado en un
 * unico lugar (repartirEquitativo).
 */

/** Nombre provisorio cuando el texto habla en primera persona (RF-04). */
export const PLACEHOLDER_VOS = "Vos";

// ---------------------------------------------------------------------------
// Borrador: lo que se edita en el formulario (RF-11)
// ---------------------------------------------------------------------------

/**
 * Un campo en null significa "la IA no lo pudo resolver con certeza" y bloquea
 * la confirmacion hasta que el usuario lo complete (AC-08, AC-10).
 */
export type BorradorConsumo = {
  id: string;
  participante: string;
  montoCentavos: number | null;
};

export type ModoReparto = "equitativo" | "individual";

export type BorradorGasto = {
  id: string;
  descripcion: string;
  montoTotalCentavos: number | null;
  pagador: string | null;
  /** RF-07: pago unico a dividir en partes iguales, o consumos distintos por persona. */
  modoReparto: ModoReparto;
  consumos: BorradorConsumo[];
};

export type BorradorSesion = {
  gastos: BorradorGasto[];
};

// ---------------------------------------------------------------------------
// Gasto validado: lo unico que acepta el motor de calculo
// ---------------------------------------------------------------------------

export type Consumo = {
  participante: string;
  montoCentavos: number;
};

export type Gasto = {
  id: string;
  descripcion: string;
  montoTotalCentavos: number;
  pagador: string;
  consumos: Consumo[];
};

// ---------------------------------------------------------------------------
// Resultado del calculo
// ---------------------------------------------------------------------------

/** Positivo: le deben. Negativo: debe. */
export type SaldoNeto = {
  participante: string;
  netoCentavos: number;
};

export type Transferencia = {
  deudor: string;
  acreedor: string;
  montoCentavos: number;
};

// ---------------------------------------------------------------------------
// Identidad de participantes
// ---------------------------------------------------------------------------

/**
 * Clave canonica para comparar nombres: "Rodri", "rodri" y " RODRI " son la
 * misma persona. Se normalizan los acentos para que "Nico" y "Nicó" no queden
 * como dos participantes distintos. El nombre original se conserva para mostrar.
 */
export function claveParticipante(nombre: string): string {
  return nombre
    .trim()
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function esMismoParticipante(a: string, b: string): boolean {
  return claveParticipante(a) === claveParticipante(b);
}

export function esPlaceholderVos(nombre: string): boolean {
  return esMismoParticipante(nombre, PLACEHOLDER_VOS);
}

/**
 * Pone en mayuscula la primera letra y deja el resto como esta: "cena" ->
 * "Cena", "rodri" -> "Rodri", pero "JUAN" sigue siendo "JUAN".
 *
 * Se aplica al entrar al formulario de revision, porque la IA devuelve los
 * nombres y descripciones tal como aparecen en el texto y suelen venir en
 * minuscula. No afecta la identidad del participante: claveParticipante ignora
 * mayusculas, asi que "rodri" y "Rodri" siguen siendo la misma persona.
 */
export function capitalizarInicial(texto: string): string {
  const limpio = texto.trim();
  if (limpio === "") return "";

  const primera = limpio.charAt(0);
  const segunda = limpio.charAt(1);
  // Si la segunda letra ya es mayuscula, el texto tiene una forma deliberada
  // ("iPhone", "eBay") y capitalizar la primera lo arruinaria ("IPhone").
  if (segunda !== "" && segunda === segunda.toLocaleUpperCase("es-AR") && /\p{L}/u.test(segunda)) {
    return limpio;
  }

  return primera.toLocaleUpperCase("es-AR") + limpio.slice(1);
}
