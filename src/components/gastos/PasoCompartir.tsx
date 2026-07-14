"use client";

import { useState } from "react";

interface Props {
  resumen: string;
  onVolver: () => void;
}

export default function PasoCompartir({ resumen, onVolver }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(resumen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const enlaceWhatsapp = `https://wa.me/?text=${encodeURIComponent(resumen)}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Resumen para compartir</h2>
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          {resumen}
        </pre>
      </section>

      <div className="flex flex-col gap-2">
        <a
          href={enlaceWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white"
        >
          Compartir por WhatsApp
        </a>
        <button
          type="button"
          onClick={copiar}
          className="rounded-md border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className="text-sm text-slate-500 underline"
        >
          Volver a editar
        </button>
      </div>
    </div>
  );
}
