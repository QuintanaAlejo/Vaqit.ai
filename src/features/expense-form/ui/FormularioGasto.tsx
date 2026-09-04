"use client";

import { useId, useState } from "react";
import { esMismoParticipante, esPlaceholderVos, type BorradorGasto } from "@/shared/domain/expense";
import { filtrarTextoMonto, parseMonto } from "@/shared/domain/money";
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
 *
 * Los nombres se administran una sola vez arriba (ParticipantesSesion); cada
 * ticket de gasto solo elige, con un toggle compacto, cual de esos nombres
 * participo de ese gasto puntual (AC-13, AC-14: no todos los gastos los
 * consume todo el grupo).
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
      <ParticipantesSesion
        participantes={participantes}
        gastosCount={sesion.gastos.length}
        dispatch={dispatch}
        nuevoId={nuevoId}
      />

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
        onClick={() =>
          dispatch({
            tipo: "agregarGasto",
            gastoId: nuevoId(),
            idsConsumo: participantes.map(() => nuevoId()),
          })
        }
      >
        + Agregar otro gasto
      </Button>
    </div>
  );
}

/**
 * Registro global de nombres de la sesion (RF-05, RF-06). Un solo lugar para
 * agregar, renombrar o quitar a alguien, en vez de repetirlo gasto por gasto.
 */
function ParticipantesSesion({
  participantes,
  gastosCount,
  dispatch,
  nuevoId,
}: {
  participantes: string[];
  gastosCount: number;
  dispatch: DispatchBorrador;
  nuevoId: () => string;
}) {
  const idBase = useId();
  const [nuevoNombre, setNuevoNombre] = useState("");

  const agregar = () => {
    const limpio = nuevoNombre.trim();
    if (limpio === "") return;
    dispatch({
      tipo: "agregarParticipanteGlobal",
      nombre: limpio,
      ids: Array.from({ length: gastosCount }, () => nuevoId()),
    });
    setNuevoNombre("");
  };

  return (
    <Card className="flex flex-col gap-3">
      <Label>Participantes</Label>
      <div className="flex flex-wrap gap-2">
        {participantes.map((nombre) => (
          <ParticipanteChip key={nombre} nombre={nombre} dispatch={dispatch} />
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={`${idBase}-nuevo`}
          aria-label="Agregar participante a la sesión"
          value={nuevoNombre}
          placeholder="Agregar a alguien..."
          onChange={(e) => setNuevoNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
        />
        <Button variante="neutra" onClick={agregar}>
          Agregar
        </Button>
      </div>
    </Card>
  );
}

/** Un nombre del registro global: editable in-place y removible de toda la sesion. */
function ParticipanteChip({ nombre, dispatch }: { nombre: string; dispatch: DispatchBorrador }) {
  const [buffer, setBuffer] = useState(nombre);
  const esVos = esPlaceholderVos(nombre);

  const confirmar = () => {
    const limpio = buffer.trim();
    if (limpio !== "" && !esMismoParticipante(limpio, nombre)) {
      dispatch({ tipo: "renombrar", desde: nombre, hacia: limpio });
    } else {
      setBuffer(nombre);
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-[var(--radius-badges)] border border-cloud bg-paper py-1 pr-1 pl-2">
      <div className="relative">
        <Input
          key={nombre}
          aria-label="Nombre del participante"
          defaultValue={nombre}
          alerta={esVos}
          className={`h-8 w-24 !min-h-0 !rounded-[var(--radius-badges)] !border-0 !bg-transparent !p-0 text-caption font-medium ${esVos ? "pr-5" : ""}`}
          onChange={(e) => setBuffer(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {esVos ? (
          <IconoAlerta className="absolute top-1/2 right-0 !mt-0 h-3.5 w-3.5 -translate-y-1/2 text-alert-ink" />
        ) : null}
      </div>
      <button
        type="button"
        aria-label={`Quitar a ${nombre} de la sesión`}
        onClick={() => dispatch({ tipo: "quitarParticipanteGlobal", nombre })}
        className="min-h-[1.75rem] min-w-[1.75rem] rounded-[var(--radius-badges)] text-fog hover:text-alert-ink"
      >
        ×
      </button>
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

  // El value del select tiene que coincidir caracter por caracter con un
  // <option>. Si el pagador quedo escrito distinto que en la lista ("juan" vs
  // "Juan"), sin esto el campo se veria vacio aunque el pagador este cargado.
  const valorPagador =
    participantes.find((nombre) => esMismoParticipante(nombre, gasto.pagador ?? "")) ?? "";

  const cambiarMonto = (texto: string) => {
    const filtrado = filtrarTextoMonto(texto);
    dispatch({ tipo: "setTexto", clave: claveMonto(gasto.id), texto: filtrado });
    dispatch({
      tipo: "editarGasto",
      gastoId: gasto.id,
      cambios: { montoTotalCentavos: parseMonto(filtrado) },
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
          value={valorPagador}
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
        <Label>Entre quiénes</Label>

        {erroresParticipantes.length > 0 ? (
          <ParticipantesAmbiguos
            gasto={gasto}
            errores={errores}
            textoMonto={textoMonto}
            dispatch={dispatch}
          />
        ) : (
          <ParticipantesToggle
            gasto={gasto}
            participantes={participantes}
            errores={errores}
            textoMonto={textoMonto}
            dispatch={dispatch}
            nuevoId={nuevoId}
          />
        )}

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

/**
 * Selector compacto: una fila de toggles con los nombres del registro global.
 * Prendido = participo de este gasto; en reparto individual, ademas expone el
 * monto que le corresponde. Es la vista normal de un ticket sin ambiguedades.
 */
function ParticipantesToggle({
  gasto,
  participantes,
  errores,
  textoMonto,
  dispatch,
  nuevoId,
}: {
  gasto: BorradorGasto;
  participantes: string[];
  errores: ProblemaValidacion[];
  textoMonto: (gastoId: string, consumoId?: string) => string;
  dispatch: DispatchBorrador;
  nuevoId: () => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {participantes.map((nombre) => {
        const consumo = gasto.consumos.find((c) => esMismoParticipante(c.participante, nombre));
        const incluido = consumo !== undefined;
        const errorConsumo = incluido
          ? errores.find((e) => e.campo === "consumo" && e.consumoId === consumo.id)
          : undefined;

        if (!incluido) {
          return (
            <button
              key={nombre}
              type="button"
              onClick={() =>
                dispatch({
                  tipo: "alternarParticipante",
                  gastoId: gasto.id,
                  nombre,
                  idNuevoConsumo: nuevoId(),
                })
              }
              className="rounded-[var(--radius-badges)] border border-dashed border-cloud bg-snow px-3 py-1.5 text-caption text-steel transition-colors hover:border-iron hover:text-iron"
            >
              + {nombre}
            </button>
          );
        }

        return (
          <div
            key={nombre}
            className={`flex items-center gap-1.5 rounded-[var(--radius-badges)] border py-1 pr-1 pl-3 text-caption ${
              errorConsumo !== undefined
                ? "border-alert-border bg-alert-soft text-alert-ink"
                : "border-obsidian bg-obsidian text-snow"
            }`}
          >
            {nombre}
            {gasto.modoReparto === "individual" ? (
              <span className="relative">
                <span
                  className={`pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 ${
                    errorConsumo !== undefined ? "text-alert-ink" : "text-cloud"
                  }`}
                >
                  $
                </span>
                <input
                  aria-label={`Consumo de ${nombre}`}
                  inputMode="decimal"
                  value={textoMonto(gasto.id, consumo.id)}
                  onChange={(e) => {
                    const filtrado = filtrarTextoMonto(e.target.value);
                    dispatch({
                      tipo: "setTexto",
                      clave: claveMonto(gasto.id, consumo.id),
                      texto: filtrado,
                    });
                    dispatch({
                      tipo: "editarConsumo",
                      gastoId: gasto.id,
                      consumoId: consumo.id,
                      cambios: { montoCentavos: parseMonto(filtrado) },
                    });
                  }}
                  className={`h-6 w-16 rounded-[var(--radius-badges)] bg-transparent pl-4 text-caption outline-none ${
                    errorConsumo !== undefined
                      ? "text-alert-ink placeholder:text-alert-ink"
                      : "text-snow placeholder:text-cloud"
                  }`}
                />
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Quitar a ${nombre} de este gasto`}
              onClick={() =>
                dispatch({
                  tipo: "alternarParticipante",
                  gastoId: gasto.id,
                  nombre,
                  idNuevoConsumo: nuevoId(),
                })
              }
              className={`min-h-[1.5rem] min-w-[1.5rem] rounded-[var(--radius-badges)] ${
                errorConsumo !== undefined ? "hover:text-obsidian" : "hover:text-cloud"
              }`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Fallback para AC-07: cuando dos consumos del mismo gasto comparten nombre
 * (ambiguos, no necesariamente la misma persona), el toggle por nombre no
 * alcanza porque no puede distinguirlos. Se vuelve a la fila editable de
 * siempre para que el usuario diferencie a mano (apellido, inicial), sin
 * propagar ese cambio al resto de la sesion.
 */
function ParticipantesAmbiguos({
  gasto,
  errores,
  textoMonto,
  dispatch,
}: {
  gasto: BorradorGasto;
  errores: ProblemaValidacion[];
  textoMonto: (gastoId: string, consumoId?: string) => string;
  dispatch: DispatchBorrador;
}) {
  return (
    <div className="flex flex-col gap-2">
      {gasto.consumos.map((consumo) => {
        const errorNombre = errores.find(
          (e) => e.campo === "participante" && e.consumoId === consumo.id,
        );
        const errorConsumo = errores.find(
          (e) => e.campo === "consumo" && e.consumoId === consumo.id,
        );

        return (
          <div key={consumo.id} className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <Input
                aria-label="Nombre del participante"
                value={consumo.participante}
                placeholder="Nombre"
                alerta={errorNombre !== undefined}
                className="flex-1"
                onChange={(e) =>
                  dispatch({
                    tipo: "editarConsumo",
                    gastoId: gasto.id,
                    consumoId: consumo.id,
                    cambios: { participante: e.target.value },
                  })
                }
              />

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
                      const filtrado = filtrarTextoMonto(e.target.value);
                      dispatch({
                        tipo: "setTexto",
                        clave: claveMonto(gasto.id, consumo.id),
                        texto: filtrado,
                      });
                      dispatch({
                        tipo: "editarConsumo",
                        gastoId: gasto.id,
                        consumoId: consumo.id,
                        cambios: { montoCentavos: parseMonto(filtrado) },
                      });
                    }}
                  />
                </div>
              ) : null}

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
            </div>

            {errorNombre ? <Mensaje tono="error">{errorNombre.mensaje}</Mensaje> : null}
            {errorConsumo ? <Mensaje tono="error">{errorConsumo.mensaje}</Mensaje> : null}
          </div>
        );
      })}
    </div>
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
