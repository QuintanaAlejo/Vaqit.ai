import { z } from "zod";

/**
 * Schema de lo que devuelve el MODELO, que no es lo mismo que lo que devuelve
 * nuestro endpoint (eso esta en contract.ts).
 *
 * Los montos entran como string porque el prompt le pide explicitamente al
 * modelo que no normalice numeros: la conversion la hace parseMonto().
 */

/** Un monto ausente puede llegar como null, como "" o directamente faltar. */
const MontoCrudo = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((valor) => {
    if (valor === null || valor === undefined) return null;
    // Algunos modelos ignoran la instruccion y devuelven un number: se acepta
    // y se pasa a string para que lo parsee el mismo camino que el resto.
    return typeof valor === "number" ? String(valor) : valor;
  });

const NombreCrudo = z
  .union([z.string(), z.null()])
  .optional()
  .transform((valor) => (valor === null || valor === undefined ? null : valor.trim()));

export const ConsumoCrudo = z.object({
  participante: NombreCrudo,
  monto: MontoCrudo,
});

export const GastoCrudo = z.object({
  descripcion: z.string().optional().default(""),
  montoTotal: MontoCrudo,
  pagador: NombreCrudo,
  // Si el modelo manda cualquier otra cosa se asume equitativo: es el reparto
  // que no requiere montos por persona y por lo tanto nunca queda incompleto.
  modoReparto: z
    .union([z.literal("equitativo"), z.literal("individual")])
    .optional()
    .default("equitativo"),
  consumos: z.array(ConsumoCrudo).optional().default([]),
});

export const RespuestaModelo = z.object({
  gastos: z.array(GastoCrudo),
});

export type RespuestaModelo = z.infer<typeof RespuestaModelo>;
export type GastoCrudo = z.infer<typeof GastoCrudo>;
