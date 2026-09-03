import type { ReactNode } from "react";

/**
 * Superficie elevada de DESIGN.md: 36px de radio, blanco sobre el canvas paper,
 * borde hairline de 1px y ninguna drop shadow. El padding sale del token
 * responsive --card-padding (20px mobile / 28px desktop).
 */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[var(--radius-cards)] border border-cloud bg-snow p-[var(--card-padding)] ${className}`}
    >
      {children}
    </section>
  );
}
