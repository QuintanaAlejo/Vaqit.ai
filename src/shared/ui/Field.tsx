import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/**
 * Inputs del design system con estado de alerta.
 *
 * El estado `alerta` es el resaltado en rojo claro que exigen AC-01 (placeholder
 * "Vos") y AC-07 (campo ambiguo), usando los unicos tres tokens cromaticos que
 * DESIGN.md habilita para esto.
 */

const BASE =
  "min-h-[var(--tap-target)] w-full rounded-[var(--radius-inputs)] border px-3 py-2.5 text-graphite outline-none transition-colors placeholder:text-ash focus:border-iron";

const NORMAL = "border-cloud bg-snow";
const ALERTA = "border-alert-border bg-alert-soft";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-caption font-medium text-steel">
      {children}
    </label>
  );
}

/** Mensaje bajo un campo. `tono` distingue lo que bloquea de lo que solo avisa. */
export function Mensaje({ children, tono }: { children: ReactNode; tono: "error" | "aviso" }) {
  return (
    <p
      className={`flex items-start gap-1.5 text-caption ${
        tono === "error" ? "text-alert-ink" : "text-steel"
      }`}
    >
      <IconoAlerta />
      <span>{children}</span>
    </p>
  );
}

/** Triangulo de alerta inline, en SVG para no depender de una libreria de iconos. */
export function IconoAlerta({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" />
      <path d="M8 6.5v3" />
      <path d="M8 11.6v.4" />
    </svg>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { alerta?: boolean };

export function Input({ alerta = false, className = "", ...props }: InputProps) {
  return (
    <input
      aria-invalid={alerta || undefined}
      className={`${BASE} ${alerta ? ALERTA : NORMAL} ${className}`}
      {...props}
    />
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { alerta?: boolean };

export function Select({ alerta = false, className = "", children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={alerta || undefined}
      className={`${BASE} ${alerta ? ALERTA : NORMAL} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
