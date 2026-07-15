export const LIMITE_REQUESTS = 5;
export const VENTANA_MS = 10 * 60 * 1000;

export function crearLimitadorDeTasa(limite = LIMITE_REQUESTS, ventanaMs = VENTANA_MS) {
  const registros = new Map<string, number[]>();

  return {
    registrarIntento(clave: string, ahora: number = Date.now()): boolean {
      const vigentes = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);

      if (vigentes.length >= limite) {
        registros.set(clave, vigentes);
        return false;
      }

      vigentes.push(ahora);
      registros.set(clave, vigentes);
      return true;
    },
  };
}

export const limitadorGlobal = crearLimitadorDeTasa();
