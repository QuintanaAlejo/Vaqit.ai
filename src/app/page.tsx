import { FlujoGasto } from "@/features/expense-form/ui/FlujoGasto";

/**
 * Server Component por defecto: el shell de la pagina se renderiza en el
 * servidor y solo el flujo interactivo baja como client component.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[var(--flow-max-width)] flex-col gap-6 px-5 py-10">
      <FlujoGasto />
      <footer className="mt-auto pt-4 text-caption text-ash">
        Vaqit.ai no guarda nada: al cerrar la pestaña se borra todo.
      </footer>
    </main>
  );
}
