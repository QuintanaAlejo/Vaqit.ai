import type { GastoInterpretado, InterpretacionGasto } from "./tipos";

export type ResultadoParseo =
  | { ok: true; data: InterpretacionGasto }
  | { ok: false; error: string };

function esNumeroFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

function esArrayDeStrings(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((v) => typeof v === "string");
}

function parsearGasto(valor: unknown): GastoInterpretado | null {
  if (typeof valor !== "object" || valor === null) return null;
  const g = valor as Record<string, unknown>;

  const monto = g.monto === null || g.monto === undefined ? null : g.monto;
  if (monto !== null && !esNumeroFinito(monto)) return null;

  const pagador = g.pagador === null || g.pagador === undefined ? null : g.pagador;
  if (pagador !== null && typeof pagador !== "string") return null;

  if (g.modo !== "equitativo" && g.modo !== "individual") return null;

  if (!esArrayDeStrings(g.consumidores)) return null;

  const montosIndividuales: Record<string, number> = {};
  if (g.montosIndividuales !== undefined) {
    if (typeof g.montosIndividuales !== "object" || g.montosIndividuales === null) return null;
    for (const [nombre, m] of Object.entries(g.montosIndividuales as Record<string, unknown>)) {
      if (!esNumeroFinito(m)) return null;
      montosIndividuales[nombre] = m;
    }
  }

  return {
    monto,
    pagador,
    modo: g.modo,
    consumidores: g.consumidores,
    montosIndividuales,
  };
}

export function parseRespuestaIA(json: unknown): ResultadoParseo {
  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "La respuesta de la IA no es un objeto JSON válido." };
  }

  const raiz = json as Record<string, unknown>;

  if (typeof raiz.interpretable !== "boolean") {
    return { ok: false, error: "Falta el campo 'interpretable' en la respuesta de la IA." };
  }

  if (!raiz.interpretable) {
    return {
      ok: true,
      data: { interpretable: false, participantes: [], gastos: [], advertencias: [] },
    };
  }

  if (!esArrayDeStrings(raiz.participantes)) {
    return { ok: false, error: "Falta o es inválido el campo 'participantes'." };
  }

  if (!Array.isArray(raiz.gastos)) {
    return { ok: false, error: "Falta o es inválido el campo 'gastos'." };
  }

  const gastos: GastoInterpretado[] = [];
  for (const g of raiz.gastos) {
    const parseado = parsearGasto(g);
    if (!parseado) {
      return { ok: false, error: "Uno de los gastos interpretados tiene un formato inválido." };
    }
    gastos.push(parseado);
  }

  const advertencias = esArrayDeStrings(raiz.advertencias) ? raiz.advertencias : [];

  return {
    ok: true,
    data: { interpretable: true, participantes: raiz.participantes, gastos, advertencias },
  };
}
