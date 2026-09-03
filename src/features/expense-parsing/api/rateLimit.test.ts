import { beforeEach, describe, expect, it } from "vitest";
import { crearLimitador, MAX_REQUESTS, VENTANA_MS, type Limitador } from "./rateLimit";

/** El reloj se pasa por parametro, asi que no hace falta timers falsos. */
const T0 = 1_700_000_000_000;

describe("rateLimit — RNF-04 / AC-12", () => {
  let limitador: Limitador;

  beforeEach(() => {
    limitador = crearLimitador();
  });

  it("permite exactamente 5 requests en la ventana", () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      const resultado = limitador.registrar("s1", T0 + i * 1000);
      expect(resultado.permitido, `request ${i + 1}`).toBe(true);
    }
  });

  it("rechaza el sexto request e informa cuanto falta esperar", () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) limitador.registrar("s1", T0 + i * 1000);

    const sexto = limitador.registrar("s1", T0 + MAX_REQUESTS * 1000);
    expect(sexto.permitido).toBe(false);
    if (!sexto.permitido) {
      expect(sexto.retryAfterSeconds).toBeGreaterThan(0);
      expect(sexto.retryAfterSeconds).toBeLessThanOrEqual(VENTANA_MS / 1000);
    }
  });

  it("descuenta el cupo por sesion, no globalmente", () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) limitador.registrar("s1", T0 + i * 1000);

    // Otra sesion arranca con su cupo intacto.
    expect(limitador.registrar("s2", T0).permitido).toBe(true);
  });

  it("libera el cupo cuando los requests salen de la ventana", () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) limitador.registrar("s1", T0 + i * 1000);
    expect(limitador.registrar("s1", T0 + 5000).permitido).toBe(false);

    // Justo despues de que expira el mas viejo se libera un lugar.
    const despues = limitador.registrar("s1", T0 + VENTANA_MS + 1);
    expect(despues.permitido).toBe(true);
  });

  it("informa cuantos requests quedan", () => {
    const primero = limitador.registrar("s1", T0);
    expect(primero.permitido && primero.restantes).toBe(MAX_REQUESTS - 1);

    const segundo = limitador.registrar("s1", T0 + 1);
    expect(segundo.permitido && segundo.restantes).toBe(MAX_REQUESTS - 2);
  });

  it("respeta los limites configurados a medida", () => {
    const chico = crearLimitador(2, 1000);
    expect(chico.registrar("s1", T0).permitido).toBe(true);
    expect(chico.registrar("s1", T0 + 1).permitido).toBe(true);
    expect(chico.registrar("s1", T0 + 2).permitido).toBe(false);
    // Pasada la ventana de 1s vuelve a permitir.
    expect(chico.registrar("s1", T0 + 1001).permitido).toBe(true);
  });

  it("limpiar descarta el estado acumulado", () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) limitador.registrar("s1", T0 + i);
    limitador.limpiar();
    expect(limitador.registrar("s1", T0 + 100).permitido).toBe(true);
  });
});
