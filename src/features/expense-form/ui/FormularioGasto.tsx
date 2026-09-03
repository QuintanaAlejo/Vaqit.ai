"use client";

import { useId } from "react";
import { esPlaceholderVos, type BorradorGasto } from "@/shared/domain/expense";
import { parseMonto } from "@/shared/domain/money";
import { participantesDeSesion } from "@/features/expense-form/domain/borrador";
import type { ProblemaValidacion } from "@/features/expense-form/domain/validation";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { IconoAlerta, Input, Label, Mensaje, Select } from "@/shared/ui/Field";
import type { BorradorSesion } from "@/shared/domain/expense";
import { claveMonto, type DispatchBorrador } from "./useBorradorSesion";

/**
 * Formulario editable (RF-11). Es la pantalla obligatoria entre lo que
 * interpreto la IA y el calculo: nunca se calcula directo sobre la respuesta del
 * modelo.
 */

type Props = {
  sesion: BorradorSesion;
  errores: ProblemaValidacion[];
  advertencias: ProblemaValidacion[];
  textoMonto: (gastoId: string, consumoId?: string) => string;
  dispatch: DispatchBorrador;
  nuevoId: () => string;
};

export function FormularioGasto({
  sesion,
  errores,
  advertencias,
  textoMonto,
  dispatch,
  nuevoId,
}: Props) {
  const participantes = participantesDeSesion(sesion);

  return (
    <div className="flex flex-col gap-4">
      {sesion.gastos.map((gasto, indice) => (
        <GastoEditable
          key={gasto.id}
          gasto={gasto}
          indice={indice}
          puedeQuitar={sesion.gastos.length > 1}
          participantes={participantes}
          errores={errores.filter((e) => e.gastoId === gasto.id)}
          advertencias={advertencias.filter((a) => a.gastoId === gasto.id)}
          textoMonto={textoMonto}
          dispatch={dispatch}
          nuevoId={nuevoId}
        />
      ))}

      <Button
        variante="neutra"
        onClick={() => dispatch({ tipo: "agregarGasto", ids: [nuevoId(), nuevoId(), nuevoId()] })}
      >
        + Agregar otro gasto
      </Button>
    </div>
  );
}

type GastoProps = {
  gasto: BorradorGasto;
  indice: number;
  puedeQuitar: boolean;
  participantes: string[];
  errores: ProblemaValidacion[];
  advertencias: ProblemaValidacion[];
  textoMonto: (gastoId: string, consumoId?: string) => string;
  dispatch: DispatchBorrador;
  nuevoId: () => string;
};

function GastoEditable({
  gasto,
  indice,
  puedeQuitar,
  participantes,
  errores,
  advertencias,
  textoMonto,
  dispatch,
  nuevoId,
}: GastoProps) {
  const idBase = useId();
  const errorMonto = errores.find((e) => e.campo === "montoTotal");
  const errorPagador = errores.find((e) => e.campo === "pagador");
  const avisoPagador = advertencias.find((a) => a.campo === "pagador");
  const erroresParticipantes = errores.filter((e) => e.campo === "participante" && !e.consumoId);
  const errorTotalConsumos = errores.find((e) => e.campo === "consumo" && !e.consumoId);

  const cambiarMonto = (texto: string) => {
    dispatch({ tipo: "setTexto", clave: claveMonto(gasto.id), texto });
    dispatch({
      tipo: "editarGasto",
      gastoId: gasto.id,
      cambios: { montoTotalCentavos: parseMonto(texto) },
    });
  };

  return (
    <Card className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-subheading font-semibold text-obsidian">
          {gasto.descripcion.trim() === "" ? `Gasto ${indice + 1}` : gasto.descripcion}
        </h2>
        {puedeQuitar ? (
          <button
            type="button"
            onClick={() => dispatch({ tipo: "quitarGasto", gastoId: gasto.id })}
            className="min-h-[var(--tap-target)] rounded-[var(--radius-badges)] px-2 text-caption text-fog hover:text-alert-ink"
          >
            Quitar
          </button>
        ) : null}
      </header>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idBase}-desc`}>Descripción</Label>
        <Input
          id={`${idBase}-desc`}
          value={gasto.descripcion}
          placeholder="Cena, bebidas, traslado..."
          onChange={(e) =>
            dispatch({
              tipo: "editarGasto",
              gastoId: gasto.id,
              cambios: { descripcion: e.target.value },
            })
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idBase}-monto`}>Monto total</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-steel">
            $
          </span>
          <Input
            id={`${idBase}-monto`}
            inputMode="decimal"
            className="pl-7"
            alerta={errorMonto !== undefined}
            value={textoMonto(gasto.id)}
            placeholder="60.000"
            onChange={(e) => cambiarMonto(e.target.value)}
          />
        </div>
        {errorMonto ? <Mensaje tono="error">{errorMonto.mensaje}</Mensaje> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idBase}-pagador`}>¿Quién pagó?</Label>
        <Select
          id={`${idBase}-pagador`}
          alerta={errorPagador !== undefined || avisoPagador !== undefined}
          value={gasto.pagador ?? ""}
          onChange={(e) =>
            dispatch({
              tipo: "editarGasto",
              gastoId: gasto.id,
              cambios: { pagador: e.target.value === "" ? null : e.target.value },
            })
          }
        >
          <option value="">Elegí quién pagó</option>
          {participantes.map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre}
            </option>
          ))}
        </Select>
        {errorPagador ? <Mensaje tono="error">{errorPagador.mensaje}</Mensaje> : null}
        {!errorPagador && avisoPagador ? (
          <Mensaje tono="aviso">{avisoPagador.mensaje}</Mensaje>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption font-medium text-steel">¿Cómo se reparte?</legend>
        <div className="flex gap-2">
          <OpcionReparto
            activa={gasto.modoReparto === "equitativo"}
            onClick={() =>
              dispatch({ tipo: "setModoReparto", gastoId: gasto.id, modo: "equitativo" })
            }
          >
            En partes iguales
          </OpcionReparto>
          <OpcionReparto
            activa={gasto.modoReparto === "individual"}
            onClick={() =>
              dispatch({ tipo: "setModoReparto", gastoId: gasto.id, modo: "individual" })
            }
          >
            Consumo por persona
          </OpcionReparto>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label>Participantes</Label>
        {gasto.consumos.map((consumo) => {
          const errorNombre = errores.find(
            (e) => e.campo === "participante" && e.consumoId === consumo.id,
          );
          const errorConsumo = errores.find(
            (e) => e.campo === "consumo" && e.consumoId === consumo.id,
          );
          const esVos = esPlaceholderVos(consumo.participante);

          return (
            <div key={consumo.id} className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <div className="relative flex-1">
                  <Input
                    aria-label="Nombre del participante"
                    value={consumo.participante}
                    placeholder="Nombre"
                    alerta={errorNombre !== undefined || esVos}
                    className={esVos ? "pr-9" : ""}
                    onChange={(e) =>
                      dispatch({
                        tipo: "editarConsumo",
                        gastoId: gasto.id,
                        consumoId: consumo.id,
                        cambios: { participante: e.target.value },
                      })
                    }
                  />
                  {esVos ? (
                    <IconoAlerta className="absolute top-1/2 right-3 !mt-0 h-4 w-4 -translate-y-1/2 text-alert-ink" />
                  ) : null}
                </div>

                {gasto.modoReparto === "individual" ? (
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-steel">
                      $
                    </span>
                    <Input
                      aria-label={`Consumo de ${consumo.participante || "este participante"}`}
                      inputMode="decimal"
                      className="pl-7"
                      alerta={errorConsumo !== undefined}
                      value={textoMonto(gasto.id, consumo.id)}
                      onChange={(e) => {
                        dispatch({
                          tipo: "setTexto",
                          clave: claveMonto(gasto.id, consumo.id),
                          texto: e.target.value,
                        });
                        dispatch({
                          tipo: "editarConsumo",
                          gastoId: gasto.id,
                          consumoId: consumo.id,
                          cambios: { montoCentavos: parseMonto(e.target.value) },
                        });
                      }}
                    />
                  </div>
                ) : null}

                {gasto.consumos.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Quitar a ${consumo.participante || "este participante"}`}
                    onClick={() =>
                      dispatch({ tipo: "quitarConsumo", gastoId: gasto.id, consumoId: consumo.id })
                    }
                    className="min-h-[var(--tap-target)] w-8 shrink-0 text-fog hover:text-alert-ink"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              {errorNombre ? <Mensaje tono="error">{errorNombre.mensaje}</Mensaje> : null}
              {errorConsumo ? <Mensaje tono="error">{errorConsumo.mensaje}</Mensaje> : null}
              {esVos && !errorNombre ? (
                <Mensaje tono="error">Reemplazá &quot;Vos&quot; por tu nombre real.</Mensaje>
              ) : null}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => dispatch({ tipo: "agregarConsumo", gastoId: gasto.id, id: nuevoId() })}
          className="min-h-[var(--tap-target)] self-start text-caption font-medium text-iron underline underline-offset-2"
        >
          + Agregar participante
        </button>

        {erroresParticipantes.map((error) => (
          <Mensaje key={error.mensaje} tono="error">
            {error.mensaje}
          </Mensaje>
        ))}
        {errorTotalConsumos ? <Mensaje tono="error">{errorTotalConsumos.mensaje}</Mensaje> : null}
      </div>
    </Card>
  );
}

function OpcionReparto({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`min-h-[var(--tap-target)] flex-1 rounded-[var(--radius-badges)] border px-3 py-2 text-caption transition-colors ${
        activa ? "border-obsidian bg-obsidian text-snow" : "border-cloud bg-snow text-iron"
      }`}
    >
      {children}
    </button>
  );
}
