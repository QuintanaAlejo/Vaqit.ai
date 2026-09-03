import { cookies } from "next/headers";
import {
  AppError,
  LLMProviderRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
  MalformedLLMResponseError,
  MissingConfigError,
  UninterpretableTextError,
} from "@/shared/errors";
import { interpretarConOpenRouter, proveedorConfigurado } from "../data/openRouterClient";
import { SolicitudInterpretacion, type RespuestaInterpretacion } from "../domain/contract";
import { normalizarRespuesta } from "../domain/normalizarGasto";
import { limitadorGlobal, type Limitador } from "./rateLimit";

/**
 * Handler de POST /api/parse-expense.
 *
 * Orden deliberado: primero se valida el body, despues se chequea el rate limit
 * y solo al final se invoca al proveedor. AC-12 exige rechazar el sexto request
 * SIN llamar a la IA, asi que el limite tiene que estar antes del fetch.
 *
 * No se loguea el texto del usuario en ningun punto (RNF-07).
 */

export const COOKIE_SESION = "vaqit_sid";

/** Vida de la cookie: apenas mas que la ventana del rate limit. */
const COOKIE_MAX_AGE_S = 15 * 60;

const MENSAJES: Record<string, string> = {
  LLM_TIMEOUT: "La IA tardó demasiado en responder. Podés reintentar o cargar el gasto a mano.",
  LLM_UNAVAILABLE: "La IA no está disponible en este momento. Cargá el gasto a mano.",
  LLM_PROVIDER_RATE_LIMIT:
    "La IA está saturada en este momento. Probá en un rato o cargá el gasto a mano.",
  LLM_MALFORMED_RESPONSE:
    "No pudimos interpretar el texto. Probá reformularlo o cargá el gasto a mano.",
  UNINTERPRETABLE_TEXT:
    "No encontramos un gasto en ese texto. Probá contarlo de otra forma o cargalo a mano.",
  MISSING_CONFIG: "La interpretación por IA no está configurada. Cargá el gasto a mano.",
  INVALID_REQUEST: "El texto no es válido. Escribí una descripción del gasto.",
};

const MENSAJE_FALLBACK = "Algo falló al interpretar el texto. Cargá el gasto a mano.";

export type DependenciasHandler = {
  interpretar?: typeof interpretarConOpenRouter;
  configurado?: () => boolean;
  limitador?: Limitador;
  ahora?: () => number;
  /** Inyectable porque next/headers no esta disponible fuera de un request. */
  leerSesionId?: () => Promise<string>;
};

export async function manejarInterpretacion(
  request: Request,
  deps: DependenciasHandler = {},
): Promise<Response> {
  const interpretar = deps.interpretar ?? interpretarConOpenRouter;
  const configurado = deps.configurado ?? proveedorConfigurado;
  const limitador = deps.limitador ?? limitadorGlobal;
  const ahora = deps.ahora ?? Date.now;
  const leerSesionId = deps.leerSesionId ?? sesionIdDesdeCookie;

  const cuerpo: unknown = await request.json().catch(() => null);
  const solicitud = SolicitudInterpretacion.safeParse(cuerpo);
  if (!solicitud.success) {
    return json(
      { ok: false, code: "INVALID_REQUEST", mensaje: MENSAJES.INVALID_REQUEST ?? "" },
      400,
    );
  }

  // Antes del rate limit: si la IA no esta configurada el request no llega al
  // proveedor, asi que no tiene sentido que gaste cupo. Sin esto, el usuario se
  // come los 5 intentos y despues recibe un 429 en vez del motivo real.
  if (!configurado()) {
    return json(aRespuestaError(new MissingConfigError("Proveedor no configurado.")), 503);
  }

  const sesionId = await leerSesionId();
  const limite = limitador.registrar(sesionId, ahora());
  if (!limite.permitido) {
    return json(
      {
        ok: false,
        code: "SESSION_RATE_LIMIT",
        mensaje: `Alcanzaste el límite de 5 interpretaciones cada 10 minutos. Podés esperar o cargar el gasto a mano.`,
        retryAfterSeconds: limite.retryAfterSeconds,
      },
      429,
    );
  }

  try {
    const respuestaModelo = await interpretar(solicitud.data.texto);
    const gastos = normalizarRespuesta(respuestaModelo);

    // AC-09: el modelo respondio bien pero no habia ningun gasto en el texto.
    if (gastos.length === 0) {
      throw new UninterpretableTextError("El texto no contiene un gasto interpretable.");
    }

    return json({ ok: true, gastos }, 200);
  } catch (error) {
    return json(aRespuestaError(error), statusDe(error));
  }
}

/**
 * Lee el id de sesion de la cookie, o genera uno nuevo. La cookie es httpOnly y
 * solo contiene un uuid: no identifica a la persona, solo permite contar sus
 * requests dentro de la ventana.
 */
async function sesionIdDesdeCookie(): Promise<string> {
  const store = await cookies();
  const existente = store.get(COOKIE_SESION)?.value;
  if (existente !== undefined && existente !== "") return existente;

  const nuevo = crypto.randomUUID();
  store.set(COOKIE_SESION, nuevo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
  return nuevo;
}

function aRespuestaError(error: unknown): RespuestaInterpretacion {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, mensaje: MENSAJES[error.code] ?? MENSAJE_FALLBACK };
  }
  return { ok: false, code: "UNKNOWN", mensaje: MENSAJE_FALLBACK };
}

function statusDe(error: unknown): number {
  if (error instanceof LLMTimeoutError) return 504;
  if (error instanceof LLMProviderRateLimitError) return 503;
  if (error instanceof LLMUnavailableError) return 502;
  if (error instanceof MissingConfigError) return 503;
  if (error instanceof MalformedLLMResponseError) return 422;
  if (error instanceof UninterpretableTextError) return 422;
  return 500;
}

function json(cuerpo: RespuestaInterpretacion, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
