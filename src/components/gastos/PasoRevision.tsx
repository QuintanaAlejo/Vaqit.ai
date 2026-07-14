import type { Gasto, Saldo, Transferencia } from "@/lib/gastos/types";

interface Props {
  gastos: Gasto[];
  saldos: Saldo[];
  transferencias: Transferencia[];
  onEditar: () => void;
  onConfirmar: () => void;
}

export default function PasoRevision({
  gastos,
  saldos,
  transferencias,
  onEditar,
  onConfirmar,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Revisá los gastos cargados</h2>

        {gastos.map((gasto, indice) => (
          <div key={indice} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-900">
              {gasto.pagador} pagó ${gasto.monto.toLocaleString("es-AR")}
            </p>
            <ul className="text-sm text-slate-600">
              {gasto.consumos.map((consumo) => (
                <li key={consumo.participante}>
                  {consumo.participante} consumió ${consumo.monto.toLocaleString("es-AR")}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Saldo por persona</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {saldos.map((saldo) => (
            <li key={saldo.participante} className="flex justify-between rounded-md bg-slate-50 px-3 py-2">
              <span>{saldo.participante}</span>
              <span className={saldo.neto >= 0 ? "text-emerald-600" : "text-red-600"}>
                {saldo.neto >= 0 ? "+" : ""}${saldo.neto.toLocaleString("es-AR")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Transferencias para saldar</h2>
        {transferencias.length === 0 ? (
          <p className="text-sm text-slate-500">No hay transferencias pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {transferencias.map((t, indice) => (
              <li key={indice} className="rounded-md bg-slate-50 px-3 py-2">
                {t.deudor} le debe ${t.monto.toLocaleString("es-AR")} a {t.acreedor}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEditar}
          className="flex-1 rounded-md border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className="flex-1 rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}
