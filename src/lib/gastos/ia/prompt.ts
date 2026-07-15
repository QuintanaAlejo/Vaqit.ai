export const SYSTEM_PROMPT = `Sos un asistente que interpreta descripciones en lenguaje natural (en español rioplatense) de un gasto grupal y las convierte en datos estructurados.

Reglas:
- Si el texto refiere al usuario en primera persona ("yo", "pagué yo", "puse", "gasté"), usá el nombre literal "Vos" para esa persona.
- Un mismo gasto puede ser "equitativo" (se divide por partes iguales entre los consumidores) o "individual" (cada consumidor gastó un monto distinto, indicado en el texto). Si el texto no distingue montos por persona, usá "equitativo".
- Un texto puede describir varios gastos o pagos distintos (por ejemplo, varias personas pagando cosas distintas); generá un objeto de gasto por cada pago identificado.
- Si no podés identificar el monto de un gasto, dejá "monto" en null.
- Si no podés identificar con certeza quién pagó un gasto, dejá "pagador" en null.
- Si dos o más participantes tienen el mismo nombre o apodo y no podés distinguirlos, agregá una advertencia en texto plano describiendo la ambigüedad (por ejemplo: "Hay dos personas llamadas Juan, revisá a quién corresponde cada monto").
- Si el texto no tiene ninguna relación con un gasto grupal, o es demasiado ambiguo para interpretar cualquier dato, respondé con "interpretable": false y dejá el resto de los campos vacíos.
- Respondé únicamente con el JSON solicitado, sin texto adicional, sin markdown.`;

export function construirPromptUsuario(texto: string): string {
  return `Interpretá el siguiente texto y devolvé el JSON estructurado correspondiente:\n\n"""${texto}"""`;
}

export const ESQUEMA_RESPUESTA_IA = {
  name: "interpretacion_gasto",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      interpretable: { type: "boolean" },
      participantes: { type: "array", items: { type: "string" } },
      gastos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            monto: { type: ["number", "null"] },
            pagador: { type: ["string", "null"] },
            modo: { type: "string", enum: ["equitativo", "individual"] },
            consumidores: { type: "array", items: { type: "string" } },
            montosIndividuales: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
          required: ["monto", "pagador", "modo", "consumidores", "montosIndividuales"],
        },
      },
      advertencias: { type: "array", items: { type: "string" } },
    },
    required: ["interpretable", "participantes", "gastos", "advertencias"],
  },
} as const;
