export interface GastoForm {
  id: string;
  monto: string;
  pagador: string;
  consumidores: string[];
  modo: "equitativo" | "individual";
  montosIndividuales: Record<string, string>;
}

export interface EstadoFormulario {
  participantes: string[];
  gastos: GastoForm[];
}

export function crearGastoVacio(participantesActuales: string[]): GastoForm {
  return {
    id: crypto.randomUUID(),
    monto: "",
    pagador: "",
    consumidores: [...participantesActuales],
    modo: "equitativo",
    montosIndividuales: {},
  };
}
