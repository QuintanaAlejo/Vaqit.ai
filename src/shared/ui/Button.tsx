import type { ButtonHTMLAttributes } from "react";

type Variante = "primaria" | "ghost" | "neutra";

const BASE =
  "inline-flex min-h-[var(--tap-target)] items-center justify-center gap-2 rounded-[var(--radius-buttons)] px-4 py-3 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Variantes de DESIGN.md. La primaria usa el fill obsidian con borde hairline
 * mas highlight interno: el sistema define la elevacion por borde, no por
 * drop shadow.
 */
const VARIANTES: Record<Variante, string> = {
  primaria:
    "bg-obsidian text-snow shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.5),0_0_0_1.5px_rgb(44,46,52)] hover:bg-graphite",
  ghost: "bg-snow text-iron ring-1 ring-iron hover:bg-paper",
  neutra: "bg-snow text-graphite ring-1 ring-cloud hover:bg-paper",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante };

export function Button({ variante = "primaria", className = "", ...props }: Props) {
  return <button className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props} />;
}
