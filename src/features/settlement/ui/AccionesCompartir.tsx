"use client";

import { useEffect, useRef, useState } from "react";
import { enlaceWhatsApp } from "@/features/settlement/domain/share";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";

/**
 * Compartir el resumen (RF-15, RF-16).
 *
 * WhatsApp es el camino principal (AC-04) y copiar es el respaldo para un
 * dispositivo sin WhatsApp ni acceso a WhatsApp Web (AC-15).
 */

type EstadoCopia = "idle" | "copiado" | "error";

/** Cuanto dura el cartel de "Copiado" antes de volver al estado normal. */
const MS_CONFIRMACION = 2000;

export function AccionesCompartir({ resumen }: { resumen: string }) {
  const [estadoCopia, setEstadoCopia] = useState<EstadoCopia>("idle");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Si el componente se desmonta con el cartel visible, el timeout tiene que
    // limpiarse o intenta actualizar estado de un componente que ya no existe.
    return () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    };
  }, []);

  const confirmar = (estado: EstadoCopia) => {
    setEstadoCopia(estado);
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setEstadoCopia("idle"), MS_CONFIRMACION);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumen);
      confirmar("copiado");
    } catch {
      // La Clipboard API falla sin permiso o fuera de un contexto seguro. En vez
      // de dejar al usuario sin salida, se muestra el resumen para copiar a mano.
      confirmar("error");
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-caption font-medium text-steel">Compartirlo</h3>

      <Button onClick={() => window.open(enlaceWhatsApp(resumen), "_blank", "noopener,noreferrer")}>
        Compartir por WhatsApp
      </Button>

      <Button variante="neutra" onClick={() => void copiar()}>
        {estadoCopia === "copiado" ? "Copiado" : "Copiar el resumen"}
      </Button>

      {estadoCopia === "error" ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-alert-ink">
            Tu navegador no nos deja copiar. Seleccioná el texto y copialo a mano:
          </p>
          <textarea
            readOnly
            rows={Math.min(12, resumen.split("\n").length + 1)}
            value={resumen}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-y rounded-[var(--radius-inputs)] border border-cloud bg-paper px-3 py-2.5 text-graphite"
          />
        </div>
      ) : null}

      <details className="text-caption text-fog">
        <summary className="min-h-[var(--tap-target)] cursor-pointer content-center">
          Ver el texto que se comparte
        </summary>
        {/* whitespace-pre-wrap para que se vea igual que en WhatsApp: el resumen
            es texto plano con saltos de linea reales (RNF-03). */}
        <pre className="mt-2 font-cosmica text-caption whitespace-pre-wrap text-steel">
          {resumen}
        </pre>
      </details>
    </Card>
  );
}
