import type { SaldoNeto, Transferencia } from "@/shared/domain/expense";
import { formatMonto } from "@/shared/domain/money";
import { Card } from "@/shared/ui/Card";

/**
 * Resultado del calculo: la matriz de transferencias (RF-10) y, como respaldo
 * visual, el saldo neto de cada uno (RF-09) para que se entienda de donde
 * salieron esos movimientos.
 */
export function ResultadoTransferencias({
  transferencias,
  saldos,
}: {
  transferencias: Transferencia[];
  saldos: SaldoNeto[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <h2 className="text-heading-sm-fluid text-obsidian">
          {transferencias.length === 0 ? "Están a cero" : "Quién le debe a quién"}
        </h2>

        {transferencias.length === 0 ? (
          <p className="text-body text-steel">
            Nadie le debe nada a nadie: los pagos cruzados se compensaron entre sí y no hace falta
            ninguna transferencia.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {transferencias.map((t) => (
              <li
                key={`${t.deudor}-${t.acreedor}-${t.montoCentavos}`}
                className="flex items-center justify-between gap-3 border-b border-cloud pb-3 last:border-0 last:pb-0"
              >
                <span className="text-body text-graphite">
                  <strong className="font-semibold">{t.deudor}</strong> le debe a{" "}
                  <strong className="font-semibold">{t.acreedor}</strong>
                </span>
                <span className="shrink-0 text-body-lg font-semibold text-obsidian">
                  {formatMonto(t.montoCentavos)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {transferencias.length > 1 ? (
          <p className="text-caption text-fog">
            {transferencias.length} transferencias, el mínimo para saldar todas las deudas del
            grupo.
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h3 className="text-caption font-medium text-steel">Saldo de cada uno</h3>
        <ul className="flex flex-col gap-2">
          {saldos.map((saldo) => (
            <li key={saldo.participante} className="flex items-center justify-between gap-3">
              <span className="text-body text-graphite">{saldo.participante}</span>
              <span
                className={`text-body font-medium ${
                  saldo.netoCentavos === 0 ? "text-fog" : "text-obsidian"
                }`}
              >
                {saldo.netoCentavos === 0
                  ? "al día"
                  : saldo.netoCentavos > 0
                    ? `le deben ${formatMonto(saldo.netoCentavos)}`
                    : `debe ${formatMonto(-saldo.netoCentavos)}`}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
