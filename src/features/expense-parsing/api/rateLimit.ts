/**
 * Rate limit por sesion (RNF-04, AC-12): 5 interpretaciones cada 10 minutos.
 *
 * Guarda solo timestamps por id de sesion. Nunca el texto, los montos ni los
 * nombres: RNF-07 sigue intacto porque no hay dato del gasto que sobreviva al
 * request.
 *
 * LIMITACION CONOCIDA: el contador vive en la memoria del proceso. En un deploy
 * serverless con varias instancias el limite es por instancia, y se reinicia en
 * cada cold start. Es una concesion deliberada a cambio de no agregar infra;
 * cuando haga falta exactitud, se reemplaza este modulo por Vercel KV sin tocar
 * a quien lo llama.
 */

export const MAX_REQUESTS = 5;
export const VENTANA_MS = 10 * 60 * 1000;

/** Tope de sesiones en memoria, para que el Map no crezca sin techo. */
const MAX_SESIONES = 10_000;

export type ResultadoRateLimit =
  { permitido: true; restantes: number } | { permitido: false; retryAfterSeconds: number };

export type Limitador = {
  registrar: (sesionId: string, ahora: number) => ResultadoRateLimit;
  /** Solo para tests: descarta todo el estado acumulado. */
  limpiar: () => void;
};

export function crearLimitador(maxRequests = MAX_REQUESTS, ventanaMs = VENTANA_MS): Limitador {
  const registros = new Map<string, number[]>();

  const podar = (ahora: number) => {
    for (const [sesionId, timestamps] of registros) {
      const vigentes = timestamps.filter((t) => ahora - t < ventanaMs);
      if (vigentes.length === 0) registros.delete(sesionId);
      else registros.set(sesionId, vigentes);
    }
  };

  return {
    registrar(sesionId, ahora) {
      const previos = registros.get(sesionId) ?? [];
      const vigentes = previos.filter((t) => ahora - t < ventanaMs);

      if (vigentes.length >= maxRequests) {
        // El cupo se libera cuando expira el request mas viejo de la ventana.
        const masViejo = vigentes[0] ?? ahora;
        const esperaMs = ventanaMs - (ahora - masViejo);
        registros.set(sesionId, vigentes);
        return {
          permitido: false,
          retryAfterSeconds: Math.max(1, Math.ceil(esperaMs / 1000)),
        };
      }

      vigentes.push(ahora);
      registros.set(sesionId, vigentes);

      // Se poda al cruzar el techo, no en cada request: recorrer el Map entero
      // por request seria trabajo lineal innecesario en el camino caliente.
      if (registros.size > MAX_SESIONES) podar(ahora);

      return { permitido: true, restantes: maxRequests - vigentes.length };
    },

    limpiar() {
      registros.clear();
    },
  };
}

/**
 * Instancia compartida por el route handler. Es un singleton de modulo: en dev
 * Next recarga los modulos y el contador se reinicia, lo cual es correcto.
 */
export const limitadorGlobal = crearLimitador();
