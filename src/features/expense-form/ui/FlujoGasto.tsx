"use client";

import { useCallback, useState } from "react";
import { PLACEHOLDER_VOS, type BorradorGasto, type BorradorSesion } from "@/shared/domain/expense";
import { formatMontoEditable } from "@/shared/domain/money";
import { calcularSaldosNetos } from "@/features/settlement/domain/balances";
import { generarResumen } from "@/features/settlement/domain/summary";
import { calcularTransferencias } from "@/features/settlement/domain/transfers";
import { AccionesCompartir } from "@/features/settlement/ui/AccionesCompartir";
import { nuevoBorradorGasto, tienePlaceholderVos } from "@/features/expense-form/domain/borrador";
import { borradorAGastos } from "@/features/expense-form/domain/validation";
import { interpretarGasto } from "@/features/expense-parsing/api/parseExpenseClient";
import type { GastoInterpretado } from "@/features/expense-parsing/domain/contract";
import { EntradaTexto, type EstadoEntrada } from "@/features/expense-parsing/ui/EntradaTexto";
import { ResultadoTransferencias } from "@/features/settlement/ui/ResultadoTransferencias";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { IconoAlerta } from "@/shared/ui/Field";
import { FormularioGasto } from "./FormularioGasto";
import { claveMonto, useBorradorSesion } from "./useBorradorSesion";

/**
 * Orquesta el flujo completo: entrada -> formulario editable -> resultado.
 *
 * Es el unico componente con estado del paso actual. Nada se guarda en
 * sessionStorage ni en el servidor: al recargar la pagina la sesion arranca de
 * cero, que es el comportamiento efimero que define el PRD.
 */

type Paso = "entrada" | "formulario" | "resultado";

export function FlujoGasto() {
  const [paso, setPaso] = useState<Paso>("entrada");
  const [texto, setTexto] = useState("");
  const [estadoEntrada, setEstadoEntrada] = useState<EstadoEntrada>("idle");
  const [errorEntrada, setErrorEntrada] = useState<string | null>(null);

  const { sesion, validacion, textoMonto, dispatch } = useBorradorSesion();

  const nuevoId = useCallback(() => crypto.randomUUID(), []);

  const irAFormulario = useCallback(
    (nuevaSesion: BorradorSesion) => {
      dispatch({ tipo: "cargar", sesion: nuevaSesion, textos: textosIniciales(nuevaSesion) });
      setPaso("formulario");
    },
    [dispatch],
  );

  const cargarManual = useCallback(() => {
    setErrorEntrada(null);
    irAFormulario({
      gastos: [nuevoBorradorGasto(nuevoId(), [PLACEHOLDER_VOS], [nuevoId()])],
    });
  }, [irAFormulario, nuevoId]);

  const interpretar = useCallback(async () => {
    setEstadoEntrada("interpretando");
    setErrorEntrada(null);

    const resultado = await interpretarGasto(texto);

    setEstadoEntrada("idle");

    if (!resultado.ok) {
      // AC-05, AC-09 y AC-12 desembocan todos aca: se muestra el motivo y la
      // carga manual queda a un clic de distancia.
      setErrorEntrada(resultado.mensaje);
      return;
    }

    irAFormulario({ gastos: resultado.gastos.map((g) => aBorrador(g, nuevoId)) });
  }, [texto, irAFormulario, nuevoId]);

  const empezarDeNuevo = useCallback(() => {
    dispatch({ tipo: "reset" });
    setTexto("");
    setErrorEntrada(null);
    setPaso("entrada");
  }, [dispatch]);

  if (paso === "entrada") {
    return (
      <EntradaTexto
        texto={texto}
        onTextoChange={setTexto}
        onInterpretar={() => void interpretar()}
        onCargaManual={cargarManual}
        estado={estadoEntrada}
        error={errorEntrada}
      />
    );
  }

  if (paso === "formulario") {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-heading-fluid text-obsidian">Revisá y corregí</h1>
          <p className="text-body text-steel">
            Antes de calcular, chequeá que los montos, el pagador y los participantes estén bien.
          </p>
        </header>

        <FormularioGasto
          sesion={sesion}
          errores={validacion.errores}
          advertencias={validacion.advertencias}
          textoMonto={textoMonto}
          dispatch={dispatch}
          nuevoId={nuevoId}
        />

        {!validacion.puedeConfirmar ? (
          <p className="text-caption text-alert-ink">
            Completá los campos marcados para poder calcular.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button disabled={!validacion.puedeConfirmar} onClick={() => setPaso("resultado")}>
            Calcular
          </Button>
          <Button variante="neutra" onClick={empezarDeNuevo}>
            Empezar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  const gastos = borradorAGastos(sesion);
  const saldos = calcularSaldosNetos(gastos);
  const transferencias = calcularTransferencias(saldos);
  const resumen = generarResumen(gastos, transferencias);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-heading-fluid text-obsidian">Listo</h1>

      <ResultadoTransferencias transferencias={transferencias} saldos={saldos} />

      <AccionesCompartir resumen={resumen} />

      {tienePlaceholderVos(sesion) ? (
        <Card className="flex items-start gap-2 border-alert-border bg-alert-soft">
          <IconoAlerta className="text-alert-ink" />
          <p className="text-caption text-alert-ink">
            El resumen todavía dice &quot;Vos&quot;. Volvé a editar y poné tu nombre real para que
            el resto entienda quién es quién.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button variante="neutra" onClick={() => setPaso("formulario")}>
          Volver a editar
        </Button>
        <Button variante="neutra" onClick={empezarDeNuevo}>
          Empezar de nuevo
        </Button>
      </div>
    </div>
  );
}

/** Convierte lo que devolvio la IA en un borrador editable, asignando ids. */
function aBorrador(gasto: GastoInterpretado, nuevoId: () => string): BorradorGasto {
  return {
    id: nuevoId(),
    descripcion: gasto.descripcion,
    montoTotalCentavos: gasto.montoTotalCentavos,
    pagador: gasto.pagador,
    modoReparto: gasto.modoReparto,
    consumos: gasto.consumos.map((consumo) => ({
      id: nuevoId(),
      participante: consumo.participante,
      montoCentavos: consumo.montoCentavos,
    })),
  };
}

/**
 * Precarga el texto visible de cada monto. Sin esto, un borrador que llega con
 * montos ya resueltos mostraria los inputs vacios.
 */
function textosIniciales(sesion: BorradorSesion): Record<string, string> {
  const textos: Record<string, string> = {};
  for (const gasto of sesion.gastos) {
    if (gasto.montoTotalCentavos !== null) {
      textos[claveMonto(gasto.id)] = formatMontoEditable(gasto.montoTotalCentavos);
    }
    for (const consumo of gasto.consumos) {
      if (consumo.montoCentavos !== null) {
        textos[claveMonto(gasto.id, consumo.id)] = formatMontoEditable(consumo.montoCentavos);
      }
    }
  }
  return textos;
}
