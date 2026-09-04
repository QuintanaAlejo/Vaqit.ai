"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { BorradorGasto, BorradorSesion, ModoReparto } from "@/shared/domain/expense";
import {
  agregarParticipanteGlobal,
  alternarParticipanteEnGasto,
  nuevoBorradorGasto,
  participantesDeSesion,
  quitarParticipanteGlobal,
  renombrarParticipante,
} from "@/features/expense-form/domain/borrador";
import { validarSesion } from "@/features/expense-form/domain/validation";

/**
 * Estado del borrador editable. Vive solo en memoria: no se escribe en
 * sessionStorage ni en ningun otro lado, consistente con la efimeridad de la
 * sesion que define el PRD (RNF-07).
 *
 * Los montos se guardan dos veces a proposito: `centavos` en el borrador (lo que
 * consume el dominio) y el texto crudo en `textos` (lo que el usuario esta
 * tipeando). Sin el texto crudo, un input controlado por el numero parseado
 * pelea con el usuario mientras escribe "60.0" camino a "60.000".
 */

type Estado = {
  sesion: BorradorSesion;
  textos: Record<string, string>;
};

type Accion =
  | { tipo: "cargar"; sesion: BorradorSesion; textos: Record<string, string> }
  | { tipo: "reset" }
  | { tipo: "setTexto"; clave: string; texto: string }
  | { tipo: "editarGasto"; gastoId: string; cambios: Partial<BorradorGasto> }
  | { tipo: "setModoReparto"; gastoId: string; modo: ModoReparto }
  | { tipo: "agregarGasto"; gastoId: string; idsConsumo: string[] }
  | { tipo: "quitarGasto"; gastoId: string }
  | { tipo: "quitarConsumo"; gastoId: string; consumoId: string }
  | {
      tipo: "editarConsumo";
      gastoId: string;
      consumoId: string;
      cambios: { participante?: string; montoCentavos?: number | null };
    }
  | { tipo: "alternarParticipante"; gastoId: string; nombre: string; idNuevoConsumo: string }
  | { tipo: "agregarParticipanteGlobal"; nombre: string; ids: string[] }
  | { tipo: "quitarParticipanteGlobal"; nombre: string }
  | { tipo: "renombrar"; desde: string; hacia: string };

const VACIO: Estado = { sesion: { gastos: [] }, textos: {} };

/** Clave del texto crudo de un monto: el del gasto o el de una fila de consumo. */
export function claveMonto(gastoId: string, consumoId?: string): string {
  return consumoId === undefined ? `gasto:${gastoId}` : `consumo:${gastoId}:${consumoId}`;
}

function mapearGasto(
  estado: Estado,
  gastoId: string,
  fn: (gasto: BorradorGasto) => BorradorGasto,
): Estado {
  return {
    ...estado,
    sesion: {
      gastos: estado.sesion.gastos.map((gasto) => (gasto.id === gastoId ? fn(gasto) : gasto)),
    },
  };
}

function reducer(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case "cargar":
      return { sesion: accion.sesion, textos: accion.textos };

    case "reset":
      return VACIO;

    case "setTexto":
      return { ...estado, textos: { ...estado.textos, [accion.clave]: accion.texto } };

    case "editarGasto":
      return mapearGasto(estado, accion.gastoId, (gasto) => ({ ...gasto, ...accion.cambios }));

    case "setModoReparto":
      return mapearGasto(estado, accion.gastoId, (gasto) => ({
        ...gasto,
        modoReparto: accion.modo,
        // Al volver a equitativo los montos individuales dejan de aplicar: se
        // limpian para que no reaparezcan si el usuario cambia de opinion.
        consumos:
          accion.modo === "equitativo"
            ? gasto.consumos.map((c) => ({ ...c, montoCentavos: null }))
            : gasto.consumos,
      }));

    case "agregarGasto": {
      const participantesActuales = participantesDeSesion(estado.sesion);
      return {
        ...estado,
        sesion: {
          gastos: [
            ...estado.sesion.gastos,
            nuevoBorradorGasto(accion.gastoId, participantesActuales, accion.idsConsumo),
          ],
        },
      };
    }

    case "quitarGasto":
      return {
        ...estado,
        sesion: { gastos: estado.sesion.gastos.filter((g) => g.id !== accion.gastoId) },
      };

    case "quitarConsumo":
      return mapearGasto(estado, accion.gastoId, (gasto) => ({
        ...gasto,
        consumos: gasto.consumos.filter((c) => c.id !== accion.consumoId),
      }));

    case "editarConsumo":
      return mapearGasto(estado, accion.gastoId, (gasto) => ({
        ...gasto,
        consumos: gasto.consumos.map((c) =>
          c.id === accion.consumoId ? { ...c, ...accion.cambios } : c,
        ),
      }));

    case "alternarParticipante":
      return mapearGasto(estado, accion.gastoId, (gasto) =>
        alternarParticipanteEnGasto(gasto, accion.nombre, accion.idNuevoConsumo),
      );

    case "agregarParticipanteGlobal":
      return {
        ...estado,
        sesion: agregarParticipanteGlobal(estado.sesion, accion.nombre, accion.ids),
      };

    case "quitarParticipanteGlobal":
      return {
        ...estado,
        sesion: quitarParticipanteGlobal(estado.sesion, accion.nombre),
      };

    case "renombrar":
      return {
        ...estado,
        sesion: renombrarParticipante(estado.sesion, accion.desde, accion.hacia),
      };
  }
}

export function useBorradorSesion() {
  const [estado, dispatch] = useReducer(reducer, VACIO);

  const validacion = useMemo(() => validarSesion(estado.sesion), [estado.sesion]);

  const textoMonto = useCallback(
    (gastoId: string, consumoId?: string) => estado.textos[claveMonto(gastoId, consumoId)] ?? "",
    [estado.textos],
  );

  return { sesion: estado.sesion, validacion, textoMonto, dispatch };
}

export type DispatchBorrador = ReturnType<typeof useBorradorSesion>["dispatch"];
