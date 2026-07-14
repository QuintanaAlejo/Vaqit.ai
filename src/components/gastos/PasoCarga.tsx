"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  crearGastoVacio,
  type EstadoFormulario,
  type GastoForm,
} from "@/lib/gastos/tipos-formulario";
import type { ResultadoValidacion } from "@/lib/gastos/validacion";

interface Props {
  estado: EstadoFormulario;
  setEstado: Dispatch<SetStateAction<EstadoFormulario>>;
  validacion: ResultadoValidacion | null;
  onContinuar: () => void;
}

export default function PasoCarga({ estado, setEstado, validacion, onContinuar }: Props) {
  const [nuevoParticipante, setNuevoParticipante] = useState("");
  const [errorParticipante, setErrorParticipante] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [valorEdicion, setValorEdicion] = useState("");
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  function agregarParticipante() {
    const nombre = nuevoParticipante.trim();

    if (!nombre) return;

    const yaExiste = estado.participantes.some(
      (p) => p.toLowerCase() === nombre.toLowerCase()
    );

    if (yaExiste) {
      setErrorParticipante("Ese participante ya está en la lista.");
      return;
    }

    setEstado((prev) => ({ ...prev, participantes: [...prev.participantes, nombre] }));
    setNuevoParticipante("");
    setErrorParticipante(null);
  }

  function quitarParticipante(nombre: string) {
    setEstado((prev) => ({
      participantes: prev.participantes.filter((p) => p !== nombre),
      gastos: prev.gastos.map((gasto) => {
        const montosIndividuales = { ...gasto.montosIndividuales };
        delete montosIndividuales[nombre];
        return {
          ...gasto,
          pagador: gasto.pagador === nombre ? "" : gasto.pagador,
          consumidores: gasto.consumidores.filter((c) => c !== nombre),
          montosIndividuales,
        };
      }),
    }));
  }

  function iniciarEdicion(nombre: string) {
    setEditando(nombre);
    setValorEdicion(nombre);
    setErrorEdicion(null);
  }

  function cancelarEdicion() {
    setEditando(null);
    setErrorEdicion(null);
  }

  function guardarEdicion(nombreOriginal: string) {
    const nombreNuevo = valorEdicion.trim();

    if (!nombreNuevo) {
      setErrorEdicion("El nombre no puede quedar vacío.");
      return;
    }

    if (nombreNuevo === nombreOriginal) {
      cancelarEdicion();
      return;
    }

    const yaExiste = estado.participantes.some(
      (p) => p !== nombreOriginal && p.toLowerCase() === nombreNuevo.toLowerCase()
    );

    if (yaExiste) {
      setErrorEdicion("Ese participante ya está en la lista.");
      return;
    }

    setEstado((prev) => ({
      participantes: prev.participantes.map((p) => (p === nombreOriginal ? nombreNuevo : p)),
      gastos: prev.gastos.map((gasto) => {
        const montosIndividuales = { ...gasto.montosIndividuales };
        if (nombreOriginal in montosIndividuales) {
          montosIndividuales[nombreNuevo] = montosIndividuales[nombreOriginal];
          delete montosIndividuales[nombreOriginal];
        }
        return {
          ...gasto,
          pagador: gasto.pagador === nombreOriginal ? nombreNuevo : gasto.pagador,
          consumidores: gasto.consumidores.map((c) => (c === nombreOriginal ? nombreNuevo : c)),
          montosIndividuales,
        };
      }),
    }));

    cancelarEdicion();
  }

  function agregarGasto() {
    setEstado((prev) => ({
      ...prev,
      gastos: [...prev.gastos, crearGastoVacio(prev.participantes)],
    }));
  }

  function quitarGasto(id: string) {
    setEstado((prev) => ({ ...prev, gastos: prev.gastos.filter((g) => g.id !== id) }));
  }

  function actualizarGasto(id: string, cambios: Partial<GastoForm>) {
    setEstado((prev) => ({
      ...prev,
      gastos: prev.gastos.map((g) => (g.id === id ? { ...g, ...cambios } : g)),
    }));
  }

  function toggleConsumidor(gasto: GastoForm, participante: string) {
    const yaIncluido = gasto.consumidores.includes(participante);
    const consumidores = yaIncluido
      ? gasto.consumidores.filter((c) => c !== participante)
      : [...gasto.consumidores, participante];
    actualizarGasto(gasto.id, { consumidores });
  }

  function actualizarMontoIndividual(gasto: GastoForm, participante: string, valor: string) {
    actualizarGasto(gasto.id, {
      montosIndividuales: { ...gasto.montosIndividuales, [participante]: valor },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Participantes</h2>

        <div className="flex flex-wrap gap-2">
          {estado.participantes.map((participante) =>
            editando === participante ? (
              <span
                key={participante}
                className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-white px-2 py-1 text-sm"
              >
                <input
                  autoFocus
                  type="text"
                  value={valorEdicion}
                  onChange={(e) => setValorEdicion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      guardarEdicion(participante);
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelarEdicion();
                    }
                  }}
                  className="w-28 border-none bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  aria-label="Guardar nombre"
                  onClick={() => guardarEdicion(participante)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  ✓
                </button>
                <button
                  type="button"
                  aria-label="Cancelar edición"
                  onClick={cancelarEdicion}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </span>
            ) : (
              <span
                key={participante}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800"
              >
                {participante}
                <button
                  type="button"
                  onClick={() => iniciarEdicion(participante)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={`Editar a ${participante}`}
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label={`Quitar a ${participante}`}
                  onClick={() => quitarParticipante(participante)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </span>
            )
          )}
        </div>
        {errorEdicion && <p className="text-sm text-red-600">{errorEdicion}</p>}

        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoParticipante}
            onChange={(e) => {
              setNuevoParticipante(e.target.value);
              setErrorParticipante(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarParticipante();
              }
            }}
            placeholder="Nombre del participante"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={agregarParticipante}
            className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Agregar
          </button>
        </div>
        {errorParticipante && <p className="text-sm text-red-600">{errorParticipante}</p>}
        {validacion?.erroresGlobales
          .filter((e) => e.includes("participante"))
          .map((error) => (
            <p key={error} className="text-sm text-red-600">
              {error}
            </p>
          ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Gastos</h2>

        {estado.gastos.length === 0 && (
          <p className="text-sm text-slate-500">Todavía no agregaste ningún gasto.</p>
        )}

        {estado.gastos.map((gasto, indice) => {
          const errores = validacion?.erroresPorGasto[gasto.id];
          const monto = Number(gasto.monto.replace(",", "."));
          const cuotaEquitativa =
            gasto.modo === "equitativo" && gasto.consumidores.length > 0 && Number.isFinite(monto)
              ? (monto / gasto.consumidores.length).toFixed(2)
              : null;

          return (
            <div key={gasto.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Gasto {indice + 1}</span>
                <button
                  type="button"
                  onClick={() => quitarGasto(gasto.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-700">Monto total</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={gasto.monto}
                  onChange={(e) => actualizarGasto(gasto.id, { monto: e.target.value })}
                  placeholder="Ej: 15000"
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    errores?.monto ? "border-red-500" : "border-slate-300"
                  }`}
                />
                {errores?.monto && <p className="text-sm text-red-600">{errores.monto}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-700">¿Quién pagó?</label>
                <select
                  value={gasto.pagador}
                  onChange={(e) => actualizarGasto(gasto.id, { pagador: e.target.value })}
                  className={`w-full rounded-md border bg-white px-3 py-2 text-sm ${
                    errores?.pagador ? "border-red-500" : "border-slate-300"
                  }`}
                >
                  <option value="">Elegir...</option>
                  {estado.participantes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {errores?.pagador && <p className="text-sm text-red-600">{errores.pagador}</p>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-slate-700">¿Quiénes lo consumieron?</label>
                <div className="flex flex-wrap gap-3">
                  {estado.participantes.map((p) => (
                    <label key={p} className="flex items-center gap-1 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={gasto.consumidores.includes(p)}
                        onChange={() => toggleConsumidor(gasto, p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
                {errores?.consumidores && (
                  <p className="text-sm text-red-600">{errores.consumidores}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => actualizarGasto(gasto.id, { modo: "equitativo" })}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      gasto.modo === "equitativo"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    Partes iguales
                  </button>
                  <button
                    type="button"
                    onClick={() => actualizarGasto(gasto.id, { modo: "individual" })}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      gasto.modo === "individual"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    Montos distintos
                  </button>
                </div>

                {gasto.modo === "equitativo" && cuotaEquitativa && (
                  <p className="text-sm text-slate-500">
                    Cada uno paga aprox. ${cuotaEquitativa}
                  </p>
                )}

                {gasto.modo === "individual" && (
                  <div className="flex flex-col gap-2">
                    {gasto.consumidores.map((p) => (
                      <div key={p} className="flex items-center gap-2">
                        <label className="w-24 shrink-0 text-sm text-slate-700">{p}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={gasto.montosIndividuales[p] ?? ""}
                          onChange={(e) => actualizarMontoIndividual(gasto, p, e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                    {errores?.montosIndividuales && (
                      <p className="text-sm text-red-600">{errores.montosIndividuales}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={agregarGasto}
          className="rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          + Agregar gasto
        </button>
        {validacion?.erroresGlobales
          .filter((e) => e.includes("gasto"))
          .map((error) => (
            <p key={error} className="text-sm text-red-600">
              {error}
            </p>
          ))}
      </section>

      <button
        type="button"
        onClick={onContinuar}
        className="rounded-md bg-slate-900 px-4 py-3 text-base font-medium text-white"
      >
        Revisar cálculo
      </button>
    </div>
  );
}
