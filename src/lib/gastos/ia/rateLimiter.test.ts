import { describe, expect, it } from "vitest";
import { crearLimitadorDeTasa } from "./rateLimiter";

describe("rateLimiter", () => {
  it("permite hasta el límite de requests dentro de la ventana", () => {
    const limitador = crearLimitadorDeTasa(5, 10 * 60 * 1000);
    const ahora = 1_000_000;

    for (let i = 0; i < 5; i++) {
      expect(limitador.registrarIntento("1.2.3.4", ahora + i)).toBe(true);
    }
  });

  it("rechaza el sexto intento dentro de la misma ventana", () => {
    const limitador = crearLimitadorDeTasa(5, 10 * 60 * 1000);
    const ahora = 1_000_000;

    for (let i = 0; i < 5; i++) {
      limitador.registrarIntento("1.2.3.4", ahora + i);
    }

    expect(limitador.registrarIntento("1.2.3.4", ahora + 5)).toBe(false);
  });

  it("permite un nuevo intento una vez que expira la ventana", () => {
    const limitador = crearLimitadorDeTasa(5, 10 * 60 * 1000);
    const ahora = 1_000_000;

    for (let i = 0; i < 5; i++) {
      limitador.registrarIntento("1.2.3.4", ahora + i);
    }

    expect(limitador.registrarIntento("1.2.3.4", ahora + 10 * 60 * 1000 + 1)).toBe(true);
  });

  it("cuenta por separado a distintas claves (IPs)", () => {
    const limitador = crearLimitadorDeTasa(1, 10 * 60 * 1000);
    const ahora = 1_000_000;

    expect(limitador.registrarIntento("1.1.1.1", ahora)).toBe(true);
    expect(limitador.registrarIntento("2.2.2.2", ahora)).toBe(true);
    expect(limitador.registrarIntento("1.1.1.1", ahora + 1)).toBe(false);
  });
});
