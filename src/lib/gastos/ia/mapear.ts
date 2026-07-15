import { crearGastoVacio, type EstadoFormulario, type GastoForm } from "@/lib/gastos/tipos-formulario";
import type { InterpretacionGasto } from "./tipos";

export function mapearInterpretacionAFormulario(
  interpretacion: InterpretacionGasto
): EstadoFormulario {
  const participantes =
    interpretacion.participantes.length > 0 ? interpretacion.participantes : ["Vos"];

  const gastos: GastoForm[] = interpretacion.gastos.map((g) => ({
    id: crypto.randomUUID(),
    monto: g.monto !== null ? String(g.monto) : "",
    pagador: g.pagador ?? "",
    consumidores: g.consumidores.length > 0 ? g.consumidores : [...participantes],
    modo: g.modo,
    montosIndividuales: Object.fromEntries(
      Object.entries(g.montosIndividuales).map(([nombre, monto]) => [nombre, String(monto)])
    ),
  }));

  if (gastos.length === 0) {
    gastos.push(crearGastoVacio(participantes));
  }

  return { participantes, gastos };
}
