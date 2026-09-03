/**
 * Parseo y formateo de montos (RNF-05, AC-06).
 *
 * El usuario escribe montos en cualquier formato comun y no declara cual usa:
 * "60000", "60.000", "60,000", "$60.000", "60.000,50", "60,000.50", "60000.5".
 * Este modulo resuelve el separador por posicion, no por locale configurado.
 */

/** Simbolos y codigos de moneda que se descartan antes de parsear. */
const RUIDO = /(?:ars|usd|uyu|eur|pesos?|dolar(?:es)?|us\$|u\$s|\$|€|\s| | | )/gi;

/**
 * Convierte texto libre a centavos. Devuelve null si no hay un numero
 * interpretable, que es lo que deja el campo vacio en el formulario (AC-08).
 */
export function parseMonto(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;

  const limpio = raw.replace(RUIDO, "");
  if (!/\d/.test(limpio)) return null;

  // Un monto negativo no describe un gasto: se rechaza en vez de asumir signo.
  if (/^-/.test(limpio)) return null;
  if (/[^\d.,]/.test(limpio)) return null;

  const canonico = aDecimalCanonico(limpio);
  if (canonico === null) return null;

  return aCentavos(canonico);
}

/**
 * Normaliza a "entero.fraccion" con punto decimal, decidiendo que separador es
 * decimal y cual de miles.
 */
function aDecimalCanonico(limpio: string): string | null {
  const ultimoPunto = limpio.lastIndexOf(".");
  const ultimaComa = limpio.lastIndexOf(",");

  // Ambos separadores presentes: el de mas a la derecha es el decimal.
  if (ultimoPunto !== -1 && ultimaComa !== -1) {
    const decimal = ultimoPunto > ultimaComa ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    return partir(limpio, decimal, miles);
  }

  const separador = ultimoPunto !== -1 ? "." : ultimaComa !== -1 ? "," : null;
  if (separador === null) return limpio;

  const ocurrencias = limpio.split(separador).length - 1;
  // Repetido solo puede ser separador de miles: "1.234.567".
  if (ocurrencias > 1) return limpio.split(separador).join("");

  const [, fraccion = ""] = limpio.split(separador);
  // Exactamente 3 digitos a la derecha es ambiguo ("60.000"). Se resuelve como
  // miles: en es-AR "60.000" es sesenta mil, no sesenta con cero. Quien quiera
  // escribir 60 con 500 milesimas no tiene sentido en un monto de dinero.
  if (fraccion.length === 3) return limpio.split(separador).join("");

  return partir(limpio, separador, separador === "." ? "," : ".");
}

function partir(limpio: string, decimal: string, miles: string): string | null {
  const idx = limpio.lastIndexOf(decimal);
  const entero = limpio.slice(0, idx).split(miles).join("");
  const fraccion = limpio.slice(idx + 1);
  // Un separador decimal seguido de otro separador es basura, no un numero.
  if (fraccion.includes(".") || fraccion.includes(",")) return null;
  if (!/^\d*$/.test(entero) || !/^\d*$/.test(fraccion)) return null;
  if (entero === "" && fraccion === "") return null;
  return `${entero === "" ? "0" : entero}.${fraccion}`;
}

/**
 * Pasa a centavos operando sobre los digitos como texto: nunca se multiplica un
 * float por 100, asi no aparece el 6000049.999999999 de turno.
 */
function aCentavos(canonico: string): number | null {
  const [enteroRaw = "0", fraccionRaw = ""] = canonico.split(".");
  const entero = enteroRaw === "" ? "0" : enteroRaw;
  if (!/^\d+$/.test(entero)) return null;

  const dosDigitos = fraccionRaw.slice(0, 2).padEnd(2, "0");
  const centavosFraccion = Number(dosDigitos);
  // Redondeo al centavo mirando el tercer digito, sin punto flotante.
  const tercerDigito = fraccionRaw.length > 2 ? Number(fraccionRaw[2]) : 0;
  const acarreo = tercerDigito >= 5 ? 1 : 0;

  const total = Number(entero) * 100 + centavosFraccion + acarreo;
  return Number.isSafeInteger(total) ? total : null;
}

const FORMATO_ENTERO = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const FORMATO_DECIMAL = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea centavos para mostrar y para el resumen compartible.
 * El "$" se prefija a mano: Intl con style:"currency" intercala un espacio
 * duro que en el texto plano de WhatsApp (RNF-03) queda impredecible.
 */
export function formatMonto(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const cuerpo =
    abs % 100 === 0 ? FORMATO_ENTERO.format(abs / 100) : FORMATO_DECIMAL.format(abs / 100);
  return `${negativo ? "-" : ""}$${cuerpo}`;
}

/**
 * Igual que formatMonto pero sin el simbolo de moneda: se usa para precargar un
 * input editable, donde el "$" lo pone el prefijo del campo y no el valor.
 */
export function formatMontoEditable(centavos: number): string {
  const abs = Math.abs(centavos);
  return abs % 100 === 0 ? FORMATO_ENTERO.format(abs / 100) : FORMATO_DECIMAL.format(abs / 100);
}
