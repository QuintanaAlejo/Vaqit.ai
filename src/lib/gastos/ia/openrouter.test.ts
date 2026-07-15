import { describe, expect, it, vi } from "vitest";
import { interpretarConIA } from "./openrouter";

const CONTENIDO_VALIDO = JSON.stringify({
  interpretable: true,
  participantes: ["Vos"],
  gastos: [],
  advertencias: [],
});

describe("interpretarConIA", () => {
  it("devuelve sin_api_key si no hay OPENROUTER_API_KEY configurada", async () => {
    const anterior = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const resultado = await interpretarConIA("un texto");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toBe("sin_api_key");

    if (anterior) process.env.OPENROUTER_API_KEY = anterior;
  });

  it("devuelve el contenido del mensaje cuando la llamada es exitosa", async () => {
    process.env.OPENROUTER_API_KEY = "clave-de-prueba";

    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: CONTENIDO_VALIDO } }] }),
    });

    const resultado = await interpretarConIA("un texto", { fetcher: fetcher as unknown as typeof fetch });

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.contenido).toBe(CONTENIDO_VALIDO);

    delete process.env.OPENROUTER_API_KEY;
  });

  it("devuelve error http cuando la respuesta no es ok", async () => {
    process.env.OPENROUTER_API_KEY = "clave-de-prueba";

    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const resultado = await interpretarConIA("un texto", { fetcher: fetcher as unknown as typeof fetch });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toBe("http");

    delete process.env.OPENROUTER_API_KEY;
  });

  it("devuelve timeout cuando el fetcher se aborta (RNF-01)", async () => {
    process.env.OPENROUTER_API_KEY = "clave-de-prueba";

    const fetcher = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const resultado = await interpretarConIA("un texto", {
      fetcher: fetcher as unknown as typeof fetch,
      timeoutMs: 10,
    });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toBe("timeout");

    delete process.env.OPENROUTER_API_KEY;
  });
});
