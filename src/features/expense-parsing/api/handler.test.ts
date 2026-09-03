import { beforeEach, describe, expect, it } from "vitest";
import {
  LLMTimeoutError,
  LLMUnavailableError,
  MalformedLLMResponseError,
  MissingConfigError,
} from "@/shared/errors";
import type { RespuestaModelo } from "../domain/parseResponseSchema";
import { manejarInterpretacion, type DependenciasHandler } from "./handler";
import { crearLimitador, MAX_REQUESTS, type Limitador } from "./rateLimit";

const T0 = 1_700_000_000_000;

const RESPUESTA_MODELO: RespuestaModelo = {
  gastos: [
    {
      descripcion: "cena",
      montoTotal: "60.000",
      pagador: "Vos",
      modoReparto: "equitativo",
      consumos: [
        { participante: "Vos", monto: null },
        { participante: "Juan", monto: null },
        { participante: "Rodrigo", monto: null },
      ],
    },
  ],
};

function pedido(texto: unknown = "Pagué 60.000 de la cena entre Juan, Rodrigo y yo"): Request {
  return new Request("http://localhost/api/parse-expense", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });
}

/** El handler recibe el proveedor, el reloj y la sesion por inyeccion. */
function deps(overrides: Partial<DependenciasHandler> = {}): DependenciasHandler {
  return {
    interpretar: async () => RESPUESTA_MODELO,
    configurado: () => true,
    limitador: crearLimitador(),
    ahora: () => T0,
    leerSesionId: async () => "sesion-de-test",
    ...overrides,
  };
}

describe("manejarInterpretacion — camino feliz", () => {
  it("devuelve 200 con los gastos normalizados", async () => {
    const respuesta = await manejarInterpretacion(pedido(), deps());
    expect(respuesta.status).toBe(200);

    const cuerpo = await respuesta.json();
    expect(cuerpo.ok).toBe(true);
    expect(cuerpo.gastos[0].montoTotalCentavos).toBe(6_000_000);
    expect(cuerpo.gastos[0].pagador).toBe("Vos");
  });

  it("le pasa al proveedor el texto tal como lo escribio el usuario", async () => {
    let recibido: string | null = null;
    await manejarInterpretacion(
      pedido("Juan pagó 40.000 de carne"),
      deps({
        interpretar: async (texto) => {
          recibido = texto;
          return RESPUESTA_MODELO;
        },
      }),
    );
    expect(recibido).toBe("Juan pagó 40.000 de carne");
  });
});

describe("manejarInterpretacion — validacion del body", () => {
  it("rechaza un texto vacio con 400", async () => {
    const respuesta = await manejarInterpretacion(pedido("   "), deps());
    expect(respuesta.status).toBe(400);
    expect((await respuesta.json()).code).toBe("INVALID_REQUEST");
  });

  it("rechaza un body que no es el schema esperado", async () => {
    const respuesta = await manejarInterpretacion(pedido(42), deps());
    expect(respuesta.status).toBe(400);
  });

  it("rechaza un body que no es JSON", async () => {
    const roto = new Request("http://localhost/api/parse-expense", {
      method: "POST",
      body: "no soy json",
    });
    expect((await manejarInterpretacion(roto, deps())).status).toBe(400);
  });

  it("rechaza un texto mas largo que el tope", async () => {
    const respuesta = await manejarInterpretacion(pedido("a".repeat(3000)), deps());
    expect(respuesta.status).toBe(400);
  });

  it("no invoca al proveedor si el body es invalido", async () => {
    let llamado = false;
    await manejarInterpretacion(
      pedido(""),
      deps({
        interpretar: async () => {
          llamado = true;
          return RESPUESTA_MODELO;
        },
      }),
    );
    expect(llamado).toBe(false);
  });
});

describe("AC-12 — rate limit por sesion", () => {
  let limitador: Limitador;
  let llamadasAlProveedor: number;

  beforeEach(() => {
    limitador = crearLimitador();
    llamadasAlProveedor = 0;
  });

  const conConteo = () =>
    deps({
      limitador,
      interpretar: async () => {
        llamadasAlProveedor += 1;
        return RESPUESTA_MODELO;
      },
    });

  it("permite 5 interpretaciones y rechaza la sexta", async () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      const respuesta = await manejarInterpretacion(pedido(), conConteo());
      expect(respuesta.status, `request ${i + 1}`).toBe(200);
    }

    const sexta = await manejarInterpretacion(pedido(), conConteo());
    expect(sexta.status).toBe(429);

    const cuerpo = await sexta.json();
    expect(cuerpo.ok).toBe(false);
    expect(cuerpo.code).toBe("SESSION_RATE_LIMIT");
    expect(cuerpo.retryAfterSeconds).toBeGreaterThan(0);
    expect(cuerpo.mensaje).toContain("a mano");
  });

  it("rechaza la sexta SIN invocar al proveedor de IA", async () => {
    for (let i = 0; i < MAX_REQUESTS + 3; i += 1) {
      await manejarInterpretacion(pedido(), conConteo());
    }
    // Ese es el punto de RNF-04: el excedente no genera costo.
    expect(llamadasAlProveedor).toBe(MAX_REQUESTS);
  });

  it("no mezcla el cupo entre sesiones distintas", async () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      await manejarInterpretacion(pedido(), deps({ limitador }));
    }
    const otra = await manejarInterpretacion(
      pedido(),
      deps({ limitador, leerSesionId: async () => "otra-sesion" }),
    );
    expect(otra.status).toBe(200);
  });
});

describe("manejarInterpretacion — errores del proveedor", () => {
  const casos = [
    { error: new LLMTimeoutError("t"), status: 504, code: "LLM_TIMEOUT" },
    { error: new LLMUnavailableError("u"), status: 502, code: "LLM_UNAVAILABLE" },
    { error: new MalformedLLMResponseError("m"), status: 422, code: "LLM_MALFORMED_RESPONSE" },
    { error: new MissingConfigError("c"), status: 503, code: "MISSING_CONFIG" },
  ];

  for (const caso of casos) {
    it(`traduce ${caso.code} a HTTP ${caso.status} con mensaje accionable`, async () => {
      const respuesta = await manejarInterpretacion(
        pedido(),
        deps({
          interpretar: async () => {
            throw caso.error;
          },
        }),
      );
      expect(respuesta.status).toBe(caso.status);

      const cuerpo = await respuesta.json();
      expect(cuerpo.ok).toBe(false);
      expect(cuerpo.code).toBe(caso.code);
      // AC-05: todo error ofrece la carga manual como salida.
      expect(cuerpo.mensaje).toContain("a mano");
    });
  }

  it("un error inesperado se traduce a 500 sin filtrar detalles internos", async () => {
    const respuesta = await manejarInterpretacion(
      pedido(),
      deps({
        interpretar: async () => {
          throw new Error("connection string secreta expuesta");
        },
      }),
    );
    expect(respuesta.status).toBe(500);

    const cuerpo = await respuesta.json();
    expect(cuerpo.code).toBe("UNKNOWN");
    expect(cuerpo.mensaje).not.toContain("secreta");
  });
});

describe("AC-09 — texto sin ningun gasto interpretable", () => {
  it("devuelve 422 ofreciendo la carga manual", async () => {
    const respuesta = await manejarInterpretacion(
      pedido("el clima está lindo hoy"),
      deps({ interpretar: async () => ({ gastos: [] }) }),
    );
    expect(respuesta.status).toBe(422);

    const cuerpo = await respuesta.json();
    expect(cuerpo.code).toBe("UNINTERPRETABLE_TEXT");
    expect(cuerpo.mensaje).toContain("a mano");
  });

  it("tambien cuando el modelo devuelve un gasto sin nada editable", async () => {
    const respuesta = await manejarInterpretacion(
      pedido("no se entiende"),
      deps({
        interpretar: async () => ({
          gastos: [
            {
              descripcion: "",
              montoTotal: null,
              pagador: null,
              modoReparto: "equitativo" as const,
              consumos: [],
            },
          ],
        }),
      }),
    );
    expect(respuesta.status).toBe(422);
  });
});

describe("proveedor sin configurar — no gasta cupo del rate limit", () => {
  it("responde 503 con el motivo real, no un 429", async () => {
    const limitador = crearLimitador();
    const sinConfig = deps({ limitador, configurado: () => false });

    // Diez intentos: si consumieran cupo, del sexto en adelante darian 429 y el
    // usuario no sabria nunca que en realidad falta la API key.
    for (let i = 0; i < 10; i += 1) {
      const respuesta = await manejarInterpretacion(pedido(), sinConfig);
      expect(respuesta.status, `intento ${i + 1}`).toBe(503);
      expect((await respuesta.json()).code).toBe("MISSING_CONFIG");
    }
  });

  it("deja el cupo intacto para cuando la IA vuelva a estar disponible", async () => {
    const limitador = crearLimitador();
    for (let i = 0; i < 10; i += 1) {
      await manejarInterpretacion(pedido(), deps({ limitador, configurado: () => false }));
    }
    const yaConfigurado = await manejarInterpretacion(pedido(), deps({ limitador }));
    expect(yaConfigurado.status).toBe(200);
  });

  it("no invoca al proveedor cuando no esta configurado", async () => {
    let llamado = false;
    await manejarInterpretacion(
      pedido(),
      deps({
        configurado: () => false,
        interpretar: async () => {
          llamado = true;
          return RESPUESTA_MODELO;
        },
      }),
    );
    expect(llamado).toBe(false);
  });
});
