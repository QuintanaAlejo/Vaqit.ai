import { NextRequest, NextResponse } from "next/server";
import { interpretarConIA } from "@/lib/gastos/ia/openrouter";
import { parseRespuestaIA } from "@/lib/gastos/ia/parseRespuestaIA";
import { limitadorGlobal } from "@/lib/gastos/ia/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function obtenerIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "desconocida";
}

export async function POST(request: NextRequest) {
  const ip = obtenerIp(request);

  if (!limitadorGlobal.registrarIntento(ip)) {
    return NextResponse.json(
      {
        codigo: "limite_alcanzado",
        mensaje: "Alcanzaste el límite de interpretaciones por IA para esta sesión. Probá la carga manual.",
      },
      { status: 429 }
    );
  }

  let texto: string;
  try {
    const body = await request.json();
    texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  } catch {
    return NextResponse.json(
      { codigo: "solicitud_invalida", mensaje: "No se pudo leer el cuerpo de la solicitud." },
      { status: 400 }
    );
  }

  if (!texto) {
    return NextResponse.json(
      { codigo: "solicitud_invalida", mensaje: "El texto del gasto no puede estar vacío." },
      { status: 400 }
    );
  }

  const resultadoIA = await interpretarConIA(texto);

  if (!resultadoIA.ok) {
    if (resultadoIA.error === "timeout") {
      return NextResponse.json(
        {
          codigo: "timeout",
          mensaje: "La interpretación tardó demasiado. Probá la carga manual.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        codigo: "error_proveedor_ia",
        mensaje: "No se pudo interpretar el texto en este momento. Probá la carga manual.",
      },
      { status: 502 }
    );
  }

  let jsonCrudo: unknown;
  try {
    jsonCrudo = JSON.parse(resultadoIA.contenido);
  } catch {
    return NextResponse.json(
      {
        codigo: "no_interpretable",
        mensaje: "No se pudo interpretar el texto. Probá la carga manual.",
      },
      { status: 422 }
    );
  }

  const parseo = parseRespuestaIA(jsonCrudo);

  if (!parseo.ok) {
    return NextResponse.json(
      {
        codigo: "no_interpretable",
        mensaje: "No se pudo interpretar el texto. Probá la carga manual.",
      },
      { status: 422 }
    );
  }

  if (!parseo.data.interpretable) {
    return NextResponse.json(
      {
        codigo: "no_interpretable",
        mensaje: "No pudimos entender el texto como un gasto grupal. Probá la carga manual.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ codigo: "ok", data: parseo.data }, { status: 200 });
}
