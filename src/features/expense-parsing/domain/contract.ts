import { z } from "zod";

/**
 * Contrato del endpoint de interpretacion. Vive en domain porque son schemas
 * puros y los comparten los dos lados del limite: el route handler valida la
 * entrada con el mismo schema con el que el cliente valida la salida.
 */

/** Tope de longitud: un texto mas largo que esto no es la descripcion de una salida. */
export const MAX_LARGO_TEXTO = 2000;

export const SolicitudInterpretacion = z.object({
  texto: z.string().trim().min(1).max(MAX_LARGO_TEXTO),
});

export type SolicitudInterpretacion = z.infer<typeof SolicitudInterpretacion>;

export const ConsumoInterpretado = z.object({
  participante: z.string(),
  /** null = la IA no pudo determinar cuanto consumio esta persona (AC-07). */
  montoCentavos: z.number().int().nonnegative().nullable(),
});

export const GastoInterpretado = z.object({
  descripcion: z.string(),
  /** null = no habia un monto extraible del texto (AC-08). */
  montoTotalCentavos: z.number().int().positive().nullable(),
  /** null = no quedo claro quien pago (AC-10). */
  pagador: z.string().nullable(),
  modoReparto: z.enum(["equitativo", "individual"]),
  consumos: z.array(ConsumoInterpretado),
});

export type GastoInterpretado = z.infer<typeof GastoInterpretado>;

export const RespuestaInterpretacion = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    gastos: z.array(GastoInterpretado).min(1),
  }),
  z.object({
    ok: z.literal(false),
    code: z.string(),
    mensaje: z.string(),
    /** Solo en el rechazo por rate limit (AC-12). */
    retryAfterSeconds: z.number().int().nonnegative().optional(),
  }),
]);

export type RespuestaInterpretacion = z.infer<typeof RespuestaInterpretacion>;
