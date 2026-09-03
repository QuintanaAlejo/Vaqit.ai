import {
  claveParticipante,
  esPlaceholderVos,
  type BorradorGasto,
  type BorradorSesion,
  type Gasto,
} from "@/shared/domain/expense";
import { formatMonto } from "@/shared/domain/money";
import { repartirEquitativo } from "@/shared/domain/split";

/**
 * Validacion del formulario editable (RF-11, RF-12, RF-13).
 *
 * Distingue dos niveles, y la distincion importa:
 *  - errores: bloquean la confirmacion (AC-07, AC-08, AC-10, AC-11).
 *  - advertencias: se muestran pero no bloquean. El placeholder "Vos" cae aca:
 *    AC-01 pide "invitar" a reemplazarlo, y AC-02 contempla explicitamente que
 *    el calculo funcione con "Vos" sin reemplazar.
 */

export type CampoBorrador = "montoTotal" | "pagador" | "participante" | "consumo" | "gasto";

export type ProblemaValidacion = {
  gastoId: string;
  campo: CampoBorrador;
  /** Presente cuando el problema apunta a una fila de consumo puntual. */
  consumoId?: string;
  mensaje: string;
};

export type ResultadoValidacion = {
  errores: ProblemaValidacion[];
  advertencias: ProblemaValidacion[];
  puedeConfirmar: boolean;
};

export function validarSesion(sesion: BorradorSesion): ResultadoValidacion {
  const errores: ProblemaValidacion[] = [];
  const advertencias: ProblemaValidacion[] = [];

  if (sesion.gastos.length === 0) {
    errores.push({
      gastoId: "",
      campo: "gasto",
      mensaje: "Agregá al menos un gasto para calcular.",
    });
  }

  for (const gasto of sesion.gastos) {
    validarGasto(gasto, errores, advertencias);
  }

  return { errores, advertencias, puedeConfirmar: errores.length === 0 };
}

function validarGasto(
  gasto: BorradorGasto,
  errores: ProblemaValidacion[],
  advertencias: ProblemaValidacion[],
): void {
  const { id } = gasto;

  // AC-08: sin monto no se puede confirmar.
  if (gasto.montoTotalCentavos === null) {
    errores.push({ gastoId: id, campo: "montoTotal", mensaje: "Completá el monto del gasto." });
  } else if (gasto.montoTotalCentavos <= 0) {
    errores.push({
      gastoId: id,
      campo: "montoTotal",
      mensaje: "El monto tiene que ser mayor a cero.",
    });
  }

  // AC-10: sin pagador identificado tampoco.
  if (gasto.pagador === null || gasto.pagador.trim() === "") {
    errores.push({ gastoId: id, campo: "pagador", mensaje: "Elegí quién pagó este gasto." });
  } else if (esPlaceholderVos(gasto.pagador)) {
    advertencias.push({
      gastoId: id,
      campo: "pagador",
      mensaje: 'Reemplazá "Vos" por tu nombre para que el resto entienda el resumen.',
    });
  }

  if (gasto.consumos.length === 0) {
    errores.push({
      gastoId: id,
      campo: "participante",
      mensaje: "Agregá al menos un participante que haya consumido.",
    });
  }

  // Se cuenta por clave canonica pero se guarda el nombre tal como lo escribio
  // el usuario, para que el mensaje de error lo muestre igual que en el campo.
  const vistos = new Map<string, { nombre: string; cantidad: number }>();
  for (const consumo of gasto.consumos) {
    const nombre = consumo.participante.trim();

    if (nombre === "") {
      errores.push({
        gastoId: id,
        campo: "participante",
        consumoId: consumo.id,
        mensaje: "Completá el nombre del participante.",
      });
    } else {
      const clave = claveParticipante(nombre);
      const previo = vistos.get(clave);
      vistos.set(clave, {
        nombre: previo?.nombre ?? nombre,
        cantidad: (previo?.cantidad ?? 0) + 1,
      });
      if (esPlaceholderVos(nombre)) {
        advertencias.push({
          gastoId: id,
          campo: "participante",
          consumoId: consumo.id,
          mensaje: 'Reemplazá "Vos" por tu nombre real.',
        });
      }
    }

    // AC-07: un participante sin monto asignado en reparto individual es un
    // campo ambiguo que la IA no resolvio; bloquea hasta que se complete.
    if (gasto.modoReparto === "individual") {
      if (consumo.montoCentavos === null) {
        errores.push({
          gastoId: id,
          campo: "consumo",
          consumoId: consumo.id,
          mensaje: `Completá cuánto consumió ${nombre === "" ? "este participante" : nombre}.`,
        });
      } else if (consumo.montoCentavos < 0) {
        errores.push({
          gastoId: id,
          campo: "consumo",
          consumoId: consumo.id,
          mensaje: "El consumo no puede ser negativo.",
        });
      }
    }
  }

  // AC-07: nombres repetidos son ambiguos. No se puede saber a quien va cada
  // monto, asi que se exige diferenciarlos (apellido, inicial) antes de seguir.
  for (const { nombre, cantidad } of vistos.values()) {
    if (cantidad > 1) {
      errores.push({
        gastoId: id,
        campo: "participante",
        mensaje: `"${nombre}" aparece ${cantidad} veces. Diferenciá los nombres (por ejemplo con un apellido o inicial) para saber a quién corresponde cada monto.`,
      });
    }
  }

  // Si los consumos no suman el total, el calculo seria silenciosamente erroneo:
  // el pagador absorberia la diferencia sin que nadie se lo haya pedido. Se
  // bloquea mostrando cuanto falta o sobra.
  if (gasto.modoReparto === "individual" && gasto.montoTotalCentavos !== null) {
    const asignado = gasto.consumos.reduce((acc, c) => acc + (c.montoCentavos ?? 0), 0);
    const sinResolver = gasto.consumos.some((c) => c.montoCentavos === null);
    if (!sinResolver && asignado !== gasto.montoTotalCentavos) {
      const diferencia = gasto.montoTotalCentavos - asignado;
      errores.push({
        gastoId: id,
        campo: "consumo",
        mensaje:
          diferencia > 0
            ? `Faltan asignar ${formatMonto(diferencia)}: los consumos suman menos que el total del gasto.`
            : `Sobran ${formatMonto(-diferencia)}: los consumos suman más que el total del gasto.`,
      });
    }
  }
}

/**
 * Convierte el borrador validado en los gastos que acepta el motor de calculo.
 *
 * Se llama despues de que validarSesion devolvio puedeConfirmar: los null que
 * quedan aca son imposibles por construccion, y si aparecieran se descartan en
 * vez de propagar un NaN al calculo.
 */
export function borradorAGastos(sesion: BorradorSesion): Gasto[] {
  const gastos: Gasto[] = [];

  for (const borrador of sesion.gastos) {
    const { montoTotalCentavos, pagador } = borrador;
    if (montoTotalCentavos === null || pagador === null || pagador.trim() === "") continue;

    const participantes = borrador.consumos
      .map((c) => c.participante.trim())
      .filter((nombre) => nombre !== "");
    if (participantes.length === 0) continue;

    const consumos =
      borrador.modoReparto === "equitativo"
        ? repartirEquitativo(montoTotalCentavos, participantes, pagador)
        : borrador.consumos
            .filter((c) => c.participante.trim() !== "" && c.montoCentavos !== null)
            .map((c) => ({
              participante: c.participante.trim(),
              montoCentavos: c.montoCentavos ?? 0,
            }));

    gastos.push({
      id: borrador.id,
      descripcion: borrador.descripcion,
      montoTotalCentavos,
      pagador: pagador.trim(),
      consumos,
    });
  }

  return gastos;
}
