"use client";

import { useState } from "react";
import type { EstadoFormulario } from "@/lib/gastos/tipos-formulario";
import { validarFormulario, type ResultadoValidacion } from "@/lib/gastos/validacion";
import {
  calcularSaldos,
  optimizarTransferencias,
  generarResumenTexto,
} from "@/lib/gastos/calculo";
import type { Gasto, Saldo, Transferencia } from "@/lib/gastos/types";
import PasoCarga from "./PasoCarga";
import PasoRevision from "./PasoRevision";
import PasoCompartir from "./PasoCompartir";

type Paso = "carga" | "revision" | "compartir";

interface Resultado {
  gastos: Gasto[];
  saldos: Saldo[];
  transferencias: Transferencia[];
  resumen: string;
}

export default function CalculadoraGastos() {
  const [paso, setPaso] = useState<Paso>("carga");
  const [estado, setEstado] = useState<EstadoFormulario>({
    participantes: ["Vos"],
    gastos: [],
  });
  const [validacion, setValidacion] = useState<ResultadoValidacion | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function revisar() {
    const resultadoValidacion = validarFormulario(estado);
    setValidacion(resultadoValidacion);

    if (!resultadoValidacion.gastos) {
      return;
    }

    const saldos = calcularSaldos(resultadoValidacion.gastos);
    const transferencias = optimizarTransferencias(saldos);
    const resumen = generarResumenTexto(transferencias);

    setResultado({ gastos: resultadoValidacion.gastos, saldos, transferencias, resumen });
    setPaso("revision");
  }

  function volverAEditar() {
    setPaso("carga");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Vaqit.ai</h1>
        <p className="text-sm text-slate-500">
          Dividí un gasto grupal y armá quién le debe a quién.
        </p>
      </header>

      {paso === "carga" && (
        <PasoCarga
          estado={estado}
          setEstado={setEstado}
          validacion={validacion}
          setValidacion={setValidacion}
          onContinuar={revisar}
        />
      )}

      {paso === "revision" && resultado && (
        <PasoRevision
          gastos={resultado.gastos}
          saldos={resultado.saldos}
          transferencias={resultado.transferencias}
          onEditar={volverAEditar}
          onConfirmar={() => setPaso("compartir")}
        />
      )}

      {paso === "compartir" && resultado && (
        <PasoCompartir resumen={resultado.resumen} onVolver={volverAEditar} />
      )}
    </div>
  );
}
