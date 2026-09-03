import {
  LLMProviderRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
  MalformedLLMResponseError,
  MissingConfigError,
} from "@/shared/errors";
import { RespuestaModelo } from "../domain/parseResponseSchema";
import { construirUserPrompt, SYSTEM_PROMPT } from "../domain/prompts/parseGasto";

/**
 * Unico punto de la app que habla con el proveedor de IA.
 *
 * Cada modo de falla se traduce a un error propio y tipado: quien llama decide
 * que mostrar sin tener que interpretar un status HTTP ni un mensaje ajeno.
 */

const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Modelo por defecto: gratuito en OpenRouter, intercambiable por OPENROUTER_MODEL.
 * Se eligio por velocidad: la extraccion es una tarea facil y lo que aprieta es
 * RNF-01 (p95 < 10s), no la capacidad de razonamiento.
 */
const MODELO_POR_DEFECTO = "minimax/minimax-m3:free";

/**
 * Presupuesto de tiempo. RNF-01 exige p95 < 10s para todo el request; el corte
 * al proveedor se pone antes para que quede margen de respuesta al cliente.
 */
const TIMEOUT_MS = 9_000;

/**
 * Si el proveedor esta configurado. Se consulta ANTES de descontar cupo: sin
 * key el request nunca llega a la IA, asi que no tiene por que gastar uno de
 * los 5 intentos de la ventana (RNF-04).
 */
export function proveedorConfigurado(): boolean {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return apiKey !== undefined && apiKey !== "";
}

export type OpcionesInterpretacion = {
  /** Inyectable para poder testear sin red. */
  fetchImpl?: typeof fetch;
};

export async function interpretarConOpenRouter(
  texto: string,
  opciones: OpcionesInterpretacion = {},
): Promise<RespuestaModelo> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new MissingConfigError("Falta configurar OPENROUTER_API_KEY.");
  }

  const modelo = process.env.OPENROUTER_MODEL ?? MODELO_POR_DEFECTO;
  const hacerFetch = opciones.fetchImpl ?? fetch;

  let respuesta: Response;
  try {
    respuesta = await hacerFetch(URL_OPENROUTER, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        // Determinismo: la misma descripcion tiene que interpretarse igual dos
        // veces seguidas, o el usuario no entiende por que cambio el resultado.
        temperature: 0,
        // Los modelos gratuitos de OpenRouter no soportan structured outputs de
        // forma confiable; json_object es el modo mas ampliamente disponible y
        // la validacion real la hace Zod sobre el contenido.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: construirUserPrompt(texto) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === "TimeoutError") {
      throw new LLMTimeoutError(`El proveedor no respondió en ${TIMEOUT_MS} ms.`, {
        cause: causa,
      });
    }
    throw new LLMUnavailableError("No se pudo contactar al proveedor de IA.", undefined, {
      cause: causa,
    });
  }

  if (respuesta.status === 429) {
    throw new LLMProviderRateLimitError("El proveedor de IA rechazó el request por cuota.");
  }

  if (!respuesta.ok) {
    throw new LLMUnavailableError(
      `El proveedor de IA respondió ${respuesta.status}.`,
      respuesta.status,
    );
  }

  const sobre: unknown = await respuesta.json().catch((causa: unknown) => {
    throw new MalformedLLMResponseError("El proveedor devolvió un cuerpo que no es JSON.", {
      cause: causa,
    });
  });

  return parsearContenido(extraerContenido(sobre));
}

/**
 * Saca el texto de la respuesta del sobre de la API estilo OpenAI, sin confiar
 * en su forma: se navega con type guards, no con casts.
 */
function extraerContenido(sobre: unknown): string {
  if (typeof sobre !== "object" || sobre === null) {
    throw new MalformedLLMResponseError("La respuesta del proveedor no es un objeto.");
  }

  const choices = (sobre as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new MalformedLLMResponseError("La respuesta del proveedor no trae choices.");
  }

  const primera = choices[0];
  if (typeof primera !== "object" || primera === null) {
    throw new MalformedLLMResponseError("El primer choice no es un objeto.");
  }

  const mensaje = (primera as { message?: unknown }).message;
  if (typeof mensaje !== "object" || mensaje === null) {
    throw new MalformedLLMResponseError("El choice no trae message.");
  }

  const contenido = (mensaje as { content?: unknown }).content;
  if (typeof contenido !== "string" || contenido.trim() === "") {
    throw new MalformedLLMResponseError("El modelo devolvió un contenido vacío.");
  }

  return contenido;
}

/**
 * Algunos modelos envuelven el JSON en un bloque de codigo a pesar de la
 * instruccion, asi que se recorta al primer objeto balanceado antes de parsear.
 */
function parsearContenido(contenido: string): RespuestaModelo {
  const inicio = contenido.indexOf("{");
  const fin = contenido.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) {
    throw new MalformedLLMResponseError("El modelo no devolvió un objeto JSON.");
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse(contenido.slice(inicio, fin + 1));
  } catch (causa) {
    throw new MalformedLLMResponseError("El JSON del modelo no se pudo parsear.", {
      cause: causa,
    });
  }

  const parseado = RespuestaModelo.safeParse(crudo);
  if (!parseado.success) {
    throw new MalformedLLMResponseError(
      `El JSON del modelo no cumple el schema: ${parseado.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }

  return parseado.data;
}
