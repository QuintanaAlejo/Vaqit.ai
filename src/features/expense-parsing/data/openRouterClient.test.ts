import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LLMProviderRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
  MalformedLLMResponseError,
  MissingConfigError,
} from "@/shared/errors";
import { interpretarConOpenRouter } from "./openRouterClient";

/** Respuesta con el sobre de la API estilo OpenAI que devuelve OpenRouter. */
function sobreCon(contenido: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: contenido } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const JSON_VALIDO = JSON.stringify({
  gastos: [
    {
      descripcion: "cena",
      montoTotal: "60.000",
      pagador: "Vos",
      modoReparto: "equitativo",
      consumos: [{ participante: "Juan", monto: null }],
    },
  ],
});

const KEY_ORIGINAL = process.env.OPENROUTER_API_KEY;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
});

afterEach(() => {
  if (KEY_ORIGINAL === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = KEY_ORIGINAL;
});

describe("interpretarConOpenRouter — camino feliz", () => {
  it("devuelve la respuesta validada del modelo", async () => {
    const resultado = await interpretarConOpenRouter("Pagué 60.000 de la cena", {
      fetchImpl: async () => sobreCon(JSON_VALIDO),
    });
    expect(resultado.gastos[0]?.montoTotal).toBe("60.000");
    expect(resultado.gastos[0]?.pagador).toBe("Vos");
  });

  it("recorta el JSON cuando el modelo lo envuelve en un bloque de codigo", async () => {
    const resultado = await interpretarConOpenRouter("texto", {
      fetchImpl: async () => sobreCon("Claro, aca va:\n```json\n" + JSON_VALIDO + "\n```"),
    });
    expect(resultado.gastos).toHaveLength(1);
  });

  it("manda la api key y el texto del usuario al proveedor", async () => {
    // Se acumula en un array: asignar a una variable dentro del closure hace
    // que TS la estreche a never al leerla despues.
    const llamadas: Array<{ url: string; headers: Record<string, string>; body: string }> = [];

    await interpretarConOpenRouter("Pagué 60.000", {
      fetchImpl: async (url, init) => {
        llamadas.push({
          url: String(url),
          headers: (init?.headers ?? {}) as Record<string, string>,
          body: String(init?.body ?? ""),
        });
        return sobreCon(JSON_VALIDO);
      },
    });

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]?.url).toContain("openrouter.ai");
    expect(llamadas[0]?.headers.Authorization).toBe("Bearer test-key");
    expect(llamadas[0]?.body).toContain("Pagué 60.000");
  });
});

describe("interpretarConOpenRouter — cada falla es un error propio", () => {
  it("sin api key lanza MissingConfigError sin llamar al proveedor", async () => {
    delete process.env.OPENROUTER_API_KEY;
    let llamado = false;
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => {
          llamado = true;
          return sobreCon(JSON_VALIDO);
        },
      }),
    ).rejects.toThrow(MissingConfigError);
    expect(llamado).toBe(false);
  });

  it("un timeout del fetch lanza LLMTimeoutError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => {
          throw new DOMException("timed out", "TimeoutError");
        },
      }),
    ).rejects.toThrow(LLMTimeoutError);
  });

  it("un fallo de red lanza LLMUnavailableError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    ).rejects.toThrow(LLMUnavailableError);
  });

  it("un 429 lanza LLMProviderRateLimitError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => new Response("", { status: 429 }),
      }),
    ).rejects.toThrow(LLMProviderRateLimitError);
  });

  it("un 500 lanza LLMUnavailableError con el status", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => new Response("", { status: 500 }),
      }),
    ).rejects.toMatchObject({ code: "LLM_UNAVAILABLE", status: 500 });
  });

  it("un cuerpo que no es JSON lanza MalformedLLMResponseError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => new Response("<html>502</html>", { status: 200 }),
      }),
    ).rejects.toThrow(MalformedLLMResponseError);
  });

  it("un sobre sin choices lanza MalformedLLMResponseError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => new Response(JSON.stringify({ error: "nope" }), { status: 200 }),
      }),
    ).rejects.toThrow(MalformedLLMResponseError);
  });

  it("un contenido vacio lanza MalformedLLMResponseError", async () => {
    await expect(
      interpretarConOpenRouter("texto", { fetchImpl: async () => sobreCon("   ") }),
    ).rejects.toThrow(MalformedLLMResponseError);
  });

  it("un JSON que no cumple el schema lanza MalformedLLMResponseError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => sobreCon(JSON.stringify({ resultado: "otra forma" })),
      }),
    ).rejects.toThrow(MalformedLLMResponseError);
  });

  it("un JSON sintacticamente roto lanza MalformedLLMResponseError", async () => {
    await expect(
      interpretarConOpenRouter("texto", {
        fetchImpl: async () => sobreCon('{"gastos": [ {"montoTotal": '),
      }),
    ).rejects.toThrow(MalformedLLMResponseError);
  });
});
