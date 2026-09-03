"use client";

import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { IconoAlerta } from "@/shared/ui/Field";

/**
 * Pantalla de ingreso (RF-01). Ofrece siempre las dos vias: el texto libre que
 * interpreta la IA y la carga manual (RF-17), que es el fallback cuando la IA
 * falla o no interpreta bien.
 */

export type EstadoEntrada = "idle" | "interpretando";

type Props = {
  texto: string;
  onTextoChange: (texto: string) => void;
  onInterpretar: () => void;
  onCargaManual: () => void;
  estado: EstadoEntrada;
  /** Mensaje de error del ultimo intento de interpretacion, si hubo. */
  error: string | null;
};

const EJEMPLO = "Pagué 60.000 de la cena de ayer entre Juan, Rodrigo y yo";

export function EntradaTexto({
  texto,
  onTextoChange,
  onInterpretar,
  onCargaManual,
  estado,
  error,
}: Props) {
  const interpretando = estado === "interpretando";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <h1 className="text-display-fluid text-obsidian">
          Dividí el gasto
          <br />
          en segundos
        </h1>
        <p className="text-body text-steel">
          Contá en tus palabras quién pagó qué y calculamos la mínima cantidad de transferencias
          para que queden a cero.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <label htmlFor="texto-gasto" className="text-caption font-medium text-steel">
          Contanos el gasto
        </label>
        <textarea
          id="texto-gasto"
          rows={5}
          value={texto}
          disabled={interpretando}
          placeholder={EJEMPLO}
          onChange={(e) => onTextoChange(e.target.value)}
          className="w-full resize-y rounded-[var(--radius-inputs)] border border-cloud bg-snow px-3 py-2.5 text-graphite outline-none placeholder:text-ash focus:border-iron disabled:opacity-60"
        />

        {error !== null ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-badges)] border border-alert-border bg-alert-soft px-3 py-2.5 text-caption text-alert-ink">
            <IconoAlerta />
            <span>{error}</span>
          </div>
        ) : null}

        <Button onClick={onInterpretar} disabled={interpretando || texto.trim() === ""}>
          {interpretando ? "Interpretando..." : "Interpretar el gasto"}
        </Button>

        <p className="text-caption text-fog">
          Después vas a poder revisar y corregir todo antes de calcular.
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        <Button variante="neutra" onClick={onCargaManual} disabled={interpretando}>
          Cargar a mano, sin IA
        </Button>
        <p className="text-caption text-fog">
          Si el texto no se interpreta bien o preferís llenarlo vos, cargá los montos directamente
          en el formulario.
        </p>
      </div>
    </div>
  );
}
