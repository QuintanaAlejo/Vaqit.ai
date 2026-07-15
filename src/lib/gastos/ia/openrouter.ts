import { ESQUEMA_RESPUESTA_IA, SYSTEM_PROMPT, construirPromptUsuario } from "./prompt";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELO_POR_DEFECTO = "google/gemma-4-26b-a4b-it:free";
// RNF-01 tolera hasta 10s p95 (ajustado por la latencia real de los modelos
// :free de OpenRouter). Se deja un margen extra sobre ese límite para no
// cortar respuestas que llegan justo al borde. Revisar al migrar a un
// proveedor de pago.
const TIMEOUT_MS = 15000;

export type ResultadoLlamadaIA =
  | { ok: true; contenido: string }
  | { ok: false; error: "sin_api_key" | "timeout" | "http" | "desconocido"; detalle?: string };

interface OpcionesLlamadaIA {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export async function interpretarConIA(
  texto: string,
  opciones: OpcionesLlamadaIA = {}
): Promise<ResultadoLlamadaIA> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "sin_api_key" };
  }

  const fetcher = opciones.fetcher ?? fetch;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS;
  const modelo = process.env.OPENROUTER_MODEL ?? MODELO_POR_DEFECTO;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const respuesta = await fetcher(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: construirPromptUsuario(texto) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: ESQUEMA_RESPUESTA_IA,
        },
      }),
      signal: controller.signal,
    });

    if (!respuesta.ok) {
      return { ok: false, error: "http", detalle: String(respuesta.status) };
    }

    const datos = await respuesta.json();
    const contenido = datos?.choices?.[0]?.message?.content;

    if (typeof contenido !== "string") {
      return { ok: false, error: "desconocido", detalle: "Respuesta sin contenido de mensaje." };
    }

    return { ok: true, contenido };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "desconocido", detalle: String(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}
