/**
 * Jerarquia de errores del dominio. AGENTS.md exige errores tipados propios:
 * ningun catch vacio, ningun error generico cruzando capas.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** El proveedor de IA no respondio dentro del presupuesto de RNF-01. */
export class LLMTimeoutError extends AppError {
  readonly code = "LLM_TIMEOUT";
}

/** El proveedor de IA respondio con un status de error o es inalcanzable. */
export class LLMUnavailableError extends AppError {
  readonly code = "LLM_UNAVAILABLE";

  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}

/** El proveedor de IA rechazo el request por sus propias cuotas. */
export class LLMProviderRateLimitError extends AppError {
  readonly code = "LLM_PROVIDER_RATE_LIMIT";
}

/** La respuesta del modelo no cumple el schema esperado (RF-11, validacion Zod). */
export class MalformedLLMResponseError extends AppError {
  readonly code = "LLM_MALFORMED_RESPONSE";
}

/** El texto no describe un gasto interpretable (AC-09). */
export class UninterpretableTextError extends AppError {
  readonly code = "UNINTERPRETABLE_TEXT";
}

/** La sesion agoto su cupo de interpretaciones por IA (RNF-04, AC-12). */
export class SessionRateLimitError extends AppError {
  readonly code = "SESSION_RATE_LIMIT";

  constructor(
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message);
  }
}

/** El body de un request no cumple el schema de entrada. */
export class InvalidRequestError extends AppError {
  readonly code = "INVALID_REQUEST";
}

/** Falta configuracion de entorno para operar (ej. la API key del proveedor). */
export class MissingConfigError extends AppError {
  readonly code = "MISSING_CONFIG";
}
